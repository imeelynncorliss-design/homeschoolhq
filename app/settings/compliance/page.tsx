'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  MapPin, 
  Save,
  AlertCircle,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react'
import { useComplianceSettings } from '@/src/hooks/useComplianceSettings'
import { createClient } from '@/src/lib/supabase'

// State requirements reference data (for guidance/defaults)
const STATE_DEFAULTS = {
  'AL': { days: 180, hours: 0, name: 'Alabama' },
  'AK': { days: 180, hours: 0, name: 'Alaska' },
  'AZ': { days: 180, hours: 0, name: 'Arizona' },
  'AR': { days: 0, hours: 0, name: 'Arkansas' },
  'CA': { days: 175, hours: 0, name: 'California' },
  'CO': { days: 172, hours: 0, name: 'Colorado' },
  'CT': { days: 180, hours: 0, name: 'Connecticut' },
  'DE': { days: 180, hours: 0, name: 'Delaware' },
  'FL': { days: 180, hours: 0, name: 'Florida' },
  'GA': { days: 180, hours: 810, name: 'Georgia' },
  'HI': { days: 180, hours: 0, name: 'Hawaii' },
  'ID': { days: 0, hours: 0, name: 'Idaho' },
  'IL': { days: 176, hours: 0, name: 'Illinois' },
  'IN': { days: 180, hours: 0, name: 'Indiana' },
  'IA': { days: 180, hours: 0, name: 'Iowa' },
  'KS': { days: 186, hours: 0, name: 'Kansas' },
  'KY': { days: 185, hours: 0, name: 'Kentucky' },
  'LA': { days: 180, hours: 0, name: 'Louisiana' },
  'ME': { days: 175, hours: 0, name: 'Maine' },
  'MD': { days: 180, hours: 0, name: 'Maryland' },
  'MA': { days: 180, hours: 900, name: 'Massachusetts' },
  'MI': { days: 180, hours: 0, name: 'Michigan' },
  'MN': { days: 0, hours: 0, name: 'Minnesota' },
  'MS': { days: 180, hours: 0, name: 'Mississippi' },
  'MO': { days: 0, hours: 1000, name: 'Missouri' },
  'MT': { days: 0, hours: 0, name: 'Montana' },
  'NE': { days: 0, hours: 1032, name: 'Nebraska' },
  'NV': { days: 180, hours: 0, name: 'Nevada' },
  'NH': { days: 180, hours: 0, name: 'New Hampshire' },
  'NJ': { days: 180, hours: 0, name: 'New Jersey' },
  'NM': { days: 180, hours: 0, name: 'New Mexico' },
  'NY': { days: 180, hours: 900, name: 'New York' },
  'NC': { days: 180, hours: 0, name: 'North Carolina' },
  'ND': { days: 175, hours: 0, name: 'North Dakota' },
  'OH': { days: 180, hours: 0, name: 'Ohio' },
  'OK': { days: 180, hours: 0, name: 'Oklahoma' },
  'OR': { days: 0, hours: 0, name: 'Oregon' },
  'PA': { days: 180, hours: 900, name: 'Pennsylvania' },
  'RI': { days: 180, hours: 0, name: 'Rhode Island' },
  'SC': { days: 180, hours: 810, name: 'South Carolina' },
  'SD': { days: 0, hours: 0, name: 'South Dakota' },
  'TN': { days: 180, hours: 0, name: 'Tennessee' },
  'TX': { days: 0, hours: 0, name: 'Texas' },
  'UT': { days: 0, hours: 0, name: 'Utah' },
  'VT': { days: 175, hours: 0, name: 'Vermont' },
  'VA': { days: 180, hours: 0, name: 'Virginia' },
  'WA': { days: 180, hours: 0, name: 'Washington' },
  'WV': { days: 180, hours: 0, name: 'West Virginia' },
  'WI': { days: 0, hours: 875, name: 'Wisconsin' },
  'WY': { days: 175, hours: 0, name: 'Wyoming' }
}

export default function ComplianceSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Get current settings
  const { settings, loading: settingsLoading, refreshSettings } = useComplianceSettings()
  
  // Form state
  const [stateCode, setStateCode] = useState('')
  const [requiredDays, setRequiredDays] = useState(0)
  const [requiredHours, setRequiredHours] = useState(0)
  const [schoolYearStart, setSchoolYearStart] = useState('')
  const [schoolYearEnd, setSchoolYearEnd] = useState('')
  
  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  // Get organization ID
    useEffect(() => {
      async function getOrgId() {
        const { data: { user } } = await supabase.auth.getUser()
        
       // ✅ Require authentication - no fallback
    if (!user) {
      setError('Please log in to manage compliance settings')
      router.push('/login')
      return
    }
        
        const { data } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()
        
          if (data?.organization_id) {
            setOrganizationId(data.organization_id)
          } else {
            setError('Organization not found')
          }
        }
        getOrgId()
      }, [router])

  // Load existing settings into form
  useEffect(() => {
    if (settings) {
      setStateCode(settings.state_code || '')
      setRequiredDays(settings.required_annual_days || 0)
      setRequiredHours(settings.required_annual_hours || 0)
      setSchoolYearStart(settings.school_year_start_date || '')
      setSchoolYearEnd(settings.school_year_end_date || '')
    }
  }, [settings])

  // Auto-fill defaults when state is selected
  const handleStateChange = (state: string) => {
    setStateCode(state)
    const defaults = STATE_DEFAULTS[state as keyof typeof STATE_DEFAULTS]
    if (defaults) {
      setRequiredDays(defaults.days)
      setRequiredHours(defaults.hours)
    }
  }

  const handleSave = async () => {
    if (!organizationId) {
      setError('Organization ID not found')
      return
    }

    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const payload = {
        organization_id: organizationId,
        state_code: stateCode || null,
        required_annual_days: requiredDays || 0,
        required_annual_hours: requiredHours || 0,
        school_year_start_date: schoolYearStart || null,
        school_year_end_date: schoolYearEnd || null
      }

      // Upsert (insert or update)
      const { error: saveError } = await supabase
        .from('user_compliance_settings')
        .upsert(payload, {
          onConflict: 'organization_id'
        })

      if (saveError) throw saveError

      setSaveSuccess(true)
      await refreshSettings()
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Save failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (settingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Settings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-slate-400 flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Back
        </button>
        
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="text-indigo-600" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-400 tracking-tight">Compliance Settings</h1>
            <p className="text-slate-500 text-sm font-medium">Configure your state requirements and school year</p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle2 className="text-green-600 shrink-0" size={24} />
          <div>
            <p className="font-bold text-green-900">Settings saved successfully!</p>
            <p className="text-sm text-green-700">Your compliance tracking is now active.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={24} />
          <p className="text-sm text-red-800 font-bold">{error}</p>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 space-y-6">
          {/* State Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-3 uppercase tracking-wide">
              <MapPin size={16} className="text-indigo-600" />
              Your State
            </label>
            <select
              value={stateCode}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-slate-900 font-bold focus:border-indigo-600 focus:outline-none transition-colors"
            >
              <option value="">Select your state...</option>
              {Object.entries(STATE_DEFAULTS).map(([code, info]) => (
                <option key={code} value={code}>
                  {info.name} ({code})
                </option>
              ))}
            </select>
            {stateCode && (
              <p className="mt-2 text-xs text-slate-500 font-medium italic">
                💡 Default values auto-filled based on {STATE_DEFAULTS[stateCode as keyof typeof STATE_DEFAULTS]?.name} requirements. Adjust as needed.
              </p>
            )}
          </div>

          {/* Requirements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Required Days */}
            <div>
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-3 uppercase tracking-wide">
                <Calendar size={16} className="text-indigo-600" />
                Annual Days Required
              </label>
              <input
                type="number"
                value={requiredDays}
                onChange={(e) => setRequiredDays(parseInt(e.target.value) || 0)}
                min="0"
                placeholder="180"
                className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-slate-900 font-bold focus:border-indigo-600 focus:outline-none transition-colors"
              />
            </div>

            {/* Required Hours */}
            <div>
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-3 uppercase tracking-wide">
                <Clock size={16} className="text-indigo-600" />
                Annual Hours Required
              </label>
              <input
                type="number"
                value={requiredHours}
                onChange={(e) => setRequiredHours(parseInt(e.target.value) || 0)}
                min="0"
                placeholder="900"
                className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-slate-900 font-bold focus:border-indigo-600 focus:outline-none transition-colors"
              />
              <p className="mt-2 text-xs text-slate-500 font-medium italic">
                Set to 0 if your state doesn't require hours
              </p>
            </div>
          </div>

          {/* School Year Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="text-sm font-black text-slate-700 mb-3 uppercase tracking-wide block">
                School Year Start Date
              </label>
              <input
                type="date"
                value={schoolYearStart}
                onChange={(e) => setSchoolYearStart(e.target.value)}
                className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-slate-900 font-bold focus:border-indigo-600 focus:outline-none transition-colors"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-sm font-black text-slate-700 mb-3 uppercase tracking-wide block">
                School Year End Date
              </label>
              <input
                type="date"
                value={schoolYearEnd}
                onChange={(e) => setSchoolYearEnd(e.target.value)}
                className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-slate-900 font-bold focus:border-indigo-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex gap-4">
            <AlertCircle className="text-amber-500 shrink-0" size={24} />
            <div className="text-xs text-amber-800 leading-relaxed font-bold space-y-1">
              <p className="italic">
                ⚠️ These settings apply to all students in your organization. Compliance calculations will use these requirements.
              </p>
              <p className="mt-2">
                💡 <strong>Tip:</strong> Set "0" for any requirement your state doesn't mandate. The compliance tracker will only show metrics you've configured.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Compliance Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Legal Disclaimer */}
      <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <p className="text-xs text-slate-500 italic leading-relaxed">
          <strong>Disclaimer:</strong> State homeschool requirements vary and can change. Always verify current requirements with your state's education department or local homeschool organization. HomeschoolHQ provides tracking tools but cannot provide legal advice.
        </p>
      </div>
    </div>
  )
}