'use client'

import { useMemo } from 'react'
import { useStateComplianceTemplates } from '@/src/hooks/useStateComplianceTemplates'

interface ComplianceCheckerProps {
  totalDays: number
  totalHours: number
  stateInfo?: any
  loadingState?: boolean
  kidId?: string
  organizationId?: string
}

interface ComplianceRequirement {
  name: string
  required: number
  actual: number
  met: boolean
  unit: string
  type: 'required' | 'guideline' | 'none'
}

export default function ComplianceChecker({ 
  totalDays, 
  totalHours, 
  stateInfo,
  loadingState = false,
  kidId,
  organizationId
}: ComplianceCheckerProps) {
  const { templates, loading, getTemplate } = useStateComplianceTemplates()

  const compliance = useMemo(() => {
    if (!stateInfo) {
      return {
        requirements: [],
        allMet: false,
        percentComplete: 0,
        description: 'Configure your state in Settings to see requirements',
        template: null
      }
    }

    // For CUSTOM states, use the stateInfo directly
    if (stateInfo.isCustom) {
      return {
        requirements: [],
        allMet: false,
        percentComplete: 0,
        description: `${stateInfo.state_name} - Custom compliance settings`,
        template: null
      }
    }

    // For preset states, get template
    const template = getTemplate(stateInfo.state_code)
    if (!template) {
      return {
        requirements: [],
        allMet: false,
        percentComplete: 0,
        description: 'Unable to load state requirements',
        template: null
      }
    }

    const requirements: ComplianceRequirement[] = []

    // Days requirement
    if (template.required_days > 0) {
      const met = totalDays >= template.required_days
      requirements.push({
        name: 'School Days',
        required: template.required_days,
        actual: totalDays,
        met: met,
        unit: 'days',
        type: template.day_requirement_type
      })
    }

    // Hours requirement
    if (template.required_hours > 0) {
      const met = totalHours >= template.required_hours
      requirements.push({
        name: 'Total Hours',
        required: template.required_hours,
        actual: totalHours,
        met: met,
        unit: 'hours',
        type: template.hour_requirement_type
      })
    }

    // Calculate compliance - respect requirement types
    const requirementsMet = requirements.filter(r => {
      if (r.type === 'required') {
        return r.met
      } else if (r.type === 'guideline') {
        // Guideline: 80% is considered on track
        return (r.actual / r.required) >= 0.8
      }
      return true // 'none' type always passes
    }).length

    const allMet = requirements.length > 0 ? requirementsMet === requirements.length : false
    const percentComplete = requirements.length > 0
      ? Math.round((requirementsMet / requirements.length) * 100)
      : 0

    // Build description
    const descParts: string[] = []
    
    if (template.required_days > 0) {
      const verb = template.day_requirement_type === 'required' ? 'requires' : 'recommends'
      descParts.push(`${verb} ${template.required_days} days`)
    }
    
    if (template.required_hours > 0) {
      const verb = template.hour_requirement_type === 'required' ? 'requires' : 'recommends'
      descParts.push(`${verb} ${template.required_hours} hours`)
    }

    const description = template.state_name + ' ' + 
      (descParts.length > 0 
        ? descParts.join(' and ') + ' of instruction'
        : 'has flexible homeschool requirements')

    return {
      requirements,
      allMet,
      percentComplete,
      description,
      template
    }
  }, [stateInfo, totalDays, totalHours, getTemplate])

  const getStatusColor = (req: ComplianceRequirement) => {
    if (req.type === 'none') return 'text-gray-600'
    if (req.type === 'guideline') {
      const percent = (req.actual / req.required) * 100
      if (percent >= 80) return 'text-green-600'
      if (percent >= 50) return 'text-yellow-600'
      return 'text-orange-600'
    }
    return req.met ? 'text-green-600' : 'text-orange-600'
  }

  const getStatusIcon = (req: ComplianceRequirement) => {
    if (req.type === 'none') return 'ℹ️'
    if (req.type === 'guideline') {
      const percent = (req.actual / req.required) * 100
      return percent >= 80 ? '✓' : '⚠'
    }
    return req.met ? '✓' : '⚠'
  }

  const getStatusText = (req: ComplianceRequirement) => {
    if (req.type === 'none') return 'Not Regulated'
    if (req.type === 'guideline') {
      const percent = (req.actual / req.required) * 100
      return percent >= 80 ? 'On Track' : 'Below Guideline'
    }
    return req.met ? 'Met' : 'Not Met'
  }

  const getProgressColor = () => {
    if (compliance.percentComplete === 100) return 'bg-green-600'
    if (compliance.percentComplete >= 50) return 'bg-yellow-600'
    return 'bg-orange-600'
  }

  const getRequirementBorderColor = (req: ComplianceRequirement) => {
    if (req.type === 'none') return 'border-gray-200 bg-gray-50'
    if (req.type === 'guideline') {
      const percent = (req.actual / req.required) * 100
      if (percent >= 80) return 'border-green-200 bg-green-50'
      return 'border-yellow-200 bg-yellow-50'
    }
    return req.met 
      ? 'border-green-200 bg-green-50' 
      : 'border-orange-200 bg-orange-50'
  }

  if (loading || loadingState) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header with State Display */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Compliance Checker</h3>
          <p className="text-sm text-gray-600">Verify state requirements are being met</p>
        </div>
        
        {/* State Display with Link to Settings */}
        <div className="text-right">
          <p className="text-xs text-gray-600">Your State:</p>
          <p className="text-sm font-semibold text-gray-900">
            {stateInfo ? stateInfo.state_name : 'Not Set'}
          </p>
          <a 
            href="/admin" 
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Change in Settings →
          </a>
        </div>
      </div>

      {/* No State Configured Message */}
      {!stateInfo && (
        <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-gray-700 font-medium mb-1">⚠️ No state configured</p>
          <p className="text-sm text-gray-600">
            Go to <a href="/admin" className="text-blue-600 hover:underline">School Year Setup</a> to select your state and enable compliance tracking.
          </p>
        </div>
      )}

      {/* State Description with Link */}
      {stateInfo && !stateInfo.isCustom && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">{compliance.description}</p>
          {compliance.template && (
            <a 
              href={compliance.template.official_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
            >
              Verify at {compliance.template.official_source_name} →
            </a>
          )}
        </div>
      )}

      {/* Custom State Message */}
      {stateInfo?.isCustom && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-700 font-medium">📋 Custom Compliance Settings</p>
          <p className="text-xs text-gray-600 mt-1">
            You're using custom compliance settings for {stateInfo.state_name}. 
            Update your requirements in <a href="/admin" className="text-blue-600 hover:underline">Settings</a>.
          </p>
        </div>
      )}

      {/* Overall Progress */}
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
              className={`p-4 rounded-lg border-2 ${getRequirementBorderColor(req)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getStatusIcon(req)}</span>
                  <div>
                    <span className="font-semibold text-gray-900">{req.name}</span>
                    {req.type !== 'required' && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                        {req.type === 'guideline' ? 'Guideline' : 'Not Regulated'}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`font-bold ${getStatusColor(req)}`}>
                  {getStatusText(req)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">
                    {req.type === 'required' ? 'Required' : req.type === 'guideline' ? 'Recommended' : 'Tracking'}
                  </p>
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

              {!req.met && req.type === 'required' && (
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
          <p>
            {stateInfo
              ? `${stateInfo.state_name} has flexible homeschool requirements. Continue tracking for your records.`
              : 'Configure your state in Settings to view requirements'}
          </p>
        </div>
      )}

      {/* Status Message */}
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
                  ? `You're meeting all ${stateInfo?.state_name} requirements!` 
                  : 'Keep going! You\'re making progress.'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {compliance.allMet
                  ? 'Your attendance records meet all compliance requirements.'
                  : 'Continue tracking to meet all requirements.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 italic">
          ⚠️ {compliance.template?.disclaimer_text || 
            'Requirements shown are general guidelines. Always verify with your state education department for current requirements.'}
        </p>
      </div>
    </div>
  )
}