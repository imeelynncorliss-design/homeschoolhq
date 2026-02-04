'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Users,
  User,
  Settings,
  Download,
  ChevronRight
} from 'lucide-react'
import { createClient } from '@/src/lib/supabase'
import { useComplianceSettings } from '@/src/hooks/useComplianceSettings'      
import { useComplianceHours } from '@/src/hooks/useComplianceHours'
import { useComplianceHealthScore } from '@/src/hooks/useComplianceHealthScore'
import { generateComplianceReport } from '@/src/utils/generateComplianceReport'

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
  const supabase = createClient()
  
  // State
  const [viewMode, setViewMode] = useState<'family' | 'individual'>('family')
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null)
  const [kids, setKids] = useState<Kid[]>([])
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [complianceData, setComplianceData] = useState<KidComplianceData[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const handleExportReport = async () => {
    setIsExporting(true)
    try {
      const currentSettings = settings
      
      if (!currentSettings) {``
        alert('❌ Compliance settings not found')
        setIsExporting(false)
        return
      }
  
      // Validate required fields exist
      if (!currentSettings.school_year_start_date || !currentSettings.school_year_end_date) {
        alert('❌ School year dates are required for generating reports')
        setIsExporting(false)
        return
      }
  
      const { data: { user } } = await supabase.auth.getUser()
      const parentName = user?.user_metadata?.full_name || 'Parent'
      
      // Now TypeScript knows these are strings (not null/undefined)
      await generateComplianceReport({
        complianceData,
        settings: {
          ...currentSettings,
          state_code: currentSettings.state_code ?? undefined,
          school_year_start_date: currentSettings.school_year_start_date,
          school_year_end_date: currentSettings.school_year_end_date,
        },
        familyHealthScore,
        organizationName: 'HomeschoolHQ Family',
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

  // Hooks
  const { settings, loading: settingsLoading } = useComplianceSettings()

  // Get organization ID and kids
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      if (!profile?.organization_id) {
        console.error('Organization not found for user')
        setLoading(false)
        return
      }

      setOrganizationId(profile.organization_id)

      const { data: kidsData } = await supabase
        .from('kids')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: true })

      if (kidsData) setKids(kidsData)
      setLoading(false)
    }
    loadData()
  }, [router])

  // Load compliance data for each kid
  useEffect(() => {
    if (!settings || !kids.length || !organizationId) return

    const currentSettings = settings

    async function loadComplianceData() {
      const data: KidComplianceData[] = []

      for (const kid of kids) {
        const { data: hoursData } = await supabase
          .rpc('calculate_compliance_hours', {
            p_kid_id: kid.id,
            p_organization_id: organizationId,
            p_start_date: currentSettings.school_year_start_date,
            p_end_date: currentSettings.school_year_end_date
          })

        const { data: healthData } = await supabase
          .rpc('get_compliance_health_score', {
            p_kid_id: kid.id,
            p_organization_id: organizationId,
            p_start_date: currentSettings.school_year_start_date,
            p_end_date: currentSettings.school_year_end_date
          })

        const totalHours = hoursData?.[0]?.total_hours || 0
        const totalDays = hoursData?.[0]?.total_days || 0
        const healthScore = healthData?.[0]?.health_score || 0

        const requiredHours = currentSettings.required_annual_hours || 0
        const requiredDays = currentSettings.required_annual_days || 0

        const hoursRemaining = Math.max(0, requiredHours - totalHours)
        const daysRemaining = Math.max(0, requiredDays - totalDays)

        const daysProgress = requiredDays > 0 ? (totalDays / requiredDays) * 100 : 100
        const hoursProgress = requiredHours > 0 ? (totalHours / requiredHours) * 100 : 100
        const onTrack = healthScore >= 75

        data.push({
          kid,
          totalHours,
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
  }, [settings, kids, organizationId])

  // Calculate family health score
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

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading compliance data...</p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-yellow-600" size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-4">
              Compliance Settings Required
            </h2>
            <p className="text-gray-600 mb-6">
              Before you can track compliance, you need to configure your state requirements and school year dates.
            </p>
            <button
              onClick={() => router.push('/settings/compliance')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              <Settings className="inline mr-2" size={20} />
              Configure Settings
            </button>
          </div>
        </div>
      </div>
    )
  }

  const selectedKidData = selectedKidId 
    ? complianceData.find(d => d.kid.id === selectedKidId)
    : null

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-gray-600 transition-colors mb-4"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="text-indigo-600" size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                  Compliance Dashboard
                </h1>
                <p className="text-gray-600 font-medium mt-1">
                  {settings.state_code ? `${settings.state_code} Requirements` : 'Custom Requirements'} • 
                  {settings.school_year_start_date && settings.school_year_end_date && (
                    <span className="ml-1">
                      {new Date(settings.school_year_start_date).toLocaleDateString()} - {new Date(settings.school_year_end_date).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/settings/compliance')}
                className="px-4 py-2 border-2 border-gray-300 rounded-xl text-gray-700 font-bold hover:border-gray-400 transition-colors"
              >
                <Settings className="inline mr-2" size={18} />
                Settings
              </button>
              <button
                onClick={handleExportReport}
                disabled={isExporting}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold transition-colors ${
                  isExporting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-indigo-700'
                }`}
              >
                <Download className="inline mr-2" size={18} />
                {isExporting ? 'Generating...' : 'Export Report'}
              </button>
            </div>
          </div>
        </div>

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
            {/* Family Health Score Card */}
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
                    {complianceData.map((data, idx) => (
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

            {/* Student Cards */}
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
                    {/* Header */}
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
                            <h3 className="font-black text-gray-900 text-lg">
                              {data.kid.displayname}
                            </h3>
                            {data.kid.grade && (
                              <p className="text-xs text-gray-600 font-bold">
                                Grade {data.kid.grade}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className={`text-3xl font-black ${getHealthColor(data.healthScore)}`}>
                          {data.healthScore}%
                        </div>
                      </div>
                    </div>

                    {/* Progress Metrics */}
                    <div className="p-6 space-y-4">
                      {/* Days Progress */}
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
                            <p className="text-xs text-gray-500 mt-1">
                              {data.daysRemaining} days remaining
                            </p>
                          )}
                        </div>
                      )}

                      {/* Hours Progress */}
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
                            <p className="text-xs text-gray-500 mt-1">
                              {data.hoursRemaining} hours remaining
                            </p>
                          )}
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className={`mt-4 p-3 rounded-xl border-2 ${
                        data.onTrack 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
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
            {/* Student Selector */}
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

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Health Score */}
              <div className={`rounded-2xl border-2 p-6 ${getHealthBg(selectedKidData.healthScore)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={20} className={getHealthColor(selectedKidData.healthScore)} />
                  <h3 className="text-sm font-black text-gray-600 uppercase">
                    Health Score
                  </h3>
                </div>
                <div className={`text-5xl font-black ${getHealthColor(selectedKidData.healthScore)}`}>
                  {selectedKidData.healthScore}%
                </div>
                <p className="text-sm text-gray-600 font-medium mt-2">
                  {selectedKidData.onTrack ? '✓ Meeting requirements' : '⚠ Needs attention'}
                </p>
              </div>

              {/* Days Progress */}
              {selectedKidData.requiredDays > 0 && (
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={20} className="text-indigo-600" />
                    <h3 className="text-sm font-black text-gray-600 uppercase">
                      School Days
                    </h3>
                  </div>
                  <div className="text-5xl font-black text-gray-900">
                    {selectedKidData.totalDays}
                  </div>
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

              {/* Hours Progress */}
              {selectedKidData.requiredHours > 0 && (
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={20} className="text-indigo-600" />
                    <h3 className="text-sm font-black text-gray-600 uppercase">
                      Instructional Hours
                    </h3>
                  </div>
                  <div className="text-5xl font-black text-gray-900">
                    {selectedKidData.totalHours}
                  </div>
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

            {/* Progress Chart Placeholder */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-black text-gray-900 mb-4">
                Progress Over Time
              </h3>
              <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">
                  📊 Chart coming in next phase
                </p>
              </div>
            </div>

            {/* Recommendations */}
            {!selectedKidData.onTrack && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-orange-600 flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="font-black text-orange-900 mb-2">
                      Action Needed
                    </h3>
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
    </div>
  )
}