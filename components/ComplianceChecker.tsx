'use client'

import { useState, useMemo } from 'react'

interface ComplianceCheckerProps {
  totalDays: number
  totalHours: number
  requiredDays: number
  requiredHours?: number
  state?: string
}

interface ComplianceRequirement {
  name: string
  required: number
  actual: number
  met: boolean
  unit: string
}

interface StateRequirements {
  [key: string]: {
    days?: number
    hours?: number
    minimumHoursPerDay?: number
    description: string
  }
}

const STATE_REQUIREMENTS: StateRequirements = {
  'NC': {
    days: 180,
    description: 'North Carolina requires 180 days of instruction or equivalent hours'
  },
  'VA': {
    days: 180,
    description: 'Virginia requires 180 days of instruction'
  },
  'SC': {
    days: 180,
    hours: 4.5,
    description: 'South Carolina requires 180 days with 4.5 hours per day average'
  },
  'GA': {
    days: 180,
    hours: 4.5,
    description: 'Georgia requires 180 days with 4.5 hours per day average'
  },
  'FL': {
    days: 180,
    description: 'Florida requires 180 days of instruction'
  },
  'TX': {
    description: 'Texas requires instruction in good faith with a written curriculum (no specific day requirement)'
  },
  'CA': {
    days: 175,
    hours: 3,
    description: 'California requires 175 days with minimum 3 hours per day'
  },
  'NY': {
    days: 180,
    hours: 900,
    description: 'New York requires 180 days of instruction'
  },
  'PA': {
    days: 180,
    hours: 900,
    description: 'Pennsylvania requires 180 days or 900 hours of instruction'
  },
  'OH': {
    days: 180,
    hours: 4,
    description: 'Ohio requires 180 days with minimum 4 hours per day'
  }
}

export default function ComplianceChecker({ 
  totalDays, 
  totalHours, 
  requiredDays, 
  requiredHours,
  state 
}: ComplianceCheckerProps) {
  const [selectedState, setSelectedState] = useState(state || 'NC')

  const compliance = useMemo(() => {
    const stateReq = STATE_REQUIREMENTS[selectedState]
    const requirements: ComplianceRequirement[] = []

    // Days requirement
    if (stateReq?.days) {
      requirements.push({
        name: 'School Days',
        required: stateReq.days,
        actual: totalDays,
        met: totalDays >= stateReq.days,
        unit: 'days'
      })
    }

    // Total hours requirement
    if (stateReq?.hours && typeof stateReq.hours === 'number' && stateReq.hours > 10) {
      requirements.push({
        name: 'Total Hours',
        required: stateReq.hours,
        actual: totalHours,
        met: totalHours >= stateReq.hours,
        unit: 'hours'
      })
    }

    // Minimum hours per day
    if (stateReq?.minimumHoursPerDay || (stateReq?.hours && stateReq.hours <= 10)) {
      const minHours = stateReq.minimumHoursPerDay || stateReq.hours || 0
      const avgHours = totalDays > 0 ? totalHours / totalDays : 0
      requirements.push({
        name: 'Avg Hours/Day',
        required: minHours,
        actual: parseFloat(avgHours.toFixed(1)),
        met: avgHours >= minHours,
        unit: 'hours'
      })
    }

    const allMet = requirements.length > 0 ? requirements.every(r => r.met) : false
    const percentComplete = requirements.length > 0
      ? Math.round((requirements.filter(r => r.met).length / requirements.length) * 100)
      : 0

    return {
      requirements,
      allMet,
      percentComplete,
      description: stateReq?.description || 'Select your state to see requirements'
    }
  }, [selectedState, totalDays, totalHours])

  const getStatusColor = (met: boolean) => {
    return met ? 'text-green-600' : 'text-orange-600'
  }

  const getStatusIcon = (met: boolean) => {
    return met ? '✓' : '⚠'
  }

  const getProgressColor = () => {
    if (compliance.percentComplete === 100) return 'bg-green-600'
    if (compliance.percentComplete >= 50) return 'bg-yellow-600'
    return 'bg-orange-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Compliance Checker</h3>
          <p className="text-sm text-gray-600">Verify state requirements are being met</p>
        </div>
        
        {/* State Selector */}
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-medium"
        >
          <option value="">Select State</option>
          {Object.keys(STATE_REQUIREMENTS).sort().map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
      </div>

      {/* State Description */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700">{compliance.description}</p>
      </div>

      {/* Overall Status */}
      {compliance.requirements.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Compliance</span>
            <span className={`text-2xl font-bold ${compliance.allMet ? 'text-green-600' : 'text-orange-600'}`}>
              {compliance.percentComplete}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${getProgressColor()}`}
              style={{ width: `${compliance.percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* Requirements List */}
      {compliance.requirements.length > 0 ? (
        <div className="space-y-3">
          {compliance.requirements.map((req, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border-2 ${
                req.met 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getStatusIcon(req.met)}</span>
                  <span className="font-semibold text-gray-900">{req.name}</span>
                </div>
                <span className={`font-bold ${getStatusColor(req.met)}`}>
                  {req.met ? 'Met' : 'Not Met'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Required</p>
                  <p className="font-semibold text-gray-900">
                    {req.required} {req.unit}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Actual</p>
                  <p className="font-semibold text-gray-900">
                    {req.actual} {req.unit}
                  </p>
                </div>
              </div>

              {!req.met && (
                <div className="mt-2 pt-2 border-t border-orange-200">
                  <p className="text-xs text-gray-600">
                    {req.required - req.actual} {req.unit} needed to meet requirement
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Select your state to view specific requirements</p>
        </div>
      )}

      {/* Compliance Status Message */}
      {compliance.requirements.length > 0 && (
        <div className={`mt-6 p-4 rounded-lg ${
          compliance.allMet 
            ? 'bg-green-50 border-2 border-green-200' 
            : 'bg-orange-50 border-2 border-orange-200'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{compliance.allMet ? '🎉' : '📋'}</span>
            <div>
              <p className={`font-semibold ${compliance.allMet ? 'text-green-900' : 'text-orange-900'}`}>
                {compliance.allMet 
                  ? 'You\'re meeting all state requirements!' 
                  : 'Keep going! You\'re making progress.'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {compliance.allMet
                  ? 'Your attendance records meet all state compliance requirements. Great job!'
                  : 'Continue tracking your school days to meet all requirements.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 italic">
          ⚠️ Disclaimer: Requirements shown are general guidelines. Always verify with your local school district 
          or state education department for the most current and specific requirements for your situation.
        </p>
      </div>
    </div>
  )
}