'use client'

import { useState } from 'react'
import { parseLocalDate } from '@/src/lib/utils'

interface SuggestedDay {
  date: string
  lessonCount: number
  lessonHours: number
  suggestedStatus: 'full_day' | 'half_day'
  suggestedHours: number
}

interface DiscrepancyDay {
  date: string
  type: 'hours_mismatch' | 'no_school_with_lessons' | 'attendance_no_lessons' | 'outside_school_year'
  attendanceHours?: number
  lessonHours?: number
  attendanceStatus?: string
  lessonCount?: number
}

interface ReconciliationPanelProps {
  suggestions: SuggestedDay[]
  discrepancies?: DiscrepancyDay[]
  onBulkConfirm: (dates: string[], status: 'full_day' | 'half_day', hours: number) => Promise<void>
  onDismissSuggestion: (date: string) => void
  onDismissAll: () => void
  onFixDate: (date: string) => void
  onDismissDiscrepancy: (date: string, type: string) => void
}

const DISCREPANCY_LABELS: Record<DiscrepancyDay['type'], { icon: string; label: string; description: (d: DiscrepancyDay) => string; hint?: string; canDismiss: boolean }> = {
  hours_mismatch: {
    icon: '⚠️',
    label: 'Hours mismatch',
    description: (d) => `Attendance logged ${d.attendanceHours?.toFixed(1)}h but lessons show ${d.lessonHours?.toFixed(1)}h`,
    hint: 'Normal if the day included a field trip, museum visit, or hands-on work not logged as a lesson. Tap "Fix" to adjust hours, or "Dismiss" if everything is accurate.',
    canDismiss: true,
  },
  no_school_with_lessons: {
    icon: '🚫',
    label: 'Marked no school — but lessons exist',
    description: (d) => `${d.lessonCount} lesson${d.lessonCount !== 1 ? 's' : ''} were logged on this day`,
    hint: 'Tap "Fix" to update attendance status, or delete the lessons if they were added in error.',
    canDismiss: true,
  },
  attendance_no_lessons: {
    icon: '📭',
    label: 'Attendance logged — no lessons',
    description: (d) => `${d.attendanceHours?.toFixed(1)}h of attendance recorded but no lessons found`,
    hint: 'Tap "Fix" to add a lesson, log a field trip, or mark it as reviewed.',
    canDismiss: false,
  },
  outside_school_year: {
    icon: '📅',
    label: 'Outside school year',
    description: () => `This confirmed day falls outside your configured school year dates`,
    hint: 'Update your school year dates in Settings if this day should count.',
    canDismiss: true,
  },
}

const MAX_VISIBLE = 5

export default function ReconciliationPanel({
  suggestions,
  discrepancies = [],
  onBulkConfirm,
  onDismissSuggestion,
  onDismissAll,
  onFixDate,
  onDismissDiscrepancy,
}: ReconciliationPanelProps) {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<'full_day' | 'half_day'>('full_day')
  const [bulkHours, setBulkHours] = useState(4)
  const [processing, setProcessing] = useState(false)
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const [showAllDiscrepancies, setShowAllDiscrepancies] = useState(false)

  const visibleSuggestions = showAllSuggestions ? suggestions : suggestions.slice(0, MAX_VISIBLE)
  const visibleDiscrepancies = showAllDiscrepancies ? discrepancies : discrepancies.slice(0, MAX_VISIBLE)

  function toggleDate(date: string) {
    const next = new Set(selectedDates)
    next.has(date) ? next.delete(date) : next.add(date)
    setSelectedDates(next)
  }

  function selectAll() { setSelectedDates(new Set(suggestions.map(s => s.date))) }
  function deselectAll() { setSelectedDates(new Set()) }

  async function handleBulkConfirm() {
    if (selectedDates.size === 0) return
    setProcessing(true)
    try {
      await onBulkConfirm(Array.from(selectedDates), bulkStatus, bulkHours)
      setSelectedDates(new Set())
    } catch (error) {
      console.error('Failed to confirm:', error)
      alert('Failed to confirm attendance. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (suggestions.length === 0 && discrepancies.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

      {/* ── Suggested School Days ─────────────────────────────── */}
      {suggestions.length > 0 && (
        <div style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 8, padding: 16 }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <span>💡</span> Suggested School Days
                <span style={{ fontSize: 13, fontWeight: 400, color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: 999 }}>
                  {suggestions.length}
                </span>
              </h3>
              <p style={{ fontSize: 14, color: '#374151', marginTop: 4, marginBottom: 0 }}>
                These days have lessons logged but no attendance record. Confirm them to count toward compliance.
              </p>
            </div>
            <button onClick={onDismissAll} style={{ color: '#6b7280', fontSize: 14, whiteSpace: 'nowrap', marginLeft: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
              Dismiss All
            </button>
          </div>

          {/* Bulk action bar */}
          <div className="bg-white rounded-lg p-3 mb-3 flex items-center gap-3 flex-wrap">
            <button onClick={selectAll} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Select All</button>
            <span className="text-gray-300">|</span>
            <button onClick={deselectAll} className="text-sm text-gray-600 hover:text-gray-800">Deselect All</button>

            {selectedDates.size > 0 && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                <label htmlFor="bulk-status" className="text-sm text-gray-900">Mark as:</label>
                <select
                  id="bulk-status"
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as 'full_day' | 'half_day')}
                  className="text-sm px-2 py-1 border border-gray-300 rounded text-gray-900"
                >
                  <option value="full_day">Full Day</option>
                  <option value="half_day">Half Day</option>
                </select>
                <label htmlFor="bulk-hours" className="text-sm text-gray-700">Hours:</label>
                <input
                  id="bulk-hours"
                  type="number"
                  value={bulkHours}
                  onChange={(e) => setBulkHours(parseFloat(e.target.value))}
                  step="0.5" min="0" max="12"
                  className="w-16 text-sm px-2 py-1 border border-gray-300 rounded text-gray-900"
                />
                <button
                  onClick={handleBulkConfirm}
                  disabled={processing}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {processing ? 'Confirming...' : `Confirm ${selectedDates.size} Day${selectedDates.size !== 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>

          {/* Suggestions list — capped at MAX_VISIBLE */}
          <div className="space-y-2">
            {visibleSuggestions.map((s) => (
              <div
                key={s.date}
                onClick={() => toggleDate(s.date)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleDate(s.date)}
                role="checkbox"
                aria-checked={selectedDates.has(s.date)}
                tabIndex={0}
                style={{
                  background: selectedDates.has(s.date) ? '#eff6ff' : '#ffffff',
                  borderRadius: 8, padding: 12, cursor: 'pointer', transition: 'all 0.15s',
                  border: selectedDates.has(s.date) ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedDates.has(s.date)}
                      onChange={() => toggleDate(s.date)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
                          {new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span style={{ padding: '2px 8px', fontSize: 12, fontWeight: 500, borderRadius: 4, background: '#dbeafe', color: '#1e40af' }}>
                          {s.suggestedStatus === 'full_day' ? 'Full Day' : 'Half Day'}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 0 }}>
                        {s.lessonCount} lesson{s.lessonCount !== 1 ? 's' : ''} · {s.lessonHours.toFixed(1)}h · Suggested: {s.suggestedHours}h
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDismissSuggestion(s.date) }}
                    className="text-xs text-gray-500 hover:text-gray-700 ml-2"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Show more / less toggle */}
          {suggestions.length > MAX_VISIBLE && (
            <button
              onClick={() => setShowAllSuggestions(v => !v)}
              style={{ marginTop: 12, width: '100%', fontSize: 14, color: '#2563eb', fontWeight: 500, padding: '4px 0', border: '1px solid #bfdbfe', borderRadius: 8, background: '#ffffff', cursor: 'pointer' }}
            >
              {showAllSuggestions
                ? `Show less ▲`
                : `Show ${suggestions.length - MAX_VISIBLE} more ▼`}
            </button>
          )}

          {/* Summary */}
          {selectedDates.size > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #bfdbfe', fontSize: 14, color: '#374151' }}>
              <span style={{ fontWeight: 600 }}>{selectedDates.size}</span> day{selectedDates.size !== 1 ? 's' : ''} selected ·{' '}
              ~<span style={{ fontWeight: 600 }}>{(selectedDates.size * bulkHours).toFixed(1)}</span>h will be added
            </div>
          )}
        </div>
      )}

      {/* ── Reconciliation Panel ──────────────────────────────── */}
      {discrepancies.length > 0 && (
        <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: 8, padding: 16 }}>
          <div className="mb-3">
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <span>🔍</span> Reconciliation Panel
              <span style={{ fontSize: 13, fontWeight: 400, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 999 }}>
                {discrepancies.length} issue{discrepancies.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <p style={{ fontSize: 14, color: '#374151', marginTop: 4, marginBottom: 0 }}>
              These attendance records have data conflicts that may affect your compliance numbers. Review each one.
            </p>
          </div>

          <div className="space-y-2">
            {visibleDiscrepancies.map((d) => {
              const meta = DISCREPANCY_LABELS[d.type]
              return (
                <div key={`${d.date}-${d.type}`} style={{ background: '#ffffff', borderRadius: 8, padding: 12, border: '2px solid #fde68a' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
                          {parseLocalDate(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span style={{ padding: '2px 8px', fontSize: 12, fontWeight: 500, borderRadius: 4, background: '#fef3c7', color: '#92400e' }}>
                          {meta.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4, marginBottom: 0 }}>{meta.description(d)}</p>
                      {meta.hint && (
                        <p style={{ fontSize: 12, color: '#2563eb', marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>{meta.hint}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                      {d.type === 'outside_school_year' ? (
                        <a href="/school-year" style={{ fontSize: 12, color: '#b45309', fontWeight: 500, whiteSpace: 'nowrap', textDecoration: 'underline' }}>
                          Fix →
                        </a>
                      ) : (
                        <button
                          onClick={() => onFixDate(d.date)}
                          style={{ fontSize: 12, color: '#b45309', fontWeight: 500, whiteSpace: 'nowrap', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Fix →
                        </button>
                      )}
                      {meta.canDismiss && (
                        <button
                          onClick={() => onDismissDiscrepancy(d.date, d.type)}
                          style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Show more / less toggle */}
          {discrepancies.length > MAX_VISIBLE && (
            <button
              onClick={() => setShowAllDiscrepancies(v => !v)}
              style={{ marginTop: 12, width: '100%', fontSize: 14, color: '#b45309', fontWeight: 500, padding: '4px 0', border: '1px solid #fde68a', borderRadius: 8, background: '#ffffff', cursor: 'pointer' }}
            >
              {showAllDiscrepancies
                ? `Show less ▲`
                : `Show ${discrepancies.length - MAX_VISIBLE} more ▼`}
            </button>
          )}
        </div>
      )}

    </div>
  )
}