'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import moment from 'moment'
import { calculateTotalSchoolDays, isValidHomeschoolDay } from '@/utils/schoolYearUtils'
import { DEFAULT_HOLIDAYS_2025_2026, Holiday } from '@/app/utils/holidayUtils'
import { generateComplianceReport } from '@/src/utils/generateComplianceReport'

interface ProgressDashboardProps {
  userId: string
}

type Tab = 'overview' | 'insights' | 'goals' | 'compliance' | 'reports'

type LessonRow = {
  id: string
  kid_id: string
  status: string
  duration_minutes: number | null
  subject?: string
}

export default function ProgressDashboard({ userId }: ProgressDashboardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [settings, setSettings] = useState<any>(null)
  const [vacationHolidays, setVacationHolidays] = useState<Holiday[]>([])
  const [allLessons, setAllLessons] = useState<LessonRow[]>([])
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const [stats, setStats] = useState({
    totalHours: 0,
    totalLessons: 0,
    completedHours: 0,
    completedLessons: 0,
    goalHours: 180,
    goalLessons: 180,
    trackingType: 'hours' as 'hours' | 'lessons',
    schoolYearStart: '',
    schoolYearEnd: '',
    vacationDays: 0,
    attendanceDays: 0,
    attendanceHours: 0,
    selectedState: '',
  })

  useEffect(() => { loadProgress() }, [userId])

  const loadProgress = async () => {
    let attendanceDays = 0
    let attendanceHours = 0

    const { data: kidsData } = await supabase
      .from('kids')
      .select('id, organization_id')
      .eq('user_id', userId)

    const orgId = kidsData?.[0]?.organization_id
    const kidIds = kidsData?.map((k: any) => k.id) || []
    setOrganizationId(orgId || null)

    let settingsData: any = null
    if (orgId) {
      const { data } = await supabase
        .from('school_year_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()
      settingsData = data
    }
    if (settingsData) setSettings(settingsData)

    if (orgId) {
      const { data: attendanceData } = await supabase
        .from('daily_attendance')
        .select('id, attendance_date, status, hours')
        .eq('organization_id', orgId)
        .in('status', ['full_day', 'half_day'])
        .gte('attendance_date', settingsData?.school_year_start || '')
        .lte('attendance_date', settingsData?.school_year_end || '')

      attendanceDays = attendanceData?.length || 0
      attendanceHours = attendanceData?.reduce((sum: number, a: any) => sum + (a.hours || 0), 0) || 0
    }

    const { data: lessons } = kidIds.length > 0
      ? await supabase.from('lessons').select('*').in('kid_id', kidIds)
      : { data: [] }

    setAllLessons((lessons as LessonRow[]) ?? [])

    const { data: vacations } = await supabase
      .from('vacation_periods')
      .select('*')
      .eq('user_id', userId)

    const vacationHolidaysData: Holiday[] = vacations?.map((v: any) => ({
      name: v.name,
      start: v.start_date,
      end: v.end_date,
      enabled: true,
    })) || []
    setVacationHolidays(vacationHolidaysData)

    const totalVacationDays = vacations?.reduce((sum: number, v: any) => {
      return sum + moment(v.end_date).diff(moment(v.start_date), 'days') + 1
    }, 0) ?? 0

    const totalHours = ((lessons ?? []).reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0)) / 60
    const completedHours = ((lessons ?? []).filter((l: any) => l.status === 'completed')
      .reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0)) / 60

    setStats({
      totalHours,
      totalLessons: lessons?.length || 0,
      completedHours,
      completedLessons: (lessons ?? []).filter((l: any) => l.status === 'completed').length,
      goalHours: settingsData?.annual_goal_value || 180,
      goalLessons: settingsData?.annual_goal_value || 180,
      trackingType: settingsData?.annual_goal_type || 'hours',
      schoolYearStart: settingsData?.school_year_start || '',
      schoolYearEnd: settingsData?.school_year_end || '',
      vacationDays: totalVacationDays,
      attendanceDays,
      attendanceHours,
      selectedState: settingsData?.selected_state || '',
    })

    setLoading(false)
  }

  const calculateExpectedProgress = () => {
    if (!stats.schoolYearStart || !stats.schoolYearEnd) return 0
    const start = moment(stats.schoolYearStart)
    const end = moment(stats.schoolYearEnd)
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
    if (!stats.schoolYearStart || stats.attendanceDays === 0) return null
    const weeksElapsed = Math.max(1, moment().diff(moment(stats.schoolYearStart), 'weeks'))
    const daysPerWeek = stats.attendanceDays / weeksElapsed
    const daysRemaining = Math.max(0, stats.goalLessons - stats.attendanceDays)
    const weeksRemaining = daysPerWeek > 0 ? daysRemaining / daysPerWeek : 0
    return moment().add(weeksRemaining, 'weeks')
  }

  const getSubjectBreakdown = () => {
    const subjects: Record<string, { total: number; completed: number }> = {}
    allLessons.forEach((l: LessonRow) => {
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

      const requiredDays = stats.goalLessons
      const requiredHours = stats.trackingType === 'hours' ? stats.goalHours : 0

      const complianceData = kidsData.map((kid: any) => {
        const kidLessons = (lessons ?? []).filter((l: any) => l.kid_id === kid.id)
        const completedMinutes = kidLessons
          .filter((l: any) => l.status === 'completed')
          .reduce((sum: number, l: any) => sum + (l.duration_minutes ?? 0), 0)
        const totalHours = Math.round((completedMinutes / 60) * 10) / 10
        const totalDays = stats.attendanceDays
        const daysScore = requiredDays > 0 ? Math.min(100, Math.round((totalDays / requiredDays) * 100)) : 100
        const hoursScore = requiredHours > 0 ? Math.min(100, Math.round((totalHours / requiredHours) * 100)) : 100
        const healthScore = requiredHours > 0 ? Math.round(daysScore * 0.6 + hoursScore * 0.4) : daysScore
        return {
          kid, totalHours, totalDays, healthScore, requiredHours, requiredDays,
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
          state_code: stats.selectedState || undefined,
          school_year_start_date: stats.schoolYearStart,
          school_year_end_date: stats.schoolYearEnd,
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

  if (loading) return <div className="text-center py-8">Loading progress data...</div>

  const completed = stats.attendanceDays
  const goal = stats.goalLessons
  const percentComplete = goal > 0 ? Math.round((completed / goal) * 100) : 0
  const expectedProgress = calculateExpectedProgress()
  const estimatedCompletion = calculateEstimatedCompletion()
  const daysRemaining = Math.max(0, goal - completed)
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Progress Tracking</h2>
        <p className="text-gray-600">Monitor your annual learning goals and stay on track</p>
      </div>

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
              <span>Started: {stats.schoolYearStart ? moment(stats.schoolYearStart).format('MMM D, YYYY') : 'Not set'}</span>
              <span>Ends: {stats.schoolYearEnd ? moment(stats.schoolYearEnd).format('MMM D, YYYY') : 'Not set'}</span>
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
              { icon: '📅', value: stats.attendanceDays,              label: 'Days Logged',         color: 'text-gray-900'   },
              { icon: '✅', value: stats.completedLessons,            label: 'Lessons Completed',   color: 'text-green-600'  },
              { icon: '⏰', value: `${stats.completedHours.toFixed(1)}h`, label: 'Hours Logged',    color: 'text-blue-600'   },
              { icon: '🏖️', value: stats.vacationDays,                label: 'Vacation Days',       color: 'text-purple-600' },
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

          {!stats.schoolYearStart && (
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
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Completion Rate</div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalLessons > 0 ? Math.round((stats.completedLessons / stats.totalLessons) * 100) : 0}%
              </div>
              <div className="text-xs text-gray-400 mt-1">{stats.completedLessons} of {stats.totalLessons} lessons</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Avg. Hours / Day</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.attendanceDays > 0 ? (stats.completedHours / stats.attendanceDays).toFixed(1) : '0'}h
              </div>
              <div className="text-xs text-gray-400 mt-1">across {stats.attendanceDays} logged days</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Days Remaining</div>
              <div className="text-2xl font-bold text-orange-500">{daysRemaining}</div>
              <div className="text-xs text-gray-400 mt-1">to reach {goal}-day goal</div>
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

            {stats.goalHours > 0 && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-gray-700">Hours Goal</span>
                  <span className="text-gray-500">{stats.completedHours.toFixed(1)} / {stats.goalHours} hours</span>
                </div>
                <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.goalHours > 0 ? Math.round((stats.completedHours / stats.goalHours) * 100) : 0, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">Estimated Completion:</span>
              <span className="font-bold text-gray-900">
                {estimatedCompletion ? estimatedCompletion.format('MMM D, YYYY') : '—'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Custom Goals</h3>
            <p className="text-sm text-gray-400 italic">No custom goals set</p>
          </div>
        </div>
      )}

      {/* ── Compliance ── */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">✅ Compliance Status</h3>
            {!stats.selectedState ? (
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
                    <div className="font-bold text-gray-900">{stats.selectedState} Compliance</div>
                    <div className="text-sm text-gray-600">{completed} of {goal} required days logged · {percentComplete}% complete</div>
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
                      {stats.schoolYearEnd ? `by ${moment(stats.schoolYearEnd).format('MMM D, YYYY')}` : 'no end date set'}
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
              Most states accept this format as evidence of homeschool compliance.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
              {[
                { label: 'School Year', value: stats.schoolYearStart ? `${moment(stats.schoolYearStart).format('MMM D, YYYY')} – ${moment(stats.schoolYearEnd).format('MMM D, YYYY')}` : 'Not configured' },
                { label: 'State',             value: stats.selectedState || 'Not set'              },
                { label: 'Days Logged',       value: `${completed} / ${goal}`                      },
                { label: 'Lessons Completed', value: String(stats.completedLessons)                 },
              ].map(row => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-semibold text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleExportReport}
              disabled={isExporting || !stats.schoolYearStart}
              className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? '⏳ Generating...' : '⬇️ Download PDF Report'}
            </button>
            {!stats.schoolYearStart && (
              <p className="text-xs text-gray-400 mt-2 text-center">Configure school year dates before generating a report.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}