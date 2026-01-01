'use client'

import { useState } from 'react'
import moment from 'moment'

interface Lesson {
  id: string
  kid_id: string
  title: string
  subject: string
  description?: string
  lesson_date: string | null
  duration_minutes: number | null
  status: 'not_started' | 'in_progress' | 'completed'
  completed_at?: string
}

interface Child {
  id: string
  name: string
  age?: number
  grade?: string
  photo_url?: string
}

interface ThisWeekDashboardProps {
  kids: Child[]
  lessonsByKid: { [kidId: string]: Lesson[] }
  onStatusChange: (lessonId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => void
  onLessonClick: (lesson: Lesson, child: Child) => void
}

export default function ThisWeekDashboard({ kids, lessonsByKid, onStatusChange, onLessonClick }: ThisWeekDashboardProps) {
  // Get start and end of current week (Monday - Sunday)
  const startOfWeek = moment().startOf('week').add(1, 'day') // Monday
  const endOfWeek = moment().endOf('week').add(1, 'day') // Sunday
  
  // Create array of days in this week
  const daysOfWeek: moment.Moment[] = []
  let currentDay = startOfWeek.clone()
  while (currentDay.isSameOrBefore(endOfWeek)) {
    daysOfWeek.push(currentDay.clone())
    currentDay.add(1, 'day')
  }

  // State for collapsed days - default to collapse past days
  const [collapsedDays, setCollapsedDays] = useState<{ [key: string]: boolean }>(() => {
    const initial: { [key: string]: boolean } = {}
    daysOfWeek.forEach(day => {
      // Collapse if day is before today
      initial[day.format('YYYY-MM-DD')] = day.isBefore(moment(), 'day')
    })
    return initial
  })

  const toggleDay = (dateStr: string) => {
    setCollapsedDays(prev => ({ ...prev, [dateStr]: !prev[dateStr] }))
  }

  // Get all lessons for this week
  const allWeekLessons: Array<Lesson & { child: Child }> = []
  kids.forEach(kid => {
    const lessons = lessonsByKid[kid.id] || []
    lessons.forEach(lesson => {
      if (lesson.lesson_date) {
        const lessonDate = moment(lesson.lesson_date)
        if (lessonDate.isSameOrAfter(startOfWeek, 'day') && lessonDate.isSameOrBefore(endOfWeek, 'day')) {
          allWeekLessons.push({ ...lesson, child: kid })
        }
      }
    })
  })

  // Group lessons by day
  const lessonsByDay: { [dateStr: string]: Array<Lesson & { child: Child }> } = {}
  daysOfWeek.forEach(day => {
    lessonsByDay[day.format('YYYY-MM-DD')] = []
  })
  allWeekLessons.forEach(lesson => {
    const dateStr = moment(lesson.lesson_date).format('YYYY-MM-DD')
    if (lessonsByDay[dateStr]) {
      lessonsByDay[dateStr].push(lesson)
    }
  })

  // Calculate weekly stats
  const totalLessons = allWeekLessons.length
  const completedLessons = allWeekLessons.filter(l => l.status === 'completed').length
  const totalMinutes = allWeekLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
  const completedMinutes = allWeekLessons.filter(l => l.status === 'completed').reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  // Status button component
  const StatusButton = ({ lesson, child }: { lesson: Lesson; child: Child }) => {
    const getStatusConfig = (status: string) => {
      switch (status) {
        case 'not_started':
          return {
            icon: '⚪',
            text: 'Start',
            bgColor: 'bg-gray-100',
            hoverColor: 'hover:bg-gray-200',
            textColor: 'text-gray-700',
            nextStatus: 'in_progress' as const
          }
        case 'in_progress':
          return {
            icon: '🟡',
            text: 'Working',
            bgColor: 'bg-yellow-100',
            hoverColor: 'hover:bg-yellow-200',
            textColor: 'text-yellow-800',
            nextStatus: 'completed' as const
          }
        case 'completed':
          return {
            icon: '✅',
            text: 'Done',
            bgColor: 'bg-green-100',
            hoverColor: 'hover:bg-green-200',
            textColor: 'text-green-800',
            nextStatus: 'not_started' as const
          }
        default:
          return {
            icon: '⚪',
            text: 'Start',
            bgColor: 'bg-gray-100',
            hoverColor: 'hover:bg-gray-200',
            textColor: 'text-gray-700',
            nextStatus: 'in_progress' as const
          }
      }
    }

    const config = getStatusConfig(lesson.status)

    return (
      <button
        onClick={() => onStatusChange(lesson.id, config.nextStatus)}
        className={`${config.bgColor} ${config.hoverColor} ${config.textColor} px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium text-sm`}
      >
        <span className="text-base">{config.icon}</span>
        <span>{config.text}</span>
      </button>
    )
  }

  // No lessons this week
  if (totalLessons === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Lessons Scheduled This Week</h2>
          <p className="text-gray-600">Use the calendar to schedule some lessons for the week!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Week Header & Stats */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">This Week's Plan</h1>
            <p className="text-indigo-100">
              {startOfWeek.format('MMM D')} - {endOfWeek.format('MMM D, YYYY')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{progressPercent}%</div>
            <div className="text-sm text-indigo-100">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/20 rounded-full h-3 mb-4">
          <div 
            className="bg-white rounded-full h-3 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{totalLessons}</div>
            <div className="text-xs text-indigo-100">Total Lessons</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{completedLessons}</div>
            <div className="text-xs text-indigo-100">Completed</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{(totalMinutes / 60).toFixed(1)}h</div>
            <div className="text-xs text-indigo-100">Total Hours</div>
          </div>
        </div>
      </div>

      {/* Days of Week */}
      {daysOfWeek.map(day => {
        const dateStr = day.format('YYYY-MM-DD')
        const dayLessons = lessonsByDay[dateStr] || []
        const isToday = day.isSame(moment(), 'day')
        const isPast = day.isBefore(moment(), 'day')
        const isFuture = day.isAfter(moment(), 'day')
        const isCollapsed = collapsedDays[dateStr]
        
        const dayCompleted = dayLessons.filter(l => l.status === 'completed').length
        const dayTotal = dayLessons.length
        const dayProgress = dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) : 0

        return (
          <div 
            key={dateStr} 
            className={`bg-white rounded-lg shadow overflow-hidden ${
              isToday ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {/* Day Header */}
            <button
              onClick={() => toggleDay(dateStr)}
              className="w-full bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-4 hover:from-gray-100 hover:to-gray-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {day.format('dddd')}
                      </h3>
                      {isToday && (
                        <span className="inline-block px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded">
                          Today
                        </span>
                      )}
                      {isPast && dayProgress < 100 && (
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded">
                          Behind
                        </span>
                      )}
                      {dayProgress === 100 && (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                          ✓ Done
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{day.format('MMMM D, YYYY')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {dayTotal > 0 && (
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">{dayProgress}%</div>
                      <div className="text-xs text-gray-500">
                        {dayCompleted} of {dayTotal} lessons
                      </div>
                    </div>
                  )}
                  <div className="text-gray-400">
                    {isCollapsed ? '▼' : '▲'}
                  </div>
                </div>
              </div>
              
              {/* Day Progress Bar */}
              {dayTotal > 0 && (
                <div className="mt-3 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full h-2 transition-all duration-300"
                    style={{ width: `${dayProgress}%` }}
                  />
                </div>
              )}
            </button>

            {/* Day Lessons */}
            {!isCollapsed && (
              <div className="divide-y divide-gray-100">
                {dayLessons.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No lessons scheduled
                  </div>
                ) : (
                  dayLessons.map(lesson => (
                    <div key={lesson.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Child Photo */}
                        <div className="flex-shrink-0">
                          {lesson.child.photo_url ? (
                            <img 
                              src={lesson.child.photo_url} 
                              alt={lesson.child.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-700">
                              {lesson.child.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Lesson Info */}
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => onLessonClick(lesson, lesson.child)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-500">
                              {lesson.child.name}
                            </span>
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                              {lesson.subject}
                            </span>
                            {lesson.duration_minutes && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {lesson.duration_minutes} min
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                          {lesson.description && (
                            <p className="text-sm text-gray-600 line-clamp-1 mt-1">{lesson.description}</p>
                          )}
                        </div>

                        {/* Status Button */}
                        <StatusButton lesson={lesson} child={lesson.child} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}