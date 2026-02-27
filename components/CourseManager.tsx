'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'
import CourseOnboardingGuide from '@/components/CourseOnboardingGuide'

interface Course {
  id: string
  course_name: string
  subject: string
  course_code: string
  description: string
  grade_level: string
  course_type: string
  credits: number
  final_percentage: number
  letter_grade: string
  school_year: string
  semester: string
  status: string
  start_date: string
  end_date: string
}

interface Lesson {
  id: string
  title: string
  subject: string
  lesson_date: string
  duration_minutes: number
  status: string
  course_id: string | null
}

interface CourseManagerProps {
  kidId: string
  userId: string
}

const GRADE_LEVELS = ['9th', '10th', '11th', '12th', 'K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
const COURSE_TYPES = ['Regular', 'Honors', 'AP', 'Dual Enrollment', 'IB']
const SEMESTERS = ['Fall', 'Spring', 'Full Year', 'Summer']
const STATUSES = ['planned', 'in_progress', 'completed']

export default function CourseManager({ kidId, userId }: CourseManagerProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [showLinkLessons, setShowLinkLessons] = useState<string | null>(null)
  const [autoSuggesting, setAutoSuggesting] = useState(false)

  // Form state
  const [courseName, setCourseName] = useState('')
  const [subject, setSubject] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [description, setDescription] = useState('')
  const [gradeLevel, setGradeLevel] = useState('9th')
  const [courseType, setCourseType] = useState('Regular')
  const [schoolYear, setSchoolYear] = useState('')
  const [semester, setSemester] = useState('Full Year')
  const [credits, setCredits] = useState('1.0')
  const [status, setStatus] = useState('planned')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    loadCourses()
    loadLessons()
  }, [kidId])

  const loadCourses = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('kid_id', kidId)
      .order('created_at', { ascending: false })

    if (data) setCourses(data)
    setLoading(false)
  }

  const loadLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('id, title, subject, lesson_date, duration_minutes, status, course_id')
      .eq('kid_id', kidId)
      .order('lesson_date', { ascending: false })

    if (data) setLessons(data)
  }

  // Returns lessons associated with a specific course via course_id on lessons table
  const getLinkedLessons = (courseId: string): Lesson[] =>
    lessons.filter(l => l.course_id === courseId)

  // Returns lessons matching subject but not yet assigned to any course
  const getUnlinkedLessonsForCourse = (course: Course): Lesson[] =>
    lessons.filter(l =>
      l.subject === course.subject &&
      l.course_id === null
    )

  // Returns lessons matching subject + date range that aren't yet linked to any course
  // Used for auto-suggest — only available when course has both start_date and end_date
  const getAutoSuggestedLessons = (course: Course): Lesson[] => {
    if (!course.start_date || !course.end_date) return []
    return lessons.filter(l =>
      l.subject === course.subject &&
      l.course_id === null &&
      l.lesson_date >= course.start_date &&
      l.lesson_date <= course.end_date
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const courseData = {
      user_id: userId,
      kid_id: kidId,
      course_name: courseName,
      subject,
      course_code: courseCode || null,
      description: description || null,
      grade_level: gradeLevel,
      course_type: courseType,
      school_year: schoolYear || null,
      semester,
      credits: parseFloat(credits),
      status,
      start_date: startDate || null,
      end_date: endDate || null
    }

    if (editingCourse) {
      await supabase.from('courses').update(courseData).eq('id', editingCourse.id)
    } else {
      await supabase.from('courses').insert([courseData])
    }

    resetForm()
    loadCourses()
  }

  const resetForm = () => {
    setCourseName('')
    setSubject('')
    setCourseCode('')
    setDescription('')
    setGradeLevel('9th')
    setCourseType('Regular')
    setSchoolYear('')
    setSemester('Full Year')
    setCredits('1.0')
    setStatus('planned')
    setStartDate('')
    setEndDate('')
    setEditingCourse(null)
    setShowForm(false)
  }

  const editCourse = (course: Course) => {
    setCourseName(course.course_name)
    setSubject(course.subject)
    setCourseCode(course.course_code || '')
    setDescription(course.description || '')
    setGradeLevel(course.grade_level)
    setCourseType(course.course_type)
    setSchoolYear(course.school_year || '')
    setSemester(course.semester)
    setCredits(course.credits.toString())
    setStatus(course.status)
    setStartDate(course.start_date || '')
    setEndDate(course.end_date || '')
    setEditingCourse(course)
    setShowForm(true)
  }

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Delete this course? Linked lessons will be unlinked but not deleted.')) return
    // Unlink all lessons from this course before deleting
    await supabase
      .from('lessons')
      .update({ course_id: null })
      .eq('course_id', courseId)
    await supabase.from('courses').delete().eq('id', courseId)
    await loadLessons()
    loadCourses()
  }

  // Link: update the lesson's course_id to point to this course
  const linkLesson = async (courseId: string, lessonId: string) => {
    await supabase
      .from('lessons')
      .update({ course_id: courseId })
      .eq('id', lessonId)
    await loadLessons()
  }

  // Unlink: set course_id back to null — lesson still exists as standalone
  const unlinkLesson = async (lessonId: string) => {
    await supabase
      .from('lessons')
      .update({ course_id: null })
      .eq('id', lessonId)
    await loadLessons()
  }

  // Auto-suggest: links all unlinked lessons matching subject + date range in one operation
  const autoLinkByDateRange = async (course: Course) => {
    const suggested = getAutoSuggestedLessons(course)
    if (suggested.length === 0) return

    setAutoSuggesting(true)
    try {
      const lessonIds = suggested.map(l => l.id)
      await supabase
        .from('lessons')
        .update({ course_id: course.id })
        .in('id', lessonIds)
      await loadLessons()
    } finally {
      setAutoSuggesting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading courses...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Manager</h2>
          <p className="text-gray-600">Create and manage high school courses for transcripts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              showGuide
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            💡 How this works
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ New Course'}
          </button>
        </div>
      </div>

      {/* Collapsible onboarding guide */}
      {showGuide && (
        <div className="mb-6">
          <CourseOnboardingGuide onCreateCourse={() => { setShowForm(true); setShowGuide(false) }} />
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 mb-6 space-y-4">

          {/* Course Name — required, was missing from original form */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="w-full px-3 py-2 border rounded text-gray-900"
              placeholder="e.g., Algebra II, American Literature, AP Biology"
              required
            />
          </div>

          {/* Subject — full-width select dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border rounded text-gray-900"
              required
            >
              <option value="">Select a subject...</option>
              {CANONICAL_SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Subject must match your lesson subjects exactly for linking to work correctly.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
                placeholder="e.g., MATH101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level *</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
                required
              >
                {GRADE_LEVELS.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Type *</label>
              <select
                value={courseType}
                onChange={(e) => setCourseType(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
                required
              >
                {COURSE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded text-gray-900"
              rows={2}
              placeholder="Brief course description..."
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Year</label>
              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
                placeholder="2024-2025"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
                required
              >
                {SEMESTERS.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credits *</label>
              <input
                type="number"
                step="0.25"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
                required
              >
                {STATUSES.map(stat => (
                  <option key={stat} value={stat}>{stat.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-2">
            💡 Setting start and end dates enables auto-linking of lessons within that date range.
          </p>

          <div className="flex gap-2 pt-4">
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
              {editingCourse ? 'Update Course' : 'Create Course'}
            </button>
            <button type="button" onClick={resetForm} className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Course List */}
      <div className="space-y-3">
        {courses.length === 0 ? (
          <CourseOnboardingGuide onCreateCourse={() => setShowForm(true)} />
        ) : (
          courses.map(course => {
            const courseLinkedLessons = getLinkedLessons(course.id)
            const suggestedLessons = getAutoSuggestedLessons(course)

            return (
              <div key={course.id} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{course.course_name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        course.status === 'completed' ? 'bg-green-100 text-green-800' :
                        course.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {course.status.replace('_', ' ')}
                      </span>
                      {course.course_type !== 'Regular' && (
                        <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                          {course.course_type}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                      <div><span className="font-medium">Subject:</span> {course.subject}</div>
                      <div><span className="font-medium">Grade:</span> {course.grade_level}</div>
                      <div><span className="font-medium">Credits:</span> {course.credits}</div>
                      <div><span className="font-medium">Semester:</span> {course.semester}</div>
                    </div>

                    {(course.start_date || course.end_date) && (
                      <div className="text-xs text-gray-500 mt-1">
                        {course.start_date && `From ${course.start_date}`}
                        {course.start_date && course.end_date && ' → '}
                        {course.end_date && `${course.end_date}`}
                      </div>
                    )}

                    {course.description && (
                      <p className="text-sm text-gray-600 mt-2">{course.description}</p>
                    )}

                    {/* Auto-suggest banner — shown when date range is set and there are matches */}
                    {suggestedLessons.length > 0 && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-amber-800">
                          <strong>{suggestedLessons.length} unlinked {course.subject} lesson{suggestedLessons.length !== 1 ? 's' : ''}</strong> found within this course's date range
                        </p>
                        <button
                          onClick={() => autoLinkByDateRange(course)}
                          disabled={autoSuggesting}
                          className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 disabled:bg-amber-300 shrink-0"
                        >
                          {autoSuggesting ? 'Linking...' : 'Auto-link all'}
                        </button>
                      </div>
                    )}

                    {/* Linked lessons pills */}
                    {courseLinkedLessons.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          {courseLinkedLessons.length} Linked Lesson{courseLinkedLessons.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {courseLinkedLessons.slice(0, 5).map(lesson => (
                            <div key={lesson.id} className="flex items-center gap-1 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                              <span className="text-xs text-blue-800">{lesson.title || 'Lesson'}</span>
                              <button
                                onClick={() => unlinkLesson(lesson.id)}
                                className="text-blue-400 hover:text-red-500 ml-1 text-xs font-bold leading-none"
                                title="Unlink lesson"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {courseLinkedLessons.length > 5 && (
                            <button
                              onClick={() => setShowLinkLessons(course.id)}
                              className="text-xs text-gray-500 self-center hover:text-blue-600 underline"
                            >
                              +{courseLinkedLessons.length - 5} more
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4 shrink-0">
                    <button onClick={() => editCourse(course)} className="text-blue-600 hover:text-blue-800 text-sm">
                      Edit
                    </button>
                    <button
                      onClick={() => setShowLinkLessons(showLinkLessons === course.id ? null : course.id)}
                      className="text-purple-600 hover:text-purple-800 text-sm"
                    >
                      Link Lessons
                    </button>
                    <button onClick={() => deleteCourse(course.id)} className="text-red-600 hover:text-red-800 text-sm">
                      Delete
                    </button>
                  </div>
                </div>

                {/* Link Lessons Panel */}
                {showLinkLessons === course.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded border">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900">Link Lessons to {course.course_name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Lessons linked here are added to this course's transcript record.
                        </p>
                      </div>
                      <button onClick={() => setShowLinkLessons(null)} className="text-gray-500 hover:text-gray-700">✕</button>
                    </div>

                    {/* Auto-suggest action inside panel if dates are set */}
                    {course.start_date && course.end_date && suggestedLessons.length > 0 && (
                      <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-amber-800">
                          <strong>{suggestedLessons.length} lesson{suggestedLessons.length !== 1 ? 's' : ''}</strong> match this course's subject and date range
                        </p>
                        <button
                          onClick={() => autoLinkByDateRange(course)}
                          disabled={autoSuggesting}
                          className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 disabled:bg-amber-300 shrink-0"
                        >
                          {autoSuggesting ? 'Linking...' : 'Auto-link all'}
                        </button>
                      </div>
                    )}

                    {!course.start_date || !course.end_date ? (
                      <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-blue-800">
                          💡 Add start and end dates to this course to enable auto-linking of all matching lessons at once.
                        </p>
                      </div>
                    ) : null}

                    <p className="text-xs text-gray-500 mb-3">
                      Showing <strong>{course.subject}</strong> lessons — linked to this course or unlinked
                    </p>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {lessons.filter(l => l.subject === course.subject).length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No lessons found with subject "{course.subject}"
                        </p>
                      ) : (
                        lessons
                          .filter(l => l.subject === course.subject && (l.course_id === course.id || l.course_id === null))
                          .map(lesson => {
                            const isLinked = lesson.course_id === course.id
                            return (
                              <div
                                key={lesson.id}
                                className={`flex justify-between items-center p-2 rounded border ${
                                  isLinked ? 'bg-green-50 border-green-200' : 'bg-white'
                                }`}
                              >
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">{lesson.title}</div>
                                  <div className="text-xs text-gray-500">
                                    {lesson.lesson_date}
                                    {lesson.duration_minutes ? ` • ${lesson.duration_minutes} min` : ''}
                                    {lesson.status === 'completed' && (
                                      <span className="ml-1 text-green-600">• completed</span>
                                    )}
                                  </div>
                                </div>
                                {isLinked ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-green-700 font-semibold">✓ Linked</span>
                                    <button
                                      onClick={() => unlinkLesson(lesson.id)}
                                      className="text-xs text-red-500 hover:text-red-700 underline"
                                    >
                                      Unlink
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => linkLesson(course.id, lesson.id)}
                                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                  >
                                    Link
                                  </button>
                                )}
                              </div>
                            )
                          })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}