'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/lib/supabase'
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'

interface Kid {
  id: string
  displayname: string
}

interface Props {
  organizationId: string
  kids: Kid[]
  onClose: () => void
  onSaved?: () => void
}

const FONT = "'Nunito', sans-serif"

export default function QuickDailyLogModal({ organizationId, kids, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [selectedKidId, setSelectedKidId] = useState(kids[0]?.id || '')
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [hours, setHours] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

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

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    )
  }

  const handleSave = async () => {
    if (!selectedKidId || selectedSubjects.length === 0) {
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
    onSaved?.()
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 1200)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        fontFamily: FONT,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto',
        padding: '24px 20px 40px',
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 99, margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>📝</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1a1a2e' }}>Quick Daily Log</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Log subjects covered — no lesson required</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Kid selector */}
          {kids.length > 1 && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 6 }}>LEARNER</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {kids.map(kid => (
                  <button
                    key={kid.id}
                    onClick={() => setSelectedKidId(kid.id)}
                    style={{
                      padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                      border: '1.5px solid',
                      borderColor: selectedKidId === kid.id ? '#7c3aed' : '#e5e7eb',
                      background: selectedKidId === kid.id ? '#ede9fe' : '#f9fafb',
                      color: selectedKidId === kid.id ? '#5b21b6' : '#374151',
                      cursor: 'pointer', fontFamily: FONT,
                    }}
                  >
                    {kid.displayname}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date */}
          <div>
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
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 8 }}>
              SUBJECTS COVERED <span style={{ color: '#9ca3af', fontWeight: 600 }}>(select all that apply)</span>
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

          {/* Hours (optional) */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 6 }}>
              HOURS LOGGED <span style={{ color: '#9ca3af', fontWeight: 600 }}>(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
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

          {/* Notes (optional) */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 6 }}>
              NOTES <span style={{ color: '#9ca3af', fontWeight: 600 }}>(optional)</span>
            </label>
            <textarea
              placeholder="e.g. Kai finished chapter 3, Emma did pages 12–20..."
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
            <p style={{ margin: 0, fontSize: 12, color: '#dc2626', fontWeight: 700 }}>⚠️ {error}</p>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 14,
                border: '1.5px solid #e5e7eb', background: '#f9fafb',
                color: '#374151', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: FONT,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved || selectedSubjects.length === 0}
              style={{
                flex: 2, padding: '13px 0', borderRadius: 14, border: 'none',
                background: saved ? '#10b981' : (saving || selectedSubjects.length === 0) ? '#c4b5fd' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff', fontSize: 14, fontWeight: 800,
                cursor: (saving || saved || selectedSubjects.length === 0) ? 'not-allowed' : 'pointer',
                fontFamily: FONT,
                transition: 'background 0.2s ease',
              }}
            >
              {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Log'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
