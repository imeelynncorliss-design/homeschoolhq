'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'

interface SchoolYearConfigProps {
  userId: string
}

export default function SchoolYearConfig({ userId }: SchoolYearConfigProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)  // ✅ ADD THIS
  const [config, setConfig] = useState({
    school_year_start: '',
    school_year_end: '',
    annual_goal_type: 'hours',
    annual_goal_value: 180,
    weekly_goal_hours: 25
  })
  
  const [homeschoolDays, setHomeschoolDays] = useState<string[]>([
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ])

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  // ✅ GET ORGANIZATION ID FIRST
  useEffect(() => {
    getOrganizationId()
  }, [userId])

  // ✅ LOAD CONFIG WHEN ORG ID IS AVAILABLE
  useEffect(() => {
    if (organizationId) {
      loadConfig()
    }
  }, [organizationId])

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

  const loadConfig = async () => {
    if (!organizationId) return
    
    console.log('Loading config for org:', organizationId)  // ✅ ADD
    
    const { data, error } = await supabase
      .from('school_year_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()
  
    console.log('Load result:', { data, error })  // ✅ ADD
  
    if (data) {
      setConfig({
        school_year_start: data.school_year_start || '',
        school_year_end: data.school_year_end || '',
        annual_goal_type: data.annual_goal_type || 'hours',
        annual_goal_value: data.annual_goal_value || 180,
        weekly_goal_hours: data.weekly_goal_hours || 25
      })
      if (data.homeschool_days) {
        setHomeschoolDays(data.homeschool_days)
      }
    }
    setLoading(false)
  }

  const toggleDay = (day: string) => {
    setHomeschoolDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const saveConfig = async () => {
    if (!organizationId) return
    
    setSaving(true)
    
    console.log('Saving config for org:', organizationId)
    
    const { data: existing, error: existingError } = await supabase
      .from('school_year_settings')
      .select('id')
      .eq('organization_id', organizationId)
      .single()
  
    console.log('Existing record:', existing, 'Error:', existingError)
  
    const dataToSave = {
      ...config,
      homeschool_days: homeschoolDays,
      organization_id: organizationId,
      user_id: userId
    }
  
    console.log('Data to save:', dataToSave)
  
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
  
    console.log('Save result:', result)
  
    setSaving(false)
    
    if (result.error) {
      alert(`Error saving: ${result.error.message}`)
    } else {
      alert('Settings saved successfully!')
      // Reload to confirm
      loadConfig()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">School Year Configuration</h2>
        <p className="text-gray-600">Set up your homeschool calendar and learning goals</p>
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

      {/* Annual Goals */}
      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Annual Learning Goals</h3>
        
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
              onChange={(e) => setConfig({ ...config, annual_goal_value: parseInt(e.target.value) })}
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
              onChange={(e) => setConfig({ ...config, weekly_goal_hours: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              placeholder="e.g., 25"
            />
            <p className="text-xs text-gray-600 mt-1">
              Recommended hours per week
            </p>
          </div>
        </div>
      </div>

      {/* State Requirements Helper */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">State Requirements</p>
            <p className="text-sm text-gray-700">
              Most states require 180 days or 900-1000 hours per year. Check your state's specific requirements 
              to ensure compliance. Some states allow portfolio-based or test-based assessments instead of hour tracking.
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