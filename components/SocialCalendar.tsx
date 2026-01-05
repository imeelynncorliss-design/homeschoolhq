'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SocialCalendarProps {
  userId: string
}

interface SocialEvent {
  id: string
  created_by: string
  title: string
  description: string
  event_date: string
  start_time?: string
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
  const [editingEvent, setEditingEvent] = useState<SocialEvent | null>(null)
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

  const resetForm = () => {
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
    setEditingEvent(null)
  }

  const startEdit = (event: SocialEvent) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location: event.location,
      event_type: event.event_type,
      max_attendees: event.max_attendees?.toString() || '',
      rsvp_deadline: event.rsvp_deadline || '',
      is_public: event.is_public
    })
    setShowCreateForm(false)
  }

  const createEvent = async () => {
    if (!formData.title || !formData.event_date || !formData.location) {
      alert('Please fill in title, date, and location')
      return
    }

    if (!userProfile) {
      alert('User profile not loaded. Please wait a moment and try again.')
      return
    }

    const { error } = await supabase
      .from('social_events')
      .insert([{
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
      }])

    if (error) {
      alert('Error creating event: ' + error.message)
    } else {
      resetForm()
      loadEvents()
    }
  }

  const updateEvent = async () => {
    if (!editingEvent) return

    if (!formData.title || !formData.event_date || !formData.location) {
      alert('Please fill in title, date, and location')
      return
    }

    const { error } = await supabase
      .from('social_events')
      .update({
        title: formData.title,
        description: formData.description,
        event_date: formData.event_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        location: formData.location,
        event_type: formData.event_type,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        rsvp_deadline: formData.rsvp_deadline || null,
        is_public: formData.is_public
      })
      .eq('id', editingEvent.id)

    if (error) {
      alert('Error updating event: ' + error.message)
    } else {
      resetForm()
      loadEvents()
    }
  }

  const rsvpToEvent = async (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
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
          onClick={() => {
            setShowCreateForm(!showCreateForm)
            setEditingEvent(null)
            if (!showCreateForm) {
              resetForm()
            }
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          {showCreateForm ? '✕ Cancel' : '+ Create Event'}
        </button>
      </div>

      {/* CREATE FORM */}
      {showCreateForm && !editingEvent && (
        <div className="bg-white rounded-lg border-2 border-purple-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Event</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Field Trip to Science Museum"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Event details, what to bring, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({...formData, event_type: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="field_trip">🚌 Field Trip</option>
                <option value="park_day">🌳 Park Day</option>
                <option value="coop_class">🏫 Co-op Class</option>
                <option value="playdate">🎮 Playdate</option>
                <option value="other">📅 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Address or location name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees (optional)</label>
              <input
                type="number"
                value={formData.max_attendees}
                onChange={(e) => setFormData({...formData, max_attendees: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RSVP Deadline (optional)</label>
              <input
                type="date"
                value={formData.rsvp_deadline}
                onChange={(e) => setFormData({...formData, rsvp_deadline: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({...formData, is_public: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">
                Make this event public (visible to all HomeschoolHQ families)
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={createEvent}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create Event
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* EDIT FORM */}
      {editingEvent && (
        <div className="bg-white rounded-lg border-2 border-blue-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Event</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({...formData, event_type: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="field_trip">🚌 Field Trip</option>
                <option value="park_day">🌳 Park Day</option>
                <option value="coop_class">🏫 Co-op Class</option>
                <option value="playdate">🎮 Playdate</option>
                <option value="other">📅 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees</label>
              <input
                type="number"
                value={formData.max_attendees}
                onChange={(e) => setFormData({...formData, max_attendees: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RSVP Deadline</label>
              <input
                type="date"
                value={formData.rsvp_deadline}
                onChange={(e) => setFormData({...formData, rsvp_deadline: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({...formData, is_public: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">
                Make this event public
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={updateEvent}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* EVENTS LIST */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No upcoming events. Create one to get started!
          </div>
        ) : (
          events.map(event => {
            const isOrganizer = event.created_by === userId
            const userRsvp = event.rsvps?.find((r: any) => r.user_id === userId)
            
            return (
              <div key={event.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{getEventIcon(event.event_type)}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-600">Organized by {event.organizer_name}</p>
                    </div>
                  </div>
                  
                  {isOrganizer && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(event)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {event.description && (
                  <p className="text-gray-700 mb-4">{event.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  {(event.start_time || event.end_time) && (
                    <div className="flex items-center gap-2">
                      <span>🕐</span>
                      <span>
                        {event.start_time && new Date(`2000-01-01T${event.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {event.end_time && ` - ${new Date(`2000-01-01T${event.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>{event.location}</span>
                  </div>
                  {event.max_attendees && (
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      <span>Max {event.max_attendees} attendees</span>
                    </div>
                  )}
                </div>

                {!isOrganizer && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => rsvpToEvent(event.id, 'going')}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        userRsvp?.status === 'going'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      ✓ Going
                    </button>
                    <button
                      onClick={() => rsvpToEvent(event.id, 'maybe')}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        userRsvp?.status === 'maybe'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      }`}
                    >
                      ? Maybe
                    </button>
                    <button
                      onClick={() => rsvpToEvent(event.id, 'not_going')}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        userRsvp?.status === 'not_going'
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      ✗ Can't Go
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}