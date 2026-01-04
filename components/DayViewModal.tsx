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
  displayname: string
  firstname: string
  lastname: string
  age?: number
  grade?: string
  photo_url?: string
}

interface DayViewModalProps {
  date: Date
  kids: Child[]
  lessonsByKid: { [kidId: string]: Lesson[] }
  onClose: () => void
  onLessonClick: (lesson: Lesson, child: Child) => void
  onStatusChange: (lessonId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => void
}

export default function DayViewModal({ 
  date, 
  kids, 
  lessonsByKid, 
  onClose, 
  onLessonClick,
  onStatusChange 
}: DayViewModalProps) {
  const dateStr = moment(date).format('YYYY-MM-DD')
  
  // Get all lessons for this day, grouped by child
  const lessonsForDay: { child: Child; lessons: Lesson[] }[] = kids
    .map(child => {
      const childLessons = (lessonsByKid[child.id] || []).filter(lesson => {
        if (!lesson.lesson_date) return false
        
        // Try multiple date comparison methods for robustness
        const lessonDate = moment(lesson.lesson_date).format('YYYY-MM-DD')
        const lessonDateAlt = lesson.lesson_date.split('T')[0] // Handle ISO format
        
        // Debug logging (remove after testing)
        if (lessonDate.includes('2026-01') || lessonDateAlt.includes('2026-01')) {
          console.log('Checking lesson:', {
            title: lesson.title,
            lesson_date_raw: lesson.lesson_date,
            lessonDate_formatted: lessonDate,
            lessonDateAlt,
            dateStr,
            matches: lessonDate === dateStr || lessonDateAlt === dateStr
          })
        }
        
        return lessonDate === dateStr || lessonDateAlt === dateStr
      })
      return { child, lessons: childLessons }
    })
    .filter(item => item.lessons.length > 0)

  const totalLessons = lessonsForDay.reduce((sum, item) => sum + item.lessons.length, 0)

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return '✓'
    if (status === 'in_progress') return '◐'
    return '○'
  }

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-800'
    if (status === 'in_progress') return 'bg-yellow-100 text-yellow-800'
    return 'bg-blue-100 text-blue-800'
  }

  const cycleLessonStatus = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation()
    let newStatus: 'not_started' | 'in_progress' | 'completed'
    if (lesson.status === 'not_started') newStatus = 'in_progress'
    else if (lesson.status === 'in_progress') newStatus = 'completed'
    else newStatus = 'not_started'
    onStatusChange(lesson.id, newStatus)
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-1">
                {moment(date).format('dddd')}
              </h2>
              <p className="text-xl text-blue-100">
                {moment(date).format('MMMM D, YYYY')}
              </p>
              <p className="text-sm text-blue-100 mt-2">
                {totalLessons} {totalLessons === 1 ? 'lesson' : 'lessons'} scheduled
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-160px)] p-6">
          {totalLessons === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-xl font-semibold mb-2" style={{ color: '#1f2937' }}>No lessons scheduled</p>
              <p style={{ color: '#374151' }}>This day is free!</p>
              
            </div>
          ) : (
            <div className="space-y-6">
              {lessonsForDay.map(({ child, lessons }) => (
                <div key={child.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Child Header */}
                  <div className="bg-gray-50 px-4 py-3 flex items-center gap-3 border-b border-gray-200">
                    {child.photo_url ? (
                      <img 
                        src={child.photo_url} 
                        alt={child.displayname}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold shadow">
                        {child.displayname.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-base" style={{ color: '#111827' }}>{child.displayname}</h3>
                      <p className="text-sm font-medium" style={{ color: '#374151' }}>
                        {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
                      </p>
                    </div>
                  </div>

                  {/* Lessons List */}
                  <div className="divide-y divide-gray-100">
                    {lessons.map(lesson => (
                      <div
                        key={lesson.id}
                        className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => onLessonClick(lesson, child)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Status Button */}
                          <button
                            onClick={(e) => cycleLessonStatus(lesson, e)}
                            className={`flex-shrink-0 w-8 h-8 rounded-full ${getStatusColor(lesson.status)} flex items-center justify-center font-bold text-sm hover:scale-110 transition-transform`}
                            title="Click to change status"
                          >
                            {getStatusIcon(lesson.status)}
                          </button>

                          {/* Lesson Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-base group-hover:text-blue-600 transition-colors" style={{ color: '#111827' }}>
                                  {lesson.title}
                                </h4>
                                <p className="text-sm mt-0.5 font-medium" style={{ color: '#374151' }}>
                                  {lesson.subject}
                                </p>
                              </div>
                              {lesson.duration_minutes && (
                                <span className="text-xs flex-shrink-0 bg-gray-100 px-2 py-1 rounded font-medium" style={{ color: '#374151' }}>
                                  {lesson.duration_minutes < 360 
                                    ? `${lesson.duration_minutes} min` 
                                    : `${Math.round(lesson.duration_minutes / 360)} day${lesson.duration_minutes >= 720 ? 's' : ''}`
                                  }
                                </span>
                              )}
                            </div>
                            {lesson.description && (
                              <p className="text-sm mt-2 line-clamp-2" style={{ color: '#374151' }}>
                                {typeof lesson.description === 'string' 
                                  ? lesson.description 
                                  : JSON.stringify(lesson.description)
                                }
                              </p>
                            )}
                          </div>

                          {/* Arrow Icon */}
                          <svg 
                            className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center text-sm font-medium" style={{ color: '#1f2937' }}>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-100"></span>
                <span>Not Started</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-100"></span>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-100"></span>
                <span>Completed</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              style={{ color: '#1f2937' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}