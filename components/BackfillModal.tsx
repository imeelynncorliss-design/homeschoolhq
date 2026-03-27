'use client'

import { useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface BackfillModalProps {
  organizationId: string
  schoolYearStart?: string        // e.g. '2025-01-04' — pre-fills the From date
  existingDates: string[]         // dates already in daily_attendance — will be skipped
  onClose: () => void
  onComplete: () => void          // called after successful save so parent reloads data
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export default function BackfillModal({
  organizationId,
  schoolYearStart,
  existingDates,
  onClose,
  onComplete,
}: BackfillModalProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const yesterday = toLocalDateStr(addDays(new Date(), -1))

  const [fromDate,     setFromDate]     = useState(schoolYearStart ?? '')
  const [toDate,       setToDate]       = useState(yesterday)
  // Mon–Fri checked by default (index 0=Sun, 6=Sat)
  const [activeDays,   setActiveDays]   = useState([false, true, true, true, true, true, false])
  const [hoursPerDay,  setHoursPerDay]  = useState(6)
  const [saving,       setSaving]       = useState(false)
  const [done,         setDone]         = useState<{ added: number; skipped: number } | null>(null)

  const existingSet = useMemo(() => new Set(existingDates), [existingDates])

  // Build the list of dates that would be inserted
  const datesToAdd = useMemo(() => {
    if (!fromDate || !toDate || fromDate > toDate) return []
    const result: string[] = []
    let cursor = new Date(fromDate + 'T12:00:00') // noon to avoid DST shifts
    const end   = new Date(toDate   + 'T12:00:00')
    while (cursor <= end) {
      const dow    = cursor.getDay()
      const dateStr = toLocalDateStr(cursor)
      if (activeDays[dow] && !existingSet.has(dateStr)) {
        result.push(dateStr)
      }
      cursor = addDays(cursor, 1)
    }
    return result
  }, [fromDate, toDate, activeDays, existingSet])

  const skippedCount = useMemo(() => {
    if (!fromDate || !toDate || fromDate > toDate) return 0
    let count = 0
    let cursor = new Date(fromDate + 'T12:00:00')
    const end   = new Date(toDate   + 'T12:00:00')
    while (cursor <= end) {
      const dow     = cursor.getDay()
      const dateStr = toLocalDateStr(cursor)
      if (activeDays[dow] && existingSet.has(dateStr)) count++
      cursor = addDays(cursor, 1)
    }
    return count
  }, [fromDate, toDate, activeDays, existingSet])

  function toggleDay(idx: number) {
    setActiveDays(prev => prev.map((v, i) => i === idx ? !v : v))
  }

  async function handleSave() {
    if (!datesToAdd.length || saving) return
    setSaving(true)
    try {
      // Chunk in batches of 100 to stay within Supabase limits
      const BATCH = 100
      for (let i = 0; i < datesToAdd.length; i += BATCH) {
        const batch = datesToAdd.slice(i, i + BATCH).map(date => ({
          organization_id: organizationId,
          attendance_date: date,
          kid_id: null,
          status: 'full_day' as const,
          hours: hoursPerDay,
          notes: 'Backfilled',
          auto_generated: false,
        }))
        const { error } = await supabase.from('daily_attendance').insert(batch)
        if (error) throw error
      }
      setDone({ added: datesToAdd.length, skipped: skippedCount })
      onComplete()
    } catch (err) {
      console.error('Backfill error', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const canSave = datesToAdd.length > 0 && !saving

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        fontFamily: "'Nunito', sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 24,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          padding: '32px 28px', maxWidth: 480, width: '100%',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
          borderRadius: 16, padding: '20px 24px', marginBottom: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>📅</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 4px' }}>
            Backfill Past Attendance
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            Log school days from before you joined HomeschoolReady
          </p>
        </div>

        {done ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b', margin: '0 0 8px' }}>
              All done!
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 4px' }}>
              <strong style={{ color: '#7c3aed' }}>{done.added}</strong> school days added
            </p>
            {done.skipped > 0 && (
              <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 24px' }}>
                {done.skipped} days already had records — skipped
              </p>
            )}
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
                color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              Close
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Date range */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 10,
                    border: '2px solid #e5e7eb', fontSize: 14, color: '#111827',
                    fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  max={yesterday}
                  onChange={e => setToDate(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 10,
                    border: '2px solid #e5e7eb', fontSize: 14, color: '#111827',
                    fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Day of week selector */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                School Days
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={label}
                    onClick={() => toggleDay(idx)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                      cursor: 'pointer', fontSize: 12, fontWeight: 800,
                      fontFamily: "'Nunito', sans-serif",
                      background: activeDays[idx]
                        ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)'
                        : '#f3f4f6',
                      color: activeDays[idx] ? '#fff' : '#9ca3af',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours per day */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Hours per Day
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  value={hoursPerDay}
                  min={0.5}
                  max={12}
                  step={0.5}
                  onChange={e => setHoursPerDay(parseFloat(e.target.value) || 0)}
                  style={{
                    width: 90, padding: '9px 12px', borderRadius: 10,
                    border: '2px solid #e5e7eb', fontSize: 14, color: '#111827',
                    fontFamily: "'Nunito', sans-serif",
                  }}
                />
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  hours of instruction per school day
                </span>
              </div>
            </div>

            {/* Preview */}
            {fromDate && toDate && fromDate <= toDate && (
              <div style={{
                background: datesToAdd.length > 0 ? '#f5f3ff' : '#fef2f2',
                border: `2px solid ${datesToAdd.length > 0 ? '#ede9fe' : '#fee2e2'}`,
                borderRadius: 12, padding: '14px 16px',
              }}>
                {datesToAdd.length > 0 ? (
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#4c1d95' }}>
                      📅 {datesToAdd.length} school {datesToAdd.length === 1 ? 'day' : 'days'} will be added
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7c3aed' }}>
                      = {(datesToAdd.length * hoursPerDay).toFixed(1)} total hours logged
                      {skippedCount > 0 && ` · ${skippedCount} already recorded (will skip)`}
                    </p>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: '#dc2626', fontWeight: 700 }}>
                    {skippedCount > 0
                      ? `All ${skippedCount} matching days already have records — nothing to add`
                      : 'No school days in this range with the selected days of week'}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  border: '2px solid #e5e7eb', background: '#f9fafb',
                  color: '#6b7280', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                style={{
                  flex: 2, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: canSave
                    ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)'
                    : '#e5e7eb',
                  color: canSave ? '#fff' : '#9ca3af',
                  fontWeight: 800, fontSize: 14,
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  fontFamily: "'Nunito', sans-serif",
                  boxShadow: canSave ? '0 4px 14px rgba(124,58,237,0.35)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {saving ? '⏳ Adding days...' : `Add ${datesToAdd.length > 0 ? datesToAdd.length : ''} School Days`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
