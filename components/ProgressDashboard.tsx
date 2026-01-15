'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import moment from 'moment'
import { calculateTotalSchoolDays, isValidHomeschoolDay } from '@/utils/schoolYearUtils'
import { DEFAULT_HOLIDAYS_2025_2026, Holiday } from '@/app/utils/holidayUtils'

interface ProgressDashboardProps {
  userId: string
}

export default function ProgressDashboard({ userId }: ProgressDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<any>(null)
  const [vacationHolidays, setVacationHolidays] = useState<Holiday[]>([])
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
    vacationDays: 0
  })

  useEffect(() => {
    loadProgress()
  }, [userId])

  const loadProgress = async () => {
    // Load school year settings
    const { data: settingsData } = await supabase
      .from('school_year_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (settingsData) {
      setSettings(settingsData)
    }

    // Load all lessons
    const { data: lessons } = await supabase
      .from('lessons')
      .select('*, kids!inner(user_id)')
      .eq('kids.user_id', userId)

    // Load vacation periods
    const { data: vacations } = await supabase
      .from('vacation_periods')
      .select('*')
      .eq('user_id', userId)

    const vacationHolidaysData: Holiday[] = vacations?.map(v => ({
      name: v.name,
      start: v.start_date,
      end: v.end_date,
      enabled: true
    })) || []

    setVacationHolidays(vacationHolidaysData)

    const totalVacationDays = vacations?.reduce((sum, v) => {
      const start = moment(v.start_date)
      const end = moment(v.end_date)
      return sum + end.diff(start, 'days') + 1
    }, 0) || 0

    const totalHours = lessons?.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) / 60 || 0
    const completedHours = lessons?.filter(l => l.status === 'completed')
      .reduce((sum, l) => sum + (l.duration_minutes || 0), 0) / 60 || 0
    
    const totalLessons = lessons?.length || 0
    const completedLessons = lessons?.filter(l => l.status === 'completed').length || 0

    setStats({
      totalHours,
      totalLessons,
      completedHours,
      completedLessons,
      goalHours: settingsData?.annual_goal_value || 180,
      goalLessons: settingsData?.annual_goal_value || 180,
      trackingType: settingsData?.annual_goal_type || 'hours',
      schoolYearStart: settingsData?.school_year_start || '',
      schoolYearEnd: settingsData?.school_year_end || '',
      vacationDays: totalVacationDays
    })
    setLoading(false)
  }

  // Enhanced calculation that accounts for homeschool days and vacations
  const calculateExpectedProgress = () => {
    if (!stats.schoolYearStart || !stats.schoolYearEnd) return 0
    
    const start = moment(stats.schoolYearStart)
    const end = moment(stats.schoolYearEnd)
    const today = moment()
    
    if (today.isBefore(start)) return 0
    if (today.isAfter(end)) return 100
    
    // Get homeschool days from settings
    const homeschoolDays = settings?.homeschool_days || [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
    ]
    
    // Combine default holidays with vacations
    const allHolidays = [...DEFAULT_HOLIDAYS_2025_2026, ...vacationHolidays]
    
    // Calculate total possible school days for the entire year
    const totalSchoolDays = calculateTotalSchoolDays(
      start.format('YYYY-MM-DD'),
      end.format('YYYY-MM-DD'),
      homeschoolDays,
      allHolidays
    )
    
    // Calculate elapsed school days (not calendar days!)
    let elapsedSchoolDays = 0
    let currentDate = moment(start)
    
    while (currentDate.isSameOrBefore(today) && currentDate.isSameOrBefore(end)) {
      const dateStr = currentDate.format('YYYY-MM-DD')
      if (isValidHomeschoolDay(dateStr, homeschoolDays, allHolidays)) {
        elapsedSchoolDays++
      }
      currentDate.add(1, 'day')
    }
    
    return totalSchoolDays > 0 
      ? Math.round((elapsedSchoolDays / totalSchoolDays) * 100) 
      : 0
  }

  if (loading) {
    return <div className="text-center py-8">Loading progress data...</div>
  }

  const isTrackingHours = stats.trackingType === 'hours'
  const completed = isTrackingHours ? stats.completedHours : stats.completedLessons
  const goal = isTrackingHours ? stats.goalHours : stats.goalLessons
  const percentComplete = goal > 0 ? Math.round((completed / goal) * 100) : 0

  const expectedProgress = calculateExpectedProgress()
  const progressStatus = 
    percentComplete >= expectedProgress + 10 ? 'ahead' :
    percentComplete < expectedProgress - 10 ? 'behind' : 'on-track'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Progress Tracking</h2>
        <p className="text-gray-600">Monitor your annual learning goals and stay on track</p>
      </div>

      {/* Overall Progress Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold mb-1">
              {completed.toFixed(1)} / {goal} {isTrackingHours ? 'Hours' : 'Lessons'}
            </h3>
            <p className="text-blue-100">Annual Goal Progress</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{percentComplete}%</div>
            <div className="text-sm text-blue-100">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/20 rounded-full h-4 mb-2">
          <div 
            className="bg-white rounded-full h-4 transition-all duration-500"
            style={{ width: `${Math.min(percentComplete, 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm text-blue-100">
          <span>Started: {stats.schoolYearStart ? moment(stats.schoolYearStart).format('MMM D, YYYY') : 'Not set'}</span>
          <span>Ends: {stats.schoolYearEnd ? moment(stats.schoolYearEnd).format('MMM D, YYYY') : 'Not set'}</span>
        </div>
      </div>

      {/* Status Indicator */}
      <div className={`rounded-lg p-6 border-2 ${
        progressStatus === 'ahead' ? 'bg-green-50 border-green-500' :
        progressStatus === 'behind' ? 'bg-red-50 border-red-500' :
        'bg-blue-50 border-blue-500'
      }`}>
        <div className="flex items-center gap-4">
          <div className="text-5xl">
            {progressStatus === 'ahead' ? '🚀' :
             progressStatus === 'behind' ? '⚠️' : '✅'}
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-bold mb-1 ${
              progressStatus === 'ahead' ? 'text-green-800' :
              progressStatus === 'behind' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {progressStatus === 'ahead' ? 'Ahead of Schedule!' :
               progressStatus === 'behind' ? 'Behind Schedule' :
               'Right on Track!'}
            </h3>
            <p className={`text-sm ${
              progressStatus === 'ahead' ? 'text-green-700' :
              progressStatus === 'behind' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {progressStatus === 'ahead' 
                ? `You're ${percentComplete - expectedProgress}% ahead of where you should be. Great work!`
                : progressStatus === 'behind'
                ? `You're ${expectedProgress - percentComplete}% behind. Consider adjusting your schedule or adding extra study time.`
                : `You're progressing exactly as planned for this time of year.`
              }
            </p>
          </div>
        </div>

        {/* Comparison Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium">Expected Progress: {expectedProgress}%</span>
            <span className="font-medium">Actual Progress: {percentComplete}%</span>
          </div>
          <div className="relative h-8 bg-white rounded-lg overflow-hidden">
            {/* Expected progress line */}
            <div 
              className="absolute top-0 h-full w-1 bg-gray-800 z-10"
              style={{ left: `${expectedProgress}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap">
                ↓
              </div>
            </div>
            {/* Actual progress bar */}
            <div 
              className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                progressStatus === 'ahead' ? 'bg-green-500' :
                progressStatus === 'behind' ? 'bg-red-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${Math.min(percentComplete, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-3xl mb-2">📚</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalLessons}</div>
          <div className="text-sm text-gray-600">Total Lessons</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-bold text-green-600">{stats.completedLessons}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-3xl mb-2">⏰</div>
          <div className="text-2xl font-bold text-blue-600">{stats.completedHours.toFixed(1)}h</div>
          <div className="text-sm text-gray-600">Hours Logged</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-3xl mb-2">🏖️</div>
          <div className="text-2xl font-bold text-purple-600">{stats.vacationDays}</div>
          <div className="text-sm text-gray-600">Vacation Days</div>
        </div>
      </div>

      {/* Recommendations */}
      {progressStatus === 'behind' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-semibold text-gray-900 mb-2">Recommendations to Get Back on Track:</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Add an extra study session each week</li>
                <li>Extend daily lessons by 15-30 minutes</li>
                <li>Review and adjust vacation plans if possible</li>
                <li>Focus on completing scheduled lessons before adding new ones</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Not Configured Warning */}
      {!stats.schoolYearStart && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Configure Your School Year</p>
              <p className="text-sm text-gray-700">
                Set up your school year dates in the School Year tab to see accurate progress tracking.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}