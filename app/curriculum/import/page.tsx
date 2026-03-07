'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase'
import AuthGuard from '@/components/AuthGuard'
import { useAppHeader } from '@/components/layout/AppHeader'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kid {
  id: string
  displayname: string
  grade?: string
}

interface Lesson {
  title: string
  subject: string
  duration: string
  lesson_date: string
  description: string
}

const DURATION_UNITS = ['minutes', 'days', 'weeks'] as const
type DurationUnit = typeof DURATION_UNITS[number]

type Step = 'upload' | 'preview' | 'success'

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: 'calc(100vh - 56px)',
    background: '#f5f3ff',
    fontFamily: 'var(--font-dm-sans), sans-serif',
  },
  main: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '32px 24px 64px',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    border: '1.5px solid #ede9fe',
    boxShadow: '0 4px 16px rgba(124,58,237,0.07)',
    overflow: 'hidden',
  },
  cardHeader: {
    background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 45%, #a855f7 75%, #ec4899 100%)',
    padding: '20px 24px',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 900,
    margin: 0,
  },
  cardSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  cardBody: {
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 6,
  },
  select: {
    width: '100%',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    color: '#111827',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  input: {
    width: '100%',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  infoBanner: {
    background: '#ede9fe',
    border: '1.5px solid #c4b5fd',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 13,
    color: '#5b21b6',
    fontWeight: 600,
  },
  uploadZone: {
    border: '2px dashed #c4b5fd',
    borderRadius: 12,
    padding: '36px 24px',
    textAlign: 'center' as const,
    background: '#faf5ff',
  },
  fileLabel: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff',
    padding: '10px 24px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  },
  btnPrimary: {
    width: '100%',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '13px 0',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnSecondary: {
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: 10,
    padding: '13px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  lessonRow: {
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    background: '#fff',
  },
  lessonRowSelected: {
    border: '1.5px solid #7c3aed',
    background: '#faf5ff',
  },
  pill: {
    display: 'inline-block',
    background: '#ede9fe',
    color: '#5b21b6',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 10px',
    borderRadius: 20,
  },
  successWrap: {
    padding: '48px 24px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
  },
  successCheck: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 700,
  },
  errorBanner: {
    background: '#fef2f2',
    border: '1.5px solid #fca5a5',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#dc2626',
    fontWeight: 600,
  },
}

// ─── Page Content ─────────────────────────────────────────────────────────────

function CurriculumImportContent() {
  const router = useRouter()
  useAppHeader({ title: '📥 Import Curriculum', backHref: '/dashboard' })

  const [pageLoading, setPageLoading]       = useState(true)
  const [kids, setKids]                     = useState<Kid[]>([])
  const [selectedKidId, setSelectedKidId]   = useState<string>('')
  const [organizationId, setOrganizationId] = useState<string>('')
  const [userId, setUserId]                 = useState<string>('')
  const [existingSubjects, setExistingSubjects] = useState<string[]>([])

  // Import flow state
  const [step, setStep]                     = useState<Step>('upload')
  const [file, setFile]                     = useState<File | null>(null)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')
  const [extractedLessons, setExtractedLessons] = useState<Lesson[]>([])
  const [selectedLessons, setSelectedLessons]   = useState<Set<number>>(new Set())
  const [importResults, setImportResults]       = useState({ imported: 0, skipped: 0 })

  // Subject
  const [selectedSubject, setSelectedSubject]   = useState('')
  const [customSubject, setCustomSubject]        = useState('')

  // Duration
  const [applyBulkDuration, setApplyBulkDuration] = useState(false)
  const [bulkDurationValue, setBulkDurationValue]  = useState(1)
  const [bulkDurationUnit, setBulkDurationUnit]    = useState<DurationUnit>('weeks')
  const [lessonDurations, setLessonDurations]      = useState<Record<number, { value: number; unit: DurationUnit }>>({})

  // Start date
  const [useStartDate, setUseStartDate] = useState(false)
  const [startDate, setStartDate]       = useState('')

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }
      setOrganizationId(orgId)

      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname, grade')
        .eq('organization_id', orgId)
        .order('displayname')
      const kidsArr = (kidsData || []) as Kid[]
      setKids(kidsArr)
      if (kidsArr.length > 0) setSelectedKidId(kidsArr[0].id)

      const { data: subjectData } = await supabase
        .from('lessons')
        .select('subject')
        .eq('organization_id', orgId)
      if (subjectData) {
        const unique = [...new Set(subjectData.map((d: any) => d.subject).filter(Boolean))] as string[]
        setExistingSubjects(unique.filter(s => !(CANONICAL_SUBJECTS as readonly string[]).includes(s)))
      }

      setPageLoading(false)
    }
    load()
  }, [])

  // ── File handling ────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) {
      setError('Please select a PDF or image file (JPEG/PNG)')
      return
    }
    setFile(f)
    setError('')
  }

  // ── Extract ──────────────────────────────────────────────────────────────────

  const handleExtract = async () => {
    if (!file || !selectedKidId) return
    const finalSubject = selectedSubject === '__custom__' ? customSubject.trim() : selectedSubject
    if (!finalSubject) { setError('Please select or enter a subject'); return }

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('childId', selectedKidId)
    formData.append('subject', finalSubject)

    try {
      const res = await fetch('/api/import-curriculum', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to extract lessons'); return }

      if (data.lessons) {
        const sorted = [...data.lessons].sort((a: Lesson, b: Lesson) => {
          const nA = parseInt(a.title.match(/\d+/)?.[0] || '0')
          const nB = parseInt(b.title.match(/\d+/)?.[0] || '0')
          return nA - nB
        }).map((l: Lesson) => ({ ...l, subject: finalSubject }))

        setExtractedLessons(sorted)
        setSelectedLessons(new Set(sorted.map((_: Lesson, i: number) => i)))

        if (applyBulkDuration) {
          const durations: Record<number, { value: number; unit: DurationUnit }> = {}
          sorted.forEach((_: Lesson, i: number) => { durations[i] = { value: bulkDurationValue, unit: bulkDurationUnit } })
          setLessonDurations(durations)
        }

        setStep('preview')
      }
    } catch {
      setError('Failed to extract lessons. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Import ───────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!organizationId || !userId || !selectedKidId) return
    setLoading(true)

    const finalSubject = selectedSubject === '__custom__' ? customSubject.trim() : selectedSubject
    const toLessons = extractedLessons.filter((_, i) => selectedLessons.has(i))

    try {
      const { data: existing } = await supabase
        .from('lessons')
        .select('title, subject')
        .eq('kid_id', selectedKidId)

      const newLessons = toLessons.filter(l =>
        !existing?.some((e: any) => e.title === l.title && e.subject === l.subject)
      )
      const duplicateCount = toLessons.length - newLessons.length

      const toInsert: any[] = []
      let currentDate = useStartDate && startDate ? new Date(startDate) : null

      extractedLessons.forEach((lesson, i) => {
        if (!selectedLessons.has(i) || !newLessons.includes(lesson)) return

        let durationMinutes = null
        let durationDays = 0

        if (lessonDurations[i]) {
          const { value, unit } = lessonDurations[i]
          if (unit === 'minutes') { durationMinutes = value }
          else if (unit === 'days') { durationMinutes = value * 6 * 60; durationDays = value }
          else { durationMinutes = value * 5 * 6 * 60; durationDays = value * 5 }
        }

        let lessonDate = null
        if (currentDate) {
          lessonDate = currentDate.toISOString().split('T')[0]
          const next = new Date(currentDate)
          next.setDate(next.getDate() + (durationDays > 0 ? durationDays : 1))
          currentDate = next
        }

        toInsert.push({
          kid_id: selectedKidId,
          user_id: userId,
          organization_id: organizationId,
          subject: lesson.subject,
          title: lesson.title,
          description: lesson.description,
          lesson_date: lessonDate,
          duration_minutes: durationMinutes,
          status: 'not_started',
        })
      })

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase.from('lessons').insert(toInsert)
        if (insertErr) { setError(`Failed to import: ${insertErr.message}`); return }
      }

      setImportResults({ imported: toInsert.length, skipped: duplicateCount })
      setStep('success')
    } catch (e: any) {
      setError(e?.message || 'Unknown error during import')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (pageLoading) return (
    <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff' }}>
      <div style={{ color: '#7c3aed', fontWeight: 700 }}>Loading...</div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      <main style={s.main}>

        {/* ── No kids state ───────────────────────────────────────────── */}
        {kids.length === 0 ? (
          <div style={{ ...s.card, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👧</div>
            <h2 style={{ fontWeight: 900, fontSize: 18, color: '#111827', marginBottom: 8 }}>No children added yet</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>Add a child first before importing curriculum.</p>
            <button onClick={() => router.push('/dashboard')} style={s.btnPrimary}>
              Go to Dashboard
            </button>
          </div>
        ) : (

          <div style={s.card}>
            <div style={s.cardHeader}>
              <h1 style={s.cardTitle}>📥 Import Curriculum</h1>
              <p style={s.cardSub}>Upload a table of contents (PDF or image) and we'll extract lessons automatically</p>
            </div>

            <div style={s.cardBody}>

              {/* ── STEP: Upload ─────────────────────────────────────── */}
              {step === 'upload' && (
                <>
                  {error && <div style={s.errorBanner}>⚠ {error}</div>}

                  {/* Kid selector */}
                  <div>
                    <label style={s.label}>Which child is this curriculum for?</label>
                    <select
                      value={selectedKidId}
                      onChange={e => setSelectedSubject(e.target.value as string)}
                      style={s.select}
                    >
                      {kids.map(k => (
                        <option key={k.id} value={k.id}>
                          {k.displayname}{k.grade ? ` (Grade ${k.grade})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject selector */}
                  <div>
                    <label style={s.label}>What subject is this curriculum for?</label>
                    <select
                      value={selectedSubject}
                      onChange={e => setSelectedSubject(e.target.value)}
                      style={s.select}
                    >
                      <option value="">-- Select Subject --</option>
                      <optgroup label="Standard Subjects">
                      {CANONICAL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                      {existingSubjects.length > 0 && (
                        <optgroup label="Your Custom Subjects">
                          {existingSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </optgroup>
                      )}
                      <option value="__custom__">✏️ Add a new custom subject...</option>
                    </select>
                    {selectedSubject === '__custom__' && (
                      <div style={{ marginTop: 8 }}>
                        <input
                          type="text"
                          value={customSubject}
                          onChange={e => setCustomSubject(e.target.value)}
                          placeholder="e.g., Latin, Robotics, Home Economics"
                          style={s.input}
                          autoFocus
                        />
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                          💡 Use title case (e.g., "Latin" not "latin") for consistent grouping in reports.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bulk duration */}
                  <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: applyBulkDuration ? 12 : 0 }}>
                      <input
                        type="checkbox"
                        id="bulk-dur"
                        checked={applyBulkDuration}
                        onChange={e => setApplyBulkDuration(e.target.checked)}
                      />
                      <label htmlFor="bulk-dur" style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>
                        Set the same duration for all lessons
                      </label>
                    </div>
                    {applyBulkDuration && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                          type="number"
                          min={1}
                          value={bulkDurationValue}
                          onChange={e => setBulkDurationValue(parseInt(e.target.value) || 1)}
                          style={{ ...s.input, width: 80 }}
                        />
                        <select
                          value={bulkDurationUnit}
                          onChange={e => setBulkDurationUnit(e.target.value as DurationUnit)}
                          style={{ ...s.select, width: 'auto' }}
                        >
                          {DURATION_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <span style={{ fontSize: 13, color: '#3b82f6' }}>per lesson</span>
                      </div>
                    )}
                  </div>

                  {/* Start date */}
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: useStartDate ? 10 : 0 }}>
                      <input
                        type="checkbox"
                        id="start-date"
                        checked={useStartDate}
                        onChange={e => setUseStartDate(e.target.checked)}
                      />
                      <label htmlFor="start-date" style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>
                        Schedule lessons starting from a specific date
                      </label>
                    </div>
                    {useStartDate ? (
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        style={s.input}
                      />
                    ) : (
                      <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                        Lessons will be imported without dates — schedule them later from the calendar.
                      </p>
                    )}
                  </div>

                  {/* File upload */}
                  <div style={s.uploadZone}>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="file-upload" style={s.fileLabel}>
                      Choose File (PDF or Image)
                    </label>
                    {file ? (
                      <p style={{ marginTop: 12, fontSize: 13, color: '#374151', fontWeight: 600 }}>
                        ✓ {file.name}
                      </p>
                    ) : (
                      <p style={{ marginTop: 10, fontSize: 12, color: '#9ca3af' }}>
                        PDF or image · max 15 MB
                      </p>
                    )}
                  </div>

                  {file && (
                    <button
                      onClick={handleExtract}
                      disabled={loading}
                      style={{ ...s.btnPrimary, opacity: loading ? 0.6 : 1 }}
                    >
                      {loading ? 'Extracting Lessons...' : 'Extract Lessons →'}
                    </button>
                  )}
                </>
              )}

              {/* ── STEP: Preview ────────────────────────────────────── */}
              {step === 'preview' && (
                <>
                  {error && <div style={s.errorBanner}>⚠ {error}</div>}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 14, color: '#374151', fontWeight: 600, margin: 0 }}>
                      Found {extractedLessons.length} lessons — select which to import
                    </p>
                    <button
                      onClick={() => setSelectedLessons(
                        selectedLessons.size === extractedLessons.length
                          ? new Set()
                          : new Set(extractedLessons.map((_, i) => i))
                      )}
                      style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#7c3aed', cursor: 'pointer' }}
                    >
                      {selectedLessons.size === extractedLessons.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {useStartDate && startDate && (
                    <div style={s.infoBanner}>
                      📅 Lessons will be scheduled starting {new Date(startDate + 'T00:00:00').toLocaleDateString()}, spaced by duration.
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                    {extractedLessons.map((lesson, i) => {
                      const selected = selectedLessons.has(i)
                      return (
                        <div
                          key={i}
                          style={{ ...s.lessonRow, ...(selected ? s.lessonRowSelected : {}) }}
                          onClick={() => {
                            const next = new Set(selectedLessons)
                            selected ? next.delete(i) : next.add(i)
                            setSelectedLessons(next)
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {}}
                            style={{ marginTop: 3, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{lesson.title}</div>
                            {lesson.description && (
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                {typeof lesson.description === 'string' ? lesson.description : ''}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                              <span style={s.pill}>{lesson.subject}</span>
                              {lessonDurations[i] && (
                                <span style={{ ...s.pill, background: '#d1fae5', color: '#065f46' }}>
                                  {lessonDurations[i].value} {lessonDurations[i].unit}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Per-lesson duration override */}
                          <div
                            style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Duration</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <input
                                type="number"
                                min={1}
                                value={lessonDurations[i]?.value || ''}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 1
                                  const unit = lessonDurations[i]?.unit || 'weeks'
                                  setLessonDurations(prev => ({ ...prev, [i]: { value: val, unit } }))
                                }}
                                placeholder="–"
                                disabled={!selected}
                                style={{ width: 48, border: '1.5px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', fontSize: 12, color: '#111827' }}
                              />
                              <select
                                value={lessonDurations[i]?.unit || 'weeks'}
                                onChange={e => {
                                  const val = lessonDurations[i]?.value || 1
                                  setLessonDurations(prev => ({ ...prev, [i]: { value: val, unit: e.target.value as DurationUnit } }))
                                }}
                                disabled={!selected}
                                style={{ border: '1.5px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', fontSize: 11, color: '#111827' }}
                              >
                                {DURATION_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => setStep('upload')} style={s.btnSecondary}>
                      ← Back
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={loading || selectedLessons.size === 0}
                      style={{ ...s.btnPrimary, flex: 1, opacity: loading || selectedLessons.size === 0 ? 0.6 : 1 }}
                    >
                      {loading ? 'Importing...' : `Import ${selectedLessons.size} Lesson${selectedLessons.size !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </>
              )}

              {/* ── STEP: Success ────────────────────────────────────── */}
              {step === 'success' && (
                <div style={s.successWrap}>
                  <div style={s.successCheck}>✓</div>
                  <h2 style={{ fontWeight: 900, fontSize: 22, color: '#111827', margin: 0 }}>Import Complete!</h2>
                  <p style={{ fontSize: 15, color: '#374151', margin: 0 }}>
                    {importResults.imported} lesson{importResults.imported !== 1 ? 's' : ''} added successfully
                  </p>
                  {importResults.skipped > 0 && (
                    <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                      {importResults.skipped} duplicate{importResults.skipped !== 1 ? 's' : ''} skipped
                    </p>
                  )}
                  {useStartDate && startDate ? (
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                      📅 Scheduled starting {new Date(startDate + 'T00:00:00').toLocaleDateString()}
                    </p>
                  ) : (
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                      📅 Lessons imported without dates — schedule them from the Lessons page
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <button
                      onClick={() => {
                        setStep('upload')
                        setFile(null)
                        setExtractedLessons([])
                        setSelectedLessons(new Set())
                        setSelectedSubject('')
                        setCustomSubject('')
                        setError('')
                      }}
                      style={s.btnSecondary}
                    >
                      Import Another
                    </button>
                    <button
                      onClick={() => router.push('/lessons')}
                      style={s.btnPrimary}
                    >
                      View Lessons →
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function CurriculumImportPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <CurriculumImportContent />
      </Suspense>
    </AuthGuard>
  )
}