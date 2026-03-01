'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase'
import AuthGuard from '@/components/AuthGuard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string
  title: string
  description: string | null
  subject: string | null
  lesson_date: string | null
  duration_minutes: number | null
  status: string | null
  assigned_to_user_id: string | null
  kid_id: string
  notes: string | null
  kid?: { displayname: string }
}

interface Kid {
  id: string
  displayname: string
}

type TabType = 'mine' | 'family' | 'kids'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isToday(dateStr: string) {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()))
  return d > today && d <= endOfWeek
}

function isPast(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString())
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Mathematics:   { bg: '#ede9fe', text: '#6d28d9', dot: '#7c3aed' },
  Science:       { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  English:       { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  History:       { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  Art:           { bg: '#fce7f3', text: '#9d174d', dot: '#ec4899' },
  Music:         { bg: '#e0f2fe', text: '#075985', dot: '#0ea5e9' },
  'Physical Education': { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  default:       { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' },
}

function subjectColor(subject: string | null) {
  return SUBJECT_COLORS[subject || ''] || SUBJECT_COLORS.default
}

// ─── Group lessons ────────────────────────────────────────────────────────────

interface LessonGroup {
  label: string
  emoji: string
  lessons: Lesson[]
  defaultCollapsed: boolean
}

function groupLessons(lessons: Lesson[]): LessonGroup[] {
  const today: Lesson[] = []
  const thisWeek: Lesson[] = []
  const upcoming: Lesson[] = []
  const completed: Lesson[] = []
  const unscheduled: Lesson[] = []

  for (const l of lessons) {
    if (l.status === 'completed') { completed.push(l); continue }
    if (!l.lesson_date) { unscheduled.push(l); continue }
    if (isToday(l.lesson_date)) { today.push(l); continue }
    if (isThisWeek(l.lesson_date)) { thisWeek.push(l); continue }
    upcoming.push(l)
  }

  const groups: LessonGroup[] = []
  if (today.length)       groups.push({ label: 'Today',       emoji: '📋', lessons: today,       defaultCollapsed: false })
  if (thisWeek.length)    groups.push({ label: 'This Week',   emoji: '📅', lessons: thisWeek,    defaultCollapsed: false })
  if (upcoming.length)    groups.push({ label: 'Upcoming',    emoji: '🗓️', lessons: upcoming,    defaultCollapsed: true })
  if (unscheduled.length) groups.push({ label: 'Unscheduled', emoji: '⏳', lessons: unscheduled, defaultCollapsed: true })
  if (completed.length)   groups.push({ label: 'Completed',   emoji: '✅', lessons: completed,   defaultCollapsed: true })
  return groups
}

// ─── Lesson Card ──────────────────────────────────────────────────────────────

function LessonCard({
  lesson, isAssignedToMe, onComplete, onUndoComplete, onAddNote,
}: {
  lesson: Lesson
  isAssignedToMe: boolean
  onComplete: (id: string) => void
  onUndoComplete: (id: string) => void
  onAddNote: (lesson: Lesson) => void
}) {
  const colors = subjectColor(lesson.subject)
  const completed = lesson.status === 'completed'
  const today = lesson.lesson_date ? isToday(lesson.lesson_date) : false
  const past = lesson.lesson_date ? isPast(lesson.lesson_date) : false

  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: `1.5px solid ${today && !completed ? '#6ee7b7' : completed ? '#e5e7eb' : '#f3f4f6'}`,
      opacity: completed ? 0.65 : 1, transition: 'all 0.2s',
      boxShadow: today && !completed ? '0 4px 16px rgba(16,185,129,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.dot, flexShrink: 0, marginTop: 5 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: completed ? '#9ca3af' : '#111827', textDecoration: completed ? 'line-through' : 'none' }}>
              {lesson.title}
            </span>
            {completed && <span style={{ fontSize: 10, fontWeight: 800, background: '#f3f4f6', color: '#9ca3af', padding: '2px 8px', borderRadius: 20 }}>✓ DONE</span>}
            {isAssignedToMe && !completed && <span style={{ fontSize: 10, fontWeight: 800, background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 20 }}>ASSIGNED TO YOU</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            {lesson.subject && <span style={{ fontSize: 11, fontWeight: 600, background: colors.bg, color: colors.text, padding: '2px 8px', borderRadius: 20 }}>{lesson.subject}</span>}
            {lesson.kid?.displayname && <span style={{ fontSize: 12, color: '#6b7280' }}>👧 {lesson.kid.displayname}</span>}
            {lesson.lesson_date && <span style={{ fontSize: 12, color: past && !completed ? '#ef4444' : '#6b7280' }}>📅 {formatDate(lesson.lesson_date)}</span>}
            {lesson.duration_minutes && <span style={{ fontSize: 12, color: '#6b7280' }}>⏱ {lesson.duration_minutes}m</span>}
          </div>
          {lesson.description && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, lineHeight: 1.5 }}>{lesson.description}</p>}
          {lesson.notes && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
              <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>📝 {lesson.notes}</p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
           <button 
              onClick={() => onAddNote(lesson)} 
              title="Add a teaching note"
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#374151', cursor: 'pointer', fontWeight: 600 }}
            >
              📝
            </button>
            {completed && (
            <button
              onClick={() => {
                if (confirm(`Mark "${lesson.title}" as not started?`)) onUndoComplete(lesson.id)
              }}
              title="Undo completion"
              style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#92400e', cursor: 'pointer', fontWeight: 600 }}
            >
              ↩ Undo
            </button>
          )}

          {isAssignedToMe && !completed && (
            <button 
            onClick={() => {
              if (confirm(`Mark "${lesson.title}" as complete?`)) onComplete(lesson.id)
            }}
            title="Mark lesson complete"
            style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 700 }}
          >
            ✓ Done
          </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Group Section ────────────────────────────────────────────────────────────

function LessonGroupSection({ group, userId, onComplete, onUndoComplete, onAddNote }: {
  group: LessonGroup
  userId: string
  onComplete: (id: string) => void
  onUndoComplete: (id: string) => void 
  onAddNote: (lesson: Lesson) => void
}) {
  const [collapsed, setCollapsed] = useState(group.defaultCollapsed)

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', marginBottom: collapsed ? 0 : 10, width: '100%', textAlign: 'left' }}
      >
        <span style={{ fontSize: 16 }}>{group.emoji}</span>
        <span style={{ fontWeight: 800, fontSize: 13, color: '#374151', letterSpacing: 0.5, textTransform: 'uppercase' }}>{group.label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 20 }}>{group.lessons.length}</span>
        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>{collapsed ? '▼' : '▲'}</span>
      </button>
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {group.lessons.map(lesson => (
            <LessonCard key={lesson.id} lesson={lesson} isAssignedToMe={lesson.assigned_to_user_id === userId} onComplete={onComplete} onUndoComplete={onUndoComplete} onAddNote={onAddNote} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Note Modal ───────────────────────────────────────────────────────────────

function NoteModal({ lesson, onSave, onClose }: { lesson: Lesson; onSave: (id: string, note: string) => void; onClose: () => void }) {
  const [note, setNote] = useState(lesson.notes || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(lesson.id, note)
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480 }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginBottom: 4 }}>Add Note</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>{lesson.title}</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a teaching note, observation, or reminder..."
          rows={4}
          style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: '#111827', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function TeachingScheduleContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [myLessons, setMyLessons] = useState<Lesson[]>([])
  const [familyLessons, setFamilyLessons] = useState<Lesson[]>([])
  const [kids, setKids] = useState<Kid[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('mine')
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [noteLesson, setNoteLesson] = useState<Lesson | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    let orgId: string | null = null
    const { data: collab } = await supabase.from('family_collaborators').select('organization_id').eq('user_id', user.id).maybeSingle()
    if (collab) {
      orgId = collab.organization_id
    } else {
      const { data: membership } = await supabase.from('user_organizations').select('organization_id').eq('user_id', user.id).maybeSingle()
      orgId = membership?.organization_id || null
    }

    if (!orgId) { setLoading(false); return }

    const { data: kidsData } = await supabase.from('kids').select('id, displayname').eq('organization_id', orgId).order('displayname')
    setKids(kidsData || [])

    const kidIds = (kidsData || []).map((k: Kid) => k.id)
    if (kidIds.length === 0) { setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, title, description, subject, lesson_date, duration_minutes, status, assigned_to_user_id, kid_id, notes')
      .in('kid_id', kidIds)
      .gte('lesson_date', today)
      .order('lesson_date', { ascending: true })
      .limit(200)

    const lessons: Lesson[] = (lessonsData || []).map((l: any) => ({
      ...l,
      kid: kidsData?.find((k: Kid) => k.id === l.kid_id),
    }))

    setMyLessons(lessons.filter(l => l.assigned_to_user_id === user.id))
    setFamilyLessons(lessons)
    setLoading(false)
  }

  async function handleComplete(lessonId: string) {
    await supabase.from('lessons').update({ status: 'completed' }).eq('id', lessonId)
    loadData()
  }

  async function handleUndoComplete(lessonId: string) {
    await supabase.from('lessons').update({ status: 'not_started', completed_at: null }).eq('id', lessonId)
    loadData()
  }

  async function handleSaveNote(lessonId: string, note: string) {
    await supabase.from('lessons').update({ notes: note }).eq('id', lessonId)
    loadData()
  }

  const displayLessons = activeTab === 'mine'
    ? myLessons
    : activeTab === 'kids' && selectedKid
    ? familyLessons.filter(l => l.kid_id === selectedKid)
    : familyLessons

  const groups = groupLessons(displayLessons)
  const todayCount = myLessons.filter(l => l.lesson_date && isToday(l.lesson_date)).length

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
      <div style={{ color: '#10b981', fontWeight: 700 }}>Loading your schedule...</div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', background: '#f0fdf4', minHeight: '100vh' }}>
      <header style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← Dashboard</button>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 17 }}>👩‍🏫 Teaching Schedule</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </header>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '24px 24px 48px' }}>
        {todayCount > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, color: '#fff', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 32 }}>📋</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>You have {todayCount} lesson{todayCount !== 1 ? 's' : ''} today</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                {myLessons.filter(l => l.lesson_date && isToday(l.lesson_date)).map(l => l.title).join(' · ')}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#fff', borderRadius: 12, padding: 6, border: '1.5px solid #e5e7eb' }}>
          {[
            { id: 'mine', label: `My Lessons (${myLessons.length})` },
            { id: 'family', label: `Family Overview (${familyLessons.length})` },
            { id: 'kids', label: 'By Student' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: activeTab === tab.id ? 'linear-gradient(135deg, #10b981, #34d399)' : 'transparent', color: activeTab === tab.id ? '#fff' : '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Kid filter */}
        {activeTab === 'kids' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setSelectedKid(null)} style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid', borderColor: !selectedKid ? '#10b981' : '#e5e7eb', background: !selectedKid ? '#d1fae5' : '#fff', color: !selectedKid ? '#065f46' : '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>All Students</button>
            {kids.map(kid => (
              <button key={kid.id} onClick={() => setSelectedKid(kid.id)} style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid', borderColor: selectedKid === kid.id ? '#10b981' : '#e5e7eb', background: selectedKid === kid.id ? '#d1fae5' : '#fff', color: selectedKid === kid.id ? '#065f46' : '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {kid.displayname}
              </button>
            ))}
          </div>
        )}

        {/* Grouped lessons */}
        {groups.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e5e7eb', padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 500 }}>
              {activeTab === 'mine' ? 'No lessons assigned to you yet.' : 'No upcoming lessons found.'}
            </p>
          </div>
        ) : (
          groups.map(group => (
            <LessonGroupSection key={group.label} group={group} userId={user?.id} onComplete={handleComplete} onUndoComplete={handleUndoComplete} onAddNote={setNoteLesson} />
          ))
        )}
      </main>

      {noteLesson && <NoteModal lesson={noteLesson} onSave={handleSaveNote} onClose={() => setNoteLesson(null)} />}
    </div>
  )
}

export default function TeachingSchedulePage() {
  return (
    <AuthGuard>
      <TeachingScheduleContent />
    </AuthGuard>
  )
}