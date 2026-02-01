'use client'

import { useState, useEffect } from 'react'
import { Calendar, momentLocalizer, ToolbarProps } from 'react-big-calendar'
import moment from 'moment'
import FamilyNotes from './FamilyNotes'
import DailyNotes from './DailyNotes'
import DayViewModal from './DayViewModal'
import DayDetails from './DayDetails'
import { supabase } from '@/src/lib/supabase'
import './calendar-print.css'

const localizer = momentLocalizer(moment)

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

interface LessonCalendarProps {
  kids: Child[]
  lessonsByKid: { [kidId: string]: Lesson[] }
  socialEvents: any[]
  coopEnrollments: any[]
  manualAttendance: any[]
  filters: {
    showLessons: boolean
    showSocialEvents: boolean
    showCoopClasses: boolean
    showManualAttendance: boolean
  }
  onLessonClick: (lesson: Lesson, child: Child) => void
  onStatusChange?: (lessonId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => void
  userId: string
}

// Color palette for children
const CHILD_COLORS = [
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
]

// Activity type colors
const ACTIVITY_COLORS = {
  lesson: '#3b82f6',
  socialEvent: '#a855f7',
  coopClass: '#10b981',
  attendance: '#6b7280'
}

export default function LessonCalendar({ 
  kids, 
  lessonsByKid, 
  socialEvents,
  coopEnrollments,
  manualAttendance,
  filters,
  onLessonClick, 
  onStatusChange,
  userId
}: LessonCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showFamilyNotes, setShowFamilyNotes] = useState(false)
  const [showDailyNotes, setShowDailyNotes] = useState(false)
  const [showDayView, setShowDayView] = useState(false)
  const [showDayDetails, setShowDayDetails] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [datesWithNotes, setDatesWithNotes] = useState<Set<string>>(new Set())

  // Load dates that have notes
  useEffect(() => {
    loadDatesWithNotes()
  }, [])

  const loadDatesWithNotes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data } = await supabase
        .from('daily_notes')
        .select('note_date')
        .eq('user_id', user.id)
      
      if (data) {
        const dates = new Set(data.map(note => note.note_date))
        setDatesWithNotes(dates)
      }
    }
  }

  // Print function
  const handlePrint = () => {
    window.print()
  }

  // Custom date cell to show note indicator and make day clickable
  const DateCellWrapper = ({ children, value }: any) => {
    const dateStr = moment(value).format('YYYY-MM-DD')
    const hasNotes = datesWithNotes.has(dateStr)
    
    return (
      <div className="rbc-day-bg relative group">
        {children}
        
        {/* Click overlay to open day details */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setSelectedDate(value)
            setShowDayDetails(true)
          }}
          className="print-hide absolute inset-0 opacity-0 hover:opacity-10 bg-blue-500 transition-opacity z-[1]"
          title="View day details"
        />
        
        {/* Note icon - always visible, highlighted if has notes */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setSelectedDate(value)
            setShowDailyNotes(true)
          }}
          className={`print-hide absolute bottom-1 right-1 p-1 rounded transition-all z-10 ${
            hasNotes 
              ? 'bg-yellow-400 text-gray-900 shadow-sm' 
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          }`}
          title={hasNotes ? "View notes" : "Add notes"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-3.5 w-3.5" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    )
  }

  // Assign colors to kids
  const kidColors: { [kidId: string]: string } = {}
  kids.forEach((kid, index) => {
    kidColors[kid.id] = CHILD_COLORS[index % CHILD_COLORS.length]
  })

  // Custom toolbar
  const CustomToolbar = (toolbar: ToolbarProps) => {
    const goToBack = () => {
      const newDate = moment(currentDate).subtract(1, 'month').toDate()
      setCurrentDate(newDate)
    }

    const goToNext = () => {
      const newDate = moment(currentDate).add(1, 'month').toDate()
      setCurrentDate(newDate)
    }

    const label = () => {
      const date = moment(currentDate)
      return (
        <span className="text-xl font-bold text-gray-900">
          {date.format('MMMM YYYY')}
        </span>
      )
    }

    return (
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goToBack}
            className="no-print p-2 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          >
            <span className="text-2xl text-gray-700">←</span>
          </button>
          {label()}
          <button
            type="button"
            onClick={goToNext}
            className="no-print p-2 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          >
            <span className="text-2xl text-gray-700">→</span>
          </button>
        </div>
        
        <div className="no-print flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" 
              />
            </svg>
            <span>Print Calendar</span>
          </button>
          
          <button
            type="button"
            onClick={() => setShowFamilyNotes(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <span>📝</span>
            <span>Family Notes</span>
          </button>
        </div>
      </div>
    )
  }

  // Custom event component to show child photo or activity icon
  const EventComponent = ({ event }: any) => {
    const child = event.activityType === 'lesson' ? kids.find(k => k.id === event.kidId) : null
    
    const getIcon = () => {
      switch (event.activityType) {
        case 'socialEvent': return '🎉'
        case 'coopClass': return '🏫'
        case 'attendance': return '✓'
        default: return null
      }
    }
    
    return (
      <div className="flex items-center gap-1 overflow-hidden">
        {child?.photo_url ? (
          <img 
            src={child.photo_url} 
            alt={child.displayname}
            className="w-5 h-5 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <span className="text-xs flex-shrink-0">{getIcon()}</span>
        )}
        <span className="text-xs truncate">{event.title}</span>
      </div>
    )
  }

  // Build events array with all activity types
  const events = []

  // 1. Lessons (if filter enabled)
  if (filters.showLessons) {
    const lessonEvents = kids.flatMap(kid => {
      const lessons = lessonsByKid[kid.id] || []
      return lessons
        .filter(lesson => lesson.lesson_date)
        .map(lesson => {
          const dateStr = lesson.lesson_date!.split('T')[0]
          const [year, month, day] = dateStr.split('-').map(Number)
          const startDate = new Date(year, month - 1, day, 0, 0, 0)
          const endDate = new Date(startDate)
          
          if (lesson.duration_minutes) {
            endDate.setMinutes(endDate.getMinutes() + lesson.duration_minutes)
          } else {
            endDate.setHours(endDate.getHours() + 1)
          }

          return {
            id: `lesson-${lesson.id}`,
            title: `${lesson.subject}: ${lesson.title}`,
            start: startDate,
            end: endDate,
            resource: { lesson, child: kid },
            kidId: kid.id,
            kidName: kid.displayname,
            activityType: 'lesson'
          }
        })
    })
    events.push(...lessonEvents)
  }

  // 2. Social Events (if filter enabled)
  if (filters.showSocialEvents) {
    const socialEventsList = socialEvents.map(event => {
      const dateStr = event.event_date.split('T')[0]
      const [year, month, day] = dateStr.split('-').map(Number)
      const startDate = new Date(year, month - 1, day, 0, 0, 0)
      
      if (event.start_time) {
        const [hours, minutes] = event.start_time.split(':').map(Number)
        startDate.setHours(hours, minutes)
      }
      
      const endDate = new Date(startDate)
      if (event.end_time) {
        const [hours, minutes] = event.end_time.split(':').map(Number)
        endDate.setHours(hours, minutes)
      } else {
        endDate.setHours(endDate.getHours() + 2)
      }

      return {
        id: `social-${event.id}`,
        title: `🎉 ${event.title}`,
        start: startDate,
        end: endDate,
        resource: { event },
        activityType: 'socialEvent'
      }
    })
    events.push(...socialEventsList)
  }

  // 3. Co-op Classes (if filter enabled)
  if (filters.showCoopClasses) {
    const coopClassEvents = coopEnrollments.flatMap(enrollment => {
      if (!enrollment.coop_classes) return []
      
      const coopClass = enrollment.coop_classes
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        .indexOf(coopClass.day_of_week)
      
      // Generate occurrences for the current month
      const monthStart = moment(currentDate).startOf('month').toDate()
      const monthEnd = moment(currentDate).endOf('month').toDate()
      
      const occurrences = []
      let current = new Date(monthStart)
      
      while (current <= monthEnd) {
        if (current.getDay() === dayOfWeek) {
          const startDate = new Date(current)
          
          if (coopClass.start_time) {
            const [hours, minutes] = coopClass.start_time.split(':').map(Number)
            startDate.setHours(hours, minutes)
          }
          
          const endDate = new Date(startDate)
          if (coopClass.end_time) {
            const [hours, minutes] = coopClass.end_time.split(':').map(Number)
            endDate.setHours(hours, minutes)
          } else {
            endDate.setHours(endDate.getHours() + 1)
          }
          
          occurrences.push({
            id: `coop-${coopClass.id}-${moment(startDate).format('YYYY-MM-DD')}`,
            title: `🏫 ${coopClass.class_name}`,
            start: startDate,
            end: endDate,
            resource: { coopClass },
            activityType: 'coopClass'
          })
        }
        current.setDate(current.getDate() + 1)
      }
      
      return occurrences
    })
    events.push(...coopClassEvents)
  }

  const eventStyleGetter = (event: any) => {
    let backgroundColor = ACTIVITY_COLORS.lesson
    
    if (event.activityType === 'lesson') {
      backgroundColor = kidColors[event.kidId] || ACTIVITY_COLORS.lesson
    } else if (event.activityType === 'socialEvent') {
      backgroundColor = ACTIVITY_COLORS.socialEvent
    } else if (event.activityType === 'coopClass') {
      backgroundColor = ACTIVITY_COLORS.coopClass
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontWeight: '500'
      }
    }
  }

  const handleSelectEvent = (event: any) => {
    if (event.activityType === 'lesson') {
      onLessonClick(event.resource.lesson, event.resource.child)
    } else {
      // For social events and co-op classes, open the day details modal
      setSelectedDate(event.start)
      setShowDayDetails(true)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="printable-calendar rounded-lg p-6" style={{ height: '700px', backgroundColor: '#f9fafb' }}>
        {/* Print Header (only visible when printing) */}
        <div className="print-header" style={{ display: 'none' }}>
          <h1>HomeschoolHQ - {moment(currentDate).format('MMMM YYYY')}</h1>
          <p>Lesson Schedule</p>
        </div>
        
        {/* Child Legend */}
        <div className="print-legend flex flex-wrap gap-3 mb-4">
          {/* Children */}
          {kids.map(kid => (
            <div key={kid.id} className="print-legend-item flex items-center gap-2 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">
              {kid.photo_url && (
                <img 
                  src={kid.photo_url} 
                  alt={kid.displayname}
                  className="w-6 h-6 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-gray-700 font-medium">{kid.displayname}</span>
              <div 
                className="print-legend-color w-4 h-4 rounded-full" 
                style={{ backgroundColor: kidColors[kid.id] }}
              />
            </div>
          ))}
          
          {/* Activity Type Legend */}
          {filters.showSocialEvents && (
            <div className="print-legend-item flex items-center gap-2 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">
              <span className="text-sm">🎉</span>
              <span className="text-sm text-gray-700 font-medium">Social Events</span>
              <div 
                className="print-legend-color w-4 h-4 rounded-full" 
                style={{ backgroundColor: ACTIVITY_COLORS.socialEvent }}
              />
            </div>
          )}
          
          {filters.showCoopClasses && (
            <div className="print-legend-item flex items-center gap-2 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">
              <span className="text-sm">🏫</span>
              <span className="text-sm text-gray-700 font-medium">Co-op Classes</span>
              <div 
                className="print-legend-color w-4 h-4 rounded-full" 
                style={{ backgroundColor: ACTIVITY_COLORS.coopClass }}
              />
            </div>
          )}
        </div>

        <style jsx global>{`
          .rbc-date-cell {
            padding: 8px;
          }
          
          .rbc-date-cell button {
            color: #374151 !important;
            font-weight: 600 !important;
            font-size: 14px;
          }
          
          .rbc-now {
            background-color: #dbeafe !important;
          }
          
          .rbc-today {
            background-color: #dbeafe !important;
          }
          
          .rbc-header {
            padding: 12px 4px;
            font-weight: 600;
            color: #6b7280 !important;
            border-bottom: 1px solid #e5e7eb;
            background-color: #ffffff;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
          }
          
          .rbc-month-view {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            background-color: #ffffff;
          }
          
          .rbc-day-bg {
            background-color: #ffffff !important;
            border-color: #e5e7eb !important;
          }
          
          .rbc-day-bg:hover {
            background-color: #f9fafb !important;
          }
          
          .rbc-off-range-bg {
            background-color: #f9fafb !important;
          }
          
          .rbc-off-range .rbc-date-cell button {
            color: #9ca3af !important;
          }
          
          .rbc-event {
            padding: 2px 5px;
            font-size: 12px;
          }
          
          .rbc-event:hover {
            opacity: 1 !important;
            cursor: pointer;
          }
          
          .rbc-show-more {
            color: #3b82f6 !important;
            font-weight: 600;
          }
          
          /* Show print header only when printing */
          @media print {
            .print-header {
              display: block !important;
            }
          }
        `}</style>
        
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          views={['month']}
          view="month"
          date={currentDate}
          onNavigate={(date) => setCurrentDate(date)}
          components={{
            toolbar: CustomToolbar,
            event: EventComponent,
            dateCellWrapper: DateCellWrapper
          }}
          popup
        />
      </div>
      
      {/* Day Details Modal (NEW) */}
      {showDayDetails && selectedDate && (
        <DayDetails
          date={moment(selectedDate).format('YYYY-MM-DD')}
          onClose={() => {
            setShowDayDetails(false)
            setSelectedDate(null)
          }}
          userId={userId}
          organizationId={userId}
        />
      )}
      
      {/* Day View Modal */}
      {showDayView && selectedDate && (
        <DayViewModal
          date={selectedDate}
          kids={kids}
          lessonsByKid={lessonsByKid}
          onClose={() => {
            setShowDayView(false)
            setSelectedDate(null)
          }}
          onLessonClick={onLessonClick}
          onStatusChange={onStatusChange || (() => {})}
        />
      )}
      
      {/* Family Notes Modal */}
      {showFamilyNotes && (
        <FamilyNotes onClose={() => setShowFamilyNotes(false)} />
      )}
      
      {/* Daily Notes Modal */}
      {showDailyNotes && selectedDate && (
        <DailyNotes 
          date={selectedDate} 
          onClose={() => {
            setShowDailyNotes(false)
            setSelectedDate(null)
            loadDatesWithNotes()
          }} 
        />
      )}
    </div>
  )
}