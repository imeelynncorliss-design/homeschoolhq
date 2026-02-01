'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'

interface DayDetailsProps {
  date: string
  onClose: () => void
  userId: string
  organizationId: string
}

interface DayActivity {
  id: string
  type: 'lesson' | 'social_event' | 'coop_class'
  title: string
  time?: string
  duration?: number
  location?: string
  details?: any
}

export default function DayDetails({ date, onClose, userId, organizationId }: DayDetailsProps) {
  const [activities, setActivities] = useState<DayActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDayActivities()
  }, [date])

  const loadDayActivities = async () => {
    const activities: DayActivity[] = []

    // Load lessons for this day
    const { data: lessons } = await supabase
      .from('lessons')
      .select('*, kid:kids(name)')
      .eq('organization_id', organizationId)
      .eq('date', date)

    if (lessons) {
      activities.push(...lessons.map(lesson => ({
        id: lesson.id,
        type: 'lesson' as const,
        title: `${lesson.kid?.name}: ${lesson.subject}`,
        duration: lesson.duration,
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
      activities.push(...events.map(event => ({
        id: event.id,
        type: 'social_event' as const,
        title: event.title,
        time: event.start_time,
        location: event.location,
        details: event
      })))
    }

    // Load co-op classes for this day
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
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
      activities.push(...coopClasses.map(cls => ({
        id: cls.id,
        type: 'coop_class' as const,
        title: `Co-op: ${cls.class_name}`,
        time: cls.start_time,
        location: cls.location,
        details: cls
      })))
    }

    // Sort by time
    activities.sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })

    setActivities(activities)
    setLoading(false)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lesson': return '📚'
      case 'social_event': return '🎉'
      case 'coop_class': return '🏫'
      default: return '📅'
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'lesson': return 'bg-blue-50 border-blue-200'
      case 'social_event': return 'bg-purple-50 border-purple-200'
      case 'coop_class': return 'bg-green-50 border-green-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {new Date(date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {activities.length} {activities.length === 1 ? 'activity' : 'activities'} scheduled
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading activities...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-600">No activities scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map(activity => (
                <div 
                  key={`${activity.type}-${activity.id}`}
                  className={`border-2 rounded-lg p-4 ${getActivityColor(activity.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{activity.title}</h3>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {activity.type.replace('_', ' ')}
                          </span>
                        </div>
                        {activity.time && (
                          <span className="text-sm text-gray-600 font-medium">
                            {new Date(`2000-01-01T${activity.time}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>
                      
                      {activity.location && (
                        <div className="text-sm text-gray-600 mb-2">
                          📍 {activity.location}
                        </div>
                      )}

                      {activity.duration && (
                        <div className="text-sm text-gray-600">
                          ⏱️ {activity.duration} minutes
                        </div>
                      )}

                      {activity.type === 'social_event' && activity.details?.description && (
                        <p className="text-sm text-gray-700 mt-2">
                          {activity.details.description}
                        </p>
                      )}

                      {activity.type === 'coop_class' && (
                        <div className="mt-2 text-sm text-gray-600">
                          <div>👨‍🏫 {activity.details.teacher_name}</div>
                          <div>🏫 {activity.details.coop?.name}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}