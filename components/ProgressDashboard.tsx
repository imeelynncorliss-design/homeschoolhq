'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import moment from 'moment'
import { calculateTotalSchoolDays, isValidHomeschoolDay } from '@/utils/schoolYearUtils'
import { DEFAULT_HOLIDAYS_2025_2026, Holiday } from '@/app/utils/holidayUtils'
import { generateComplianceReport } from '@/src/utils/generateComplianceReport'
import { useAttendanceStats } from '@/src/hooks/useAttendanceStats'

interface ProgressDashboardProps {
  userId: string
  organizationId: string   // ← now a required prop; do NOT derive from kids table
}

type Tab = 'overview' | 'insights' | 'goals' | 'compliance' | 'reports'

type LessonRow = {
  id: string
  kid_id: string
  status: string
  duration_minutes: number | null
  subject?: string
}

type Kid = {
  id: string
  displayname: string
}

export default function ProgressDashboard({ userId, organizationId }: ProgressDashboardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [settings, setSettings] = useState<any>(null)
  const [vacationHolidays, setVacationHolidays] = useState<Holiday[]>([])
  const [allLessons, setAllLessons] = useState<LessonRow[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [requiredDays, setRequiredDays] = useState(180)
  const [selectedState, setSelectedState] = useState('')
  const [kids, setKids] = useState<Kid[]>([])
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null)
  const [fieldTripHours, setFieldTripHours] = useState(0)
  const [booksRead, setBooksRead] = useState(0)

  // ── Shared attendance stats (same logic as AttendanceTracker) ──
  const attendanceStats = useAttendanceStats({
    organizationId,
    userId,
    startDate: settings?.school_year_start || undefined,
    endDate: settings?.school_year_end || undefined,
    requiredDays,
  })

  useEffect(() => {
    if (organizationId) loadSettings()
  }, [organizationId])

  useEffect(() => {
    if (!organizationId) return
    const fetchKidStats = async () => {
      let tripQuery = supabase.from('field_trips').select('hours').eq('organization_id', organizationId)
      let bookQuery = supabase.from('reading_log').select('id').eq('organization_id', organizationId)
      if (selectedKidId) {
        tripQuery = tripQuery.eq('kid_id', selectedKidId)
        bookQuery = bookQuery.eq('kid_id', selectedKidId)
      }
      const [{ data: tripData }, { data: bookData }] = await Promise.all([tripQuery, bookQuery])
      const hours = (tripData || []).reduce((sum: number, t: any) => sum + (t.hours ?? 0), 0)
      setFieldTripHours(Math.round(hours * 10) / 10)
      setBooksRead((bookData || []).length)
    }
    fetchKidStats()
  }, [organizationId, selectedKidId])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // School year settings
      const { data: settingsData } = await supabase
        .from('school_year_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle()

      if (settingsData) {
        setSettings(settingsData)
        setSelectedState(settingsData.selected_state || '')
      }

      // Compliance goal override
      const { data: complianceData } = await supabase
        .from('user_compliance_settings')
        .select('annual_days_goal')
        .eq('organization_id', organizationId)
        .maybeSingle()

      if (complianceData?.annual_days_goal) {
        setRequiredDays(complianceData.annual_days_goal)
      } else if (settingsData?.annual_goal_value) {
        setRequiredDays(settingsData.annual_goal_value)
      }

      // Vacations
      const { data: vacations } = await supabase
        .from('vacation_periods')
        .select('*')
        .eq('user_id', userId)

      const vh: Holiday[] = (vacations || []).map((v: any) => ({
        name: v.name,
        start: v.start_date,
        end: v.end_date,
        enabled: true,
      }))
      setVacationHolidays(vh)

      // Lessons (for subject breakdown only — day counting comes from hook)
      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname')
        .eq('organization_id', organizationId)

      const kidList = (kidsData || []) as Kid[]
      setKids(kidList)
      const kidIds = kidList.map(k => k.id)
      if (kidIds.length > 0) {
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id, kid_id, status, duration_minutes, subject')
          .in('kid_id', kidIds)
        setAllLessons((lessons as LessonRow[]) || [])

      }
    } catch (err) {
      console.error('ProgressDashboard loadSettings error:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateExpectedProgress = () => {
    if (!settings?.school_year_start || !settings?.school_year_end) return 0
    const start = moment(settings.school_year_start)
    const end = moment(settings.school_year_end)
    const today = moment()
    if (today.isBefore(start)) return 0
    if (today.isAfter(end)) return 100
    const homeschoolDays = settings?.homeschool_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const allHolidays = [...DEFAULT_HOLIDAYS_2025_2026, ...vacationHolidays]
    const totalSchoolDays = calculateTotalSchoolDays(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'), homeschoolDays, allHolidays)
    let elapsedSchoolDays = 0
    let currentDate = moment(start)
    while (currentDate.isSameOrBefore(today) && currentDate.isSameOrBefore(end)) {
      if (isValidHomeschoolDay(currentDate.format('YYYY-MM-DD'), homeschoolDays, allHolidays)) elapsedSchoolDays++
      currentDate.add(1, 'day')
    }
    return totalSchoolDays > 0 ? Math.round((elapsedSchoolDays / totalSchoolDays) * 100) : 0
  }

  const calculateEstimatedCompletion = () => {
    if (!settings?.school_year_start || attendanceStats.totalDays === 0) return null
    const weeksElapsed = Math.max(1, moment().diff(moment(settings.school_year_start), 'weeks'))
    const daysPerWeek = attendanceStats.totalDays / weeksElapsed
    const daysRemaining = Math.max(0, requiredDays - attendanceStats.totalDays)
    const weeksRemaining = daysPerWeek > 0 ? daysRemaining / daysPerWeek : 0
    return moment().add(weeksRemaining, 'weeks')
  }

  const getSubjectBreakdown = () => {
    const subjects: Record<string, { total: number; completed: number }> = {}
    filteredLessons.forEach((l: LessonRow) => {
      const subj = l.subject || 'Other'
      if (!subjects[subj]) subjects[subj] = { total: 0, completed: 0 }
      subjects[subj].total++
      if (l.status === 'completed') subjects[subj].completed++
    })
    return Object.entries(subjects)
      .map(([subject, data]) => ({ subject, ...data }))
      .sort((a, b) => b.total - a.total)
  }

  const handleExportReport = async () => {
    if (!organizationId) return
    setIsExporting(true)
    try {
      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname, firstname, lastname, photo_url, grade, age')
        .eq('organization_id', organizationId)

      if (!kidsData || kidsData.length === 0) { alert('No students found.'); return }

      const kidIds = kidsData.map((k: any) => k.id)
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, kid_id, status, duration_minutes')
        .in('kid_id', kidIds)

      const complianceData = kidsData.map((kid: any) => {
        const kidLessons = (lessons ?? []).filter((l: any) => l.kid_id === kid.id)
        const completedMinutes = kidLessons
          .filter((l: any) => l.status === 'completed')
          .reduce((sum: number, l: any) => sum + (l.duration_minutes ?? 0), 0)
        const totalHours = Math.round((completedMinutes / 60) * 10) / 10
        // Use shared hook totals for consistency
        const totalDays = attendanceStats.totalDays
        const daysScore = requiredDays > 0 ? Math.min(100, Math.round((totalDays / requiredDays) * 100)) : 100
        const hoursScore = attendanceStats.totalHours > 0
          ? Math.min(100, Math.round((totalHours / attendanceStats.totalHours) * 100))
          : 100
        const healthScore = Math.round(daysScore * 0.6 + hoursScore * 0.4)
        return {
          kid,
          totalHours,
          totalDays,
          healthScore,
          requiredHours: attendanceStats.totalHours,
          requiredDays,
          hoursRemaining: 0,
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
          school_year_start_date: settings?.school_year_start,
          school_year_end_date: settings?.school_year_end,
          required_annual_days: requiredDays,
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

  if (loading || attendanceStats.loading) {
    return <div className="text-center py-8">Loading progress data...</div>
  }

  const filteredLessons = selectedKidId
    ? allLessons.filter(l => l.kid_id === selectedKidId)
    : allLessons

  const completed = attendanceStats.totalDays
  const goal = requiredDays
  const percentComplete = goal > 0 ? Math.round((completed / goal) * 100) : 0
  const expectedProgress = calculateExpectedProgress()
  const estimatedCompletion = calculateEstimatedCompletion()
  const daysRemaining = Math.max(0, goal - completed)
  const completedLessons = filteredLessons.filter(l => l.status === 'completed').length
  const totalLessons = filteredLessons.length
  const completedHours = attendanceStats.totalHours

  const progressStatus =
    percentComplete >= expectedProgress + 10 ? 'ahead' :
    percentComplete < expectedProgress - 10 ? 'behind' : 'on-track'

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'overview',   icon: '📋', label: 'Overview'   },
    { id: 'insights',   icon: '📊', label: 'Insights'   },
    { id: 'goals',      icon: '🎯', label: 'Goals'      },
    { id: 'compliance', icon: '✅', label: 'Compliance' },
    { id: 'reports',    icon: '📄', label: 'Reports'    },
  ]

  const KID_COLORS = ['#7c3aed', '#0d9488', '#ec4899', '#f59e0b', '#3b82f6']

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Progress Tracking</h2>
        <p className="text-gray-600">Monitor your annual learning goals and stay on track</p>
      </div>

      {/* Kid filter pills — Insights only */}
      {kids.length > 1 && activeTab === 'insights' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          <button
            onClick={() => setSelectedKidId(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 16px', borderRadius: 999, fontFamily: "'Nunito', sans-serif",
              fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
              border: selectedKidId === null ? '2px solid #7c3aed' : '2px solid #e5e7eb',
              background: selectedKidId === null ? '#ede9fe' : '#fff',
              color: selectedKidId === null ? '#7c3aed' : '#6b7280',
            }}
          >
            All kids
          </button>
          {kids.map((kid, idx) => {
            const color = KID_COLORS[idx % KID_COLORS.length]
            const isActive = kid.id === selectedKidId
            return (
              <button
                key={kid.id}
                onClick={() => setSelectedKidId(isActive ? null : kid.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 16px 7px 10px', borderRadius: 999, fontFamily: "'Nunito', sans-serif",
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                  border: `2px solid ${isActive ? color : '#e5e7eb'}`,
                  background: isActive ? `${color}18` : '#fff',
                  color: isActive ? color : '#6b7280',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: isActive ? color : '#d1d5db',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0,
                }}>
                  {kid.displayname.charAt(0).toUpperCase()}
                </div>
                {kid.displayname}
              </button>
            )
          })}
        </div>
      )}


      {/* Days breakdown notice — surfaces confirmed vs inferred split */}
      {attendanceStats.lessonInferredDays > 0 && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
    <span>⚠️</span>
    <span>
      <strong>{attendanceStats.lessonInferredDays} school days</strong> have lessons logged but no attendance record.
      These days count toward your total now but aren't officially confirmed yet. Once you review and confirm them in the Attendance Tracker, your numbers here will match.{' '}
  <a href="/attendance" className="underline font-semibold">Go to Attendance Tracker →</a>
    </span>
  </div>
)}

      {/* Top progress bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span className="font-semibold">Progress to {goal} days</span>
          <span>{completed} days completed</span>
        </div>
        <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressStatus === 'ahead' ? 'bg-green-500' :
              progressStatus === 'behind' ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentComplete, 100)}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-1">{completed} / {goal} Days</h3>
                <p className="text-blue-100">Annual Compliance Progress</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{percentComplete}%</div>
                <div className="text-sm text-blue-100">Complete</div>
              </div>
            </div>
            <div className="bg-white/20 rounded-full h-4 mb-2">
              <div className="bg-white rounded-full h-4 transition-all duration-500" style={{ width: `${Math.min(percentComplete, 100)}%` }} />
            </div>
            <div className="flex justify-between text-sm text-blue-100">
              <span>Started: {settings?.school_year_start ? moment(settings.school_year_start).format('MMM D, YYYY') : 'Not set'}</span>
              <span>Ends: {settings?.school_year_end ? moment(settings.school_year_end).format('MMM D, YYYY') : 'Not set'}</span>
            </div>
          </div>

          <div className={`rounded-lg p-6 border-2 ${
            progressStatus === 'ahead' ? 'bg-green-50 border-green-500' :
            progressStatus === 'behind' ? 'bg-red-50 border-red-500' :
            'bg-blue-50 border-blue-500'
          }`}>
            <div className="flex items-center gap-4">
              <div className="text-5xl">
                {progressStatus === 'ahead' ? '🚀' : progressStatus === 'behind' ? '⚠️' : '✅'}
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-1 ${
                  progressStatus === 'ahead' ? 'text-green-800' :
                  progressStatus === 'behind' ? 'text-red-800' : 'text-blue-800'
                }`}>
                  {progressStatus === 'ahead' ? 'Ahead of Schedule!' :
                   progressStatus === 'behind' ? 'Behind Schedule' : 'Right on Track!'}
                </h3>
                <p className={`text-sm ${
                  progressStatus === 'ahead' ? 'text-green-700' :
                  progressStatus === 'behind' ? 'text-red-700' : 'text-blue-700'
                }`}>
                  {progressStatus === 'ahead'
                    ? `You're ${percentComplete - expectedProgress}% ahead of where you should be. Great work!`
                    : progressStatus === 'behind'
                    ? `You're ${expectedProgress - percentComplete}% behind. Consider adjusting your schedule.`
                    : `You're progressing exactly as planned for this time of year.`}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-gray-900 bg-white/70 px-2 py-0.5 rounded">Expected: {expectedProgress}%</span>
                <span className="font-bold text-gray-900 bg-white/70 px-2 py-0.5 rounded">Actual: {percentComplete}%</span>
              </div>
              <div className="relative h-8 bg-white rounded-lg overflow-hidden">
                <div className="absolute top-0 h-full w-0.5 bg-gray-800 z-10" style={{ left: `${expectedProgress}%` }} />
                <div className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                  progressStatus === 'ahead' ? 'bg-green-500' :
                  progressStatus === 'behind' ? 'bg-red-500' : 'bg-blue-500'
                }`} style={{ width: `${Math.min(percentComplete, 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: '📅', value: attendanceStats.confirmedDays,           label: 'Confirmed Days',    color: 'text-gray-900'   },
              { icon: '📚', value: attendanceStats.lessonInferredDays,       label: 'Lesson-Only Days',  color: 'text-amber-600'  },
              { icon: '✅', value: completedLessons,                         label: 'Lessons Completed', color: 'text-green-600'  },
              { icon: '⏰', value: `${completedHours.toFixed(1)}h`,          label: 'Hours Logged',      color: 'text-blue-600'   },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-sm text-gray-600">{s.label}</div>
              </div>
            ))}
          </div>

          {progressStatus === 'behind' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-semibold text-gray-900 mb-2">Recommendations to Get Back on Track:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>Add an extra study session each week</li>
                    <li>Extend daily lessons by 15–30 minutes</li>
                    <li>Review and adjust vacation plans if possible</li>
                    <li>Focus on completing scheduled lessons before adding new ones</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {!settings?.school_year_start && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Configure Your School Year</p>
                  <p className="text-sm text-gray-700">
                    Set up your school year dates in{' '}
                    <button onClick={() => router.push('/school-year')} className="text-blue-600 font-semibold hover:underline">
                      School Year &amp; Compliance
                    </button>{' '}
                    to see accurate progress tracking.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Insights ── */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Subject Breakdown</h3>
            {getSubjectBreakdown().length === 0 ? (
              <p className="text-sm text-gray-500">No lesson data yet. Start adding lessons to see subject insights.</p>
            ) : (
              <div className="space-y-3">
                {getSubjectBreakdown().map(({ subject, total, completed: subDone }) => {
                  const pct = total > 0 ? Math.round((subDone / total) * 100) : 0
                  return (
                    <div key={subject}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-700">{subject}</span>
                        <span className="text-gray-500">{subDone}/{total} · {pct}%</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-between text-sm pt-3 mt-1 border-t border-gray-200">
                  <span className="font-bold text-gray-700">Total</span>
                  <span className="font-bold text-gray-900">{completedLessons} of {totalLessons} lessons completed</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Completion Rate</div>
              <div className="text-2xl font-bold text-purple-600">
                {totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%
              </div>
              <div className="text-xs text-gray-400 mt-1">{completedLessons} of {totalLessons} lessons</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Avg. Hours / Day</div>
              <div className="text-2xl font-bold text-blue-600">
                {attendanceStats.totalDays > 0 ? (attendanceStats.totalHours / attendanceStats.totalDays).toFixed(1) : '0'}h
              </div>
              <div className="text-xs text-gray-400 mt-1">across {attendanceStats.totalDays} logged days</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Days Remaining</div>
              <div className="text-2xl font-bold text-orange-500">{daysRemaining}</div>
              <div className="text-xs text-gray-400 mt-1">to reach {goal}-day goal</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">📚 Books Read</div>
              <div className="text-2xl font-bold text-purple-600">{booksRead}</div>
              <div className="text-xs text-gray-400 mt-1">this school year</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">🚌 Field Trip Hours</div>
              <div className="text-2xl font-bold text-green-600">{fieldTripHours}h</div>
              <div className="text-xs text-gray-400 mt-1">logged this year</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Goals ── */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Attendance Goals</h3>
                <p className="text-sm text-gray-500">Set targets and track your progress</p>
              </div>
              <button
                onClick={() => router.push('/school-year')}
                className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit Goals
              </button>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-gray-700">School Days Goal</span>
                <span className="text-gray-500">{completed} / {goal} days</span>
              </div>
              <div className="bg-gray-100 rounded-full h-4 overflow-hidden mb-1">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(percentComplete, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{percentComplete}% complete</span>
                <span>{daysRemaining} days to go</span>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-gray-700">Hours Logged</span>
                <span className="text-gray-500">{attendanceStats.totalHours.toFixed(1)} hours</span>
              </div>
              <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((attendanceStats.totalHours / (goal * 4)) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Based on 4 hrs/day target</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">Estimated Completion:</span>
              <span className="font-bold text-gray-900">
                {estimatedCompletion ? estimatedCompletion.format('MMM D, YYYY') : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Compliance ── */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">✅ Compliance Status</h3>
            {!selectedState ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  No state selected.{' '}
                  <button onClick={() => router.push('/school-year')} className="text-blue-600 font-semibold hover:underline">
                    Set your state in School Year settings
                  </button>{' '}
                  to see compliance requirements.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-lg p-4 border-2 flex items-center gap-4 ${
                  percentComplete >= 80 ? 'bg-green-50 border-green-300' :
                  percentComplete >= 40 ? 'bg-amber-50 border-amber-300' :
                  'bg-red-50 border-red-300'
                }`}>
                  <div className="text-4xl">
                    {percentComplete >= 80 ? '✅' : percentComplete >= 40 ? '⚠️' : '🚨'}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{selectedState} Compliance</div>
                    <div className="text-sm text-gray-600">
                      {completed} of {goal} required days logged · {percentComplete}% complete
                    </div>
                    {attendanceStats.lessonInferredDays > 0 && (
                      <div className="text-xs text-amber-700 mt-1">
                        ⚠️ {attendanceStats.lessonInferredDays} days are lesson-inferred and not yet manually confirmed.
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Days Logged</div>
                    <div className="text-2xl font-bold text-gray-900">{completed}</div>
                    <div className="text-xs text-gray-400">of {goal} required</div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Days Remaining</div>
                    <div className="text-2xl font-bold text-orange-500">{daysRemaining}</div>
                    <div className="text-xs text-gray-400">
                      {settings?.school_year_end ? `by ${moment(settings.school_year_end).format('MMM D, YYYY')}` : 'no end date set'}
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
                  💡 HomeschoolReady is not a legal advisor. Always verify requirements at{' '}
                  <a href="https://hslda.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">HSLDA.org</a>
                  {' '}or your state's Department of Education.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reports ── */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">📄 Compliance Report</h3>
            <p className="text-sm text-gray-500 mb-6">
              Generate a PDF compliance report showing attendance, lesson completion, and health scores for each student.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
              {[
                { label: 'School Year', value: settings?.school_year_start ? `${moment(settings.school_year_start).format('MMM D, YYYY')} – ${moment(settings.school_year_end).format('MMM D, YYYY')}` : 'Not configured' },
                { label: 'State',             value: selectedState || 'Not set'                },
                { label: 'Days Logged',       value: `${completed} / ${goal}`                  },
                { label: 'Lessons Completed', value: String(completedLessons)                   },
              ].map(row => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-semibold text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleExportReport}
              disabled={isExporting || !settings?.school_year_start}
              className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? '⏳ Generating...' : '⬇️ Download PDF Report'}
            </button>
            {!settings?.school_year_start && (
              <p className="text-xs text-gray-400 mt-2 text-center">Configure school year dates before generating a report.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}