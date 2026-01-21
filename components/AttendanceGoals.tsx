'use client'

import { useState, useEffect } from 'react'

interface AttendanceGoalsProps {
  totalDays: number
  totalHours: number
  organizationId: string
  onGoalsUpdate?: () => void
}

interface Goals {
  targetDays: number
  targetHours?: number
  targetDate?: string
  customGoals?: string[]
}

export default function AttendanceGoals({ 
  totalDays, 
  totalHours, 
  organizationId,
  onGoalsUpdate 
}: AttendanceGoalsProps) {
  const [goals, setGoals] = useState<Goals>({
    targetDays: 180,
    targetHours: undefined,
    targetDate: undefined,
    customGoals: []
  })
  const [isEditing, setIsEditing] = useState(false)
  const [newGoal, setNewGoal] = useState('')

  useEffect(() => {
    loadGoals()
  }, [organizationId])

  function loadGoals() {
    const stored = localStorage.getItem(`attendance_goals_${organizationId}`)
    if (stored) {
      setGoals(JSON.parse(stored))
    }
  }

  function saveGoals(updatedGoals: Goals) {
    localStorage.setItem(`attendance_goals_${organizationId}`, JSON.stringify(updatedGoals))
    setGoals(updatedGoals)
    onGoalsUpdate?.()
  }

  function updateTargetDays(days: number) {
    saveGoals({ ...goals, targetDays: days })
  }

  function updateTargetHours(hours: number | undefined) {
    saveGoals({ ...goals, targetHours: hours })
  }

  function updateTargetDate(date: string | undefined) {
    saveGoals({ ...goals, targetDate: date })
  }

  function addCustomGoal() {
    if (!newGoal.trim()) return
    const updatedGoals = [...(goals.customGoals || []), newGoal.trim()]
    saveGoals({ ...goals, customGoals: updatedGoals })
    setNewGoal('')
  }

  function removeCustomGoal(index: number) {
    const updatedGoals = [...(goals.customGoals || [])]
    updatedGoals.splice(index, 1)
    saveGoals({ ...goals, customGoals: updatedGoals })
  }

  function toggleCustomGoal(index: number) {
    // Mark as complete by adding a ✓ prefix
    const updatedGoals = [...(goals.customGoals || [])]
    const goal = updatedGoals[index]
    if (goal.startsWith('✓ ')) {
      updatedGoals[index] = goal.substring(2)
    } else {
      updatedGoals[index] = '✓ ' + goal
    }
    saveGoals({ ...goals, customGoals: updatedGoals })
  }

  const daysProgress = (totalDays / goals.targetDays) * 100
  const hoursProgress = goals.targetHours ? (totalHours / goals.targetHours) * 100 : undefined

  const daysRemaining = goals.targetDays - totalDays
  const hoursRemaining = goals.targetHours ? goals.targetHours - totalHours : undefined

  // Calculate estimated completion date based on current pace
  function getEstimatedCompletion() {
    if (totalDays === 0) return 'N/A'
    
    const today = new Date()
    const startOfYear = new Date(today.getFullYear(), 7, 1) // August 1
    const daysIntoYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysIntoYear === 0) return 'N/A'
    
    const daysPerDay = totalDays / daysIntoYear
    const daysToGo = goals.targetDays - totalDays
    
    if (daysPerDay === 0 || daysToGo <= 0) return 'Already met!'
    
    const daysRemaining = Math.ceil(daysToGo / daysPerDay)
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + daysRemaining)
    
    return completionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Attendance Goals</h3>
          <p className="text-sm text-gray-600">Set targets and track your progress</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium"
        >
          {isEditing ? 'Done' : 'Edit Goals'}
        </button>
      </div>

      {/* Edit Mode */}
      {isEditing && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target School Days *
            </label>
            <input
              type="number"
              value={goals.targetDays}
              onChange={(e) => updateTargetDays(parseInt(e.target.value))}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Total Hours (optional)
            </label>
            <input
              type="number"
              value={goals.targetHours || ''}
              onChange={(e) => updateTargetHours(e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="0.5"
              placeholder="e.g., 900"
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Completion Date (optional)
            </label>
            <input
              type="date"
              value={goals.targetDate || ''}
              onChange={(e) => updateTargetDate(e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
            />
          </div>
        </div>
      )}

      {/* Days Goal Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">School Days Goal</span>
          <span className="text-sm text-gray-600">
            {totalDays} / {goals.targetDays} days
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div
            className={`h-4 rounded-full transition-all ${
              daysProgress >= 100 ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(daysProgress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{Math.round(daysProgress)}% complete</span>
          {daysRemaining > 0 && <span>{daysRemaining} days to go</span>}
          {daysRemaining <= 0 && <span className="text-green-600 font-semibold">Goal met! 🎉</span>}
        </div>
      </div>

      {/* Hours Goal Progress (if set) */}
      {goals.targetHours && hoursProgress !== undefined && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Total Hours Goal</span>
            <span className="text-sm text-gray-600">
              {totalHours.toFixed(1)} / {goals.targetHours} hours
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className={`h-4 rounded-full transition-all ${
                hoursProgress >= 100 ? 'bg-green-600' : 'bg-purple-600'
              }`}
              style={{ width: `${Math.min(hoursProgress, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{Math.round(hoursProgress)}% complete</span>
            {hoursRemaining && hoursRemaining > 0 && (
              <span>{hoursRemaining.toFixed(1)} hours to go</span>
            )}
            {hoursRemaining && hoursRemaining <= 0 && (
              <span className="text-green-600 font-semibold">Goal met! 🎉</span>
            )}
          </div>
        </div>
      )}

      {/* Estimated Completion */}
      <div className="mb-6 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Estimated Completion:</span>
          <span className="font-semibold text-gray-900">{getEstimatedCompletion()}</span>
        </div>
        {goals.targetDate && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-600">Target Date:</span>
            <span className="font-semibold text-gray-900">
              {new Date(goals.targetDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          </div>
        )}
      </div>

      {/* Custom Goals */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Custom Goals</h4>
        </div>

        {isEditing && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomGoal()}
              placeholder="Add a custom goal..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
            />
            <button
              onClick={addCustomGoal}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              Add
            </button>
          </div>
        )}

        {goals.customGoals && goals.customGoals.length > 0 ? (
          <div className="space-y-2">
            {goals.customGoals.map((goal, index) => {
              const isComplete = goal.startsWith('✓ ')
              const displayGoal = isComplete ? goal.substring(2) : goal

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded ${
                    isComplete ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => toggleCustomGoal(index)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isComplete
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {isComplete && '✓'}
                    </button>
                    <span className={`text-sm ${isComplete ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                      {displayGoal}
                    </span>
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => removeCustomGoal(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            {isEditing ? 'Add custom goals to track specific milestones' : 'No custom goals set'}
          </p>
        )}
      </div>

      {/* Motivational Message */}
      {daysProgress >= 100 && (!goals.targetHours || (hoursProgress && hoursProgress >= 100)) && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-semibold text-green-900">Congratulations!</p>
              <p className="text-sm text-gray-700 mt-1">
                You've met all your attendance goals for the year! Keep up the great work!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}