'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()
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
  const [lessonRefreshKey, setLessonRefreshKey]           = useState(0)
  const [showQuickLesson, setShowQuickLesson]             = useState(false)
  const [quickTitle, setQuickTitle]                       = useState('')
  const [quickDescription, setQuickDescription]           = useState('')
  const [quickScheduled, setQuickScheduled]               = useState(false)
  const [quickDate, setQuickDate]                         = useState('')
  const [quickDuration, setQuickDuration]                 = useState(30)
  const [quickDurationCustom, setQuickDurationCustom]     = useState('')
  const [quickSaving, setQuickSaving]                     = useState(false)


  // Add material to existing subject sheet
  const [showSubjectMat, setShowSubjectMat]         = useState(false)
  const [subjectMatKidId, setSubjectMatKidId]       = useState('')
  const [subjectMatSubject, setSubjectMatSubject]   = useState('')
  const [subjectMatName, setSubjectMatName]         = useState('')
  const [subjectMatType, setSubjectMatType]         = useState<'textbook' | 'subscription' | 'physical' | 'digital'>('textbook')
  const [subjectMatUrl, setSubjectMatUrl]           = useState('')
  const [subjectMatSaving, setSubjectMatSaving]     = useState(false)

  const openSubjectMat = (kidId: string, subject: string) => {
    setSubjectMatKidId(kidId); setSubjectMatSubject(subject)
    setSubjectMatName(''); setSubjectMatType('textbook'); setSubjectMatUrl('')
    setShowSubjectMat(true)
  }

  const saveSubjectMat = async () => {
    if (!subjectMatName.trim() || !orgId) return
    setSubjectMatSaving(true)
    try {
      const { error } = await supabase.from('materials').insert({
        organization_id: orgId,
        material_type: subjectMatType,
        name: subjectMatName.trim(),
        subject: subjectMatSubject || null,
        url: subjectMatUrl.trim() || null,
        kid_ids: subjectMatKidId ? [subjectMatKidId] : null,
      })
      if (error) { console.error('Material save failed:', error); return }
      setShowSubjectMat(false)
    } finally { setSubjectMatSaving(false) }
  }

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
  // Optional material to create alongside the subject
  const [addMatName, setAddMatName]       = useState('')
  const [addMatType, setAddMatType]       = useState<'textbook' | 'subscription' | 'physical' | 'digital'>('textbook')
  const [addMatUrl, setAddMatUrl]         = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Subject autocomplete: org library first, then COMMON_SUBJECTS as fallback
  const subjectSuggestions = useMemo(() => {
    const existingNames = [...new Set(allSubjects.map(s => s.name))]
    const existingLower = new Set(existingNames.map(n => n.toLowerCase()))
    const additional = COMMON_SUBJECTS.filter(s => !existingLower.has(s.toLowerCase()))
    return [...existingNames, ...additional]
  }, [allSubjects])

  const filteredSubjectSuggestions = useMemo(() => {
    if (!addName.trim()) return subjectSuggestions.slice(0, 20)
    const q = addName.toLowerCase()
    return subjectSuggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 15)
  }, [addName, subjectSuggestions])

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
          .eq('organization_id', resolvedOrgId).neq('archived', true).order('created_at', { ascending: true }),
        supabase.from('lessons')
          .select('id, title, subject, status, lesson_date, start_time, description, notes, kid_id, duration_minutes, lesson_source')
          .eq('organization_id', resolvedOrgId).order('lesson_date', { ascending: true }),
        supabase.from('subjects').select('id, kid_id, name, weekly_frequency, color, emoji')
          .eq('organization_id', resolvedOrgId).order('created_at', { ascending: true }),
      ])

      const kidsList = kidsResult.data || []
      setKids(kidsList)
      const kidParam = searchParams?.get('kid')
      const defaultKid = kidParam && kidsList.find((k: Kid) => k.id === kidParam) ? kidParam : kidsList[0]?.id
      if (defaultKid) setActiveKidId(defaultKid)
      setAllLessons(lessonsResult.data || [])
      setAllSubjects(subjectsResult.data || [])
      setLoading(false)
    }
    load()
  }, [lessonRefreshKey])

  // Auto-open Scout generator when arriving from "Copy & Adapt" flow
  useEffect(() => {
    if (!activeKidId || loading) return
    const scoutParam = searchParams?.get('scout')
    if (scoutParam === 'adapt') {
      setTimeout(() => setShowLessonGenerator(true), 300)
      // Remove the param from the URL without re-navigating
      const url = new URL(window.location.href)
      url.searchParams.delete('scout')
      window.history.replaceState({}, '', url.toString())
    }
  }, [activeKidId, loading])

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
    setAddMatName('')
    setAddMatType('textbook')
    setAddMatUrl('')
    setShowAddSubject(true)
  }

  const handleNameChange = (name: string) => {
    // If it's a library subject, use exactly as-is. Custom input: collapse multiple spaces.
    const cleaned = COMMON_SUBJECTS.includes(name)
      ? name
      : name.replace(/\s{2,}/g, ' ')
    setAddName(cleaned)
    setAddEmoji(subjectEmoji(cleaned))
    setAddColor(subjectColor(cleaned))
  }

  const handleAddSubject = async () => {
    const finalName = addName.trim().replace(/\s{2,}/g, ' ')
    if (!finalName || !orgId || !addKidId) return
    setAddSaving(true)
    const { data, error } = await supabase.from('subjects').insert({
      organization_id: orgId,
      kid_id: addKidId,
      name: finalName,
      weekly_frequency: addFrequency,
      color: addColor,
      emoji: addEmoji,
    }).select('id, kid_id, name, weekly_frequency, color, emoji').single()
    if (!error && data) {
      setAllSubjects(prev => [...prev, data])
      // Optionally save a material alongside the new subject
      if (addMatName.trim()) {
        const { error: matErr } = await supabase.from('materials').insert({
          organization_id: orgId,
          material_type: addMatType,
          name: addMatName.trim(),
          subject: finalName,
          url: addMatUrl.trim() || null,
          kid_ids: [addKidId],
        })
        if (matErr) console.error('Material save failed:', matErr)
      }
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
                      background: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                      fontFamily: "'Nunito', sans-serif", fontWeight: isActive ? 800 : 600,
                      fontSize: 14, color: isActive ? color : 'rgba(255,255,255,0.65)',
                      cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: isActive ? color : color + '50',
                        border: `2px solid ${color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 900, color: '#fff',
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
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: 14,
                  }}>
                    {subjects.map(subj => (
                      <div
                        key={subj.subject}
                        className="subj-card"
                        onClick={() => setSelected({ kidId: kid.id, subjectName: subj.subject })}
                        style={{
                          background: 'rgba(255,255,255,0.82)',
                          backdropFilter: 'blur(18px)',
                          WebkitBackdropFilter: 'blur(18px)',
                          border: subj.lessons.length === 0
                            ? `1.5px dashed rgba(124,58,237,0.2)`
                            : `1.5px solid rgba(124,58,237,0.1)`,
                          borderRadius: 18, padding: '20px 16px',
                          cursor: 'pointer', textAlign: 'left' as const,
                          transition: 'transform 0.15s, box-shadow 0.15s',
                          boxShadow: '0 4px 24px rgba(124,58,237,0.07)',
                          fontFamily: "'Nunito', sans-serif",
                          position: 'relative' as const,
                        }}>
                        <div style={{ fontSize: 34, marginBottom: 10, lineHeight: 1 }}>{subj.emoji}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b', marginBottom: 8, lineHeight: 1.3 }}>
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
                              fontSize: 11, fontWeight: 900,
                              color: '#7c3aed', background: 'rgba(124,58,237,0.12)',
                              borderRadius: 8, padding: '4px 9px', marginBottom: 8,
                              border: '1px solid rgba(124,58,237,0.25)',
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
                        <div style={{ fontSize: 11, fontWeight: 700, color: subj.lessons.length === 0 ? '#9ca3af' : '#7c3aed', display: 'block', marginBottom: 10 }}>
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
                      background: 'rgba(124,58,237,0.12)', color: '#7c3aed',
                      fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 800,
                      cursor: 'pointer',
                    }}>
                    <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Add Lesson
                  </button>
                  <button
                    onClick={() => openSubjectMat(selected.kidId, selected.subjectName)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 13px', borderRadius: 18, border: '1.5px solid rgba(124,58,237,0.2)',
                      background: 'rgba(124,58,237,0.06)', color: '#7c3aed',
                      fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 800,
                      cursor: 'pointer',
                    }}>
                    📦 Material
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
                        background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
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
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 'calc(100% - 40px)', maxWidth: 460, zIndex: 301,
            background: '#2d2b3d', borderRadius: 24,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            maxHeight: '90vh', overflowY: 'auto',
            fontFamily: "'Nunito', sans-serif",
          }}>
            <div style={{ padding: '20px 20px 32px' }}>
              {/* Header with X */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#c4b5fd' }}>Add a Subject</div>
                <button onClick={() => setShowAddSubject(false)} style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                  width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8,
                }}>×</button>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginBottom: 20, lineHeight: 1.5 }}>
                Add subjects you plan to teach — even if you haven&rsquo;t scheduled lessons yet. Lessons will appear here once added.
              </div>

              {/* Subject autocomplete */}
              <div style={{ marginBottom: 20, position: 'relative' as const }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: 0.5 }}>SUBJECT NAME</div>
                <input
                  value={addName}
                  onChange={e => { handleNameChange(e.target.value); setShowSuggestions(true) }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Type or choose a subject…"
                  autoComplete="off"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12,
                    border: addName ? '1.5px solid #a78bfa' : '1.5px solid rgba(255,255,255,0.15)',
                    fontSize: 14, fontWeight: 600,
                    fontFamily: "'Nunito', sans-serif", color: '#1e1b4b', outline: 'none',
                    background: '#fff', boxSizing: 'border-box' as const,
                  }}
                />
                {showSuggestions && filteredSubjectSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute' as const, top: '100%', left: 0, right: 0, zIndex: 50,
                    background: '#fff', borderRadius: 12, border: '1.5px solid #e9d5ff',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxHeight: 200, overflowY: 'auto' as const,
                    marginTop: 4,
                  }}>
                    {filteredSubjectSuggestions.map((s, i) => (
                      <button key={s} onMouseDown={() => { handleNameChange(s); setShowSuggestions(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '10px 14px', border: 'none',
                          borderBottom: i < filteredSubjectSuggestions.length - 1 ? '1px solid #f3e8ff' : 'none',
                          background: 'transparent', cursor: 'pointer', textAlign: 'left' as const,
                          fontSize: 14, fontWeight: 700, color: '#1e1b4b',
                          fontFamily: "'Nunito', sans-serif",
                        }}>
                        {subjectEmoji(s)} {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Weekly frequency */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: 0.5 }}>
                  TARGET FREQUENCY
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} className="freq-btn"
                      onClick={() => setAddFrequency(addFrequency === n ? null : n)}
                      style={{
                        width: 48, height: 48, borderRadius: 12,
                        border: addFrequency === n ? '2px solid #a78bfa' : '1.5px solid rgba(255,255,255,0.15)',
                        background: addFrequency === n ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)',
                        color: addFrequency === n ? '#c4b5fd' : 'rgba(255,255,255,0.8)',
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
                      border: addFrequency === null ? '2px solid #a78bfa' : '1.5px solid rgba(255,255,255,0.15)',
                      background: addFrequency === null ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)',
                      color: addFrequency === null ? '#c4b5fd' : 'rgba(255,255,255,0.8)',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      fontFamily: "'Nunito', sans-serif",
                    }}>Flexible</button>
                </div>
              </div>

              {/* Color picker */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: 0.5 }}>COLOR</div>
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
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: 0.5 }}>PREVIEW</div>
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

              {/* Optional material */}
              <div style={{ marginBottom: 20, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: 0.5 }}>ADD A MATERIAL <span style={{ fontWeight: 600, opacity: 0.6 }}>(optional)</span></div>
                <input
                  value={addMatName}
                  onChange={e => setAddMatName(e.target.value)}
                  placeholder="e.g. Saxon Math 5/4, Khan Academy…"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12,
                    border: addMatName ? '1.5px solid #a78bfa' : '1.5px solid rgba(255,255,255,0.15)',
                    fontSize: 14, fontWeight: 600,
                    fontFamily: "'Nunito', sans-serif", color: '#1e1b4b', outline: 'none',
                    background: '#fff', boxSizing: 'border-box' as const, marginBottom: 8,
                  }}
                />
                {/* Type */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {(['textbook', 'subscription', 'physical', 'digital'] as const).map(t => {
                    const icons = { textbook: '📚', subscription: '🔑', physical: '🧰', digital: '💻' }
                    return (
                      <button key={t} onClick={() => setAddMatType(t)} style={{
                        flex: 1, padding: '6px 4px', borderRadius: 8,
                        border: addMatType === t ? '2px solid #a78bfa' : '1.5px solid rgba(255,255,255,0.15)',
                        background: addMatType === t ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.08)',
                        color: addMatType === t ? '#e9d5ff' : 'rgba(255,255,255,0.7)',
                        fontSize: 9, fontWeight: 800, cursor: 'pointer',
                        fontFamily: "'Nunito', sans-serif",
                      }}>{icons[t]}<br />{t}</button>
                    )
                  })}
                </div>
                {/* URL */}
                <input
                  value={addMatUrl}
                  onChange={e => setAddMatUrl(e.target.value)}
                  placeholder="https://… (optional)"
                  type="url"
                  inputMode="url"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12,
                    border: addMatUrl ? '1.5px solid #a78bfa' : '1.5px solid rgba(255,255,255,0.15)',
                    fontSize: 14, fontWeight: 600,
                    fontFamily: "'Nunito', sans-serif", color: '#1e1b4b', outline: 'none',
                    background: '#fff', boxSizing: 'border-box' as const,
                  }}
                />
              </div>

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

      {/* ── Add Material to existing subject sheet ── */}
      {showSubjectMat && (
        <>
          <div onClick={() => setShowSubjectMat(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 450 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 451,
            background: '#fff', borderRadius: '24px 24px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
            padding: '20px 20px 40px',
            paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
            maxHeight: '85vh', overflowY: 'auto' as const,
            fontFamily: "'Nunito', sans-serif",
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b' }}>📦 Add Material</div>
              <button onClick={() => setShowSubjectMat(false)} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>
              For <strong style={{ color: '#7c3aed' }}>{subjectMatSubject}</strong> · saved to My Materials and linked to this child
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 6 }}>RESOURCE NAME *</div>
              <input
                value={subjectMatName}
                onChange={e => setSubjectMatName(e.target.value)}
                placeholder="e.g. Saxon Math 5/4, Khan Academy…"
                autoFocus
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 14, fontWeight: 600, fontFamily: "'Nunito', sans-serif", color: '#1e1b4b', outline: 'none', boxSizing: 'border-box' as const }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 6 }}>TYPE</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['textbook', 'subscription', 'physical', 'digital'] as const).map(t => {
                  const icons = { textbook: '📚', subscription: '🔑', physical: '🧰', digital: '💻' }
                  return (
                    <button key={t} onClick={() => setSubjectMatType(t)} style={{
                      flex: 1, padding: '8px 4px', borderRadius: 10,
                      border: subjectMatType === t ? '2px solid #7c3aed' : '1.5px solid #e5e7eb',
                      background: subjectMatType === t ? '#f5f3ff' : '#f9fafb',
                      color: subjectMatType === t ? '#7c3aed' : '#6b7280',
                      fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                    }}>{icons[t]}<br />{t}</button>
                  )
                })}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 6 }}>URL <span style={{ fontWeight: 600 }}>(optional)</span></div>
              <input
                value={subjectMatUrl}
                onChange={e => setSubjectMatUrl(e.target.value)}
                placeholder="https://…"
                type="url" inputMode="url"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: subjectMatUrl.trim() ? '1.5px solid #7c3aed' : '1.5px solid #e5e7eb', fontSize: 14, fontWeight: 600, fontFamily: "'Nunito', sans-serif", color: '#1e1b4b', outline: 'none', boxSizing: 'border-box' as const }}
              />
            </div>
            <button
              onClick={saveSubjectMat}
              disabled={!subjectMatName.trim() || subjectMatSaving}
              style={{
                width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                background: subjectMatName.trim() ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#e5e7eb',
                color: subjectMatName.trim() ? '#fff' : '#9ca3af',
                fontSize: 15, fontWeight: 900, cursor: subjectMatName.trim() ? 'pointer' : 'not-allowed',
                fontFamily: "'Nunito', sans-serif",
              }}
            >{subjectMatSaving ? 'Saving…' : 'Save Material'}</button>
          </div>
        </>
      )}

      {/* Lesson view modal */}
      {selectedLesson && (
        <LessonViewModal
          lesson={selectedLesson}
          kidName={kids.find(k => k.id === selectedLesson.kid_id)?.displayname}
          kidGrade={kids.find(k => k.id === selectedLesson.kid_id)?.grade}
          organizationId={orgId ?? undefined}
          allKids={kids.map(k => ({ id: k.id, displayname: k.displayname }))}
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
            background: '#2d2b3d', borderRadius: '24px 24px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
            fontFamily: "'Nunito', sans-serif",
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            <div style={{ padding: '16px 20px 40px' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 }}>
                Add a {addLessonSubject} Lesson
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 20 }}>
                How would you like to create this lesson?
              </div>
              {/* Write your own */}
              <button
                onClick={() => {
                  setQuickTitle('')
                  setQuickDescription('')
                  setQuickScheduled(false)
                  setQuickDate(new Date().toISOString().split('T')[0])
                  setQuickDuration(30)
                  setQuickDurationCustom('')
                  setShowLessonChoiceSheet(false)
                  setShowQuickLesson(true)
                }}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.07)', textAlign: 'left' as const, cursor: 'pointer',
                  marginBottom: 10, fontFamily: "'Nunito', sans-serif",
                }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 3 }}>✏️ Write your own</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Add a custom lesson with your own title and notes</div>
              </button>
              {/* Generate with Scout */}
              <button
                onClick={() => {
                  setShowLessonChoiceSheet(false)
                  setShowLessonGenerator(true)
                }}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: '1.5px solid rgba(124,58,237,0.4)',
                  background: 'rgba(124,58,237,0.15)', textAlign: 'left' as const, cursor: 'pointer',
                  marginBottom: 10, fontFamily: "'Nunito', sans-serif",
                }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#c4b5fd', marginBottom: 3 }}>✨ Generate with Scout</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Let Scout create a lesson plan for you</div>
              </button>
              {/* From curriculum */}
              <button
                onClick={() => {
                  setShowLessonChoiceSheet(false)
                  router.push('/lessons')
                }}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.07)', textAlign: 'left' as const, cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 3 }}>📋 From curriculum</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Import from your curriculum or add a pre-planned lesson</div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Quick lesson form */}
      {showQuickLesson && (
        <div
          onClick={() => setShowQuickLesson(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
              maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.22)', fontFamily: "'Nunito', sans-serif",
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
              padding: '14px 20px', borderRadius: '20px 20px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>New Lesson</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                  {addLessonSubject}
                </div>
              </div>
              <button
                onClick={() => setShowQuickLesson(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                  color: '#fff', width: 28, height: 28, cursor: 'pointer', fontSize: 16,
                  fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
            </div>

            {/* Scrollable form body */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 5 }}>LESSON TITLE *</label>
                <input
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                  placeholder={`e.g. ${addLessonSubject} — Chapter 1`}
                  autoFocus
                  style={{
                    width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: 10,
                    fontSize: 14, fontWeight: 600, color: '#1a1a2e', outline: 'none',
                    fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 5 }}>
                  DESCRIPTION <span style={{ fontWeight: 600, color: '#9ca3af' }}>(optional)</span>
                </label>
                <textarea
                  value={quickDescription}
                  onChange={e => setQuickDescription(e.target.value)}
                  placeholder="What will you cover in this lesson?"
                  rows={2}
                  style={{
                    width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: 10,
                    fontSize: 14, fontWeight: 600, color: '#1a1a2e', outline: 'none', resize: 'none',
                    fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              {/* Duration */}
              <div style={{ background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: '12px 14px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 8 }}>DURATION</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {[15, 30, 45, 60].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setQuickDuration(d); setQuickDurationCustom('') }}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
                        fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        background: quickDuration === d && !quickDurationCustom ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#fff',
                        color: quickDuration === d && !quickDurationCustom ? '#fff' : '#374151',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                    >{d} min</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    placeholder="Other"
                    value={quickDurationCustom}
                    onChange={e => {
                      setQuickDurationCustom(e.target.value)
                      const n = parseInt(e.target.value)
                      if (n > 0) setQuickDuration(n)
                    }}
                    style={{
                      width: 80, padding: '7px 10px', border: '1.5px solid #d1d5db', borderRadius: 8,
                      fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif",
                      boxSizing: 'border-box' as const,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>minutes</span>
                </div>
              </div>

              {/* Schedule */}
              <div style={{ background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="ql-schedule"
                    checked={quickScheduled}
                    onChange={e => {
                      setQuickScheduled(e.target.checked)
                      if (e.target.checked && !quickDate) setQuickDate(new Date().toISOString().split('T')[0])
                    }}
                    style={{ accentColor: '#7c3aed', width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="ql-schedule" style={{ fontSize: 13, fontWeight: 700, color: '#4c1d95', cursor: 'pointer' }}>
                    Schedule for a specific date
                  </label>
                </div>
                {quickScheduled && (
                  <input
                    type="date"
                    value={quickDate}
                    onChange={e => setQuickDate(e.target.value)}
                    style={{
                      marginTop: 8, width: '100%', padding: '7px 10px',
                      border: '1.5px solid #d1d5db', borderRadius: 8,
                      fontSize: 14, fontWeight: 600, color: '#1a1a2e',
                      fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' as const,
                    }}
                  />
                )}
              </div>

              {/* Save button */}
              <button
                onClick={async () => {
                  if (!quickTitle.trim() || !orgId || !addLessonKidId) return
                  setQuickSaving(true)
                  const { data } = await supabase.from('lessons').insert({
                    organization_id: orgId,
                    kid_id: addLessonKidId,
                    subject: addLessonSubject,
                    title: quickTitle.trim(),
                    description: quickDescription.trim() || null,
                    lesson_date: quickScheduled ? (quickDate || null) : null,
                    duration_minutes: quickDuration,
                    status: 'not_started',
                  }).select('id, title, subject, status, lesson_date, start_time, description, notes, kid_id, duration_minutes, lesson_source').single()
                  if (data) setAllLessons(prev => [...prev, data])
                  setQuickSaving(false)
                  setShowQuickLesson(false)
                }}
                disabled={!quickTitle.trim() || quickSaving}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                  background: quickTitle.trim() ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#e5e7eb',
                  color: quickTitle.trim() ? '#fff' : '#9ca3af',
                  fontSize: 15, fontWeight: 800, cursor: quickTitle.trim() ? 'pointer' : 'default',
                  fontFamily: "'Nunito', sans-serif", flexShrink: 0,
                }}>
                {quickSaving ? 'Adding Lesson…' : 'Add Lesson'}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* LessonGenerator modal */}
      {showLessonGenerator && (
        <LessonGenerator
          kids={kids}
          userId={userId}
          initialKidId={addLessonKidId}
          initialSubject={addLessonSubject}
          onClose={() => setShowLessonGenerator(false)}
          onLessonSaved={() => setLessonRefreshKey(k => k + 1)}
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
