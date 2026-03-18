'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  Users,
  User,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { createClient } from '@/src/lib/supabase'
import { useStateComplianceTemplates } from '@/src/hooks/useStateComplianceTemplates'
import { useComplianceSettings } from '@/src/hooks/useComplianceSettings'      
import { generateComplianceReport } from '@/src/utils/generateComplianceReport'
import { useAppHeader } from '@/components/layout/AppHeader'
import { getOrganizationId } from '@/src/lib/getOrganizationId'

interface Kid {
  id: string
  displayname: string
  firstname: string
  lastname: string
  photo_url?: string
  grade?: string
  age?: number
}

interface KidComplianceData {
  kid: Kid
  totalHours: number
  totalDays: number
  healthScore: number
  requiredHours: number
  requiredDays: number
  hoursRemaining: number
  daysRemaining: number
  onTrack: boolean
}

export default function CompliancePage() {
  const router = useRouter()
  useAppHeader({ title: 'Compliance', backHref: '/reports' })
  const supabase = createClient()
  
  const { templates, loading: templatesLoading, getTemplate } = useStateComplianceTemplates()
  const { settings, loading: settingsLoading, refreshSettings } = useComplianceSettings()

  const [viewMode, setViewMode] = useState<'family' | 'individual'>('family')
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null)
  const [kids, setKids] = useState<Kid[]>([])
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [complianceData, setComplianceData] = useState<KidComplianceData[]>([])
  const [isExporting, setIsExporting] = useState(false)
  
  const [selectedState, setSelectedState] = useState<string>('')
  const [showStateSelector, setShowStateSelector] = useState(false)
  const [schoolYearStart, setSchoolYearStart] = useState<string>('')
  const [schoolYearEnd, setSchoolYearEnd] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const handleExportReport = async () => {
    setIsExporting(true)
    try {
      const currentSettings = settings
      
      if (!currentSettings) {
        alert('❌ Compliance settings not found')
        setIsExporting(false)
        return
      }
  
      if (!currentSettings.school_year_start_date || !currentSettings.school_year_end_date) {
        alert('❌ School year dates are required for generating reports')
        setIsExporting(false)
        return
      }
  
      const { data: { user } } = await supabase.auth.getUser()
      const parentName = user?.user_metadata?.full_name || 'Parent'
      
      await generateComplianceReport({
        complianceData,
        settings: {
          ...currentSettings,
          state_code: currentSettings.state_code ?? undefined,
          school_year_start_date: currentSettings.school_year_start_date,
          school_year_end_date: currentSettings.school_year_end_date,
        },
        familyHealthScore,
        organizationName: 'HomeschoolReady Family',
        parentName
      })
      
      alert('✅ Report downloaded successfully!')
    } catch (error) {
      console.error('Failed to generate report:', error)
      alert('❌ Failed to generate report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Get organization ID and kids
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      const { orgId } = await getOrganizationId(user.id)

      if (!orgId) {
        router.push('/onboarding')
        return
      }

      setOrganizationId(orgId)

      const { data: kidsData } = await supabase
        .from('kids')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })

      if (kidsData) setKids(kidsData)
      setLoading(false)
    }
    loadData()
  }, [router])

  // Load settings and set state
  useEffect(() => {
    if (settings) {
      setSelectedState(settings.state_code || '')
      setSchoolYearStart(settings.school_year_start_date || '')
      setSchoolYearEnd(settings.school_year_end_date || '')
      setShowStateSelector(!settings.state_code)
    }
  }, [settings])

  // Save state configuration
  async function handleSaveState() {
    if (!selectedState || !schoolYearStart || !schoolYearEnd || !organizationId) {
      alert('Please fill in all fields')
      return
    }

    try {
      setSaving(true)
      
      const template = getTemplate(selectedState)
      
      const settingsData = {
        organization_id: organizationId,
        state_code: selectedState,
        state_name: template?.state_name || selectedState,
        school_year_start_date: schoolYearStart,
        school_year_end_date: schoolYearEnd,
        required_annual_days: template?.required_days || 0,
        required_annual_hours: template?.required_hours || 0,
        template_source: 'state_template',
      }

      if (settings?.id) {
        await supabase
          .from('user_compliance_settings')
          .update(settingsData)
          .eq('id', settings.id)
      } else {
        await supabase
          .from('user_compliance_settings')
          .insert(settingsData)
      }

      await refreshSettings()
      setShowStateSelector(false)
      alert('✅ State settings saved!')
    } catch (err) {
      console.error('Error saving compliance settings:', err)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const template = getTemplate(selectedState || settings?.state_code || '')
  const requiredDays = template?.required_days || settings?.required_annual_days || 0
  const requiredHours = template?.required_hours || settings?.required_annual_hours || 0

  // Load compliance data for each kid — uses lessons + manual attendance (same logic as AttendanceTracker)
  useEffect(() => {
    if (!kids.length || !organizationId) return

    async function loadComplianceData() {
      // Resolve school year dates — always prefer school_year_settings (same source as AttendanceTracker)
      const { data: sySettings } = await supabase
        .from('school_year_settings')
        .select('school_year_start, school_year_end')
        .eq('organization_id', organizationId!)
        .maybeSingle()

      let startDate: string = sySettings?.school_year_start
        || settings?.school_year_start_date
        || null

      let endDate: string = sySettings?.school_year_end
        || settings?.school_year_end_date
        || null

      // Last resort: current school year Aug → Jun
      if (!startDate || !endDate) {
        const now = new Date()
        const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
        startDate = `${year}-08-01`
        endDate = `${year + 1}-06-30`
      }



      const data: KidComplianceData[] = []

      // Load org-wide manual attendance for the school year once
      const { data: attendance } = await supabase
        .from('daily_attendance')
        .select('attendance_date, hours, status, kid_id')
        .eq('organization_id', organizationId!)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)



      for (const kid of kids) {
        // Lessons for this kid within school year
        const { data: lessons } = await supabase
          .from('lessons')
          .select('lesson_date, duration_minutes')
          .eq('kid_id', kid.id)
          .gte('lesson_date', startDate)
          .lte('lesson_date', endDate)


        // Build set of all relevant dates
        const allDates = new Set<string>()
        lessons?.forEach((l: any) => allDates.add(l.lesson_date.substring(0, 10)))
        attendance?.forEach((a: any) => allDates.add(a.attendance_date))

        let totalDays = 0
        let totalHours = 0

        for (const date of allDates) {
          const dayLessons = lessons?.filter((l: any) => l.lesson_date.substring(0, 10) === date) || []
          const lessonHours = dayLessons.reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0) / 60

          // Manual attendance applies if kid-specific or org-wide (kid_id null)
          const dayAtt = attendance?.find((a: any) =>
            a.attendance_date === date &&
            (a.kid_id === kid.id || a.kid_id === null)
          )

          let isSchoolDay = false
          let dayHours = 0

          if (dayAtt) {
            isSchoolDay = dayAtt.status !== 'no_school'
            dayHours = dayAtt.hours
          } else if (lessonHours > 0) {
            isSchoolDay = true
            dayHours = lessonHours
          }

          if (isSchoolDay) {
            totalDays++
            totalHours += dayHours
          }
        }

        const roundedHours = Math.round(totalHours * 10) / 10

        const hoursRemaining = Math.max(0, Math.round((requiredHours - roundedHours) * 10) / 10)
        const daysRemaining = Math.max(0, requiredDays - totalDays)

        // Health score = average progress toward each applicable requirement
        const daysProgress = requiredDays > 0 ? Math.min(100, (totalDays / requiredDays) * 100) : null
        const hoursProgress = requiredHours > 0 ? Math.min(100, (roundedHours / requiredHours) * 100) : null
        const progressValues = [daysProgress, hoursProgress].filter(v => v !== null) as number[]
        const healthScore = progressValues.length > 0
          ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
          : 0
        const onTrack = healthScore >= 75

        data.push({
          kid,
          totalHours: roundedHours,
          totalDays,
          healthScore,
          requiredHours,
          requiredDays,
          hoursRemaining,
          daysRemaining,
          onTrack
        })
      }

      setComplianceData(data)
    }

    loadComplianceData()
  }, [settings, kids, organizationId, requiredDays, requiredHours])

  const familyHealthScore = complianceData.length > 0
    ? Math.round(complianceData.reduce((sum, d) => sum + d.healthScore, 0) / complianceData.length)
    : 0

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-600'
    if (percentage >= 60) return 'bg-yellow-600'
    return 'bg-red-600'
  }

  if (loading || settingsLoading || templatesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading compliance data...</p>
        </div>
      </div>
    )
  }

  if (!settings || showStateSelector) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="text-indigo-600" size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
              Configure Compliance Settings
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              Select your state and school year to start tracking compliance
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Your State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 [&>option]:text-gray-900"
                >
                  <option value="">Select your state...</option>
                  {templates.map(t => (
                    <option key={t.state_code} value={t.state_code}>
                      {t.state_name} ({t.state_code})
                    </option>
                  ))}
                </select>
              </div>

              {template && (
                <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <h3 className="font-bold text-gray-900 mb-2">{template.state_name} Requirements</h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    {template.required_days > 0 && (
                      <p>• Days: {template.required_days} ({template.day_requirement_type})</p>
                    )}
                    {template.required_hours > 0 && (
                      <p>• Hours: {template.required_hours} ({template.hour_requirement_type})</p>
                    )}
                    {template.parental_qualifications && (
                      <p>• Parent Qualifications: {template.parental_qualifications}</p>
                    )}
                  </div>
                  <a
                    href={template.official_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Verify at {template.official_source_name}
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">School Year Start</label>
                  <input
                    type="date"
                    value={schoolYearStart}
                    onChange={(e) => setSchoolYearStart(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">School Year End</label>
                  <input
                    type="date"
                    value={schoolYearEnd}
                    onChange={(e) => setSchoolYearEnd(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {template && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                  <p className="text-xs text-gray-700 italic">
                    ⚠️ {template.disclaimer_text}
                  </p>
                </div>
              )}

              <button
                onClick={handleSaveState}
                disabled={saving || !selectedState || !schoolYearStart || !schoolYearEnd}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const selectedKidData = selectedKidId 
    ? complianceData.find(d => d.kid.id === selectedKidId)
    : null

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingBottom: 100 }}>
      <div className="p-8">
      <button onClick={() => router.push('/reports')} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.72)', border: '1.5px solid rgba(124,58,237,0.15)',
        borderRadius: 20, padding: '7px 16px 7px 12px',
        fontSize: 13, fontWeight: 700, color: '#7c3aed',
        cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
        margin: '0 0 16px',
      }}>
        ‹ Records
      </button>
      <div className="max-w-7xl mx-auto">

        {/* View Mode Toggle */}
        <div className="mb-6 flex justify-center">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('family')}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                viewMode === 'family'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="inline mr-2" size={18} />
              Family Overview
            </button>
            <button
              onClick={() => {
                setViewMode('individual')
                if (!selectedKidId && kids.length > 0) {
                  setSelectedKidId(kids[0].id)
                }
              }}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                viewMode === 'individual'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="inline mr-2" size={18} />
              Individual Details
            </button>
          </div>
        </div>

        {/* Family Overview Mode */}
        {viewMode === 'family' && (
          <div className="space-y-6">
            <div className={`rounded-[2rem] border-2 p-8 ${getHealthBg(familyHealthScore)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-600 uppercase tracking-wider mb-2">
                    Family Compliance Health
                  </h3>
                  <div className="flex items-baseline gap-3">
                    <span className={`text-6xl font-black ${getHealthColor(familyHealthScore)}`}>
                      {familyHealthScore}%
                    </span>
                    <span className="text-2xl text-gray-600 font-bold">
                      {familyHealthScore >= 80 ? '🎉 Excellent' : familyHealthScore >= 60 ? '⚠️ On Track' : '❌ Needs Attention'}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-600 mb-2">
                    {complianceData.filter(d => d.onTrack).length} of {complianceData.length} students on track
                  </p>
                  <div className="flex gap-2">
                    {complianceData.map((data) => (
                      <div
                        key={data.kid.id}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-black ${
                          data.healthScore >= 80 ? 'bg-green-200 text-green-800' :
                          data.healthScore >= 60 ? 'bg-yellow-200 text-yellow-800' :
                          'bg-red-200 text-red-800'
                        }`}
                      >
                        {data.healthScore}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {complianceData.map((data) => {
                const daysProgress = data.requiredDays > 0 ? (data.totalDays / data.requiredDays) * 100 : 0
                const hoursProgress = data.requiredHours > 0 ? (data.totalHours / data.requiredHours) * 100 : 0

                return (
                  <div
                    key={data.kid.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedKidId(data.kid.id)
                      setViewMode('individual')
                    }}
                  >
                    <div className={`p-6 border-b-4 ${
                      data.healthScore >= 80 ? 'border-green-500 bg-green-50' :
                      data.healthScore >= 60 ? 'border-yellow-500 bg-yellow-50' :
                      'border-red-500 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {data.kid.photo_url ? (
                            <img 
                              src={data.kid.photo_url} 
                              alt={data.kid.displayname}
                              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold">
                              {data.kid.firstname?.[0]}
                            </div>
                          )}
                          <div>
                            <h3 className="font-black text-gray-900 text-lg">{data.kid.displayname}</h3>
                            {data.kid.grade && (
                              <p className="text-xs text-gray-600 font-bold">Grade {data.kid.grade}</p>
                            )}
                          </div>
                        </div>
                        <div className={`text-3xl font-black ${getHealthColor(data.healthScore)}`}>
                          {data.healthScore}%
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      {data.requiredDays > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-gray-600 uppercase flex items-center gap-1">
                              <Calendar size={14} />
                              School Days
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {data.totalDays} / {data.requiredDays}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${getProgressColor(daysProgress)}`}
                              style={{ width: `${Math.min(100, daysProgress)}%` }}
                            />
                          </div>
                          {data.daysRemaining > 0 && (
                            <p className="text-xs text-gray-500 mt-1">{data.daysRemaining} days remaining</p>
                          )}
                        </div>
                      )}

                      {data.requiredHours > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-gray-600 uppercase flex items-center gap-1">
                              <Clock size={14} />
                              Instructional Hours
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {data.totalHours} / {data.requiredHours}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${getProgressColor(hoursProgress)}`}
                              style={{ width: `${Math.min(100, hoursProgress)}%` }}
                            />
                          </div>
                          {data.hoursRemaining > 0 && (
                            <p className="text-xs text-gray-500 mt-1">{data.hoursRemaining} hours remaining</p>
                          )}
                        </div>
                      )}

                      <div className={`mt-4 p-3 rounded-xl border-2 ${
                        data.onTrack ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black uppercase ${
                            data.onTrack ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {data.onTrack ? '✓ On Track' : '⚠ Behind Pace'}
                          </span>
                          <ChevronRight size={16} className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Individual Detail Mode */}
        {viewMode === 'individual' && selectedKidData && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <div className="flex items-center gap-3 overflow-x-auto">
                {complianceData.map((data) => (
                  <button
                    key={data.kid.id}
                    onClick={() => setSelectedKidId(data.kid.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all flex-shrink-0 ${
                      selectedKidId === data.kid.id
                        ? 'bg-indigo-100 border-2 border-indigo-600 text-indigo-900'
                        : 'bg-gray-50 border-2 border-transparent text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {data.kid.photo_url ? (
                      <img 
                        src={data.kid.photo_url} 
                        alt={data.kid.displayname}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">
                        {data.kid.firstname?.[0]}
                      </div>
                    )}
                    <span>{data.kid.displayname}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      data.healthScore >= 80 ? 'bg-green-200 text-green-800' :
                      data.healthScore >= 60 ? 'bg-yellow-200 text-yellow-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {data.healthScore}%
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`rounded-2xl border-2 p-6 ${getHealthBg(selectedKidData.healthScore)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={20} className={getHealthColor(selectedKidData.healthScore)} />
                  <h3 className="text-sm font-black text-gray-600 uppercase">Health Score</h3>
                </div>
                <div className={`text-5xl font-black ${getHealthColor(selectedKidData.healthScore)}`}>
                  {selectedKidData.healthScore}%
                </div>
                <p className="text-sm text-gray-600 font-medium mt-2">
                  {selectedKidData.onTrack ? '✓ Meeting requirements' : '⚠ Needs attention'}
                </p>
              </div>

              {selectedKidData.requiredDays > 0 && (
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={20} className="text-indigo-600" />
                    <h3 className="text-sm font-black text-gray-600 uppercase">School Days</h3>
                  </div>
                  <div className="text-5xl font-black text-gray-900">{selectedKidData.totalDays}</div>
                  <p className="text-sm text-gray-600 font-medium mt-2">
                    of {selectedKidData.requiredDays} required
                    {selectedKidData.daysRemaining > 0 && (
                      <span className="text-orange-600 font-bold ml-1">
                        ({selectedKidData.daysRemaining} left)
                      </span>
                    )}
                  </p>
                </div>
              )}

              {selectedKidData.requiredHours > 0 && (
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={20} className="text-indigo-600" />
                    <h3 className="text-sm font-black text-gray-600 uppercase">Instructional Hours</h3>
                  </div>
                  <div className="text-5xl font-black text-gray-900">{selectedKidData.totalHours}</div>
                  <p className="text-sm text-gray-600 font-medium mt-2">
                    of {selectedKidData.requiredHours} required
                    {selectedKidData.hoursRemaining > 0 && (
                      <span className="text-orange-600 font-bold ml-1">
                        ({selectedKidData.hoursRemaining} left)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-black text-gray-900 mb-4">Progress Over Time</h3>
              <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">📊 Chart coming in next phase</p>
              </div>
            </div>

            {!selectedKidData.onTrack && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-orange-600 flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="font-black text-orange-900 mb-2">Action Needed</h3>
                    <ul className="space-y-1 text-sm text-orange-800">
                      {selectedKidData.daysRemaining > 0 && (
                        <li>• Schedule {selectedKidData.daysRemaining} more school days before year end</li>
                      )}
                      {selectedKidData.hoursRemaining > 0 && (
                        <li>• Complete {selectedKidData.hoursRemaining} more instructional hours</li>
                      )}
                      <li>• Consider increasing daily instructional time</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div> {/* closes p-8 wrapper */}

    </div>
  )
}