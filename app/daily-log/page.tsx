'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase'
import AuthGuard from '@/components/AuthGuard'
import { useAppHeader } from '@/components/layout/AppHeader'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'

const FONT = "'Nunito', sans-serif"

interface Kid {
  id: string
  displayname: string
  firstname: string
}

interface DailyLog {
  id: string
  kid_id: string
  log_date: string
  subjects: string[]
  notes: string | null
  hours: number | null
}

function DailyLogContent() {
  const router = useRouter()
  const supabase = createClient()
  useAppHeader({ title: '📝 Daily Subject Log', backHref: '/reports' })

  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [kids, setKids] = useState<Kid[]>([])
  const [selectedKidId, setSelectedKidId] = useState<string>('')
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [hours, setHours] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }
      setOrganizationId(orgId)

      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname, firstname')
        .eq('organization_id', orgId)
        .eq('archived', false)
        .order('created_at', { ascending: true })

      if (kidsData?.length) {
        setKids(kidsData)
        setSelectedKidId(kidsData[0].id)
      }
      setLoading(false)
    }
    init()
  }, [])

  // Load existing log for selected kid + date
  useEffect(() => {
    if (!selectedKidId || !logDate) return
    async function loadExisting() {
      const { data } = await supabase
        .from('daily_subject_logs')
        .select('*')
        .eq('kid_id', selectedKidId)
        .eq('log_date', logDate)
        .maybeSingle()
      if (data) {
        setSelectedSubjects(data.subjects || [])
        setNotes(data.notes || '')
        setHours(data.hours ? String(data.hours) : '')
      } else {
        setSelectedSubjects([])
        setNotes('')
        setHours('')
      }
    }
    loadExisting()
  }, [selectedKidId, logDate])

  // Load recent logs for selected kid
  useEffect(() => {
    if (!selectedKidId) return
    setLogsLoading(true)
    supabase
      .from('daily_subject_logs')
      .select('*')
      .eq('kid_id', selectedKidId)
      .order('log_date', { ascending: false })
      .limit(14)
      .then(({ data }) => {
        setRecentLogs(data || [])
        setLogsLoading(false)
      })
  }, [selectedKidId, saved])

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    )
  }

  const handleSave = async () => {
    if (!selectedKidId || !organizationId || selectedSubjects.length === 0) {
      setError('Please select at least one subject.')
      return
    }
    setSaving(true)
    setError(null)

    const { error: upsertError } = await supabase
      .from('daily_subject_logs')
      .upsert({
        organization_id: organizationId,
        kid_id: selectedKidId,
        log_date: logDate,
        subjects: selectedSubjects,
        notes: notes.trim() || null,
        hours: hours ? parseFloat(hours) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'kid_id,log_date' })

    if (upsertError) {
      setError('Failed to save. Please try again.')
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = async (log: DailyLog) => {
    if (!confirm(`Delete log for ${formatDate(log.log_date)}?`)) return
    await supabase.from('daily_subject_logs').delete().eq('id', log.id)
    setRecentLogs(prev => prev.filter(l => l.id !== log.id))
    // Clear form if deleting the currently-shown log
    if (log.kid_id === selectedKidId && log.log_date === logDate) {
      setSelectedSubjects([])
      setNotes('')
      setHours('')
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const isToday = (dateStr: string) => dateStr === new Date().toISOString().slice(0, 10)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff' }}>
        <p style={{ color: '#7c3aed', fontWeight: 700, fontFamily: FONT }}>Loading…</p>
      </div>
    )
  }

  const selectedKid = kids.find(k => k.id === selectedKidId)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff', fontFamily: FONT, paddingBottom: 100 }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 0' }}>

        {/* Kid selector */}
        {kids.length > 1 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {kids.map(kid => (
                <button
                  key={kid.id}
                  onClick={() => setSelectedKidId(kid.id)}
                  style={{
                    padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                    border: '1.5px solid',
                    borderColor: selectedKidId === kid.id ? '#7c3aed' : '#e5e7eb',
                    background: selectedKidId === kid.id ? '#7c3aed' : '#fff',
                    color: selectedKidId === kid.id ? '#fff' : '#374151',
                    cursor: 'pointer', fontFamily: FONT,
                  }}
                >
                  {kid.displayname}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Log form card */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #ede9fe', boxShadow: '0 4px 16px rgba(124,58,237,0.08)', padding: '20px', marginBottom: 24 }}>

          {/* Date */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 6 }}>DATE</label>
            <input
              type="date"
              value={logDate}
              onChange={e => setLogDate(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1.5px solid #d1d5db', fontSize: 14, fontWeight: 600,
                color: '#1a1a2e', fontFamily: FONT, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Subjects */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 8 }}>
              SUBJECTS COVERED
              <span style={{ color: '#9ca3af', fontWeight: 600, marginLeft: 6 }}>select all that apply</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CANONICAL_SUBJECTS.map(subject => {
                const selected = selectedSubjects.includes(subject)
                return (
                  <button
                    key={subject}
                    onClick={() => toggleSubject(subject)}
                    style={{
                      padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      border: '1.5px solid',
                      borderColor: selected ? '#7c3aed' : '#e5e7eb',
                      background: selected ? '#7c3aed' : '#f9fafb',
                      color: selected ? '#fff' : '#374151',
                      cursor: 'pointer', fontFamily: FONT,
                      transition: 'all 0.1s ease',
                    }}
                  >
                    {selected ? '✓ ' : ''}{subject}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hours */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 6 }}>
              HOURS <span style={{ color: '#9ca3af', fontWeight: 600 }}>optional</span>
            </label>
            <input
              type="number"
              min="0" max="24" step="0.5"
              placeholder="e.g. 3.5"
              value={hours}
              onChange={e => setHours(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1.5px solid #d1d5db', fontSize: 14, fontWeight: 600,
                color: '#1a1a2e', fontFamily: FONT, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 6 }}>
              NOTES <span style={{ color: '#9ca3af', fontWeight: 600 }}>optional</span>
            </label>
            <textarea
              placeholder={`e.g. ${selectedKid?.firstname || 'Emma'} finished chapter 3, worked on multiplication tables...`}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1.5px solid #d1d5db', fontSize: 13, fontWeight: 600,
                color: '#1a1a2e', fontFamily: FONT, resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#dc2626', fontWeight: 700 }}>⚠️ {error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || saved || selectedSubjects.length === 0}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
              background: saved ? '#10b981' : (saving || selectedSubjects.length === 0) ? '#c4b5fd' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#fff', fontSize: 15, fontWeight: 800,
              cursor: (saving || saved || selectedSubjects.length === 0) ? 'not-allowed' : 'pointer',
              fontFamily: FONT, transition: 'background 0.2s ease',
            }}
          >
            {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Daily Log'}
          </button>
        </div>

        {/* Recent logs */}
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, margin: '0 0 12px', textTransform: 'uppercase' }}>
            Recent Logs — {selectedKid?.displayname}
          </h3>
          {logsLoading ? (
            <p style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>Loading…</p>
          ) : recentLogs.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #ede9fe', padding: '24px 20px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 14, fontWeight: 600 }}>No logs yet — start with today!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    background: '#fff', borderRadius: 16, border: '1.5px solid #ede9fe',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderColor: log.log_date === logDate && log.kid_id === selectedKidId ? '#7c3aed' : '#ede9fe',
                  }}
                  onClick={() => setLogDate(log.log_date)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>
                        {formatDate(log.log_date)}
                      </span>
                      {isToday(log.log_date) && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', background: '#ede9fe', padding: '2px 8px', borderRadius: 20 }}>TODAY</span>
                      )}
                      {log.hours && (
                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>· {log.hours}h</span>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(log) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#d1d5db', padding: 4 }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {log.subjects.map(s => (
                      <span key={s} style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: '#f3f0ff', color: '#5b21b6',
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                  {log.notes && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280', fontWeight: 600, lineHeight: 1.5 }}>
                      {log.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DailyLogPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f5f3ff' }} />}>
        <DailyLogContent />
      </Suspense>
    </AuthGuard>
  )
}
