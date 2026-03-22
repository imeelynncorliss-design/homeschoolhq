'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import LessonViewModal, { type LessonViewModalLesson } from '@/components/LessonViewModal'
import LessonGenerator from '@/components/LessonGenerator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kid {
  id: string
  displayname: string
  grade?: string
}

interface SubjectRecord {
  id: string
  kid_id: string
  name: string
  weekly_frequency: number | null
  color: string | null
  emoji: string | null
}

interface Lesson {
  id: string
  title: string
  subject: string
  status: 'not_started' | 'in_progress' | 'completed'
  lesson_date: string | null
  start_time: string | null
  description?: string | null
  notes?: string | null
  kid_id: string
  duration_minutes?: number | null
  lesson_source?: string | null
}

interface SubjectGroup {
  subject: string
  lessons: Lesson[]
  color: string
  emoji: string
  weekly_frequency: number | null
  subjectId: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KID_COLORS = ['#7c3aed', '#0d9488', '#ec4899', '#f59e0b', '#3b82f6']

const SUBJECT_PALETTE = [
  '#7c3aed', '#0d9488', '#ec4899', '#f59e0b', '#3b82f6',
  '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
]

const STATUS_CONFIG = {
  completed:   { dot: '#10b981', label: 'Done' },
  in_progress: { dot: '#f59e0b', label: 'In Progress' },
  not_started: { dot: '#9ca3af', label: 'Not Started' },
}

const COMMON_SUBJECTS = [
  'Mathematics', 'Reading', 'Writing', 'Language Arts', 'Science',
  'Social Studies', 'History', 'Geography', 'Art', 'Music',
  'Physical Education', 'Health', 'Spanish', 'French', 'Latin',
  'Bible', 'Computer Science', 'Logic', 'Life Skills',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_EMOJI_MAP: Record<string, string> = {
  'mathematics': '🔢', 'math': '🔢',
  'english': '📖', 'language arts': '📖', 'reading': '📖', 'writing': '✏️',
  'science': '🔬',
  'social studies': '🌍', 'history': '🏛️', 'geography': '🗺️',
  'art': '🎨', 'music': '🎵',
  'physical education': '⚽', 'pe': '⚽', 'health': '💪',
  'foreign language': '💬', 'spanish': '💬', 'french': '💬', 'latin': '🏛️',
  'bible': '✝️', 'religious': '✝️',
  'computer science': '💻', 'technology': '💻',
  'life skills': '🏠', 'logic': '🧩',
}

function subjectEmoji(subject: string): string {
  const lower = subject.toLowerCase()
  for (const [key, emoji] of Object.entries(SUBJECT_EMOJI_MAP)) {
    if (lower.includes(key)) return emoji
  }
  return '📚'
}

function subjectColor(subject: string): string {
  let hash = 0
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash)
  }
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getThisWeekBounds(): { mon: string; sun: string } {
  const now = new Date()
  const day = now.getDay() // 0=Sun … 6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diffToMon)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { mon: fmt(mon), sun: fmt(sun) }
}

// ─── Subject Content ──────────────────────────────────────────────────────────

function SubjectsContent() {
  const router   = useRouter()
  const supabase = createClient()
  const css = {
    root: {
      fontFamily: "'Nunito', sans-serif",
      paddingBottom: 88,
    },
  }

  const [loading, setLoading]           = useState(true)
  const [kids, setKids]                 = useState<Kid[]>([])
  const [activeKidId, setActiveKidId]   = useState<string | null>(null)
  const [allLessons, setAllLessons]     = useState<Lesson[]>([])
  const [allSubjects, setAllSubjects]   = useState<SubjectRecord[]>([])
  const [orgId, setOrgId]               = useState<string | null>(null)
  const [userId, setUserId]             = useState<string>('')
  const [selected, setSelected]         = useState<{ kidId: string; subjectName: string } | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<LessonViewModalLesson | null>(null)

  // Add Lesson state
  const [showLessonChoiceSheet, setShowLessonChoiceSheet] = useState(false)
  const [addLessonKidId, setAddLessonKidId]               = useState('')
  const [addLessonSubject, setAddLessonSubject]           = useState('')
  const [showLessonGenerator, setShowLessonGenerator]     = useState(false)
  const [showQuickLesson, setShowQuickLesson]             = useState(false)
  const [quickTitle, setQuickTitle]                       = useState('')
  const [quickDate, setQuickDate]                         = useState('')
  const [quickDuration, setQuickDuration]                 = useState(30)
  const [quickSaving, setQuickSaving]                     = useState(false)

  // Edit frequency sheet
  const [showEditFreq, setShowEditFreq]           = useState(false)
  const [editFreqSubjectId, setEditFreqSubjectId] = useState<string | null>(null)
  const [editFreqKidId, setEditFreqKidId]         = useState<string>('')
  const [editFreqSubjectName, setEditFreqSubjectName] = useState<string>('')
  const [editFreqValue, setEditFreqValue]         = useState<number | null>(null)
  const [editFreqSaving, setEditFreqSaving]       = useState(false)

  const openEditFreq = (subjectId: string | null, kidId: string, subjectName: string, currentFreq: number | null) => {
    setEditFreqSubjectId(subjectId)
    setEditFreqKidId(kidId)
    setEditFreqSubjectName(subjectName)
    setEditFreqValue(currentFreq)
    setShowEditFreq(true)
  }

  const handleEditFrequency = async () => {
    if (!orgId) return
    setEditFreqSaving(true)

    if (editFreqSubjectId) {
      // Existing subjects table record — just update
      await supabase.from('subjects').update({ weekly_frequency: editFreqValue }).eq('id', editFreqSubjectId)
      setAllSubjects(prev => prev.map(s =>
        s.id === editFreqSubjectId ? { ...s, weekly_frequency: editFreqValue } : s
      ))
    } else {
      // Legacy subject — create a new subjects table record
      const { data } = await supabase.from('subjects').insert({
        organization_id: orgId,
        kid_id: editFreqKidId,
        name: editFreqSubjectName,
        weekly_frequency: editFreqValue,
        color: subjectColor(editFreqSubjectName),
        emoji: subjectEmoji(editFreqSubjectName),
      }).select('id, kid_id, name, weekly_frequency, color, emoji').single()
      if (data) setAllSubjects(prev => [...prev, data])
    }

    setEditFreqSaving(false)
    setShowEditFreq(false)
  }

  // Add Subject modal state
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [addKidId, setAddKidId]           = useState<string>('')
  const [addName, setAddName]             = useState('')
  const [addFrequency, setAddFrequency]   = useState<number | null>(null)
  const [addColor, setAddColor]           = useState(SUBJECT_PALETTE[0])
  const [addEmoji, setAddEmoji]           = useState('📚')
  const [addSaving, setAddSaving]         = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      const { data: org } = await supabase
        .from('organizations').select('id').eq('user_id', user.id).maybeSingle()
      let resolvedOrgId = org?.id
      if (!resolvedOrgId) {
        const { data: m } = await supabase
          .from('user_organizations').select('organization_id').eq('user_id', user.id).maybeSingle()
        resolvedOrgId = m?.organization_id
      }
      if (!resolvedOrgId) { router.push('/onboarding'); return }
      setOrgId(resolvedOrgId)

      const [kidsResult, lessonsResult, subjectsResult] = await Promise.all([
        supabase.from('kids').select('id, displayname, grade')
          .eq('organization_id', resolvedOrgId).order('created_at', { ascending: true }),
        supabase.from('lessons')
          .select('id, title, subject, status, lesson_date, start_time, description, notes, kid_id, duration_minutes, lesson_source')
          .eq('organization_id', resolvedOrgId).order('lesson_date', { ascending: true }),
        supabase.from('subjects').select('id, kid_id, name, weekly_frequency, color, emoji')
          .eq('organization_id', resolvedOrgId).order('created_at', { ascending: true }),
      ])

      const kidsList = kidsResult.data || []
      setKids(kidsList)
      if (kidsList.length > 0) setActiveKidId(kidsList[0].id)
      setAllLessons(lessonsResult.data || [])
      setAllSubjects(subjectsResult.data || [])
      setLoading(false)
    }
    load()
  }, [])

  // ── Derived: merge subjects table + lesson subjects ──────────────────────────
  const kidSubjects: { kid: Kid; subjects: SubjectGroup[]; color: string }[] = kids.map((kid, idx) => {
    const tableSubjects = allSubjects.filter(s => s.kid_id === kid.id)
    const tableNamesLower = new Set(tableSubjects.map(s => s.name.toLowerCase()))

    // Legacy subjects derived from lessons but not in the subjects table
    const lessonSubjectNames = [...new Set(
      allLessons.filter(l => l.kid_id === kid.id && l.subject).map(l => l.subject)
    )].filter(n => !tableNamesLower.has(n.toLowerCase()))

    const subjects: SubjectGroup[] = [
      ...tableSubjects.map(s => ({
        subject: s.name,
        lessons: allLessons.filter(l =>
          l.kid_id === kid.id && l.subject?.toLowerCase() === s.name.toLowerCase()
        ),
        color: s.color || subjectColor(s.name),
        emoji: s.emoji || subjectEmoji(s.name),
        weekly_frequency: s.weekly_frequency,
        subjectId: s.id,
      })).sort((a, b) => a.subject.localeCompare(b.subject)),
      ...lessonSubjectNames.sort().map(name => ({
        subject: name,
        lessons: allLessons.filter(l => l.kid_id === kid.id && l.subject === name),
        color: subjectColor(name),
        emoji: subjectEmoji(name),
        weekly_frequency: null,
        subjectId: null,
      })),
    ]

    return { kid, subjects, color: KID_COLORS[idx % KID_COLORS.length] }
  })

  // ── Add Subject ──────────────────────────────────────────────────────────────
  const openAddSubject = (kidId: string) => {
    setAddKidId(kidId)
    setAddName('')
    setAddFrequency(null)
    setAddColor(SUBJECT_PALETTE[0])
    setAddEmoji('📚')
    setShowAddSubject(true)
  }

  const handleNameChange = (name: string) => {
    setAddName(name)
    setAddEmoji(subjectEmoji(name))
    setAddColor(subjectColor(name))
  }

  const handleAddSubject = async () => {
    if (!addName.trim() || !orgId || !addKidId) return
    setAddSaving(true)
    const { data, error } = await supabase.from('subjects').insert({
      organization_id: orgId,
      kid_id: addKidId,
      name: addName.trim(),
      weekly_frequency: addFrequency,
      color: addColor,
      emoji: addEmoji,
    }).select('id, kid_id, name, weekly_frequency, color, emoji').single()
    if (!error && data) {
      setAllSubjects(prev => [...prev, data])
    }
    setAddSaving(false)
    setShowAddSubject(false)
  }

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Remove this subject? Existing lessons will not be deleted.')) return
    await supabase.from('subjects').delete().eq('id', subjectId)
    setAllSubjects(prev => prev.filter(s => s.id !== subjectId))
    setSelected(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3d3a52' }}>
      <div style={{ color: '#7c3aed', fontWeight: 800, fontSize: 18, fontFamily: "'Nunito', sans-serif" }}>Loading...</div>
    </div>
  )

  return (
    <div className="hr-page" style={css.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        .nav-btn:hover { opacity: 0.8; }
        .subj-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.13) !important; }
        .lesson-row:hover { background: rgba(124,58,237,0.05) !important; }
        .freq-btn:hover { opacity: 0.85; }
        .color-swatch:hover { transform: scale(1.15); }
      `}</style>

      {/* Page title */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 className="hr-h1" style={{ fontSize: 26, margin: 0, fontFamily: "'Nunito', sans-serif" }}>
            Subjects
          </h1>
          {/* Subjects | Lessons toggle */}
          <div className="hr-pill-row">
            <button className="hr-pill active" style={{ fontFamily: "'Nunito', sans-serif", cursor: 'default' }}>Subjects</button>
            <button className="hr-pill" onClick={() => router.push('/lessons')} style={{ fontFamily: "'Nunito', sans-serif" }}>Lessons</button>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 600, margin: '0 0 24px' }}>
          Curriculum overview by child
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 20px' }}>

        {kids.length === 0 ? (
          <div className="hr-card" style={{ padding: '40px 24px', textAlign: 'center', color: '#6b7280', fontSize: 15, fontWeight: 600 }}>
            Add children to your account to see subjects here.
          </div>
        ) : (
          <>
            {/* Kid switcher */}
            {kids.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 24 }}>
                {kidSubjects.map(({ kid, color }) => {
                  const isActive = kid.id === activeKidId
                  return (
                    <button key={kid.id} onClick={() => setActiveKidId(kid.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 16px 8px 10px', borderRadius: 30,
                      border: `2px solid ${isActive ? color : color + '45'}`,
                      background: isActive ? color + '18' : 'rgba(255,255,255,0.65)',
                      fontFamily: "'Nunito', sans-serif", fontWeight: isActive ? 800 : 600,
                      fontSize: 14, color: isActive ? color : '#6b7280',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: color + '30', border: `2px solid ${color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 900, color,
                      }}>
                        {kid.displayname.charAt(0).toUpperCase()}
                      </div>
                      {kid.displayname}
                    </button>
                  )
                })}
              </div>
            )}

            {kidSubjects.filter(k => k.kid.id === activeKidId).map(({ kid, subjects, color }) => (
              <div key={kid.id} style={{ marginBottom: 32 }}>

                {/* Kid header + Add Subject button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: color + '22', border: `2px solid ${color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 900, color,
                    }}>
                      {kid.displayname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#c4b5fd' }}>{kid.displayname}</div>
                      {kid.grade && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Grade {kid.grade}</div>}
                    </div>
                  </div>
                  <button
                    className="hr-back-btn"
                    onClick={() => openAddSubject(kid.id)}
                    style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13 }}>
                    + Add Subject
                  </button>
                </div>

                {/* Subject grid */}
                {subjects.length === 0 ? (
                  <div style={{
                    background: 'rgba(255,255,255,0.7)', borderRadius: 14,
                    border: '1.5px dashed rgba(124,58,237,0.2)', padding: '24px',
                    textAlign: 'center', color: '#9ca3af', fontSize: 13, fontWeight: 600,
                  }}>
                    No subjects yet. Tap <strong style={{ color }}>+ Add Subject</strong> to start planning {kid.displayname}&rsquo;s curriculum.
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: 12,
                  }}>
                    {subjects.map(subj => (
                      <div
                        key={subj.subject}
                        className="subj-card"
                        onClick={() => setSelected({ kidId: kid.id, subjectName: subj.subject })}
                        style={{
                          background: subj.lessons.length === 0
                            ? 'rgba(255,255,255,0.6)'
                            : 'rgba(255,255,255,0.88)',
                          border: subj.lessons.length === 0
                            ? `1.5px dashed ${subj.color}50`
                            : `1.5px solid ${subj.color}30`,
                          borderRadius: 16, padding: '16px 14px',
                          cursor: 'pointer', textAlign: 'left' as const,
                          transition: 'transform 0.15s, box-shadow 0.15s',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                          fontFamily: "'Nunito', sans-serif",
                          position: 'relative' as const,
                        }}>
                        <div style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>{subj.emoji}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e1b4b', marginBottom: 6, lineHeight: 1.3 }}>
                          {subj.subject}
                        </div>
                        {/* Frequency badge — tappable for all subjects */}
                        {subj.weekly_frequency ? (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              openEditFreq(subj.subjectId, kid.id, subj.subject, subj.weekly_frequency)
                            }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10, fontWeight: 900,
                              color: subj.color, background: subj.color + '15',
                              borderRadius: 8, padding: '3px 8px', marginBottom: 6,
                              border: `1px solid ${subj.color}30`,
                              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                            }}>
                            Target: {subj.weekly_frequency}×/wk ✏️
                          </button>
                        ) : (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              openEditFreq(subj.subjectId, kid.id, subj.subject, null)
                            }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10, fontWeight: 700,
                              color: '#9ca3af', background: '#f3f4f6',
                              borderRadius: 8, padding: '3px 8px', marginBottom: 6,
                              border: '1px solid #e5e7eb',
                              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                            }}>
                            Set target ✏️
                          </button>
                        )}
                        {/* Weekly progress indicator */}
                        {(() => {
                          const { mon, sun } = getThisWeekBounds()
                          const thisWeekCount = subj.lessons.filter(l =>
                            l.lesson_date && l.lesson_date >= mon && l.lesson_date <= sun
                          ).length
                          const target = subj.weekly_frequency
                          if (target) {
                            const pct = Math.min(thisWeekCount / target, 1)
                            const color = thisWeekCount === 0 ? '#ef4444'
                              : thisWeekCount >= target ? '#10b981' : '#f59e0b'
                            const statusLabel = thisWeekCount === 0 ? 'Not started'
                              : thisWeekCount >= target ? 'Target met! 🎉' : 'In progress'
                            return (
                              <div style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 }}>
                                  This week's lessons
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color }}>
                                    {thisWeekCount} of {target} {statusLabel}
                                  </span>
                                </div>
                                <div style={{ height: 4, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%', borderRadius: 4,
                                    width: `${pct * 100}%`,
                                    background: color,
                                    transition: 'width 0.3s',
                                  }} />
                                </div>
                              </div>
                            )
                          }
                          // No frequency set — show neutral count
                          return (
                            <div style={{ marginBottom: 4 }}>
                              <div style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 }}>
                                This week's lessons
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>
                                {thisWeekCount > 0 ? `${thisWeekCount} scheduled` : 'None scheduled'}
                              </div>
                            </div>
                          )
                        })()}
                        <div style={{ fontSize: 11, fontWeight: 700, color: subj.lessons.length === 0 ? '#9ca3af' : subj.color, display: 'block' }}>
                          {subj.lessons.length === 0 ? 'No lessons yet' : `${subj.lessons.length} lesson${subj.lessons.length !== 1 ? 's' : ''}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Lesson list panel */}
      {selected && (() => {
        const panelKid = kids.find(k => k.id === selected.kidId)
        const panelLessons = allLessons.filter(l => l.kid_id === selected.kidId && l.subject?.toLowerCase() === selected.subjectName.toLowerCase())
        const panelSubj = kidSubjects.find(k => k.kid.id === selected.kidId)?.subjects.find(s => s.subject === selected.subjectName)
        const emoji = panelSubj?.emoji || subjectEmoji(selected.subjectName)
        const color = panelSubj?.color || subjectColor(selected.subjectName)
        return (
          <div onClick={() => setSelected(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              width: '100%', maxWidth: 600,
              background: '#fff', borderRadius: 20,
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
            }}>
              {/* Panel header */}
              <div style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(0,0,0,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{emoji}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b', fontFamily: "'Nunito', sans-serif" }}>
                      {selected.subjectName}
                    </span>
                    {panelSubj?.weekly_frequency && (
                      <span style={{
                        fontSize: 11, fontWeight: 900, color,
                        background: color + '15', borderRadius: 8, padding: '2px 8px',
                      }}>
                        {panelSubj.weekly_frequency}×/wk
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 2, fontFamily: "'Nunito', sans-serif" }}>
                    {panelKid?.displayname} · {panelLessons.length} lesson{panelLessons.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => {
                      setAddLessonKidId(selected.kidId)
                      setAddLessonSubject(selected.subjectName)
                      setShowLessonChoiceSheet(true)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 13px', borderRadius: 18, border: 'none',
                      background: color + '18', color,
                      fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 800,
                      cursor: 'pointer',
                    }}>
                    <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Add Lesson
                  </button>
                  <button onClick={() => setSelected(null)} style={{
                    background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%',
                    width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#6b7280',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
              </div>

              {/* Lesson list */}
              <div style={{ overflowY: 'auto', padding: '8px 0', flex: 1 }}>
                {panelLessons.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b', marginBottom: 6, fontFamily: "'Nunito', sans-serif" }}>
                      No lessons yet
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, lineHeight: 1.5, marginBottom: 16, fontFamily: "'Nunito', sans-serif" }}>
                      Add your first {selected.subjectName} lesson to get started.
                    </div>
                    <button
                      onClick={() => {
                        setAddLessonKidId(selected.kidId)
                        setAddLessonSubject(selected.subjectName)
                        setShowLessonChoiceSheet(true)
                      }}
                      style={{
                        padding: '10px 20px', borderRadius: 20, border: 'none',
                        background: color, color: '#fff',
                        fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 800,
                        cursor: 'pointer',
                      }}>
                      + Add Lesson
                    </button>
                  </div>
                ) : (
                  panelLessons.map(lesson => {
                    const cfg = STATUS_CONFIG[lesson.status]
                    return (
                      <div key={lesson.id} className="lesson-row"
                        onClick={() => { setSelected(null); setSelectedLesson(lesson as LessonViewModalLesson) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 20px', cursor: 'pointer',
                          borderBottom: '1px solid rgba(0,0,0,0.04)',
                          fontFamily: "'Nunito', sans-serif", transition: 'background 0.12s',
                        }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lesson.title}
                          </div>
                          {lesson.lesson_date && (
                            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 1 }}>
                              {formatDate(lesson.lesson_date)}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.dot, flexShrink: 0 }}>{cfg.label}</span>
                        <span style={{ color: '#d1d5db', fontSize: 16 }}>›</span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Remove subject (only for subjects in the table) */}
              {panelSubj?.subjectId && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
                  <button
                    onClick={() => handleDeleteSubject(panelSubj.subjectId!)}
                    style={{
                      background: 'none', border: 'none', color: '#ef4444',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      fontFamily: "'Nunito', sans-serif",
                    }}>
                    Remove subject
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Add Subject modal */}
      {showAddSubject && (
        <>
          <div onClick={() => setShowAddSubject(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300,
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
            background: '#fff', borderRadius: '24px 24px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            maxHeight: '90vh', overflowY: 'auto',
            fontFamily: "'Nunito', sans-serif",
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
            </div>

            <div style={{ padding: '16px 20px 40px' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#1e1b4b', marginBottom: 4 }}>Add a Subject</div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 20, lineHeight: 1.5 }}>
                Add subjects you plan to teach — even if you haven&rsquo;t scheduled lessons yet. Lessons will appear here once added.
              </div>

              {/* Subject name */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 8, letterSpacing: 0.5 }}>SUBJECT NAME</div>
                <input
                  value={addName}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Latin, Logic, Art History..."
                  list="subject-suggestions"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 12,
                    border: '1.5px solid #e5e7eb', fontSize: 15, fontWeight: 600,
                    fontFamily: "'Nunito', sans-serif", color: '#1e1b4b', outline: 'none',
                  }}
                />
                <datalist id="subject-suggestions">
                  {COMMON_SUBJECTS.map(s => <option key={s} value={s} />)}
                </datalist>
                {/* Quick-pick pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 10 }}>
                  {COMMON_SUBJECTS.filter(s => !s.toLowerCase().includes(addName.toLowerCase()) || addName === '').slice(0, 10).map(s => (
                    <button key={s} onClick={() => handleNameChange(s)}
                      style={{
                        padding: '4px 10px', borderRadius: 14, border: '1.5px solid #e5e7eb',
                        background: '#f9fafb', fontSize: 12, fontWeight: 700, color: '#374151',
                        cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                      }}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Weekly frequency */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 8, letterSpacing: 0.5 }}>
                  TARGET FREQUENCY
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} className="freq-btn"
                      onClick={() => setAddFrequency(addFrequency === n ? null : n)}
                      style={{
                        width: 48, height: 48, borderRadius: 12,
                        border: addFrequency === n ? '2px solid #7c3aed' : '1.5px solid #e5e7eb',
                        background: addFrequency === n ? '#ede9fe' : '#f9fafb',
                        color: addFrequency === n ? '#7c3aed' : '#374151',
                        fontWeight: 900, fontSize: 14, cursor: 'pointer',
                        fontFamily: "'Nunito', sans-serif",
                        display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                        gap: 1,
                      }}>
                      <span>{n}×</span>
                      <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.7 }}>/wk</span>
                    </button>
                  ))}
                  <button className="freq-btn"
                    onClick={() => setAddFrequency(null)}
                    style={{
                      padding: '0 14px', height: 48, borderRadius: 12,
                      border: addFrequency === null ? '2px solid #7c3aed' : '1.5px solid #e5e7eb',
                      background: addFrequency === null ? '#ede9fe' : '#f9fafb',
                      color: addFrequency === null ? '#7c3aed' : '#374151',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      fontFamily: "'Nunito', sans-serif",
                    }}>Flexible</button>
                </div>
              </div>

              {/* Color picker */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 8, letterSpacing: 0.5 }}>COLOR</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                  {SUBJECT_PALETTE.map(c => (
                    <button key={c} className="color-swatch"
                      onClick={() => setAddColor(c)}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', background: c,
                        border: addColor === c ? '3px solid #1e1b4b' : '3px solid transparent',
                        cursor: 'pointer', transition: 'transform 0.12s',
                        outline: addColor === c ? '2px solid #fff' : 'none',
                        outlineOffset: -4,
                      }} />
                  ))}
                </div>
              </div>

              {/* Preview */}
              {addName.trim() && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 8, letterSpacing: 0.5 }}>PREVIEW</div>
                  <div style={{
                    display: 'inline-block', background: 'rgba(255,255,255,0.88)',
                    border: `1.5px solid ${addColor}30`, borderRadius: 16, padding: '16px 14px',
                    minWidth: 140,
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>{addEmoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1e1b4b', marginBottom: 6 }}>{addName}</div>
                    {addFrequency && (
                      <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 900, color: addColor, background: addColor + '15', borderRadius: 8, padding: '2px 7px', marginBottom: 4 }}>
                        {addFrequency}×/wk
                      </div>
                    )}
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', display: 'block' }}>No lessons yet</div>
                  </div>
                </div>
              )}

              {/* Save */}
              <button
                onClick={handleAddSubject}
                disabled={!addName.trim() || addSaving}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                  background: addName.trim() ? '#7c3aed' : '#e5e7eb',
                  color: addName.trim() ? '#fff' : '#9ca3af',
                  fontSize: 16, fontWeight: 900, cursor: addName.trim() ? 'pointer' : 'default',
                  fontFamily: "'Nunito', sans-serif",
                }}>
                {addSaving ? 'Saving…' : 'Add Subject'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Lesson view modal */}
      {selectedLesson && (
        <LessonViewModal
          lesson={selectedLesson}
          kidName={kids.find(k => k.id === selectedLesson.kid_id)?.displayname}
          kidGrade={kids.find(k => k.id === selectedLesson.kid_id)?.grade}
          onClose={() => setSelectedLesson(null)}
          onEdit={() => setSelectedLesson(null)}
          onDelete={async () => {
            await supabase.from('lessons').delete().eq('id', selectedLesson.id)
            setAllLessons(prev => prev.filter(l => l.id !== selectedLesson.id))
            setSelectedLesson(null)
          }}
          onCycleStatus={async (lessonId, currentStatus) => {
            const next = currentStatus === 'not_started' ? 'in_progress'
                       : currentStatus === 'in_progress'  ? 'completed'
                       : 'not_started'
            await supabase.from('lessons').update({ status: next }).eq('id', lessonId)
            setAllLessons(prev => prev.map(l => l.id === lessonId ? { ...l, status: next as Lesson['status'] } : l))
            setSelectedLesson(s => s ? { ...s, status: next as LessonViewModalLesson['status'] } : null)
          }}
          onSetStatus={async (lessonId, newStatus) => {
            await supabase.from('lessons').update({ status: newStatus }).eq('id', lessonId)
            setAllLessons(prev => prev.map(l => l.id === lessonId ? { ...l, status: newStatus } : l))
            setSelectedLesson(s => s ? { ...s, status: newStatus } : null)
          }}
          onSave={(lessonId, updates) => {
            setAllLessons(prev => prev.map(l => l.id === lessonId ? { ...l, ...updates } : l))
            setSelectedLesson(s => s ? { ...s, ...updates } : null)
          }}
        />
      )}

      {/* Edit Frequency sheet */}
      {showEditFreq && (
        <>
          <div onClick={() => setShowEditFreq(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400,
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
            background: '#fff', borderRadius: '24px 24px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            fontFamily: "'Nunito', sans-serif",
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
            </div>
            <div style={{ padding: '16px 20px 40px' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b', marginBottom: 4 }}>
                Weekly Target
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>
                How many times per week do you aim to teach this subject?
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 24 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} className="freq-btn"
                    onClick={() => setEditFreqValue(editFreqValue === n ? null : n)}
                    style={{
                      width: 56, height: 56, borderRadius: 14,
                      border: editFreqValue === n ? '2px solid #7c3aed' : '1.5px solid #e5e7eb',
                      background: editFreqValue === n ? '#ede9fe' : '#f9fafb',
                      color: editFreqValue === n ? '#7c3aed' : '#374151',
                      fontWeight: 900, fontSize: 15, cursor: 'pointer',
                      fontFamily: "'Nunito', sans-serif",
                      display: 'flex', flexDirection: 'column' as const,
                      alignItems: 'center', justifyContent: 'center', gap: 1,
                    }}>
                    <span>{n}×</span>
                    <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>/wk</span>
                  </button>
                ))}
                <button className="freq-btn"
                  onClick={() => setEditFreqValue(null)}
                  style={{
                    padding: '0 16px', height: 56, borderRadius: 14,
                    border: editFreqValue === null ? '2px solid #7c3aed' : '1.5px solid #e5e7eb',
                    background: editFreqValue === null ? '#ede9fe' : '#f9fafb',
                    color: editFreqValue === null ? '#7c3aed' : '#374151',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    fontFamily: "'Nunito', sans-serif",
                  }}>Flexible</button>
              </div>
              <button
                onClick={handleEditFrequency}
                disabled={editFreqSaving}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                  background: '#7c3aed', color: '#fff',
                  fontSize: 16, fontWeight: 900, cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                }}>
                {editFreqSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Lesson choice sheet */}
      {showLessonChoiceSheet && (
        <>
          <div onClick={() => setShowLessonChoiceSheet(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400,
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
            background: '#fff', borderRadius: '24px 24px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            fontFamily: "'Nunito', sans-serif",
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
            </div>
            <div style={{ padding: '16px 20px 40px' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b', marginBottom: 4 }}>
                Add a {addLessonSubject} Lesson
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>
                How would you like to create this lesson?
              </div>
              {/* Write your own */}
              <button
                onClick={() => {
                  setQuickTitle('')
                  setQuickDate(new Date().toISOString().split('T')[0])
                  setQuickDuration(30)
                  setShowLessonChoiceSheet(false)
                  setShowQuickLesson(true)
                }}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: '1.5px solid #e5e7eb',
                  background: '#f9fafb', textAlign: 'left' as const, cursor: 'pointer',
                  marginBottom: 10, fontFamily: "'Nunito', sans-serif",
                }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b', marginBottom: 3 }}>✏️ Write your own</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Add a custom lesson with your own title and notes</div>
              </button>
              {/* Generate with Scout */}
              <button
                onClick={() => {
                  setShowLessonChoiceSheet(false)
                  setShowLessonGenerator(true)
                }}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: '1.5px solid #ede9fe',
                  background: '#faf5ff', textAlign: 'left' as const, cursor: 'pointer',
                  marginBottom: 10, fontFamily: "'Nunito', sans-serif",
                }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#7c3aed', marginBottom: 3 }}>✨ Generate with Scout</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Let Scout create a lesson plan for you</div>
              </button>
              {/* From curriculum */}
              <button
                onClick={() => {
                  setShowLessonChoiceSheet(false)
                  router.push('/lessons')
                }}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: '1.5px solid #e5e7eb',
                  background: '#f9fafb', textAlign: 'left' as const, cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b', marginBottom: 3 }}>📋 From curriculum</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Import from your curriculum or add a pre-planned lesson</div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Quick lesson form */}
      {showQuickLesson && (
        <>
          <div onClick={() => setShowQuickLesson(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400,
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
            background: '#fff', borderRadius: '24px 24px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            fontFamily: "'Nunito', sans-serif",
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
            </div>
            <div style={{ padding: '16px 20px 40px' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b', marginBottom: 20 }}>
                New {addLessonSubject} Lesson
              </div>
              {/* Title */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6, letterSpacing: 0.5 }}>LESSON TITLE</div>
                <input
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                  placeholder={`e.g. ${addLessonSubject} — Chapter 1`}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 12,
                    border: '1.5px solid #e5e7eb', fontSize: 15, fontWeight: 600,
                    fontFamily: "'Nunito', sans-serif", color: '#1e1b4b', outline: 'none',
                  }}
                />
              </div>
              {/* Date */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6, letterSpacing: 0.5 }}>DATE</div>
                <input
                  type="date"
                  value={quickDate}
                  onChange={e => setQuickDate(e.target.value)}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 12,
                    border: '1.5px solid #e5e7eb', fontSize: 15, fontWeight: 600,
                    fontFamily: "'Nunito', sans-serif", color: '#1e1b4b', outline: 'none',
                  }}
                />
              </div>
              {/* Duration */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6, letterSpacing: 0.5 }}>DURATION (MINUTES)</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[15, 30, 45, 60, 90].map(d => (
                    <button key={d} onClick={() => setQuickDuration(d)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 10,
                        border: quickDuration === d ? '2px solid #7c3aed' : '1.5px solid #e5e7eb',
                        background: quickDuration === d ? '#ede9fe' : '#f9fafb',
                        color: quickDuration === d ? '#7c3aed' : '#374151',
                        fontWeight: 800, fontSize: 13, cursor: 'pointer',
                        fontFamily: "'Nunito', sans-serif",
                      }}>{d}</button>
                  ))}
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!quickTitle.trim() || !orgId || !addLessonKidId) return
                  setQuickSaving(true)
                  const { data } = await supabase.from('lessons').insert({
                    organization_id: orgId,
                    kid_id: addLessonKidId,
                    subject: addLessonSubject,
                    title: quickTitle.trim(),
                    lesson_date: quickDate || null,
                    duration_minutes: quickDuration,
                    status: 'not_started',
                  }).select('id, title, subject, status, lesson_date, start_time, description, notes, kid_id, duration_minutes, lesson_source').single()
                  if (data) setAllLessons(prev => [...prev, data])
                  setQuickSaving(false)
                  setShowQuickLesson(false)
                }}
                disabled={!quickTitle.trim() || quickSaving}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                  background: quickTitle.trim() ? '#7c3aed' : '#e5e7eb',
                  color: quickTitle.trim() ? '#fff' : '#9ca3af',
                  fontSize: 16, fontWeight: 900, cursor: quickTitle.trim() ? 'pointer' : 'default',
                  fontFamily: "'Nunito', sans-serif",
                }}>
                {quickSaving ? 'Saving…' : 'Add Lesson'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* LessonGenerator modal */}
      {showLessonGenerator && (
        <LessonGenerator
          kids={kids}
          userId={userId}
          initialKidId={addLessonKidId}
          initialSubject={addLessonSubject}
          onClose={() => setShowLessonGenerator(false)}
        />
      )}

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubjectsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ede9fe 0%, #dbeafe 50%, #d1fae5 100%)' }} />}>
        <SubjectsContent />
      </Suspense>
    </AuthGuard>
  )
}
