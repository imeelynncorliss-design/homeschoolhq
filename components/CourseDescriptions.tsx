'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/src/lib/supabase'

interface Course {
  id: string
  course_name: string
  subject: string
  grade_level: string
  course_type: string
  credits: number
  course_description: string | null
}

interface CourseDescriptionsProps {
  kidId: string
}

const GRADE_ORDER = ['9', '10', '11', '12', '8', '7', '6']

export default function CourseDescriptions({ kidId }: CourseDescriptionsProps) {
  const [courses, setCourses]     = useState<Course[]>([])
  const [drafts, setDrafts]       = useState<Record<string, string>>({})
  const [saving, setSaving]       = useState<Record<string, boolean>>({})
  const [saved, setSaved]         = useState<Record<string, boolean>>({})
  const [loading, setLoading]     = useState(true)

  const loadCourses = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('courses')
      .select('id, course_name, subject, grade_level, course_type, credits, course_description')
      .eq('kid_id', kidId)
      .order('grade_level', { ascending: true })

    const list = (data || []) as Course[]
    setCourses(list)
    const initial: Record<string, string> = {}
    list.forEach(c => { initial[c.id] = c.course_description ?? '' })
    setDrafts(initial)
    setLoading(false)
  }, [kidId])

  useEffect(() => { loadCourses() }, [loadCourses])

  const handleSave = async (courseId: string) => {
    setSaving(p => ({ ...p, [courseId]: true }))
    await supabase
      .from('courses')
      .update({ course_description: drafts[courseId] || null })
      .eq('id', courseId)
    setSaving(p => ({ ...p, [courseId]: false }))
    setSaved(p => ({ ...p, [courseId]: true }))
    setTimeout(() => setSaved(p => ({ ...p, [courseId]: false })), 2000)
  }

  const byGrade = courses.reduce<Record<string, Course[]>>((acc, c) => {
    const key = c.grade_level || 'Other'
    ;(acc[key] = acc[key] || []).push(c)
    return acc
  }, {})

  const sortedGrades = Object.keys(byGrade).sort((a, b) => {
    const ai = GRADE_ORDER.indexOf(a)
    const bi = GRADE_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const filled = courses.filter(c => drafts[c.id]?.trim()).length

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#7c3aed', fontWeight: 700 }}>
      Loading courses...
    </div>
  )

  if (courses.length === 0) return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>No courses yet</div>
      <div style={{ fontSize: 13, color: '#6b7280' }}>Add courses in the Grade Book tab first.</div>
    </div>
  )

  return (
    <div style={{ padding: '4px 0' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
          Course Descriptions
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          Write a short paragraph for each course describing what was covered, materials used, and how it was evaluated.
          Many colleges request these alongside the transcript.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#f3f4f6', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Descriptions written</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed' }}>{filled} / {courses.length}</span>
          </div>
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 4 }}>
            <div style={{ height: 6, borderRadius: 4, background: 'linear-gradient(90deg, #7c3aed, #ec4899)', width: `${courses.length > 0 ? (filled / courses.length) * 100 : 0}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      {/* Courses grouped by grade */}
      {sortedGrades.map(grade => (
        <div key={grade} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            {grade.match(/^\d+$/) ? `Grade ${grade}` : grade}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {byGrade[grade].map(course => {
              const isDirty = drafts[course.id] !== (course.course_description ?? '')
              const isSaving = saving[course.id]
              const wasSaved = saved[course.id]

              return (
                <div key={course.id} style={{ background: '#fafafa', borderRadius: 14, border: '1.5px solid #e5e7eb', padding: '16px 18px' }}>
                  {/* Course header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{course.course_name}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={pill}>{course.subject}</span>
                        {course.course_type && <span style={pill}>{course.course_type}</span>}
                        <span style={pill}>{course.credits} {course.credits === 1 ? 'credit' : 'credits'}</span>
                      </div>
                    </div>
                    {drafts[course.id]?.trim() && (
                      <span style={{ fontSize: 16 }}>✅</span>
                    )}
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={drafts[course.id] ?? ''}
                    onChange={e => setDrafts(p => ({ ...p, [course.id]: e.target.value }))}
                    placeholder={`Describe what ${course.course_name} covered — topics studied, textbooks or materials used, and how the student was evaluated (tests, projects, portfolio, etc.).`}
                    rows={4}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '12px 14px', borderRadius: 10,
                      border: '1.5px solid #e5e7eb', background: '#fff',
                      fontSize: 13, color: '#374151', lineHeight: 1.6,
                      fontFamily: "'Nunito', sans-serif",
                      resize: 'vertical', outline: 'none',
                    }}
                  />

                  {/* Save button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button
                      onClick={() => handleSave(course.id)}
                      disabled={isSaving || !isDirty}
                      style={{
                        padding: '10px 20px', borderRadius: 12, border: 'none',
                        fontSize: 13, fontWeight: 700,
                        cursor: isSaving || !isDirty ? 'default' : 'pointer',
                        pointerEvents: isSaving || !isDirty ? 'none' : 'auto',
                        background: wasSaved ? '#059669' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                        color: '#fff',
                        transition: 'all 0.2s',
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      {isSaving ? 'Saving...' : wasSaved ? '✓ Saved' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const pill: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#7c3aed',
  background: '#ede9fe', borderRadius: 6, padding: '2px 8px',
}
