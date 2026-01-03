'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [showLinkLessons, setShowLinkLessons] = useState<string | null>(null)
  
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
      .select('*')
      .eq('kid_id', kidId)
      .order('lesson_date', { ascending: false })
    
    if (data) setLessons(data)
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
      await supabase
        .from('courses')
        .update(courseData)
        .eq('id', editingCourse.id)
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
    if (!confirm('Delete this course? This will also remove any linked lessons.')) return
    
    await supabase.from('courses').delete().eq('id', courseId)
    loadCourses()
  }

  const linkLesson = async (courseId: string, lessonId: string) => {
    await supabase.from('course_grades').insert([{
      course_id: courseId,
      lesson_id: lessonId
    }])
    
    alert('Lesson linked to course!')
  }

  if (loading) {
    return <div className="text-center py-8">Loading courses...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Manager</h2>
          <p className="text-gray-600">Create and manage high school courses</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Course'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
                placeholder="e.g., Algebra I"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
                placeholder="e.g., Math"
                required
              />
            </div>
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

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              {editingCourse ? 'Update Course' : 'Create Course'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Course List */}
      <div className="space-y-3">
        {courses.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-8 text-center">
            <p className="text-gray-600">No courses yet. Create your first course to get started!</p>
          </div>
        ) : (
          courses.map(course => (
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
                  {course.description && (
                    <p className="text-sm text-gray-600 mt-2">{course.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => editCourse(course)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowLinkLessons(course.id)}
                    className="text-purple-600 hover:text-purple-800 text-sm"
                  >
                    Link Lessons
                  </button>
                  <button
                    onClick={() => deleteCourse(course.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Link Lessons Modal */}
              {showLinkLessons === course.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded border">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-gray-900">Link Lessons to {course.course_name}</h4>
                    <button
                      onClick={() => setShowLinkLessons(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {lessons.filter(l => l.subject === course.subject).map(lesson => (
                      <div key={lesson.id} className="flex justify-between items-center bg-white p-2 rounded border">
                        <div>
                          <div className="font-medium text-gray-900">{lesson.title}</div>
                          <div className="text-xs text-gray-500">
                            {lesson.lesson_date} • {lesson.duration_minutes} min
                          </div>
                        </div>
                        <button
                          onClick={() => linkLesson(course.id, lesson.id)}
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          Link
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}