'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import moment from 'moment'

interface SocialCalendarProps {
  userId: string
}

interface SocialEvent {
  id: string
  created_by: string
  title: string
  description: string
  event_date: string
  start_time: string
  end_time?: string
  location: string
  event_type: 'field_trip' | 'park_day' | 'coop_class' | 'playdate' | 'other'
  max_attendees?: number
  rsvp_deadline?: string
  organizer_name: string
  organizer_email: string
  is_public: boolean
  rsvps?: any[]
}

export default function SocialCalendar({ userId }: SocialCalendarProps) {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<SocialEvent[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    event_type: 'field_trip' as const,
    max_attendees: '',
    rsvp_deadline: '',
    is_public: true
  })

  useEffect(() => {
    loadUserProfile()
    loadEvents()
  }, [userId])

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserProfile(user)
  }

  const loadEvents = async () => {
    // Load public events and events user created
    const { data, error } = await supabase
      .from('social_events')
      .select(`
        *,
        rsvps:event_rsvps(count)
      `)
      .or(`is_public.eq.true,created_by.eq.${userId}`)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })

    if (data) {
      setEvents(data)
    }
    setLoading(false)
  }

  const createEvent = async () => {
    if (!formData.title || !formData.event_date || !formData.location) {
      alert('Please fill in required fields')
      return
    }

    if (!userProfile) {
      alert('User profile not loaded. Please wait a moment and try again.')
      return
    }

    const eventData = {
      created_by: userId,
      title: formData.title,
      description: formData.description,
      event_date: formData.event_date,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      location: formData.location,
      event_type: formData.event_type,
      max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
      rsvp_deadline: formData.rsvp_deadline || null,
      organizer_name: userProfile?.user_metadata?.full_name || userProfile?.email || 'Anonymous',
      organizer_email: userProfile?.email || '',
      is_public: formData.is_public
    }

    console.log('Creating event with data:', eventData)

    const { error } = await supabase
      .from('social_events')
      .insert([eventData])

    if (error) {
      console.error('Error creating event:', error)
      alert('Error creating event: ' + error.message)
      return
    }

    if (!error) {
      setFormData({
        title: '',
        description: '',
        event_date: '',
        start_time: '',
        end_time: '',
        location: '',
        event_type: 'field_trip',
        max_attendees: '',
        rsvp_deadline: '',
        is_public: true
      })
      setShowCreateForm(false)
      loadEvents()
    }
  }

  const rsvpToEvent = async (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
    // Check if already RSVP'd
    const { data: existing } = await supabase
      .from('event_rsvps')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      await supabase
        .from('event_rsvps')
        .update({ status })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('event_rsvps')
        .insert([{
          event_id: eventId,
          user_id: userId,
          status,
          attendee_name: userProfile?.user_metadata?.full_name || userProfile?.email || 'Anonymous',
          attendee_email: userProfile?.email || ''
        }])
    }

    loadEvents()
  }

  const deleteEvent = async (eventId: string) => {
    if (confirm('Delete this event? All RSVPs will be removed.')) {
      await supabase
        .from('social_events')
        .delete()
        .eq('id', eventId)
      
      loadEvents()
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'field_trip': return '🚌'
      case 'park_day': return '🌳'
      case 'coop_class': return '🏫'
      case 'playdate': return '🎮'
      default: return '📅'
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Social Calendar</h2>
          <p className="text-gray-600">Plan and join homeschool group activities</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          {showCreateForm ? 'Cancel' : '+ Create Event'}
        </button>
      </div>

      {/* Create Event Form */}
      {showCreateForm && (
        <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Event</h3>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Science Museum Visit"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What to expect, what to bring, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type *
              </label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              >
                <option value="field_trip">🚌 Field Trip</option>
                <option value="park_day">🌳 Park Day</option>
                <option value="coop_class">🏫 Co-op Class</option>
                <option value="playdate">🎮 Playdate</option>
                <option value="other">📅 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="123 Main St or Park Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Attendees (optional)
              </label>
              <input
                type="number"
                value={formData.max_attendees}
                onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
                placeholder="Leave blank for unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RSVP Deadline (optional)
              </label>
              <input
                type="date"
                value={formData.rsvp_deadline}
                onChange={(e) => setFormData({ ...formData, rsvp_deadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">
                Make this event public (visible to all HomeschoolHQ families in your area)
              </span>
            </label>
          </div>

          <button
            onClick={createEvent}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-semibold"
          >
            Create Event
          </button>
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Events</h3>
          <p className="text-gray-600">Create your first event to start connecting with other families!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div 
              key={event.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl">{getEventIcon(event.event_type)}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-600">
                        Organized by {event.organizer_name}
                      </p>
                    </div>
                  </div>
                  
                  {event.description && (
                    <p className="text-gray-700 mb-3">{event.description}</p>
                  )}

                  <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{moment(event.event_date).format('dddd, MMM D, YYYY')}</span>
                    </div>
                    {event.start_time && (
                      <div className="flex items-center gap-2">
                        <span>🕐</span>
                        <span>{event.start_time}{event.end_time && ` - ${event.end_time}`}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span>{event.location}</span>
                    </div>
                    {event.max_attendees && (
                      <div className="flex items-center gap-2">
                        <span>👥</span>
                        <span>Max: {event.max_attendees} attendees</span>
                      </div>
                    )}
                  </div>
                </div>

                {event.created_by === userId && (
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* RSVP Buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => rsvpToEvent(event.id, 'going')}
                  className="flex-1 px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-medium"
                >
                  ✓ Going
                </button>
                <button
                  onClick={() => rsvpToEvent(event.id, 'maybe')}
                  className="flex-1 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 font-medium"
                >
                  ? Maybe
                </button>
                <button
                  onClick={() => rsvpToEvent(event.id, 'not_going')}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium"
                >
                  ✗ Can't Go
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}