'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'

interface DayDetailsProps {
  date: string
  onClose: () => void
  userId: string
  organizationId: string
  onEditLesson?: (lesson: any) => void 
}

interface LessonActivity {
  id: string
  type: 'lesson'
  title: string
  subject: string
  description?: string
  duration_minutes?: number
  status: 'not_started' | 'in_progress' | 'completed'
  kid_name: string
  kid_photo?: string
  details: any
}

interface OtherActivity {
  id: string
  type: 'social_event' | 'coop_class'
  title: string
  time?: string
  location?: string
  details: any
}

type DayActivity = LessonActivity | OtherActivity

export default function DayDetails({ date, onClose, userId, organizationId, onEditLesson }: DayDetailsProps) {
  const [activities, setActivities] = useState<DayActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingLesson, setUpdatingLesson] = useState<string | null>(null)

  useEffect(() => {
    loadDayActivities()
  }, [date])

  const loadDayActivities = async () => {
    setLoading(true)
    const result: DayActivity[] = []

    // Load lessons for this day — fixed: lesson_date, displayname, duration_minutes
    const { data: lessons } = await supabase
      .from('lessons')
      .select(`
        *,
        kid:kids(id, displayname, photo_url)
      `)
      .eq('organization_id', organizationId)
      .eq('lesson_date', date)
      .order('subject', { ascending: true })

    if (lessons) {
      result.push(...lessons.map(lesson => ({
        id: lesson.id,
        type: 'lesson' as const,
        title: lesson.title,
        subject: lesson.subject,
        description: lesson.description,
        duration_minutes: lesson.duration_minutes,
        status: lesson.status,
        kid_name: lesson.kid?.displayname || 'Unknown',
        kid_photo: lesson.kid?.photo_url,
        details: lesson
      })))
    }

    // Load social events for this day
    const { data: events } = await supabase
      .from('social_events')
      .select('*')
      .eq('event_date', date)
      .or(`is_public.eq.true,created_by.eq.${userId}`)

    if (events) {
      result.push(...events.map(event => ({
        id: event.id,
        type: 'social_event' as const,
        title: event.title,
        time: event.start_time,
        location: event.location,
        details: event
      })))
    }

    // Load co-op classes for this day — fixed: use UTC date to get correct day name
    const [year, month, day] = date.split('-').map(Number)
    const dayName = new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long' })
    const { data: coopClasses } = await supabase
      .from('coop_classes')
      .select(`
        *,
        coop:coops(name),
        enrollments:class_enrollments!inner(user_id)
      `)
      .eq('enrollments.user_id', userId)
      .eq('day_of_week', dayName)

    if (coopClasses) {
      result.push(...coopClasses.map(cls => ({
        id: cls.id,
        type: 'coop_class' as const,
        title: cls.class_name,
        time: cls.start_time,
        location: cls.location,
        details: cls
      })))
    }

    setActivities(result)
    setLoading(false)
  }

  const handleStatusChange = async (lessonId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => {
    setUpdatingLesson(lessonId)

    const updates: any = { status: newStatus }
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
    if (newStatus === 'not_started') updates.completed_at = null

    const { error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', lessonId)

    if (!error) {
      setActivities(prev => prev.map(a =>
        a.id === lessonId && a.type === 'lesson'
          ? { ...a, status: newStatus } as LessonActivity
          : a
      ))
    }
    setUpdatingLesson(null)
  }

  const cycleStatus = (lesson: LessonActivity) => {
    const next = lesson.status === 'not_started' ? 'in_progress'
      : lesson.status === 'in_progress' ? 'completed'
      : 'not_started'
    handleStatusChange(lesson.id, next)
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return { pill: 'bg-green-100 text-green-700 border-green-300', icon: '✅', label: 'Completed' }
      case 'in_progress':
        return { pill: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: '🔄', label: 'In Progress' }
      default:
        return { pill: 'bg-gray-100 text-gray-500 border-gray-300', icon: '⭕', label: 'Not Started' }
    }
  }

  const lessons = activities.filter(a => a.type === 'lesson') as LessonActivity[]
  const otherActivities = activities.filter(a => a.type !== 'lesson') as OtherActivity[]

  const completedCount = lessons.filter(l => l.status === 'completed').length
  const totalLessons = lessons.length

  // Format date correctly without timezone shift
  const [y, m, d] = date.split('-').map(Number)
  const displayDate = new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-xl flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{displayDate}</h2>
              <p className="text-indigo-200 text-sm mt-0.5">
                {totalLessons > 0
                  ? `${completedCount} of ${totalLessons} lesson${totalLessons !== 1 ? 's' : ''} complete`
                  : 'No lessons scheduled'}
                {otherActivities.length > 0 && ` · ${otherActivities.length} other ${otherActivities.length === 1 ? 'activity' : 'activities'}`}
              </p>
            </div>
            <button onClick={onClose} className="text-indigo-200 hover:text-white text-2xl leading-none font-light mt-0.5">
              ✕
            </button>
          </div>

          {/* Progress bar */}
          {totalLessons > 0 && (
            <div className="mt-3 bg-indigo-500 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${Math.round((completedCount / totalLessons) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📅</div>
              <p className="text-gray-500 font-medium">Nothing scheduled for this day</p>
              <p className="text-gray-400 text-sm mt-1">Use Auto-Schedule or Add Lesson to plan this day</p>
            </div>
          ) : (
            <>
              {/* Lessons section */}
              {lessons.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    Lessons · {completedCount}/{totalLessons} done
                  </div>
                  <div className="space-y-2">
                    {lessons.map(lesson => {
                      const statusStyle = getStatusStyle(lesson.status)
                      const isUpdating = updatingLesson === lesson.id

                      return (
                        <div
                          key={lesson.id}
                          className={`rounded-lg border p-3 transition-all ${
                            lesson.status === 'completed'
                              ? 'bg-green-50 border-green-200 opacity-80'
                              : lesson.status === 'in_progress'
                              ? 'bg-yellow-50 border-yellow-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Kid avatar */}
                            <div className="flex-shrink-0 mt-0.5">
                              {lesson.kid_photo ? (
                                <img src={lesson.kid_photo} alt={lesson.kid_name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold border border-purple-200">
                                  {lesson.kid_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-gray-500">{lesson.kid_name}</span>
                                    <span className="text-xs text-gray-300">·</span>
                                    <span className="text-xs font-semibold text-purple-600">{lesson.subject}</span>
                                  </div>
                                  <p className={`text-sm font-semibold mt-0.5 ${lesson.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                    {lesson.title}
                                  </p>
                                  {lesson.duration_minutes && (
                                    <p className="text-xs text-gray-400 mt-0.5">⏱ {lesson.duration_minutes} min</p>
                                  )}
                                </div>

                                {/* Status cycle button */}
                                <button
                                  onClick={() => cycleStatus(lesson)}
                                  disabled={isUpdating}
                                  title="Click to advance status"
                                  className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold transition-all ${statusStyle.pill} ${isUpdating ? 'opacity-50 cursor-wait' : 'hover:opacity-80 cursor-pointer'}`}
                                >
                                  {isUpdating ? '...' : statusStyle.icon}
                                  <span className="hidden sm:inline">{statusStyle.label}</span>
                                </button>
                                <button
                                  onClick={() => onEditLesson && onEditLesson(lesson.details)}
                                  className="flex-shrink-0 px-2 py-1 rounded-full border border-gray-200 text-xs font-semibold text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all"
                                >
                                  ✏️
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              

              {/* Other activities section */}
              {otherActivities.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    Other Activities
                  </div>
                  <div className="space-y-2">
                    {otherActivities.map(activity => (
                      <div
                        key={`${activity.type}-${activity.id}`}
                        className={`rounded-lg border p-3 ${
                          activity.type === 'social_event'
                            ? 'bg-purple-50 border-purple-200'
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg flex-shrink-0">
                            {activity.type === 'social_event' ? '🎉' : '🏫'}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                            {activity.time && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                🕐 {new Date(`2000-01-01T${activity.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            )}
                            {activity.location && (
                              <p className="text-xs text-gray-500 mt-0.5">📍 {activity.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0 flex justify-between items-center">
          <p className="text-xs text-gray-400">Click a status badge to cycle: Not Started → In Progress → Completed</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}