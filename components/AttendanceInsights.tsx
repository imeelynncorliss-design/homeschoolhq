'use client'

import { useMemo } from 'react'

interface DayData {
  date: string
  isSchoolDay: boolean
  totalHours: number
  lessonCount: number
}

interface AttendanceInsightsProps {
  days: DayData[]
  requiredDays: number
}

export default function AttendanceInsights({ days, requiredDays }: AttendanceInsightsProps) {
  const insights = useMemo(() => {
    if (days.length === 0) return null

    const schoolDays = days.filter(d => d.isSchoolDay)
    const totalDays = schoolDays.length
    const totalHours = schoolDays.reduce((sum, d) => sum + d.totalHours, 0)

    // Calculate streak
    const sortedDays = [...days].sort((a, b) => b.date.localeCompare(a.date))
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let lastDate: Date | null = null

    for (const day of sortedDays) {
      if (!day.isSchoolDay) {
        tempStreak = 0
        lastDate = null
        continue
      }

      const dayDate = new Date(day.date)
      
      if (!lastDate) {
        tempStreak = 1
        // Check if this is today or yesterday (for current streak)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        const isRecent = dayDate.toDateString() === today.toDateString() || 
                        dayDate.toDateString() === yesterday.toDateString()
        
        if (isRecent) currentStreak = 1
      } else {
        const daysDiff = Math.floor((lastDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff <= 3) { // Allow weekend gaps
          tempStreak++
          if (tempStreak > longestStreak) longestStreak = tempStreak
          
          // Update current streak if this is recent
          const today = new Date()
          const isRecent = Math.floor((today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)) <= 3
          if (isRecent) currentStreak = tempStreak
        } else {
          tempStreak = 1
        }
      }
      
      lastDate = dayDate
    }

    if (tempStreak > longestStreak) longestStreak = tempStreak

    // Day of week analysis
    const dayOfWeekStats: { [key: string]: { count: number, hours: number } } = {
      'Sunday': { count: 0, hours: 0 },
      'Monday': { count: 0, hours: 0 },
      'Tuesday': { count: 0, hours: 0 },
      'Wednesday': { count: 0, hours: 0 },
      'Thursday': { count: 0, hours: 0 },
      'Friday': { count: 0, hours: 0 },
      'Saturday': { count: 0, hours: 0 }
    }

    schoolDays.forEach(day => {
      const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })
      dayOfWeekStats[dayName].count++
      dayOfWeekStats[dayName].hours += day.totalHours
    })

    // Find most productive day
    const mostProductiveDay = Object.entries(dayOfWeekStats)
      .filter(([_, stats]) => stats.count > 0)
      .sort((a, b) => b[1].count - a[1].count)[0]

    // Calculate pace
    const today = new Date()
    const startOfSchoolYear = new Date(today.getFullYear(), 7, 1) // August 1
    const daysIntoYear = Math.floor((today.getTime() - startOfSchoolYear.getTime()) / (1000 * 60 * 60 * 24))
    const expectedDays = Math.floor((daysIntoYear / 365) * requiredDays)
    const pace = totalDays - expectedDays

    // Monthly comparison
    const thisMonth = new Date()
    const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1)
    
    const thisMonthDays = schoolDays.filter(d => {
      const date = new Date(d.date)
      return date.getMonth() === thisMonth.getMonth() && date.getFullYear() === thisMonth.getFullYear()
    })
    
    const lastMonthDays = schoolDays.filter(d => {
      const date = new Date(d.date)
      return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear()
    })

    const thisMonthTotal = thisMonthDays.length
    const lastMonthTotal = lastMonthDays.length
    const monthComparison = thisMonthTotal - lastMonthTotal

    // Average hours per day
    const avgHours = totalDays > 0 ? totalHours / totalDays : 0

    // Projected finish date
    const remainingDays = requiredDays - totalDays
    const avgDaysPerWeek = totalDays > 0 ? totalDays / (daysIntoYear / 7) : 0
    const weeksRemaining = avgDaysPerWeek > 0 ? remainingDays / avgDaysPerWeek : 0
    const projectedFinishDate = new Date()
    projectedFinishDate.setDate(projectedFinishDate.getDate() + (weeksRemaining * 7))

    return {
      totalDays,
      totalHours,
      avgHours,
      currentStreak,
      longestStreak,
      mostProductiveDay: mostProductiveDay ? mostProductiveDay[0] : null,
      dayOfWeekStats,
      pace,
      expectedDays,
      thisMonthTotal,
      lastMonthTotal,
      monthComparison,
      projectedFinishDate,
      remainingDays
    }
  }, [days, requiredDays])

  if (!insights) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Insights & Analytics</h3>
        <p className="text-gray-600">No attendance data yet. Start tracking to see insights!</p>
      </div>
    )
  }

  const paceColor = insights.pace >= 0 ? 'text-green-600' : 'text-orange-600'
  const paceText = insights.pace >= 0 ? 'ahead of pace' : 'behind pace'
  const monthChangeColor = insights.monthComparison >= 0 ? 'text-green-600' : 'text-red-600'
  const monthChangeIcon = insights.monthComparison >= 0 ? '↑' : '↓'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Insights & Analytics</h3>
        <p className="text-sm text-gray-600">Understand your homeschool patterns and progress</p>
      </div>

      {/* Streak Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔥</span>
            <p className="text-sm font-medium text-gray-700">Current Streak</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{insights.currentStreak}</p>
          <p className="text-xs text-gray-600 mt-1">consecutive school days</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <p className="text-sm font-medium text-gray-700">Longest Streak</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{insights.longestStreak}</p>
          <p className="text-xs text-gray-600 mt-1">days in a row</p>
        </div>
      </div>

      {/* Pace & Projection */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Progress Tracking</h4>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Pace vs. Expected</span>
            <span className={`font-semibold ${paceColor}`}>
              {Math.abs(insights.pace)} days {paceText}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Expected by now</span>
            <span className="font-semibold text-gray-900">{insights.expectedDays} days</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Days remaining</span>
            <span className="font-semibold text-gray-900">{insights.remainingDays} days</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm text-gray-600">Projected finish</span>
            <span className="font-semibold text-blue-600">
              {insights.projectedFinishDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Month Comparison</h4>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">This Month</span>
          <span className="text-2xl font-bold text-gray-900">{insights.thisMonthTotal}</span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Last Month</span>
          <span className="text-2xl font-bold text-gray-900">{insights.lastMonthTotal}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-sm text-gray-600">Change</span>
          <span className={`font-semibold ${monthChangeColor}`}>
            {monthChangeIcon} {Math.abs(insights.monthComparison)} days
          </span>
        </div>
      </div>

      {/* Day of Week Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Most Productive Days</h4>
        
        {insights.mostProductiveDay && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="font-semibold text-gray-900">{insights.mostProductiveDay}</p>
                <p className="text-xs text-gray-600">
                  {insights.dayOfWeekStats[insights.mostProductiveDay].count} school days
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {Object.entries(insights.dayOfWeekStats)
            .filter(([_, stats]) => stats.count > 0)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([day, stats]) => {
              const maxCount = Math.max(...Object.values(insights.dayOfWeekStats).map(s => s.count))
              const percentage = (stats.count / maxCount) * 100

              return (
                <div key={day}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{day}</span>
                    <span className="text-gray-900 font-medium">
                      {stats.count} days • {stats.hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Average Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">Avg Hours/Day</p>
          <p className="text-2xl font-bold text-gray-900">{insights.avgHours.toFixed(1)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">Total Hours</p>
          <p className="text-2xl font-bold text-gray-900">{insights.totalHours.toFixed(0)}</p>
        </div>
      </div>
    </div>
  )
}