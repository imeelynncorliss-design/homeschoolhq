// components/CalendarView.tsx - Updated version
'use client'

import { useState } from 'react'

interface CalendarDay {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  lessonCount: number
  lessonHours: number
  socialEventCount: number
  coopClassCount: number
  manualAttendance?: {
    status: 'full_day' | 'half_day' | 'no_school'
    hours: number
    notes?: string | null
  }
  isSchoolDay: boolean
  totalHours: number
}

interface CalendarViewProps {
  year: number
  month: number
  days: CalendarDay[]
  onDayClick: (date: string) => void
  onMonthChange: (year: number, month: number) => void
  filters: {
    showLessons: boolean
    showSocialEvents: boolean
    showCoopClasses: boolean
    showManualAttendance: boolean
  }
}

export default function CalendarView({ 
  year, 
  month, 
  days, 
  onDayClick, 
  onMonthChange,
  filters 
}: CalendarViewProps) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Generate calendar grid (6 weeks)
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  
  const calendarDays: (CalendarDay | null)[] = []
  
  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const prevMonthDate = new Date(year, month - 1, daysInPrevMonth - i)
    const dateStr = prevMonthDate.toISOString().split('T')[0]
    const dayData = days.find(d => d.date === dateStr)
    
    calendarDays.push(dayData ? { ...dayData, isCurrentMonth: false } : null)
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const currentDate = new Date(year, month, i)
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayData = days.find(d => d.date === dateStr)
    const isToday = dateStr === new Date().toISOString().split('T')[0]
    
    calendarDays.push(dayData ? { ...dayData, isCurrentMonth: true, isToday } : {
      date: dateStr,
      isCurrentMonth: true,
      isToday,
      lessonCount: 0,
      lessonHours: 0,
      socialEventCount: 0,
      coopClassCount: 0,
      isSchoolDay: false,
      totalHours: 0
    })
  }
  
  // Next month days to fill the grid
  const remainingDays = 42 - calendarDays.length
  for (let i = 1; i <= remainingDays; i++) {
    const nextMonthDate = new Date(year, month + 1, i)
    const dateStr = nextMonthDate.toISOString().split('T')[0]
    const dayData = days.find(d => d.date === dateStr)
    
    calendarDays.push(dayData ? { ...dayData, isCurrentMonth: false } : null)
  }

  function getVisibleActivityCount(day: CalendarDay): number {
    let count = 0
    if (filters.showLessons) count += day.lessonCount
    if (filters.showSocialEvents) count += day.socialEventCount
    if (filters.showCoopClasses) count += day.coopClassCount
    if (filters.showManualAttendance && day.manualAttendance) count += 1
    return count
  }

  function getDayColor(day: CalendarDay | null) {
    if (!day) return 'bg-gray-50'
    if (!day.isCurrentMonth) return 'bg-gray-50 opacity-40'
    
    // Priority: Manual attendance > Has activities
    if (filters.showManualAttendance && day.manualAttendance) {
      if (day.manualAttendance.status === 'full_day') return 'bg-green-100 hover:bg-green-200'
      if (day.manualAttendance.status === 'half_day') return 'bg-yellow-100 hover:bg-yellow-200'
      if (day.manualAttendance.status === 'no_school') return 'bg-gray-100 hover:bg-gray-200'
    }
    
    const hasVisibleActivities = getVisibleActivityCount(day) > 0
    if (hasVisibleActivities) {
      // Mix colors if multiple types
      const types = []
      if (filters.showLessons && day.lessonCount > 0) types.push('lesson')
      if (filters.showSocialEvents && day.socialEventCount > 0) types.push('social')
      if (filters.showCoopClasses && day.coopClassCount > 0) types.push('coop')
      
      if (types.length > 1) return 'bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 hover:from-blue-100 hover:via-purple-100 hover:to-green-100'
      if (types.includes('lesson')) return 'bg-blue-50 hover:bg-blue-100'
      if (types.includes('social')) return 'bg-purple-50 hover:bg-purple-100'
      if (types.includes('coop')) return 'bg-green-50 hover:bg-green-100'
    }
    
    return 'bg-white hover:bg-gray-50'
  }

  function getDayBorder(day: CalendarDay | null) {
    if (!day) return 'border-gray-200'
    if (day.isToday) return 'border-2 border-blue-500'
    return 'border border-gray-200'
  }

  function goToPrevMonth() {
    if (month === 0) {
      onMonthChange(year - 1, 11)
    } else {
      onMonthChange(year, month - 1)
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      onMonthChange(year + 1, 0)
    } else {
      onMonthChange(year, month + 1)
    }
  }

  function goToToday() {
    const today = new Date()
    onMonthChange(today.getFullYear(), today.getMonth())
  }

  // Calculate filtered stats
  const filteredDays = days.filter(d => getVisibleActivityCount(d) > 0)
  const totalActivities = days.reduce((sum, d) => sum + getVisibleActivityCount(d), 0)

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h3>
        
        <div className="flex gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium"
          >
            Today
          </button>
          <button
            onClick={goToPrevMonth}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium"
          >
            ←
          </button>
          <button
            onClick={goToNextMonth}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium"
          >
            →
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {filters.showManualAttendance && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-100 border border-gray-300 rounded"></div>
              <span className="text-gray-600">Full Day</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-yellow-100 border border-gray-300 rounded"></div>
              <span className="text-gray-600">Half Day</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span className="text-gray-600">No School</span>
            </div>
          </>
        )}
        {filters.showLessons && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-50 border border-gray-300 rounded"></div>
            <span className="text-gray-600">📚 Lessons</span>
          </div>
        )}
        {filters.showSocialEvents && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-purple-50 border border-gray-300 rounded"></div>
            <span className="text-gray-600">🎉 Events</span>
          </div>
        )}
        {filters.showCoopClasses && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-50 border border-gray-300 rounded"></div>
            <span className="text-gray-600">🏫 Co-op</span>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          const visibleActivityCount = day ? getVisibleActivityCount(day) : 0
          
          return (
            <button
              key={index}
              onClick={() => day && day.isCurrentMonth && onDayClick(day.date)}
              disabled={!day || !day.isCurrentMonth}
              className={`
                aspect-square p-1 text-left transition-all relative
                ${getDayColor(day)}
                ${getDayBorder(day)}
                ${day && day.isCurrentMonth ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {day && (
                <>
                  <div className={`text-sm font-medium ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                    {new Date(day.date).getDate()}
                  </div>
                  
                  {day.isCurrentMonth && visibleActivityCount > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {/* Activity indicators */}
                      {filters.showLessons && day.lessonCount > 0 && (
                        <div className="text-[10px] text-blue-600 font-medium">
                          📚 {day.lessonCount}
                        </div>
                      )}
                      {filters.showSocialEvents && day.socialEventCount > 0 && (
                        <div className="text-[10px] text-purple-600 font-medium">
                          🎉 {day.socialEventCount}
                        </div>
                      )}
                      {filters.showCoopClasses && day.coopClassCount > 0 && (
                        <div className="text-[10px] text-green-600 font-medium">
                          🏫 {day.coopClassCount}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {day.isCurrentMonth && filters.showManualAttendance && day.manualAttendance && (
                    <div className="text-[10px] text-gray-600 font-bold mt-0.5">
                      {day.manualAttendance.hours}h
                    </div>
                  )}
                  
                  {day.isCurrentMonth && day.manualAttendance?.notes && (
                    <div className="absolute bottom-1 right-1 text-xs">
                      📝
                    </div>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Stats Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {filteredDays.length}
            </p>
            <p className="text-xs text-gray-600">Days with Activities</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {totalActivities}
            </p>
            <p className="text-xs text-gray-600">Total Activities</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {days.reduce((sum, d) => sum + d.totalHours, 0).toFixed(1)}
            </p>
            <p className="text-xs text-gray-600">Total Hours</p>
          </div>
        </div>
      </div>
    </div>
  )
}