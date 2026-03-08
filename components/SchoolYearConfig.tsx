'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'
import { Shield, Download } from 'lucide-react'
import { generateComplianceReport } from '@/src/utils/generateComplianceReport'

interface SchoolYearConfigProps {
  userId: string
}

type LessonRow = {
  id: string
  kid_id: string
  status: string
  duration_minutes: number | null
}
export default function SchoolYearConfig({ userId }: SchoolYearConfigProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [complianceScore, setComplianceScore] = useState<number | null>(null)
  const [completedCount, setCompletedCount] = useState<number>(0)

  const [selectedState, setSelectedState] = useState<string>('')
  const [states, setStates] = useState<any[]>([])
  const [stateRequirements, setStateRequirements] = useState<any>(null)
  const [showCustomFields, setShowCustomFields] = useState(false)
  const [customCompliance, setCustomCompliance] = useState({
    stateName: '',
    days: '',
    hours: '',
    notes: '',
  })

  const [config, setConfig] = useState({
    school_year_start: '',
    school_year_end: '',
    annual_goal_type: 'hours',
    annual_goal_value: 180,
    weekly_goal_hours: 25,
  })

  const ensureHttps = (url: string) => {
    if (!url) return ''
    return url.startsWith('http') ? url : `https://${url}`
  }

  useEffect(() => { getOrganizationId() }, [userId])
  useEffect(() => { if (organizationId) { loadConfig(); loadComplianceScore() } }, [organizationId])
  useEffect(() => { fetchStates() }, [])
  useEffect(() => {
    if (!selectedState || selectedState === 'CUSTOM') { setStateRequirements(null); return }
    fetchStateRequirements()
  }, [selectedState])

  useEffect(() => {
    if (stateRequirements) {
      if (stateRequirements.required_days !== '0') {
        setConfig(prev => ({ ...prev, annual_goal_type: 'lessons', annual_goal_value: parseInt(stateRequirements.required_days) }))
      } else if (stateRequirements.required_hours !== '0') {
        setConfig(prev => ({ ...prev, annual_goal_type: 'hours', annual_goal_value: parseInt(stateRequirements.required_hours) }))
      }
    }
  }, [stateRequirements])

  useEffect(() => {
    if (config.annual_goal_value > 0 && completedCount >= 0) {
      setComplianceScore(Math.min(100, Math.round((completedCount / config.annual_goal_value) * 100)))
    }
  }, [config.annual_goal_value, completedCount])

  const getOrganizationId = async () => {
    const { data: kids } = await supabase.from('kids').select('organization_id').eq('user_id', userId).limit(1)
    if (kids && kids.length > 0) setOrganizationId(kids[0].organization_id)
  }

  const loadComplianceScore = async () => {
    if (!organizationId) return
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, status')
      .eq('organization_id', organizationId)
    if (lessons) {
    const completed = lessons.filter((l: { status: string }) => l.status === 'completed').length
      setCompletedCount(completed)
    }
  }

  const fetchStates = async () => {
    const { data } = await supabase.from('state_compliance_templates').select('state_code, state_name').eq('status', 'active').order('state_name')
    if (data) setStates(data)
  }

  const fetchStateRequirements = async () => {
    const { data } = await supabase.from('state_compliance_templates').select('*').eq('state_code', selectedState).single()
    if (data) setStateRequirements(data)
  }

  const loadConfig = async () => {
    if (!organizationId) return
    const { data } = await supabase.from('school_year_settings').select('*').eq('organization_id', organizationId).single()
    if (data) {
      setConfig({
        school_year_start: data.school_year_start || '',
        school_year_end: data.school_year_end || '',
        annual_goal_type: data.annual_goal_type || 'hours',
        annual_goal_value: data.annual_goal_value || 180,
        weekly_goal_hours: data.weekly_goal_hours || 25,
      })
      if (data.selected_state) { setSelectedState(data.selected_state); setShowCustomFields(data.selected_state === 'CUSTOM') }
      if (data.custom_required_days || data.custom_required_hours || data.custom_compliance_notes || data.custom_state_name) {
        setCustomCompliance({ stateName: data.custom_state_name || '', days: data.custom_required_days?.toString() || '', hours: data.custom_required_hours?.toString() || '', notes: data.custom_compliance_notes || '' })
      }
    }
    setLoading(false)
  }

  const saveConfig = async () => {
    if (!organizationId) return
    setSaving(true)
    const { data: existing } = await supabase.from('school_year_settings').select('id').eq('organization_id', organizationId).single()
    const dataToSave = {
      ...config,
      selected_state: selectedState,
      custom_state_name: showCustomFields ? customCompliance.stateName : null,
      custom_required_days: showCustomFields && customCompliance.days ? parseInt(customCompliance.days) : null,
      custom_required_hours: showCustomFields && customCompliance.hours ? parseInt(customCompliance.hours) : null,
      custom_compliance_notes: showCustomFields ? customCompliance.notes : null,
      organization_id: organizationId,
      user_id: userId,
    }
    let result
    if (existing) {
      result = await supabase.from('school_year_settings').update(dataToSave).eq('organization_id', organizationId)
    } else {
      result = await supabase.from('school_year_settings').insert([dataToSave])
    }
    setSaving(false)
    if (result.error) { alert(`Error saving: ${result.error.message}`) }
    else { alert('Settings saved successfully!'); loadConfig() }
  }

  // ── PDF Export ──────────────────────────────────────────────────────────────

  const handleExportReport = async () => {
    if (!organizationId) return
    setIsExporting(true)
    try {
      // Fetch kids
      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname, firstname, lastname, photo_url, grade, age')
        .eq('organization_id', organizationId)

      if (!kidsData || kidsData.length === 0) {
        alert('No students found. Add a child before generating a report.')
        return
      }

      // Fetch attendance days
      const { data: attendanceData } = await supabase
        .from('daily_attendance')
        .select('id, kid_id')
        .eq('organization_id', organizationId)
        .in('status', ['full_day', 'half_day'])

      const attendanceDays = attendanceData?.length ?? 0

      // Fetch lessons
      const kidIds = kidsData.map((k: { id: string }) => k.id)
      const { data: allLessons } = await supabase
        .from('lessons')
        .select('id, kid_id, status, duration_minutes')
        .in('kid_id', kidIds)

      const requiredDays = config.annual_goal_value
      const requiredHours = config.annual_goal_type === 'hours' ? config.annual_goal_value : 0

      // Build per-kid compliance data
      const complianceData = kidsData.map((kid: { id: string; displayname: string; firstname: string; lastname: string; photo_url?: string; grade?: string; age?: number }) => {
        const kidLessons = (allLessons ?? []).filter((l: { kid_id: string; status: string; duration_minutes: number | null }) => l.kid_id === kid.id)
        const completedMinutes = kidLessons
        .filter((l: { status: string; duration_minutes: number | null }) => l.status === 'completed')
        .reduce((sum: number, l: { duration_minutes: number | null }) => sum + (l.duration_minutes ?? 0), 0)
        const totalHours = Math.round((completedMinutes / 60) * 10) / 10
        const totalDays = attendanceDays

        const daysScore = requiredDays > 0 ? Math.min(100, Math.round((totalDays / requiredDays) * 100)) : 100
        const hoursScore = requiredHours > 0 ? Math.min(100, Math.round((totalHours / requiredHours) * 100)) : 100
        const healthScore = requiredHours > 0
          ? Math.round(daysScore * 0.6 + hoursScore * 0.4)
          : daysScore

        return {
          kid,
          totalHours,
          totalDays,
          healthScore,
          requiredHours,
          requiredDays,
          hoursRemaining: Math.max(0, requiredHours - totalHours),
          daysRemaining: Math.max(0, requiredDays - totalDays),
          onTrack: healthScore >= 60,
        }
      })

      const familyHealthScore = Math.round(
        complianceData.reduce((sum: number, d: { healthScore: number }) => sum + d.healthScore, 0) / complianceData.length
      )

      await generateComplianceReport({
        complianceData,
        settings: {
          state_code: selectedState || undefined,
          school_year_start_date: config.school_year_start,
          school_year_end_date: config.school_year_end,
          required_annual_days: requiredDays,
          required_annual_hours: requiredHours || undefined,
        },
        familyHealthScore,
      })
    } catch (err) {
      console.error('Export failed:', err)
      alert('Failed to generate report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const scoreBannerStyle = complianceScore === null ? null
    : complianceScore >= 80 ? { bg: 'bg-green-50 border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-700', icon: '✅' }
    : complianceScore >= 40 ? { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-700', icon: '⚠️' }
    : { bg: 'bg-red-50 border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-700', icon: '🚨' }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">School Year Setup</h2>
          <p className="text-gray-600">Configure your calendar, state compliance, and goals</p>
        </div>
        <button
          onClick={handleExportReport}
          disabled={isExporting || !config.school_year_start}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
        >
          <Download size={15} />
          {isExporting ? 'Generating...' : 'Export PDF Report'}
        </button>
      </div>

      {/* ── Progress Summary Banner ── */}
      {complianceScore !== null && scoreBannerStyle && (
        <div className={`rounded-lg p-4 border ${scoreBannerStyle.bg} flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{scoreBannerStyle.icon}</span>
            <div>
              <p className={`font-semibold ${scoreBannerStyle.text}`}>
                Annual Goal Progress: {complianceScore}%
              </p>
              <p className={`text-sm ${scoreBannerStyle.text} opacity-80`}>
                {completedCount} of {config.annual_goal_value} {config.annual_goal_type === 'hours' ? 'hours' : 'lessons'} completed
                {complianceScore < 80 && ' · You may need to pick up the pace to meet your annual goal'}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/progress'}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${scoreBannerStyle.badge} border border-current border-opacity-20 hover:opacity-80 transition-opacity`}
          >
            View Full Progress →
          </button>
        </div>
      )}

      {/* School Year Dates */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 School Year Dates</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School Year Start Date</label>
            <input type="date" value={config.school_year_start} onChange={(e) => setConfig({ ...config, school_year_start: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School Year End Date</label>
            <input type="date" value={config.school_year_end} onChange={(e) => setConfig({ ...config, school_year_end: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
          </div>
        </div>
      </div>

      {/* State & Compliance */}
      <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">State & Compliance</h3>
        </div>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="text-gray-700">
            💡 <strong>Why select your state?</strong> Each state has different homeschool requirements.
            We'll show you what's legally required and help you track compliance throughout the year.
          </p>
          <p className="text-gray-700 mt-2">
            We currently have detailed requirements for 10 states. If your state isn't listed,
            select "Custom / Other State" to enter your own requirements.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Your State</label>
          <select
            value={selectedState}
            onChange={(e) => { setSelectedState(e.target.value); setShowCustomFields(e.target.value === 'CUSTOM') }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select your state...</option>
            {states.map((state) => <option key={state.state_code} value={state.state_code}>{state.state_name} ({state.state_code})</option>)}
            <option value="CUSTOM">Custom / Other State</option>
          </select>
          <p className="text-sm text-gray-600 mt-1">
            {showCustomFields ? 'Enter your custom compliance requirements below' : "We'll auto-load your state's homeschool requirements"}
          </p>
        </div>

        {showCustomFields && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">Enter your state's requirements or your personal goals:</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State/Region Name</label>
              <input type="text" value={customCompliance.stateName} onChange={(e) => setCustomCompliance({...customCompliance, stateName: e.target.value})} placeholder="e.g., Alaska, Montana, or your region" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
              <p className="text-xs text-gray-600 mt-1">This helps you identify your custom compliance settings</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Days (optional)</label>
                <input type="number" value={customCompliance.days} onChange={(e) => setCustomCompliance({...customCompliance, days: e.target.value})} placeholder="e.g., 180" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Hours (optional)</label>
                <input type="number" value={customCompliance.hours} onChange={(e) => setCustomCompliance({...customCompliance, hours: e.target.value})} placeholder="e.g., 900" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
              <textarea value={customCompliance.notes} onChange={(e) => setCustomCompliance({...customCompliance, notes: e.target.value})} placeholder="Add any additional requirements or notes about your state's homeschool laws..." rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
            </div>
          </div>
        )}

        {selectedState && stateRequirements && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-900">{stateRequirements.state_name} requirements:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              {stateRequirements.required_days !== '0' && (
                <li>• <strong>{stateRequirements.required_days} days</strong>{stateRequirements.day_requirement_type === 'Required' ? ' (required)' : ' (guideline)'}</li>
              )}
              {stateRequirements.required_hours !== '0' && (
                <li>• <strong>{stateRequirements.required_hours} hours</strong>{stateRequirements.hour_requirement_type === 'Required' ? ' (required)' : ' (guideline)'}</li>
              )}
            </ul>
            {stateRequirements.overall_notes && (
              <div className="mt-3 pt-3 border-t border-blue-300">
                <p className="text-xs font-semibold text-gray-800 mb-2">📋 Additional Details:</p>
                <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{stateRequirements.overall_notes}</p>
              </div>
            )}
            <a href={ensureHttps(stateRequirements.official_source_url)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mt-2">
              Verify at {stateRequirements.official_source_name} →
            </a>
          </div>
        )}
      </div>

      {/* Annual Goals */}
      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Annual Learning Goals</h3>
        {selectedState && selectedState !== 'CUSTOM' && stateRequirements && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="text-gray-700">💡 <strong>Pre-filled from {stateRequirements.state_name} requirements.</strong> You can adjust these to exceed state minimums or match your family's goals.</p>
          </div>
        )}
        {selectedState === 'CUSTOM' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <p className="text-gray-700">💡 <strong>Set your own goals.</strong> Most states require 180 days or 900 hours annually.</p>
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Track Progress By:</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input type="radio" value="hours" checked={config.annual_goal_type === 'hours'} onChange={(e) => setConfig({ ...config, annual_goal_type: e.target.value as 'hours' | 'lessons' })} className="mr-2" />
              <span className="text-gray-900">Hours</span>
            </label>
            <label className="flex items-center">
              <input type="radio" value="lessons" checked={config.annual_goal_type === 'lessons'} onChange={(e) => setConfig({ ...config, annual_goal_type: e.target.value as 'hours' | 'lessons' })} className="mr-2" />
              <span className="text-gray-900">Lessons/Days</span>
            </label>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Annual Goal ({config.annual_goal_type})</label>
            <input type="number" value={config.annual_goal_value} onChange={(e) => { const value = e.target.value === '' ? 0 : parseInt(e.target.value); setConfig({ ...config, annual_goal_value: isNaN(value) ? 0 : value }) }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" placeholder="e.g., 180" />
            <p className="text-xs text-gray-600 mt-1">{config.annual_goal_type === 'hours' ? 'Total hours required for the year (common: 180-900)' : 'Total lesson days required (common: 180)'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Goal (hours)</label>
            <input type="number" value={config.weekly_goal_hours} onChange={(e) => { const value = e.target.value === '' ? 0 : parseInt(e.target.value); setConfig({ ...config, weekly_goal_hours: isNaN(value) ? 0 : value }) }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" placeholder="e.g., 25" />
            <p className="text-xs text-gray-600 mt-1">Recommended hours per week</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={saveConfig} disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-400">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}