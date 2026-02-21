'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'
import { Shield } from 'lucide-react'

interface SchoolYearConfigProps {
  userId: string
}

export default function SchoolYearConfig({ userId }: SchoolYearConfigProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  
  const [selectedState, setSelectedState] = useState<string>('')
  const [states, setStates] = useState<any[]>([])
  const [stateRequirements, setStateRequirements] = useState<any>(null)
  const [showCustomFields, setShowCustomFields] = useState(false)
  const [customCompliance, setCustomCompliance] = useState({
    stateName: '',
    days: '',
    hours: '',
    notes: ''
  })
  
  const [config, setConfig] = useState({
    school_year_start: '',
    school_year_end: '',
    annual_goal_type: 'hours',
    annual_goal_value: 180,
    weekly_goal_hours: 25
  })

  const ensureHttps = (url: string) => {
    if (!url) return ''
    return url.startsWith('http') ? url : `https://${url}`
  }

  useEffect(() => {
    getOrganizationId()
  }, [userId])

  useEffect(() => {
    if (organizationId) {
      loadConfig()
    }
  }, [organizationId])

  useEffect(() => {
    fetchStates()
  }, [])

  useEffect(() => {
    if (!selectedState || selectedState === 'CUSTOM') {
      setStateRequirements(null)
      return
    }
    fetchStateRequirements()
  }, [selectedState])

  // NEW: Auto-populate goals from state requirements
  useEffect(() => {
    if (stateRequirements) {
      // Auto-populate annual goal if state has requirements
      if (stateRequirements.required_days !== '0') {
        setConfig(prev => ({
          ...prev,
          annual_goal_type: 'lessons',
          annual_goal_value: parseInt(stateRequirements.required_days)
        }))
      } else if (stateRequirements.required_hours !== '0') {
        setConfig(prev => ({
          ...prev,
          annual_goal_type: 'hours',
          annual_goal_value: parseInt(stateRequirements.required_hours)
        }))
      }
    }
  }, [stateRequirements])

  const getOrganizationId = async () => {
    const { data: kids } = await supabase
      .from('kids')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)

    if (kids && kids.length > 0) {
      setOrganizationId(kids[0].organization_id)
    }
  }

  const fetchStates = async () => {
    const { data, error } = await supabase
      .from('state_compliance_templates')
      .select('state_code, state_name')
      .eq('status', 'active')
      .order('state_name')
    
    if (data) setStates(data)
  }

  const fetchStateRequirements = async () => {
    const { data, error } = await supabase
      .from('state_compliance_templates')
      .select('*')
      .eq('state_code', selectedState)
      .single()
    
    if (data) setStateRequirements(data)
  }

  const loadConfig = async () => {
    if (!organizationId) return
    
    const { data, error } = await supabase
      .from('school_year_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()
  
    if (data) {
      setConfig({
        school_year_start: data.school_year_start || '',
        school_year_end: data.school_year_end || '',
        annual_goal_type: data.annual_goal_type || 'hours',
        annual_goal_value: data.annual_goal_value || 180,
        weekly_goal_hours: data.weekly_goal_hours || 25
      })
      if (data.selected_state) {
        setSelectedState(data.selected_state)
        setShowCustomFields(data.selected_state === 'CUSTOM')
      }
      if (data.custom_required_days || data.custom_required_hours || data.custom_compliance_notes || data.custom_state_name) {
        setCustomCompliance({
          stateName: data.custom_state_name || '',
          days: data.custom_required_days?.toString() || '',
          hours: data.custom_required_hours?.toString() || '',
          notes: data.custom_compliance_notes || ''
        })
      }
    }
    setLoading(false)
  }

  const saveConfig = async () => {
    if (!organizationId) return
    
    setSaving(true)
    
    const { data: existing } = await supabase
      .from('school_year_settings')
      .select('id')
      .eq('organization_id', organizationId)
      .single()
  
    const dataToSave = {
      ...config,
      selected_state: selectedState,
      custom_state_name: showCustomFields ? customCompliance.stateName : null,
      custom_required_days: showCustomFields && customCompliance.days ? parseInt(customCompliance.days) : null,
      custom_required_hours: showCustomFields && customCompliance.hours ? parseInt(customCompliance.hours) : null,
      custom_compliance_notes: showCustomFields ? customCompliance.notes : null,
      organization_id: organizationId,
      user_id: userId
    }
  
    let result
    if (existing) {
      result = await supabase
        .from('school_year_settings')
        .update(dataToSave)
        .eq('organization_id', organizationId)
    } else {
      result = await supabase
        .from('school_year_settings')
        .insert([dataToSave])
    }
  
    setSaving(false)
    
    if (result.error) {
      alert(`Error saving: ${result.error.message}`)
    } else {
      alert('Settings saved successfully!')
      loadConfig()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">School Year Setup</h2>
        <p className="text-gray-600">Configure your calendar, state compliance, and goals</p>
      </div>

      {/* School Year Dates */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 School Year Dates</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Year Start Date
            </label>
            <input
              type="date"
              value={config.school_year_start}
              onChange={(e) => setConfig({ ...config, school_year_start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Year End Date
            </label>
            <input
              type="date"
              value={config.school_year_end}
              onChange={(e) => setConfig({ ...config, school_year_end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your State
          </label>
          <select 
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value)
              setShowCustomFields(e.target.value === 'CUSTOM')
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select your state...</option>
            {states.map((state) => (
              <option key={state.state_code} value={state.state_code}>
                {state.state_name} ({state.state_code})
              </option>
            ))}
            <option value="CUSTOM">Custom / Other State</option>
          </select>
          <p className="text-sm text-gray-600 mt-1">
            {showCustomFields 
              ? 'Enter your custom compliance requirements below'
              : "We'll auto-load your state's homeschool requirements"
            }
          </p>
        </div>

        {/* Custom Fields */}
        {showCustomFields && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">
              Enter your state's requirements or your personal goals:
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Region Name
              </label>
              <input
                type="text"
                value={customCompliance.stateName}
                onChange={(e) => setCustomCompliance({...customCompliance, stateName: e.target.value})}
                placeholder="e.g., Alaska, Montana, or your region"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
              <p className="text-xs text-gray-600 mt-1">
                This helps you identify your custom compliance settings
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Days (optional)
                </label>
                <input
                  type="number"
                  value={customCompliance.days}
                  onChange={(e) => setCustomCompliance({...customCompliance, days: e.target.value})}
                  placeholder="e.g., 180"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Hours (optional)
                </label>
                <input
                  type="number"
                  value={customCompliance.hours}
                  onChange={(e) => setCustomCompliance({...customCompliance, hours: e.target.value})}
                  placeholder="e.g., 900"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={customCompliance.notes}
                onChange={(e) => setCustomCompliance({...customCompliance, notes: e.target.value})}
                placeholder="Add any additional requirements or notes about your state's homeschool laws..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
          </div>
        )}
        
        {/* State Requirements Display */}
        {selectedState && stateRequirements && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-900">
              {stateRequirements.state_name} requirements:
            </p>
            
            <ul className="text-sm text-gray-700 space-y-1">
              {stateRequirements.required_days !== '0' && (
                <li>
                  • <strong>{stateRequirements.required_days} days</strong> 
                  {stateRequirements.day_requirement_type === 'Required' ? ' (required)' : ' (guideline)'}
                </li>
              )}
              {stateRequirements.required_hours !== '0' && (
                <li>
                  • <strong>{stateRequirements.required_hours} hours</strong> 
                  {stateRequirements.hour_requirement_type === 'Required' ? ' (required)' : ' (guideline)'}
                </li>
              )}
            </ul>
            
            {stateRequirements.overall_notes && (
              <div className="mt-3 pt-3 border-t border-blue-300">
                <p className="text-xs font-semibold text-gray-800 mb-2">📋 Additional Details:</p>
                <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                  {stateRequirements.overall_notes}
                </p>
              </div>
            )}
            
            <a 
              href={ensureHttps(stateRequirements.official_source_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mt-2"
            >
              Verify at {stateRequirements.official_source_name} →
            </a>
          </div>
        )}
      </div>

      {/* Annual Goals */}
      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Annual Learning Goals</h3>
        
        {/* Helper text for preset states */}
        {selectedState && selectedState !== 'CUSTOM' && stateRequirements && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="text-gray-700">
              💡 <strong>Pre-filled from {stateRequirements.state_name} requirements.</strong> You can adjust these to exceed state minimums or match your family's goals.
            </p>
          </div>
        )}
        
        {/* Helper text for custom */}
        {selectedState === 'CUSTOM' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <p className="text-gray-700">
              💡 <strong>Set your own goals.</strong> Most states require 180 days or 900 hours annually.
            </p>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Track Progress By:
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="hours"
                checked={config.annual_goal_type === 'hours'}
                onChange={(e) => setConfig({ ...config, annual_goal_type: e.target.value as 'hours' | 'lessons' })}
                className="mr-2"
              />
              <span className="text-gray-900">Hours</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="lessons"
                checked={config.annual_goal_type === 'lessons'}
                onChange={(e) => setConfig({ ...config, annual_goal_type: e.target.value as 'hours' | 'lessons' })}
                className="mr-2"
              />
              <span className="text-gray-900">Lessons/Days</span>
            </label>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual Goal ({config.annual_goal_type})
            </label>
            <input
              type="number"
              value={config.annual_goal_value}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                setConfig({ ...config, annual_goal_value: isNaN(value) ? 0 : value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              placeholder="e.g., 180"
            />
            <p className="text-xs text-gray-600 mt-1">
              {config.annual_goal_type === 'hours' 
                ? 'Total hours required for the year (common: 180-900)'
                : 'Total lesson days required (common: 180)'
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weekly Goal (hours)
            </label>
            <input
              type="number"
              value={config.weekly_goal_hours}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                setConfig({ ...config, weekly_goal_hours: isNaN(value) ? 0 : value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              placeholder="e.g., 25"
            />
            <p className="text-xs text-gray-600 mt-1">
              Recommended hours per week
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-400"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}