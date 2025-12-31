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
}

interface Child {
  id: string
  name: string
  age?: number
  grade?: string
  photo_url?: string
}

interface TodaysDashboardProps {
  kids: Child[]
  lessonsByKid: { [kidId: string]: Lesson[] }
  onStatusChange: (lessonId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => void
  onLessonClick: (lesson: Lesson, child: Child) => void
}

export default function TodaysDashboard({ kids, lessonsByKid, onStatusChange, onLessonClick }: TodaysDashboardProps) {
  const today = moment().format('YYYY-MM-DD')
  
  // Get today's lessons for each child
  const todaysLessonsByKid: { [kidId: string]: Lesson[] } = {}
  kids.forEach(kid => {
    const lessons = lessonsByKid[kid.id] || []
    const todaysLessons = lessons.filter(lesson => 
      lesson.lesson_date && moment(lesson.lesson_date).format('YYYY-MM-DD') === today
    )
    if (todaysLessons.length > 0) {
      todaysLessonsByKid[kid.id] = todaysLessons
    }
  })

  // Calculate overall stats for today
  const allTodaysLessons = Object.values(todaysLessonsByKid).flat()
  const totalLessons = allTodaysLessons.length
  const completedLessons = allTodaysLessons.filter(l => l.status === 'completed').length
  const inProgressLessons = allTodaysLessons.filter(l => l.status === 'in_progress').length
  const totalMinutes = allTodaysLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
  const completedMinutes = allTodaysLessons
    .filter(l => l.status === 'completed')
    .reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  // Status button component
  const StatusButton = ({ lesson, child }: { lesson: Lesson; child: Child }) => {
    const getStatusConfig = (status: string) => {
      switch (status) {
        case 'not_started':
          return {
            icon: '⚪',
            text: 'Not Started',
            bgColor: 'bg-gray-100',
            hoverColor: 'hover:bg-gray-200',
            textColor: 'text-gray-700',
            nextStatus: 'in_progress' as const
          }
        case 'in_progress':
          return {
            icon: '🟡',
            text: 'In Progress',
            bgColor: 'bg-yellow-100',
            hoverColor: 'hover:bg-yellow-200',
            textColor: 'text-yellow-800',
            nextStatus: 'completed' as const
          }
        case 'completed':
          return {
            icon: '✅',
            text: 'Completed',
            bgColor: 'bg-green-100',
            hoverColor: 'hover:bg-green-200',
            textColor: 'text-green-800',
            nextStatus: 'not_started' as const
          }
        default:
          return {
            icon: '⚪',
            text: 'Not Started',
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
        className={`${config.bgColor} ${config.hoverColor} ${config.textColor} px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm`}
      >
        <span className="text-lg">{config.icon}</span>
        <span>{config.text}</span>
      </button>
    )
  }

  // No lessons today
  if (totalLessons === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Lessons Scheduled for Today</h2>
          <p className="text-gray-600">Enjoy your day off, or use the calendar to schedule some lessons!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Today's Header & Stats */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Today's Teaching</h1>
            <p className="text-blue-100">{moment().format('dddd, MMMM D, YYYY')}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{progressPercent}%</div>
            <div className="text-sm text-blue-100">Complete</div>
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
            <div className="text-xs text-blue-100">Total Lessons</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{completedLessons}</div>
            <div className="text-xs text-blue-100">Completed</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{(totalMinutes / 60).toFixed(1)}h</div>
            <div className="text-xs text-blue-100">Total Hours</div>
          </div>
        </div>
      </div>

      {/* Lessons by Child */}
      {kids.map(kid => {
        const kidLessons = todaysLessonsByKid[kid.id]
        if (!kidLessons || kidLessons.length === 0) return null

        const kidCompleted = kidLessons.filter(l => l.status === 'completed').length
        const kidTotal = kidLessons.length
        const kidProgress = Math.round((kidCompleted / kidTotal) * 100)
        const kidMinutes = kidLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)

        return (
          <div key={kid.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Child Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {kid.photo_url && (
                    <img 
                      src={kid.photo_url} 
                      alt={kid.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                    />
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{kid.name}</h2>
                    <p className="text-sm text-gray-600">
                      {kidCompleted} of {kidTotal} lessons • {(kidMinutes / 60).toFixed(1)} hours
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{kidProgress}%</div>
                  <div className="text-xs text-gray-500">Complete</div>
                </div>
              </div>

              {/* Child Progress Bar */}
              <div className="mt-3 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full h-2 transition-all duration-300"
                  style={{ width: `${kidProgress}%` }}
                />
              </div>
            </div>

            {/* Lessons List */}
            <div className="divide-y divide-gray-100">
              {kidLessons.map(lesson => (
                <div 
                  key={lesson.id} 
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => onLessonClick(lesson, kid)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
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
                      <h3 className="font-semibold text-gray-900 mb-1">{lesson.title}</h3>
                      {lesson.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{lesson.description}</p>
                      )}
                    </div>

                    <StatusButton lesson={lesson} child={kid} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}