'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'

interface Settings {
  school_name: string
  school_address: string
  school_city: string
  school_state: string
  school_zip: string
  school_phone: string
  administrator_name: string
  administrator_title: string
  administrator_email: string
  class_rank: number | null
  class_size: number | null
  graduation_date: string
}

interface Honor {
  id: string
  honor_name: string
  honor_type: string
  description: string
  date_received: string
}

interface TranscriptSettingsProps {
  kidId: string
  userId: string
}

export default function TranscriptSettings({ kidId, userId }: TranscriptSettingsProps) {
  const [settings, setSettings] = useState<Settings>({
    school_name: 'Homeschool',
    school_address: '',
    school_city: '',
    school_state: '',
    school_zip: '',
    school_phone: '',
    administrator_name: '',
    administrator_title: 'Parent/Administrator',
    administrator_email: '',
    class_rank: null,
    class_size: null,
    graduation_date: ''
  })
  
  const [honors, setHonors] = useState<Honor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showHonorForm, setShowHonorForm] = useState(false)
  
  // Honor form state
  const [honorName, setHonorName] = useState('')
  const [honorType, setHonorType] = useState('')
  const [honorDesc, setHonorDesc] = useState('')
  const [honorDate, setHonorDate] = useState('')

  useEffect(() => {
    loadSettings()
    loadHonors()
  }, [kidId])

  const loadSettings = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('transcript_settings')
      .select('*')
      .eq('kid_id', kidId)
      .single()
    
    if (data) {
      setSettings({
        school_name: data.school_name || 'Homeschool',
        school_address: data.school_address || '',
        school_city: data.school_city || '',
        school_state: data.school_state || '',
        school_zip: data.school_zip || '',
        school_phone: data.school_phone || '',
        administrator_name: data.administrator_name || '',
        administrator_title: data.administrator_title || 'Parent/Administrator',
        administrator_email: data.administrator_email || '',
        class_rank: data.class_rank,
        class_size: data.class_size,
        graduation_date: data.graduation_date || ''
      })
    }
    setLoading(false)
  }

  const loadHonors = async () => {
    const { data } = await supabase
      .from('honors_awards')
      .select('*')
      .eq('kid_id', kidId)
      .order('date_received', { ascending: false })
    
    if (data) setHonors(data)
  }

  const saveSettings = async () => {
    setSaving(true)
    
    const { data: existing } = await supabase
      .from('transcript_settings')
      .select('id')
      .eq('kid_id', kidId)
      .single()
    
    if (existing) {
      await supabase
        .from('transcript_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('kid_id', kidId)
    } else {
      await supabase.from('transcript_settings').insert([{
        user_id: userId,
        kid_id: kidId,
        ...settings
      }])
    }
    
    setSaving(false)
    alert('Settings saved successfully!')
  }

  const addHonor = async (e: React.FormEvent) => {
    e.preventDefault()
    
    await supabase.from('honors_awards').insert([{
      kid_id: kidId,
      honor_name: honorName,
      honor_type: honorType,
      description: honorDesc,
      date_received: honorDate || null
    }])
    
    setHonorName('')
    setHonorType('')
    setHonorDesc('')
    setHonorDate('')
    setShowHonorForm(false)
    loadHonors()
  }

  const deleteHonor = async (honorId: string) => {
    if (!confirm('Delete this honor/award?')) return
    await supabase.from('honors_awards').delete().eq('id', honorId)
    loadHonors()
  }

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Transcript Settings</h2>
        <p className="text-gray-600">Configure school information and academic settings</p>
      </div>

      {/* School Information */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">School Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
            <input
              type="text"
              value={settings.school_name}
              onChange={(e) => setSettings({...settings, school_name: e.target.value})}
              className="w-full px-3 py-2 border rounded text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={settings.school_address}
              onChange={(e) => setSettings({...settings, school_address: e.target.value})}
              className="w-full px-3 py-2 border rounded text-gray-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={settings.school_city}
                onChange={(e) => setSettings({...settings, school_city: e.target.value})}
                className="w-full px-3 py-2 border rounded text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={settings.school_state}
                onChange={(e) => setSettings({...settings, school_state: e.target.value})}
                className="w-full px-3 py-2 border rounded text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                type="text"
                value={settings.school_zip}
                onChange={(e) => setSettings({...settings, school_zip: e.target.value})}
                className="w-full px-3 py-2 border rounded text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={settings.school_phone}
              onChange={(e) => setSettings({...settings, school_phone: e.target.value})}
              className="w-full px-3 py-2 border rounded text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Administrator Information */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Administrator Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={settings.administrator_name}
              onChange={(e) => setSettings({...settings, administrator_name: e.target.value})}
              className="w-full px-3 py-2 border rounded text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={settings.administrator_title}
              onChange={(e) => setSettings({...settings, administrator_title: e.target.value})}
              className="w-full px-3 py-2 border rounded text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={settings.administrator_email}
              onChange={(e) => setSettings({...settings, administrator_email: e.target.value})}
              className="w-full px-3 py-2 border rounded text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Academic Information */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Academic Information</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Rank</label>
            <input
              type="number"
              value={settings.class_rank || ''}
              onChange={(e) => setSettings({...settings, class_rank: e.target.value ? parseInt(e.target.value) : null})}
              className="w-full px-3 py-2 border rounded text-gray-900"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Size</label>
            <input
              type="number"
              value={settings.class_size || ''}
              onChange={(e) => setSettings({...settings, class_size: e.target.value ? parseInt(e.target.value) : null})}
              className="w-full px-3 py-2 border rounded text-gray-900"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Date</label>
            <input
              type="date"
              value={settings.graduation_date}
              onChange={(e) => setSettings({...settings, graduation_date: e.target.value})}
              className="w-full px-3 py-2 border rounded text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Honors & Awards */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Honors & Awards</h3>
          <button
            onClick={() => setShowHonorForm(!showHonorForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            {showHonorForm ? 'Cancel' : '+ Add Honor/Award'}
          </button>
        </div>

        {showHonorForm && (
          <form onSubmit={addHonor} className="mb-4 p-4 bg-gray-50 rounded border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={honorName}
                  onChange={(e) => setHonorName(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-gray-900"
                  placeholder="Honor/Award Name *"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  value={honorType}
                  onChange={(e) => setHonorType(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-gray-900"
                  placeholder="Type (Academic, Athletic, etc.)"
                />
              </div>
            </div>
            <div>
              <textarea
                value={honorDesc}
                onChange={(e) => setHonorDesc(e.target.value)}
                className="w-full px-3 py-2 border rounded text-gray-900"
                placeholder="Description (optional)"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={honorDate}
                onChange={(e) => setHonorDate(e.target.value)}
                className="px-3 py-2 border rounded text-gray-900"
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Add Honor/Award
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {honors.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No honors or awards yet</p>
          ) : (
            honors.map(honor => (
              <div key={honor.id} className="flex justify-between items-start p-3 bg-gray-50 rounded border">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{honor.honor_name}</div>
                  {honor.honor_type && (
                    <div className="text-sm text-gray-600">{honor.honor_type}</div>
                  )}
                  {honor.description && (
                    <div className="text-sm text-gray-600 mt-1">{honor.description}</div>
                  )}
                  {honor.date_received && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(honor.date_received).getFullYear()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteHonor(honor.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 font-medium"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}