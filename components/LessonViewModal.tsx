'use client'

import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '@/src/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LessonViewModalLesson {
  id: string
  kid_id: string
  title: string
  subject: string
  description?: string
  lesson_source?: string | null
  lesson_date: string | null
  duration_minutes: number | null
  status: 'not_started' | 'in_progress' | 'completed'
  assigned_to_user_id?: string | null
}

type ProficiencyLevel = 'needs_support' | 'progressing' | 'got_it'

interface CheckIn {
  proficiency: ProficiencyLevel | null
  notes: string
}


interface LessonViewModalProps {
  lesson: LessonViewModalLesson
  kidName?: string
  kidGrade?: string | number | null
  assessmentScore?: number | null
  assignedToName?: string | null
  organizationId?: string
  /** The org's home state, e.g. "NC" — used to pull compliance standards */
  stateCode?: string | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onCycleStatus: (lessonId: string, currentStatus: string) => void
  onSetStatus?: (lessonId: string, status: 'not_started' | 'in_progress' | 'completed') => void
  onGenerateAssessment?: (lesson: LessonViewModalLesson) => void
  onSave?: (lessonId: string, updates: Partial<LessonViewModalLesson>) => void
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', emoji: '⬜', bg: '#f3f4f6', color: '#6b7280', next: 'Mark In Progress' },
  in_progress:  { label: 'In Progress',  emoji: '🔵', bg: '#eff6ff', color: '#2563eb', next: 'Mark Complete'   },
  completed:    { label: 'Completed',    emoji: '✅', bg: '#f0fdf4', color: '#16a34a', next: 'Reset to Not Started' },
}

// Red / Yellow / Green — simple, parent-friendly
const PROFICIENCY_LEVELS: {
  value: ProficiencyLevel
  label: string
  sublabel: string
  emoji: string
  bg: string
  activeBg: string
  border: string
  activeBorder: string
  color: string
}[] = [
  {
    value: 'needs_support',
    label: 'Needs Support',
    sublabel: 'Struggling with the concept',
    emoji: '🔴',
    bg: '#fff',
    activeBg: '#fef2f2',
    border: '#e5e7eb',
    activeBorder: '#f87171',
    color: '#dc2626',
  },
  {
    value: 'progressing',
    label: 'Progressing',
    sublabel: 'Getting there, needs practice',
    emoji: '🟡',
    bg: '#fff',
    activeBg: '#fefce8',
    border: '#e5e7eb',
    activeBorder: '#fbbf24',
    color: '#d97706',
  },
  {
    value: 'got_it',
    label: 'Got It!',
    sublabel: 'Understands and can apply it',
    emoji: '🟢',
    bg: '#fff',
    activeBg: '#f0fdf4',
    border: '#e5e7eb',
    activeBorder: '#4ade80',
    color: '#16a34a',
  },
]

const SUBJECT_COLORS: Record<string, { bg: string; color: string }> = {
  'Math':               { bg: '#eff6ff', color: '#2563eb' },
  'Reading':            { bg: '#fdf4ff', color: '#9333ea' },
  'Writing':            { bg: '#fef9c3', color: '#a16207' },
  'Science':            { bg: '#f0fdf4', color: '#16a34a' },
  'History':            { bg: '#fff7ed', color: '#ea580c' },
  'Social Studies':     { bg: '#fff7ed', color: '#ea580c' },
  'Language Arts':      { bg: '#fdf4ff', color: '#9333ea' },
  'Art':                { bg: '#fce7f3', color: '#be185d' },
  'Music':              { bg: '#fce7f3', color: '#be185d' },
  'Physical Education': { bg: '#ecfdf5', color: '#059669' },
  'Foreign Language':   { bg: '#eff6ff', color: '#0284c7' },
  'Bible':              { bg: '#fefce8', color: '#b45309' },
  'Health':             { bg: '#ecfdf5', color: '#059669' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes: number | null): string {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes} min`
  if (minutes >= 1800 && minutes % 1800 === 0) return `${minutes / 1800} week${minutes / 1800 !== 1 ? 's' : ''}`
  if (minutes >= 360 && minutes % 360 === 0) return `${minutes / 360} day${minutes / 360 !== 1 ? 's' : ''}`
  if (minutes >= 360) return `${Math.round(minutes / 360)} days`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unscheduled'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ─── Scout Lesson Plan type (AI-generated, stored as JSON in description) ─────

interface ScoutLessonPlan {
  title?: string
  approach?: string
  overview?: string
  description?: string
  materials?: string[]
  activities?: Array<{ name: string; duration: string; description: string }>
  assessment?: string
  assessmentIdeas?: string[]
  extensions?: string[]
  learningObjectives?: string[]
}

function parseScoutPlan(lesson: { description?: string; lesson_source?: string | null }): ScoutLessonPlan | null {
  // Primary: trust the explicit source column
  if (lesson.lesson_source === 'scout') {
    if (!lesson.description) return {} as ScoutLessonPlan
    try { return JSON.parse(lesson.description) as ScoutLessonPlan } catch (_e) { return {} as ScoutLessonPlan }
  }
  // Fallback: presence of a `materials` key in the JSON description is the
  // definitive signal that this is a Scout-generated lesson
  if (!lesson.description) return null
  const trimmed = lesson.description.trim()

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'materials' in parsed) {
        return parsed as ScoutLessonPlan
      }
    } catch (_e) { /* not valid JSON */ }
  }

  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LessonViewModal({
  lesson,
  kidName,
  kidGrade,
  assessmentScore,
  assignedToName,
  organizationId,
  stateCode,
  onClose,
  onEdit,
  onDelete,
  onCycleStatus,
  onSetStatus,
  onGenerateAssessment,
  onSave,
}: LessonViewModalProps) {
  const status = STATUS_CONFIG[lesson.status] ?? STATUS_CONFIG.not_started
  const subjectColors = SUBJECT_COLORS[lesson.subject] || { bg: '#f3f4f6', color: '#374151' }

  // Detect Scout (AI-generated) lesson plan stored as JSON in description
  const lessonPlan = parseScoutPlan(lesson)
  // isScoutLesson also catches legacy plain-text Scout format (contains "Materials:")
  const isScoutLesson = lessonPlan !== null
    || lesson.lesson_source === 'scout'
    || /materials:/i.test(lesson.description ?? '')

  // Check-in
  const [checkIn, setCheckIn] = useState<CheckIn>({ proficiency: null, notes: '' })
  const [checkInSaved, setCheckInSaved] = useState(false)
  const [checkInSaving, setCheckInSaving] = useState(false)
  const [existingCheckInId, setExistingCheckInId] = useState<string | null>(null)

  // Portfolio uploads
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [existingUploads, setExistingUploads] = useState<Array<{ id: string; file_name: string; file_url: string; file_path: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null)

  // Tabs
  const [activeTab, setActiveTab] = useState<'details' | 'checkin'>('details')

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editTitle, setEditTitle] = useState(lesson.title)
  const [editDate, setEditDate] = useState(lesson.lesson_date ?? '')
  const [editDuration, setEditDuration] = useState(String(lesson.duration_minutes ?? ''))
  const [editDescription, setEditDescription] = useState(lesson.description ?? '')

  useEffect(() => {
    loadCheckIn()
    loadExistingUploads()
  }, [lesson.id])

  const loadExistingUploads = async () => {
    const { data } = await supabase
      .from('portfolio_uploads')
      .select('id, file_name, file_url, file_path')
      .eq('lesson_id', lesson.id)
      .order('created_at', { ascending: true })
    if (!data || data.length === 0) { setExistingUploads([]); return }
    // Private bucket — generate signed URLs (1-hour expiry) for display
    const withSignedUrls = await Promise.all(data.map(async (u: { id: string; file_name: string; file_url: string; file_path: string }) => {
      const { data: signed } = await supabase.storage
        .from('portfolio-uploads')
        .createSignedUrl(u.file_path, 3600)
      return { ...u, file_url: signed?.signedUrl ?? u.file_url }
    }))
    setExistingUploads(withSignedUrls)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const oversized = files.filter(f => f.size > 10 * 1024 * 1024)
    if (oversized.length > 0) {
      setUploadError('Each file must be under 10 MB.')
      return
    }
    setUploadError(null)
    setPendingFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const removePending = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    if (!pendingFiles.length || !organizationId) return
    setUploading(true)
    setUploadError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const uploaded: typeof existingUploads = []
      for (const file of pendingFiles) {
        const ts = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${organizationId}/${lesson.kid_id}/lessons/${lesson.id}/${ts}_${safeName}`
        const { error: storageErr } = await supabase.storage
          .from('portfolio-uploads')
          .upload(path, file, { upsert: false })
        if (storageErr) throw storageErr
        const { data: signed } = await supabase.storage
          .from('portfolio-uploads')
          .createSignedUrl(path, 3600)
        const { data: row, error: dbErr } = await supabase
          .from('portfolio_uploads')
          .insert({
            organization_id: organizationId,
            kid_id: lesson.kid_id,
            lesson_id: lesson.id,
            attendance_date: lesson.lesson_date ?? new Date().toISOString().slice(0, 10),
            file_name: file.name,
            file_url: path,
            file_path: path,
            file_type: file.type || null,
            file_size: file.size,
            uploaded_by: user.id,
          })
          .select('id, file_name, file_url, file_path')
          .single()
        if (dbErr) throw dbErr
        if (row) uploaded.push({ ...row, file_url: signed?.signedUrl ?? path })
      }
      setExistingUploads(prev => [...prev, ...uploaded])
      setPendingFiles([])
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const deleteExistingUpload = async (upload: { id: string; file_path: string }) => {
    setDeletingUploadId(upload.id)
    await supabase.storage.from('portfolio-uploads').remove([upload.file_path])
    await supabase.from('portfolio_uploads').delete().eq('id', upload.id)
    setExistingUploads(prev => prev.filter(u => u.id !== upload.id))
    setDeletingUploadId(null)
  }

  const loadCheckIn = async () => {
    const { data } = await supabase
      .from('lesson_checkins')
      .select('*')
      .eq('lesson_id', lesson.id)
      .maybeSingle()
    if (data) {
      setExistingCheckInId(data.id)
      setCheckIn({ proficiency: data.proficiency, notes: data.notes || '' })
      setCheckInSaved(true)
    }
  }

  const saveCheckIn = async () => {
    if (!checkIn.proficiency) return
    setCheckInSaving(true)
    try {
      const payload = {
        lesson_id: lesson.id,
        kid_id: lesson.kid_id,
        organization_id: organizationId,
        proficiency: checkIn.proficiency,
        notes: checkIn.notes.trim() || null,
        checked_in_at: new Date().toISOString(),
      }
      if (existingCheckInId) {
        await supabase.from('lesson_checkins').update(payload).eq('id', existingCheckInId)
      } else {
        const { data } = await supabase
          .from('lesson_checkins').insert([payload]).select().single()
        if (data) setExistingCheckInId(data.id)
      }
      setCheckInSaved(true)
    } catch (e) {
      console.error('Error saving check-in:', e)
    } finally {
      setCheckInSaving(false)
    }
  }

  const handleEditSave = async () => {
    setEditSaving(true)
    const updates: Partial<LessonViewModalLesson> = {
      title:            editTitle.trim() || lesson.title,
      lesson_date:      editDate || null,
      duration_minutes: editDuration ? parseInt(editDuration) : null,
      description:      editDescription.trim() || undefined,
    }
    await supabase.from('lessons').update({
      title:            updates.title,
      lesson_date:      updates.lesson_date,
      duration_minutes: updates.duration_minutes,
      description:      updates.description,
    }).eq('id', lesson.id)
    onSave?.(lesson.id, updates)
    setEditSaving(false)
    setEditing(false)
  }

  const handleDelete = () => {
    const msg = lesson.duration_minutes
      ? `This lesson has ${lesson.duration_minutes} min tracked.\n\nDeleting will remove these hours. Continue?`
      : 'Delete this lesson?'
    if (confirm(msg)) { onDelete(); onClose() }
  }

  const handlePrint = () => {
    const plan = lessonPlan
    const dateStr = lesson.lesson_date
      ? new Date(lesson.lesson_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'Unscheduled'

    const materialsHtml = plan?.materials?.length
      ? `<div class="section"><div class="label">Materials</div><div class="chips">${plan.materials.map(m => `<span class="chip">${m}</span>`).join('')}</div></div>`
      : ''

    const objectivesHtml = plan?.learningObjectives?.length
      ? `<div class="section"><div class="label">Learning Objectives</div><ul>${plan.learningObjectives.map(o => `<li>${o}</li>`).join('')}</ul></div>`
      : ''

    const activitiesHtml = plan?.activities?.length
      ? `<div class="section"><div class="label">Activities</div>${plan.activities.map(a => `<div class="act-card"><strong>${a.name}</strong>${a.duration ? ` <span class="duration">⏱ ${a.duration}</span>` : ''}<p>${a.description}</p></div>`).join('')}</div>`
      : ''

    const assessmentHtml = (plan?.assessment || plan?.assessmentIdeas?.length)
      ? `<div class="section"><div class="label">Assessment Ideas</div>${plan?.assessment ? `<p>${plan.assessment}</p>` : `<ul>${plan?.assessmentIdeas!.map(a => `<li>${a}</li>`).join('')}</ul>`}</div>`
      : ''

    const extensionsHtml = plan?.extensions?.length
      ? `<div class="section"><div class="label">Extensions</div><ul>${plan.extensions.map(e => `<li>${e}</li>`).join('')}</ul></div>`
      : ''

    const overviewHtml = (plan?.overview || plan?.approach || plan?.description)
      ? `<div class="section"><div class="label">Overview</div><p>${plan?.overview || plan?.approach || plan?.description}</p></div>`
      : lesson.description && !plan
        ? `<div class="section"><div class="label">Description</div><p>${lesson.description}</p></div>`
        : ''

    const html = `<!DOCTYPE html><html><head><title>Lesson Plan — ${lesson.title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; color: #1f2937; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 22px; font-weight: 900; color: #2d1b69; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #6b7280; margin-bottom: 20px; display: flex; gap: 16px; flex-wrap: wrap; }
  .meta span { display: flex; align-items: center; gap: 4px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; background: #eff6ff; color: #2563eb; margin-right: 6px; }
  .section { margin-bottom: 18px; }
  .label { font-size: 11px; font-weight: 800; color: #7c3aed; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 6px; }
  p { margin: 0 0 8px; }
  ul, ol { margin: 0 0 8px; padding-left: 20px; }
  li { margin-bottom: 3px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 100px; padding: 3px 10px; font-size: 12px; font-family: system-ui, sans-serif; }
  .act-card { background: #f9fafb; border-radius: 8px; padding: 12px; margin-bottom: 8px; border: 1px solid #e5e7eb; }
  .act-card strong { font-size: 13px; color: #111827; }
  .act-card p { margin: 6px 0 0; font-size: 13px; color: #374151; }
  .duration { font-size: 11px; color: #6b7280; font-family: system-ui; margin-left: 6px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h1>${lesson.title}</h1>
<div class="meta">
  <span><span class="badge">${lesson.subject}</span></span>
  <span>📅 ${dateStr}</span>
  ${lesson.duration_minutes ? `<span>⏱ ${formatDuration(lesson.duration_minutes)}</span>` : ''}
  ${kidName ? `<span>👤 ${kidName}${kidGrade ? ` · Grade ${kidGrade}` : ''}</span>` : ''}
</div>
<hr/>
${overviewHtml}${objectivesHtml}${materialsHtml}${activitiesHtml}${assessmentHtml}${extensionsHtml}
</body></html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  const activeProficiency = PROFICIENCY_LEVELS.find(p => p.value === checkIn.proficiency)

  const tabs = [
    { key: 'details'   as const, label: 'Details',   emoji: '📋' },
    { key: 'checkin'   as const, label: 'Check-In',  emoji: '🎯' },
  ]

  return (
    <div style={vw.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={vw.modal} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={vw.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {kidName && (
              <div style={vw.kidLine}>
                {kidName}{kidGrade ? ` · Grade ${kidGrade}` : ''}
              </div>
            )}
            <h2 style={vw.title}>{lesson.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' as const }}>
              <span style={{ ...vw.chip, background: subjectColors.bg, color: subjectColors.color }}>
                {lesson.subject || 'No Subject'}
              </span>
              <span style={{ ...vw.chip, background: status.bg, color: status.color }}>
                {status.emoji} {status.label}
              </span>
              {assessmentScore !== null && assessmentScore !== undefined && (
                <span style={{ ...vw.chip, background: '#fef9c3', color: '#a16207' }}>
                  📝 {assessmentScore}%
                </span>
              )}
              {/* Show saved proficiency as colored dot chip */}
              {activeProficiency && checkInSaved && (
                <span style={{
                  ...vw.chip,
                  background: activeProficiency.activeBg,
                  color: activeProficiency.color,
                  border: `1px solid ${activeProficiency.activeBorder}`,
                }}>
                  {activeProficiency.emoji} {activeProficiency.label}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button style={vw.printBtn} onClick={handlePrint} title="Print lesson plan" aria-label="Print">🖨️</button>
            <button style={vw.closeBtn} onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        {/* ── Edit Form ── */}
        {editing && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={vw.editLabel}>Lesson Title</label>
              <input style={vw.editInput} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label style={vw.editLabel}>Date</label>
              <input style={vw.editInput} type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <div>
              <label style={vw.editLabel}>Duration (minutes)</label>
              <input style={vw.editInput} type="number" min="1" placeholder="e.g. 45" value={editDuration} onChange={e => setEditDuration(e.target.value)} />
            </div>
            <div>
              <label style={vw.editLabel}>Description / Notes</label>
              <textarea style={{ ...vw.notesArea, minHeight: 100 }} value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="What will you cover?" />
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        {!editing && (<>
          <div style={vw.tabBar}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                style={{ ...vw.tab, ...(activeTab === tab.key ? vw.tabActive : {}) }}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

        {/* ── Details Tab ── */}
        {activeTab === 'details' && (
          <div style={vw.body}>

            {/* Source row */}
            <div style={{ ...vw.row, background: lessonPlan ? '#f0fdf4' : '#f0f9ff' }}>
              <span style={vw.rowLabel}>Lesson Type</span>
              <span style={{
                ...vw.rowValue,
                fontWeight: 700,
                color: isScoutLesson ? '#15803d' : '#0369a1',
              }}>
                {isScoutLesson ? '✨ Scout Lesson' : '📚 Curriculum'}
              </span>
            </div>

            <div style={vw.row}>
              <span style={vw.rowLabel}>Date</span>
              <span style={vw.rowValue}>
                {lesson.lesson_date
                  ? <>📅 {formatDate(lesson.lesson_date)}</>
                  : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Unscheduled</span>
                }
              </span>
            </div>

            <div style={vw.row}>
              <span style={vw.rowLabel}>Duration</span>
              <span style={vw.rowValue}>⏱ {formatDuration(lesson.duration_minutes)}</span>
            </div>

            {assignedToName && (
              <div style={vw.row}>
                <span style={vw.rowLabel}>Assigned To</span>
                <span style={vw.rowValue}>👤 {assignedToName}</span>
              </div>
            )}

            <div style={{ ...vw.row, flexDirection: 'column' as const, alignItems: 'flex-start', gap: 8 }}>
              <span style={vw.rowLabel}>Progress</span>
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                {(['not_started', 'in_progress', 'completed'] as const).map(s => {
                  const cfg = STATUS_CONFIG[s]
                  const isActive = lesson.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        if (lesson.status === s) return
                        if (onSetStatus) {
                          onSetStatus(lesson.id, s)
                        } else {
                          onCycleStatus(lesson.id, lesson.status)
                        }
                      }}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                        border: isActive ? `2px solid ${cfg.color}` : '2px solid #e5e7eb',
                        background: isActive ? cfg.bg : '#fff',
                        color: isActive ? cfg.color : '#9ca3af',
                        fontSize: 11, fontWeight: 800, fontFamily: 'system-ui, sans-serif',
                        textAlign: 'center' as const, lineHeight: 1.4,
                        transition: 'all 0.15s',
                        boxShadow: isActive ? `0 0 0 3px ${cfg.color}20` : 'none',
                      }}
                    >
                      <div style={{ fontSize: 16, marginBottom: 2 }}>{cfg.emoji}</div>
                      <div>{cfg.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {lessonPlan ? (
              /* ── AI-generated rich lesson plan ── */
              <div style={{ padding: '12px 22px 20px', display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                {(lessonPlan.overview || lessonPlan.approach || lessonPlan.description) && (
                  <div>
                    <div style={vw.planLabel}>Overview</div>
                    <div style={vw.planText}>
                      {lessonPlan.overview || lessonPlan.approach || lessonPlan.description}
                    </div>
                  </div>
                )}
                {lessonPlan.learningObjectives && lessonPlan.learningObjectives.length > 0 && (
                  <div>
                    <div style={vw.planLabel}>Learning Objectives</div>
                    <ul style={vw.planList}>
                      {lessonPlan.learningObjectives.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                  </div>
                )}
                {lessonPlan.materials && lessonPlan.materials.length > 0 && (
                  <div>
                    <div style={vw.planLabel}>Materials</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                      {lessonPlan.materials.map((m, i) => (
                        <span key={i} style={vw.materialChip}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {lessonPlan.activities && lessonPlan.activities.length > 0 && (
                  <div>
                    <div style={vw.planLabel}>Activities</div>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                      {lessonPlan.activities.map((a, i) => (
                        <div key={i} style={vw.activityCard}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#111827', fontFamily: 'system-ui, sans-serif' }}>{a.name}</span>
                            {a.duration && <span style={vw.durationBadge}>⏱ {a.duration}</span>}
                          </div>
                          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, fontFamily: 'system-ui, sans-serif' }}>{a.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(lessonPlan.assessment || (lessonPlan.assessmentIdeas && lessonPlan.assessmentIdeas.length > 0)) && (
                  <div>
                    <div style={vw.planLabel}>Assessment Ideas</div>
                    {lessonPlan.assessment
                      ? <div style={vw.planText}>{lessonPlan.assessment}</div>
                      : <ul style={vw.planList}>
                          {lessonPlan.assessmentIdeas!.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                    }
                  </div>
                )}
                {lessonPlan.extensions && lessonPlan.extensions.length > 0 && (
                  <div>
                    <div style={vw.planLabel}>Extensions</div>
                    <ul style={vw.planList}>
                      {lessonPlan.extensions.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : lesson.description ? (
              /* ── Plain curriculum/manual description ── */
              <div style={{ ...vw.row, flexDirection: 'column' as const, alignItems: 'flex-start', gap: 8 }}>
                <span style={vw.rowLabel}>Description</span>
                <div style={vw.description}>{lesson.description}</div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Check-In Tab ── */}
        {activeTab === 'checkin' && (
          <div style={vw.body}>
            <div style={{ padding: '16px 22px 12px' }}>
              <p style={vw.sectionDesc}>
                How did <strong>{kidName || 'your child'}</strong> do with this lesson?
              </p>
            </div>

            {/* Red / Yellow / Green buttons — full width stacked */}
            <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {PROFICIENCY_LEVELS.map(level => {
                const isSelected = checkIn.proficiency === level.value
                return (
                  <button
                    key={level.value}
                    onClick={() => { setCheckIn(c => ({ ...c, proficiency: level.value })); setCheckInSaved(false) }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 18px',
                      borderRadius: 12,
                      border: `2px solid ${isSelected ? level.activeBorder : level.border}`,
                      background: isSelected ? level.activeBg : level.bg,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? `0 0 0 3px ${level.activeBorder}30` : 'none',
                      textAlign: 'left' as const,
                    }}
                  >
                    <span style={{ fontSize: 28, lineHeight: 1 }}>{level.emoji}</span>
                    <div>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: isSelected ? level.color : '#111827',
                        fontFamily: 'system-ui, sans-serif',
                      }}>
                        {level.label}
                      </div>
                      <div style={{
                        fontSize: 12, color: isSelected ? level.color : '#9ca3af',
                        fontFamily: 'system-ui, sans-serif', marginTop: 1,
                        opacity: isSelected ? 0.85 : 1,
                      }}>
                        {level.sublabel}
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ marginLeft: 'auto', fontSize: 16, color: level.color }}>✓</div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Notes */}
            <div style={{ padding: '14px 22px 6px' }}>
              <label style={{ ...vw.rowLabel, display: 'block', marginBottom: 6 }}>
                Observation Notes{' '}
                <span style={{ color: '#d1d5db', fontWeight: 400, textTransform: 'none' as const, fontSize: 11 }}>
                  (optional)
                </span>
              </label>
              <textarea
                style={vw.notesArea}
                rows={3}
                placeholder={`e.g., "She understood fractions but struggled with mixed numbers…"`}
                value={checkIn.notes}
                onChange={e => { setCheckIn(c => ({ ...c, notes: e.target.value })); setCheckInSaved(false) }}
              />
            </div>

            {/* Portfolio Uploads */}
            {organizationId && (
              <div style={{ padding: '14px 22px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ ...vw.rowLabel, display: 'block' }}>
                    Work Samples{' '}
                    <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' as const, fontSize: 11 }}>
                      (photos, PDFs — optional)
                    </span>
                  </label>
                  <label style={{
                    fontSize: 11, fontWeight: 700, color: '#4f46e5',
                    cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
                    padding: '4px 10px', border: '1.5px solid #c7d2fe',
                    borderRadius: 8, background: '#eff6ff',
                  }}>
                    + Add Files
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </label>
                </div>

                {/* Existing uploads */}
                {existingUploads.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4, marginBottom: 8 }}>
                    {existingUploads.map(u => (
                      <div key={u.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: 8, padding: '7px 10px',
                      }}>
                        <span style={{ fontSize: 14 }}>
                          {u.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '🖼️' : '📄'}
                        </span>
                        <a
                          href={u.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flex: 1, fontSize: 12, color: '#15803d', fontWeight: 600, fontFamily: 'system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, textDecoration: 'none' }}
                        >
                          {u.file_name}
                        </a>
                        <button
                          onClick={() => deleteExistingUpload(u)}
                          disabled={deletingUploadId === u.id}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ef4444', padding: 2, opacity: deletingUploadId === u.id ? 0.4 : 1 }}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending files */}
                {pendingFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4, marginBottom: 8 }}>
                    {pendingFiles.map((f, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#fefce8', border: '1px solid #fde68a',
                        borderRadius: 8, padding: '7px 10px',
                      }}>
                        <span style={{ fontSize: 14 }}>
                          {f.type.startsWith('image/') ? '🖼️' : '📄'}
                        </span>
                        <span style={{ flex: 1, fontSize: 12, color: '#92400e', fontWeight: 600, fontFamily: 'system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {f.name}
                        </span>
                        <button
                          onClick={() => removePending(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ef4444', padding: 2 }}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      style={{
                        marginTop: 4, padding: '7px 14px', border: 'none',
                        borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: uploading ? '#e5e7eb' : '#4f46e5',
                        color: uploading ? '#9ca3af' : '#fff',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontFamily: 'system-ui, sans-serif', alignSelf: 'flex-start' as const,
                      }}
                    >
                      {uploading ? 'Uploading…' : `⬆️ Upload ${pendingFiles.length} file${pendingFiles.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div style={{ fontSize: 12, color: '#ef4444', fontFamily: 'system-ui, sans-serif', marginTop: 4 }}>
                    ⚠️ {uploadError}
                  </div>
                )}
              </div>
            )}

            {/* Save */}
            <div style={{ padding: '8px 22px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                style={{
                  ...vw.btnPrimary,
                  opacity: !checkIn.proficiency || checkInSaving ? 0.4 : 1,
                  cursor: !checkIn.proficiency || checkInSaving ? 'not-allowed' : 'pointer',
                }}
                disabled={!checkIn.proficiency || checkInSaving}
                onClick={saveCheckIn}
              >
                {checkInSaving ? 'Saving…' : checkInSaved ? '✓ Saved' : '💾 Save Check-In'}
              </button>
              {checkInSaved && (
                <span style={{ fontSize: 12, color: '#16a34a', fontFamily: 'system-ui, sans-serif' }}>
                  Check-in recorded ✓
                </span>
              )}
            </div>
          </div>
        )}


        </>)}

        {/* ── Footer ── */}
        <div style={vw.footer}>
          <button style={vw.btnDanger} onClick={handleDelete}>🗑 Delete</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? (
              <>
                <button style={vw.btnSecondary} onClick={() => setEditing(false)}>Cancel</button>
                <button
                  style={{ ...vw.btnPrimary, opacity: editSaving ? 0.5 : 1 }}
                  disabled={editSaving}
                  onClick={handleEditSave}
                >
                  {editSaving ? 'Saving…' : '💾 Save'}
                </button>
              </>
            ) : (
              <>
                {onGenerateAssessment && (
                  <button style={vw.btnSecondary} onClick={() => { onGenerateAssessment(lesson); onClose() }}>
                    📝 Assessment
                  </button>
                )}
                <button style={vw.btnPrimary} onClick={() => setEditing(true)}>✏️ Edit</button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const vw: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(15,10,40,0.55)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modal: {
    background: '#fff', borderRadius: 18,
    width: '100%', maxWidth: 500, maxHeight: '90vh',
    boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)',
    padding: '20px 22px 18px',
    display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0,
  },
  kidLine: {
    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    fontFamily: 'system-ui, sans-serif', marginBottom: 4,
  },
  title: {
    fontSize: 19, fontWeight: 800, color: '#fff',
    fontFamily: 'system-ui, sans-serif', margin: 0, lineHeight: 1.25,
  },
  chip: {
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 10px', borderRadius: 100,
    fontSize: 11, fontWeight: 700, fontFamily: 'system-ui, sans-serif',
  },
  printBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
    fontSize: 16, width: 30, height: 30, borderRadius: '50%',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
    fontSize: 22, width: 30, height: 30, borderRadius: '50%',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, lineHeight: 1, padding: 0, marginTop: 2,
  },
  tabBar: {
    display: 'flex', borderBottom: '1px solid #f3f4f6',
    background: '#fafafa', flexShrink: 0,
  },
  tab: {
    flex: 1, padding: '10px 8px', border: 'none', background: 'none',
    cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#9ca3af',
    fontFamily: 'system-ui, sans-serif', borderBottom: '2px solid transparent',
    transition: 'all 0.15s',
  },
  tabActive: { color: '#4f46e5', borderBottom: '2px solid #4f46e5', background: '#fff' },
  body: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 22px', gap: 12, borderBottom: '1px solid #f9fafb',
  },
  rowLabel: {
    fontSize: 11, fontWeight: 700, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    fontFamily: 'system-ui, sans-serif', flexShrink: 0,
  },
  rowValue: {
    fontSize: 14, color: '#111827',
    fontFamily: 'system-ui, sans-serif', textAlign: 'right',
  },
  cycleBtn: {
    background: 'none', border: '1px solid #e5e7eb', borderRadius: 100,
    padding: '4px 12px', fontSize: 12, fontWeight: 600,
    color: '#4f46e5', cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
  },
  description: {
    fontSize: 14, color: '#374151', lineHeight: 1.65, fontFamily: 'Georgia, serif',
    background: '#f9fafb', borderRadius: 8, padding: '12px 14px',
    width: '100%', boxSizing: 'border-box', whiteSpace: 'pre-wrap',
  },
  sectionDesc: {
    fontSize: 13, color: '#6b7280', lineHeight: 1.5,
    fontFamily: 'system-ui, sans-serif', margin: 0,
  },
  notesArea: {
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8,
    padding: '10px 12px', fontSize: 13, lineHeight: 1.6,
    color: '#1f2937', fontFamily: 'Georgia, serif',
    resize: 'vertical', boxSizing: 'border-box', minHeight: 80, outline: 'none',
  },
  standardRow: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '11px 22px', borderBottom: '1px solid #f3f4f6',
  },
  gradeChip: {
    fontSize: 10, fontWeight: 800, color: '#4f46e5', fontFamily: 'system-ui, sans-serif',
    flexShrink: 0, background: '#eff6ff', padding: '2px 7px', borderRadius: 4,
    marginTop: 2, whiteSpace: 'nowrap',
  },
  standardDesc: {
    fontSize: 13, color: '#374151', lineHeight: 1.5, fontFamily: 'system-ui, sans-serif',
  },
  footer: {
    padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderTop: '1px solid #f3f4f6', background: '#fafafa', flexShrink: 0,
  },
  btnPrimary: {
    padding: '9px 20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    border: 'none', borderRadius: 100, fontSize: 13, fontWeight: 700, color: '#fff',
    cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
  },
  btnSecondary: {
    padding: '9px 16px', background: '#fff', border: '1.5px solid #e5e7eb',
    borderRadius: 100, fontSize: 13, fontWeight: 600, color: '#374151',
    cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
  },
  btnDanger: {
    padding: '9px 16px', background: '#fff', border: '1.5px solid #fca5a5',
    borderRadius: 100, fontSize: 13, fontWeight: 600, color: '#ef4444',
    cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
  },
  planLabel: {
    fontSize: 11, fontWeight: 800, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    fontFamily: 'system-ui, sans-serif', marginBottom: 6,
  },
  planText: {
    fontSize: 13, color: '#374151', lineHeight: 1.65,
    fontFamily: 'Georgia, serif',
  },
  planList: {
    margin: '0', paddingLeft: 18,
    fontSize: 13, color: '#374151', lineHeight: 1.8,
    fontFamily: 'Georgia, serif',
  },
  materialChip: {
    fontSize: 12, fontWeight: 600, color: '#4f46e5',
    background: '#eff6ff', border: '1px solid #c7d2fe',
    borderRadius: 6, padding: '3px 9px',
    fontFamily: 'system-ui, sans-serif',
  },
  activityCard: {
    background: '#f9fafb', border: '1px solid #e5e7eb',
    borderRadius: 10, padding: '11px 14px',
  },
  durationBadge: {
    fontSize: 11, fontWeight: 700, color: '#6b7280',
    background: '#f3f4f6', borderRadius: 4, padding: '2px 7px',
    fontFamily: 'system-ui, sans-serif',
  },
  editLabel: {
    fontSize: 11, fontWeight: 700, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    fontFamily: 'system-ui, sans-serif', display: 'block', marginBottom: 6,
  },
  editInput: {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid #e5e7eb', borderRadius: 8,
    fontSize: 14, color: '#111827', fontFamily: 'system-ui, sans-serif',
    outline: 'none', boxSizing: 'border-box',
  },
}