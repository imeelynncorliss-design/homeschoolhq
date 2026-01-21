'use client'

import { useState } from 'react'

interface SuggestedDay {
  date: string
  lessonCount: number
  lessonHours: number
  suggestedStatus: 'full_day' | 'half_day'
  suggestedHours: number
}

interface ReconciliationPanelProps {
  suggestions: SuggestedDay[]
  onBulkConfirm: (dates: string[], status: 'full_day' | 'half_day', hours: number) => Promise<void>
  onDismissSuggestion: (date: string) => void
  onDismissAll: () => void
}

export default function ReconciliationPanel({ 
  suggestions, 
  onBulkConfirm, 
  onDismissSuggestion,
  onDismissAll 
}: ReconciliationPanelProps) {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<'full_day' | 'half_day'>('full_day')
  const [bulkHours, setBulkHours] = useState(4)
  const [processing, setProcessing] = useState(false)

  if (suggestions.length === 0) {
    return null
  }

  function toggleDate(date: string) {
    const newSelected = new Set(selectedDates)
    if (newSelected.has(date)) {
      newSelected.delete(date)
    } else {
      newSelected.add(date)
    }
    setSelectedDates(newSelected)
  }

  function selectAll() {
    setSelectedDates(new Set(suggestions.map(s => s.date)))
  }

  function deselectAll() {
    setSelectedDates(new Set())
  }

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

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            Suggested School Days
          </h3>
          <p className="text-sm text-gray-700 mt-1">
            These days have lessons but no attendance marked. Confirm them as school days?
          </p>
        </div>
        <button
          onClick={onDismissAll}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          Dismiss All
        </button>
      </div>

      {/* Bulk Actions */}
      <div className="bg-white rounded-lg p-3 mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={deselectAll}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Deselect All
            </button>
          </div>

          {selectedDates.size > 0 && (
            <>
              <div className="h-4 w-px bg-gray-300"></div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Mark as:</span>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as 'full_day' | 'half_day')}
                  className="text-sm px-2 py-1 border border-gray-300 rounded"
                >
                  <option value="full_day">Full Day</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Hours:</span>
                <input
                  type="number"
                  value={bulkHours}
                  onChange={(e) => setBulkHours(parseFloat(e.target.value))}
                  step="0.5"
                  min="0"
                  max="12"
                  className="w-16 text-sm px-2 py-1 border border-gray-300 rounded"
                />
              </div>

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
      </div>

      {/* Suggestions List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.date}
            className={`
              bg-white rounded-lg p-3 border-2 transition-all cursor-pointer
              ${selectedDates.has(suggestion.date) 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300'
              }
            `}
            onClick={() => toggleDate(suggestion.date)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {/* Checkbox */}
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={selectedDates.has(suggestion.date)}
                    onChange={() => toggleDate(suggestion.date)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Date Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {new Date(suggestion.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                      {suggestion.suggestedStatus === 'full_day' ? 'Full Day' : 'Half Day'}
                    </span>
                  </div>
                  
                  <div className="mt-1 text-sm text-gray-600">
                    {suggestion.lessonCount} lesson{suggestion.lessonCount !== 1 ? 's' : ''} • 
                    {' '}{suggestion.lessonHours.toFixed(1)} hours of lessons
                  </div>
                  
                  <div className="mt-1 text-xs text-gray-500">
                    Suggested: {suggestion.suggestedHours} hours
                  </div>
                </div>
              </div>

              {/* Individual Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDismissSuggestion(suggestion.date)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {selectedDates.size > 0 && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{selectedDates.size}</span> day{selectedDates.size !== 1 ? 's' : ''} selected • 
            {' '}Will add approximately <span className="font-semibold">{(selectedDates.size * bulkHours).toFixed(1)}</span> hours to your attendance
          </p>
        </div>
      )}
    </div>
  )
}