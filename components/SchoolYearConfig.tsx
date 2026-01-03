'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SchoolYearConfigProps {
  userId: string
}

export default function SchoolYearConfig({ userId }: SchoolYearConfigProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    school_year_start: '',
    school_year_end: '',
    school_type: 'traditional', // traditional, year-round, hybrid
    annual_goal_type: 'hours', // hours or lessons
    annual_goal_value: 180, // default 180 days/hours
    weekly_goal_hours: 25
  })
  
  // ✅ NEW: Add homeschool days state
  const [homeschoolDays, setHomeschoolDays] = useState<string[]>([
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ])

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  useEffect(() => {
    loadConfig()
  }, [userId])

  const loadConfig = async () => {
    const { data, error } = await supabase
      .from('school_year_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) {
      setConfig(data)
      // ✅ NEW: Load homeschool days
      if (data.homeschool_days) {
        setHomeschoolDays(data.homeschool_days)
      }
    }
    setLoading(false)
  }

  // ✅ NEW: Toggle day function
  const toggleDay = (day: string) => {
    setHomeschoolDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const saveConfig = async () => {
    setSaving(true)
    
    const { data: existing } = await supabase
      .from('school_year_settings')
      .select('id')
      .eq('user_id', userId)
      .single()

    // ✅ UPDATED: Include homeschool_days in save
    const dataToSave = {
      ...config,
      homeschool_days: homeschoolDays
    }

    if (existing) {
      await supabase
        .from('school_year_settings')
        .update(dataToSave)
        .eq('user_id', userId)
    } else {
      await supabase
        .from('school_year_settings')
        .insert([{ ...dataToSave, user_id: userId }])
    }

    setSaving(false)
    alert('Settings saved successfully!')
  }

  if (loading) {
    return <div className="text-center py-8">Loading configuration...</div>
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

      {/* ✅ NEW SECTION: Homeschool Days */}
      <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📆 Homeschool Days</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select which days you typically homeschool. This helps with auto-scheduling lessons.
        </p>
        <div className="flex flex-wrap gap-3">
          {allDays.map(day => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              type="button"
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                homeschoolDays.includes(day)
                  ? 'bg-orange-600 text-white shadow-md transform scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-orange-400'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Selected: {homeschoolDays.length === 0 ? 'None' : homeschoolDays.join(', ')}
        </p>
      </div>

      {/* School Type */}
      <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏫 School Schedule Type</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <button
            onClick={() => setConfig({ ...config, school_type: 'traditional' })}
            className={`p-4 rounded-lg border-2 transition-all ${
              config.school_type === 'traditional'
                ? 'border-purple-600 bg-purple-100'
                : 'border-gray-300 bg-white hover:border-purple-400'
            }`}
          >
            <div className="text-4xl mb-2">📚</div>
            <div className="font-semibold text-gray-900">Traditional</div>
            <div className="text-xs text-gray-600 mt-1">Sep-May with summer break</div>
          </button>

          <button
            onClick={() => setConfig({ ...config, school_type: 'year-round' })}
            className={`p-4 rounded-lg border-2 transition-all ${
              config.school_type === 'year-round'
                ? 'border-purple-600 bg-purple-100'
                : 'border-gray-300 bg-white hover:border-purple-400'
            }`}
          >
            <div className="text-4xl mb-2">🔄</div>
            <div className="font-semibold text-gray-900">Year-Round</div>
            <div className="text-xs text-gray-600 mt-1">Continuous learning all year</div>
          </button>

          <button
            onClick={() => setConfig({ ...config, school_type: 'hybrid' })}
            className={`p-4 rounded-lg border-2 transition-all ${
              config.school_type === 'hybrid'
                ? 'border-purple-600 bg-purple-100'
                : 'border-gray-300 bg-white hover:border-purple-400'
            }`}
          >
            <div className="text-4xl mb-2">🔀</div>
            <div className="font-semibold text-gray-900">Hybrid</div>
            <div className="text-xs text-gray-600 mt-1">Mix of scheduled & flexible</div>
          </button>
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