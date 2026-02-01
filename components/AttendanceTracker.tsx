'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/src/lib/supabase'
import CalendarView from './CalendarView'
import CalendarFilters from './CalendarFilters'
import ReconciliationPanel from './ReconciliationPanel'
import AttendanceInsights from './AttendanceInsights'
import ComplianceChecker from './ComplianceChecker'
import AttendanceGoals from './AttendanceGoals'
import PDFExport from './PDFExport'
import DayDetails from './DayDetails'

interface AttendanceTrackerProps {
  kids: any[]
  organizationId: string
  userId: string  // ADD THIS
  organizationName?: string
  schoolYear?: string
  state?: string
}

interface LessonData {
  id: string
  lesson_date: string
  duration_minutes: number
  kid_id: string
  completed: boolean
}

interface ManualAttendance {
  id: string
  organization_id: string
  attendance_date: string
  kid_id: string | null | undefined
  status: 'full_day' | 'half_day' | 'no_school'
  hours: number
  notes: string | null | undefined
  auto_generated: boolean
}

interface DayData {
  date: string
  lessonHours: number
  lessonCount: number
  socialEventCount: number  // NEW
  coopClassCount: number    // NEW
  manualAttendance?: ManualAttendance
  isSchoolDay: boolean
  totalHours: number
  isCurrentMonth?: boolean
  isToday?: boolean
}

interface MonthGroup {
  month: string
  year: number
  days: DayData[]
  totalDays: number
  totalHours: number
  isExpanded: boolean
}

interface SuggestedDay {
  date: string
  lessonCount: number
  lessonHours: number
  suggestedStatus: 'full_day' | 'half_day'
  suggestedHours: number
}

type ViewMode = 'list' | 'calendar'
type TabMode = 'overview' | 'insights' | 'goals' | 'compliance' | 'reports'

export default function AttendanceTracker({ 
  kids, 
  organizationId,
  userId,  // NEW
  organizationName = 'My Homeschool',
  schoolYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  state = 'NC'
}: AttendanceTrackerProps) {
  const [lessons, setLessons] = useState<LessonData[]>([])
  const [manualAttendance, setManualAttendance] = useState<ManualAttendance[]>([])
  const [socialEvents, setSocialEvents] = useState<any[]>([])  // NEW
  const [coopEnrollments, setCoopEnrollments] = useState<any[]>([])  // NEW
  const [loading, setLoading] = useState(true)
  const [selectedKid, setSelectedKid] = useState<string>('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showMarkModal, setShowMarkModal] = useState(false)
  const [markingDate, setMarkingDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [activeTab, setActiveTab] = useState<TabMode>('overview')
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [attendanceMarkedToday, setAttendanceMarkedToday] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)  // NEW

  // NEW: Activity filters
  const [filters, setFilters] = useState({
    showLessons: true,
    showSocialEvents: true,
    showCoopClasses: true,
    showManualAttendance: true
  })

  const [filterCounts, setFilterCounts] = useState({
    lessons: 0,
    socialEvents: 0,
    coopClasses: 0,
    manualAttendance: 0
  })

  useEffect(() => {
    loadData()
    loadDismissedSuggestions()
  }, [])

  useEffect(() => {
    checkTodaysAttendance()
  }, [manualAttendance]) 

  useEffect(() => {
    groupByMonth()
  }, [lessons, manualAttendance, socialEvents, coopEnrollments, selectedKid, startDateFilter, endDateFilter, searchTerm])

  function loadDismissedSuggestions() {
    const dismissed = localStorage.getItem('dismissed_attendance_suggestions')
    if (dismissed) {
      setDismissedSuggestions(new Set(JSON.parse(dismissed)))
    }
  }

  function checkTodaysAttendance() {
    const today = new Date().toISOString().split('T')[0]
    const todayAttendance = manualAttendance.some(a => a.attendance_date === today)
    setAttendanceMarkedToday(todayAttendance)
  }

  function saveDismissedSuggestions(dismissed: Set<string>) {
    localStorage.setItem('dismissed_attendance_suggestions', JSON.stringify(Array.from(dismissed)))
    setDismissedSuggestions(dismissed)
  }

  async function loadData() {
    setLoading(true)
    try {
      // Load lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .not('lesson_date', 'is', null)
        .order('lesson_date', { ascending: false })

      if (lessonsError) throw lessonsError

      // Load manual attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('organization_id', organizationId)
        .order('attendance_date', { ascending: false })

      if (attendanceError) throw attendanceError

      // NEW: Load social events
      const { data: eventsData, error: eventsError } = await supabase
        .from('social_events')
        .select('*')
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .order('event_date', { ascending: false })

      if (eventsError && eventsError.code !== 'PGRST116') {
        console.error('Error loading social events:', eventsError)
      }

      // NEW: Load co-op enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('class_enrollments')
        .select(`
          *,
          coop_classes(*)
        `)
        .eq('user_id', userId)

      if (enrollmentsError && enrollmentsError.code !== 'PGRST116') {
        console.error('Error loading co-op enrollments:', enrollmentsError)
      }

      setLessons(lessonsData || [])
      setManualAttendance(attendanceData || [])
      setSocialEvents(eventsData || [])
      setCoopEnrollments(enrollmentsData || [])

      // Calculate filter counts
      calculateFilterCounts(lessonsData || [], eventsData || [], enrollmentsData || [], attendanceData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function calculateFilterCounts(lessonsData: any[], eventsData: any[], enrollmentsData: any[], attendanceData: any[]) {
    const lessonDates = new Set(lessonsData.map(l => l.lesson_date))
    const eventDates = new Set(eventsData.map(e => e.event_date))
    
    // Count co-op class occurrences in current school year
    let coopCount = 0
    const today = new Date()
    const yearStart = new Date(today.getFullYear(), 0, 1)
    const yearEnd = new Date(today.getFullYear(), 11, 31)
    
    enrollmentsData.forEach(enrollment => {
      if (!enrollment.coop_classes) return
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        .indexOf(enrollment.coop_classes.day_of_week)
      
      let current = new Date(yearStart)
      while (current <= yearEnd) {
        if (current.getDay() === dayOfWeek) {
          coopCount++
        }
        current.setDate(current.getDate() + 1)
      }
    })

    setFilterCounts({
      lessons: lessonDates.size,
      socialEvents: eventDates.size,
      coopClasses: coopCount,
      manualAttendance: attendanceData.length
    })
  }

  function groupByMonth() {
    const allDates = new Set<string>()
    lessons.forEach(l => allDates.add(l.lesson_date))
    manualAttendance.forEach(a => allDates.add(a.attendance_date))
    socialEvents.forEach(e => allDates.add(e.event_date))

    // Add co-op class dates
    coopEnrollments.forEach(enrollment => {
      if (!enrollment.coop_classes) return
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        .indexOf(enrollment.coop_classes.day_of_week)
      
      // Generate dates for the visible range
      const today = new Date()
      const yearStart = new Date(today.getFullYear(), 0, 1)
      const yearEnd = new Date(today.getFullYear(), 11, 31)
      
      let current = new Date(yearStart)
      while (current <= yearEnd) {
        if (current.getDay() === dayOfWeek) {
          allDates.add(current.toISOString().split('T')[0])
        }
        current.setDate(current.getDate() + 1)
      }
    })

    const daysData: DayData[] = Array.from(allDates).map(date => {
      let dateLessons = lessons.filter(l => l.lesson_date === date)
      if (selectedKid !== 'all') {
        dateLessons = dateLessons.filter(l => l.kid_id === selectedKid)
      }

      const lessonMinutes = dateLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
      const lessonHours = lessonMinutes / 60

      // Count social events
      const socialEventCount = socialEvents.filter(e => e.event_date === date).length

      // Count co-op classes for this date
      const dayOfWeek = new Date(date).getDay()
      const coopClassCount = coopEnrollments.filter(enrollment => {
        if (!enrollment.coop_classes) return false
        const classDayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          .indexOf(enrollment.coop_classes.day_of_week)
        return classDayOfWeek === dayOfWeek
      }).length

      let dateAttendance = manualAttendance.find(a => a.attendance_date === date)
      if (selectedKid !== 'all' && dateAttendance) {
        if (dateAttendance.kid_id !== selectedKid && dateAttendance.kid_id !== null) {
          dateAttendance = undefined
        }
      }

      let isSchoolDay = false
      let totalHours = 0

      if (dateAttendance) {
        isSchoolDay = dateAttendance.status !== 'no_school'
        totalHours = dateAttendance.hours
      } else if (lessonHours > 0) {
        isSchoolDay = true
        totalHours = lessonHours
      }

      return {
        date,
        lessonHours,
        lessonCount: dateLessons.length,
        socialEventCount,
        coopClassCount,
        manualAttendance: dateAttendance,
        isSchoolDay,
        totalHours
      }
    })

    let filtered = daysData
    if (startDateFilter) {
      filtered = filtered.filter(d => d.date >= startDateFilter)
    }
    if (endDateFilter) {
      filtered = filtered.filter(d => d.date <= endDateFilter)
    }
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.date.includes(searchTerm) ||
        new Date(d.date).toLocaleDateString().includes(searchTerm)
      )
    }

    const groups: { [key: string]: DayData[] } = {}
    filtered.forEach(day => {
      const date = new Date(day.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(day)
    })

    const currentMonth = new Date().toISOString().slice(0, 7)
    const monthGroupsArray: MonthGroup[] = Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(key => {
        const [year, month] = key.split('-')
        const monthDays = groups[key]
        
        const totalDays = monthDays.filter(d => d.isSchoolDay).length
        const totalHours = monthDays.reduce((sum, d) => sum + d.totalHours, 0)

        return {
          month: new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' }),
          year: parseInt(year),
          days: monthDays.sort((a, b) => a.date.localeCompare(b.date)),
          totalDays,
          totalHours,
          isExpanded: key === currentMonth
        }
      })

    setMonthGroups(monthGroupsArray)
  }

  // Generate suggestions for reconciliation
  const suggestions = useMemo((): SuggestedDay[] => {
    const allDates = new Set<string>()
    lessons.forEach(l => allDates.add(l.lesson_date))

    const suggested: SuggestedDay[] = []

    Array.from(allDates).forEach(date => {
      const hasManual = manualAttendance.some(a => a.attendance_date === date)
      if (hasManual) return

      if (dismissedSuggestions.has(date)) return

      let dateLessons = lessons.filter(l => l.lesson_date === date)
      if (selectedKid !== 'all') {
        dateLessons = dateLessons.filter(l => l.kid_id === selectedKid)
      }

      if (dateLessons.length === 0) return

      const lessonMinutes = dateLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
      const lessonHours = lessonMinutes / 60

      const suggestedStatus: 'full_day' | 'half_day' = lessonHours >= 3 ? 'full_day' : 'half_day'
      const suggestedHours = lessonHours >= 3 ? 4 : 2

      suggested.push({
        date,
        lessonCount: dateLessons.length,
        lessonHours,
        suggestedStatus,
        suggestedHours
      })
    })

    return suggested.sort((a, b) => b.date.localeCompare(a.date))
  }, [lessons, manualAttendance, selectedKid, dismissedSuggestions])

  // Get calendar days for current view
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1)
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0)
    
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - 7)
    
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + 7)

    const allDates = new Set<string>()
    lessons.forEach(l => {
      if (l.lesson_date >= startDate.toISOString().split('T')[0] && 
          l.lesson_date <= endDate.toISOString().split('T')[0]) {
        allDates.add(l.lesson_date)
      }
    })
    manualAttendance.forEach(a => {
      if (a.attendance_date >= startDate.toISOString().split('T')[0] && 
          a.attendance_date <= endDate.toISOString().split('T')[0]) {
        allDates.add(a.attendance_date)
      }
    })
    socialEvents.forEach(e => {
      if (e.event_date >= startDate.toISOString().split('T')[0] && 
          e.event_date <= endDate.toISOString().split('T')[0]) {
        allDates.add(e.event_date)
      }
    })

    // Add co-op class dates for this range
    coopEnrollments.forEach(enrollment => {
      if (!enrollment.coop_classes) return
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        .indexOf(enrollment.coop_classes.day_of_week)
      
      let current = new Date(startDate)
      while (current <= endDate) {
        if (current.getDay() === dayOfWeek) {
          allDates.add(current.toISOString().split('T')[0])
        }
        current.setDate(current.getDate() + 1)
      }
    })

    return Array.from(allDates).map(date => {
      let dateLessons = lessons.filter(l => l.lesson_date === date)
      if (selectedKid !== 'all') {
        dateLessons = dateLessons.filter(l => l.kid_id === selectedKid)
      }

      const lessonMinutes = dateLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
      const lessonHours = lessonMinutes / 60

      const socialEventCount = socialEvents.filter(e => e.event_date === date).length

      const dayOfWeek = new Date(date).getDay()
      const coopClassCount = coopEnrollments.filter(enrollment => {
        if (!enrollment.coop_classes) return false
        const classDayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          .indexOf(enrollment.coop_classes.day_of_week)
        return classDayOfWeek === dayOfWeek
      }).length

      let dateAttendance = manualAttendance.find(a => a.attendance_date === date)
      if (selectedKid !== 'all' && dateAttendance) {
        if (dateAttendance.kid_id !== selectedKid && dateAttendance.kid_id !== null) {
          dateAttendance = undefined
        }
      }

      let isSchoolDay = false
      let totalHours = 0

      if (dateAttendance) {
        isSchoolDay = dateAttendance.status !== 'no_school'
        totalHours = dateAttendance.hours
      } else if (lessonHours > 0) {
        isSchoolDay = true
        totalHours = lessonHours
      }

      const dayDate = new Date(date)
      const isCurrentMonth = dayDate.getMonth() === calendarMonth && dayDate.getFullYear() === calendarYear
      const isToday = date === new Date().toISOString().split('T')[0]

      return {
        date,
        lessonHours,
        lessonCount: dateLessons.length,
        socialEventCount,
        coopClassCount,
        manualAttendance: dateAttendance,
        isSchoolDay,
        totalHours,
        isCurrentMonth,
        isToday
      }
    })
  }, [lessons, manualAttendance, socialEvents, coopEnrollments, selectedKid, calendarYear, calendarMonth])

  // All days for insights and export
  const allDays = useMemo(() => {
    return monthGroups.flatMap(g => g.days)
  }, [monthGroups])

  function toggleMonth(index: number) {
    setMonthGroups(prev => prev.map((group, i) => 
      i === index ? { ...group, isExpanded: !group.isExpanded } : group
    ))
  }

  function clearFilters() {
    setSelectedKid('all')
    setStartDateFilter('')
    setEndDateFilter('')
    setSearchTerm('')
  }

  async function markAttendance(date: string, status: 'full_day' | 'half_day' | 'no_school', hours: number, notes: string, kidId: string | null) {
    try {
      console.log('🎯 Marking attendance:', { date, status, hours, notes, kidId, organizationId });
      
      const existing = manualAttendance.find(a => 
        a.attendance_date === date && 
        (kidId === null ? a.kid_id === null : a.kid_id === kidId)
      );
  
      if (existing) {
        console.log('📝 Updating existing record:', existing.id);
        const { data, error } = await supabase
          .from('daily_attendance')
          .update({
            status,
            hours,
            notes: notes || null,
            auto_generated: false
          })
          .eq('id', existing.id)
          .select();
  
        console.log('✅ Update result:', { data, error });
        if (error) throw error;
      } else {
        console.log('➕ Creating new record');
        const { data, error } = await supabase
          .from('daily_attendance')
          .insert({
            organization_id: organizationId,
            attendance_date: date,
            kid_id: kidId,
            status,
            hours,
            notes: notes || null,
            auto_generated: false
          })
          .select();
  
        console.log('✅ Insert result:', { data, error });
        if (error) throw error;
      }
  
      await loadData();
      setShowMarkModal(false);
      checkTodaysAttendance();
    } catch (error: any) {
      console.error('❌ Error marking attendance:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        status: error?.status
      });
      alert('Failed to save attendance. Please try again.');
    }
  }

  async function bulkConfirmAttendance(dates: string[], status: 'full_day' | 'half_day', hours: number) {
    try {
      const records = dates.map(date => ({
        organization_id: organizationId,
        attendance_date: date,
        kid_id: selectedKid !== 'all' ? selectedKid : null,
        status,
        hours,
        auto_generated: true
      }))

      const { error } = await supabase
        .from('daily_attendance')
        .upsert(records, {
          onConflict: 'organization_id,attendance_date,kid_id'
        })

      if (error) throw error

      await loadData()
    } catch (error) {
      console.error('Error bulk confirming:', error)
      throw error
    }
  }

  function dismissSuggestion(date: string) {
    const newDismissed = new Set(dismissedSuggestions)
    newDismissed.add(date)
    saveDismissedSuggestions(newDismissed)
  }

  function dismissAllSuggestions() {
    const allDates = new Set([...dismissedSuggestions, ...suggestions.map(s => s.date)])
    saveDismissedSuggestions(allDates)
  }

  async function deleteAttendance(id: string) {
    if (!confirm('Remove this attendance record?')) return

    try {
      const { error } = await supabase
        .from('daily_attendance')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Error deleting attendance:', error)
      alert('Failed to delete attendance. Please try again.')
    }
  }

  const stats = useMemo(() => {
    let filtered = monthGroups.flatMap(g => g.days)

    const totalDays = filtered.filter(d => d.isSchoolDay).length
    const totalHours = filtered.reduce((sum, d) => sum + d.totalHours, 0)
    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0

    return {
      totalDays,
      totalHours: totalHours.toFixed(1),
      totalHoursNumber: totalHours,
      avgHoursPerDay: avgHoursPerDay.toFixed(1),
      completion: Math.round((totalDays / 180) * 100),
      required: 180
    }
  }, [monthGroups])

  if (loading) {
    return <div className="text-center py-8 text-gray-900">Loading attendance data...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Attendance Tracking</h2>
          <p className="text-gray-600">Track school days and instructional hours</p>
        </div>
        {attendanceMarkedToday ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Today's attendance recorded</span>
        </div>
      ) : (
        <button
          onClick={() => {
            setMarkingDate(new Date().toISOString().split('T')[0])
            setShowMarkModal(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          ✓ Mark Today
        </button>
      )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">School Days</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalDays}</p>
          <p className="text-xs text-gray-500">of {stats.required} required</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Total Hours</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalHours}</p>
          <p className="text-xs text-gray-500">instructional time</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Completion</p>
          <p className="text-3xl font-bold text-gray-900">{stats.completion}%</p>
          <p className="text-xs text-gray-500">of school year</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Avg Hours/Day</p>
          <p className="text-3xl font-bold text-gray-900">{stats.avgHoursPerDay}</p>
          <p className="text-xs text-gray-500">per school day</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-gray-900">Progress to {stats.required} days</p>
          <p className="text-sm text-gray-600">{stats.totalDays} days completed</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-red-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((stats.totalDays / stats.required) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Tabbed Interface */}
      <div className="bg-white rounded-lg shadow">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              📋 Overview
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'insights'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              📊 Insights
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'goals'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              🎯 Goals
            </button>
            <button
              onClick={() => setActiveTab('compliance')}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'compliance'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              ✅ Compliance
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'reports'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              📄 Reports
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Reconciliation Panel */}
              {suggestions.length > 0 && (
                <ReconciliationPanel
                  suggestions={suggestions}
                  onBulkConfirm={bulkConfirmAttendance}
                  onDismissSuggestion={dismissSuggestion}
                  onDismissAll={dismissAllSuggestions}
                />
              )}

              {/* NEW: Calendar Filters */}
              <CalendarFilters
                filters={filters}
                onChange={setFilters}
                counts={filterCounts}
              />

              {/* Filters */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters & Search</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Child</label>
                    <select
                      value={selectedKid}
                      onChange={(e) => setSelectedKid(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                    >
                      <option value="all">All Children</option>
                      {kids.map(kid => (
                        <option key={kid.id} value={kid.id}>{kid.displayname}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Date</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="mm/dd/yyyy or Aug"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                    />
                  </div>
                </div>

                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear All Filters
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📋 List View
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📅 Calendar View
                </button>
              </div>

              {/* Calendar View */}
              {viewMode === 'calendar' && (
                <CalendarView
                  year={calendarYear}
                  month={calendarMonth}
                  days={calendarDays}
                  onDayClick={(date) => setSelectedDate(date)}
                  onMonthChange={(year, month) => {
                    setCalendarYear(year)
                    setCalendarMonth(month)
                  }}
                  filters={filters}
                />
              )}

              {/* List View - keep existing code */}
              {viewMode === 'list' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">School Days Log</h3>

                  {monthGroups.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No attendance records found</p>
                  ) : (
                    <div className="space-y-2">
                      {/* Keep existing month groups rendering */}
                      {monthGroups.map((group, index) => (
                        <div key={`${group.month}-${group.year}`} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* ...existing month group code... */}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Other tabs remain the same */}
          {activeTab === 'insights' && (
            <AttendanceInsights
              days={allDays}
              requiredDays={stats.required}
            />
          )}

          {activeTab === 'goals' && (
            <AttendanceGoals
              totalDays={stats.totalDays}
              totalHours={stats.totalHoursNumber}
              organizationId={organizationId}
              onGoalsUpdate={loadData}
            />
          )}

          {activeTab === 'compliance' && (
            <ComplianceChecker
              totalDays={stats.totalDays}
              totalHours={stats.totalHoursNumber}
              requiredDays={stats.required}
              state={state}
            />
          )}

          {activeTab === 'reports' && (
            <PDFExport
              days={allDays}
              totalDays={stats.totalDays}
              totalHours={stats.totalHoursNumber}
              requiredDays={stats.required}
              organizationName={organizationName}
              studentNames={kids.map(k => k.displayname)}
              schoolYear={schoolYear}
              state={state}
            />
          )}
        </div>
      </div>

      {/* Mark Attendance Modal */}
      {showMarkModal && (
        <MarkAttendanceModal
          date={markingDate}
          kids={kids}
          selectedKid={selectedKid}
          existingAttendance={manualAttendance.find(a => a.attendance_date === markingDate)}
          onSave={markAttendance}
          onClose={() => setShowMarkModal(false)}
        />
      )}

      {/* NEW: Day Details Modal */}
      {selectedDate && (
        <DayDetails
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          userId={userId}
          organizationId={organizationId}
        />
      )}
    </div>
  )
}

// Keep existing MarkAttendanceModal component...
// Mark Attendance Modal Component
interface MarkAttendanceModalProps {
  date: string
  kids: any[]
  selectedKid: string
  existingAttendance?: ManualAttendance
  onSave: (date: string, status: 'full_day' | 'half_day' | 'no_school', hours: number, notes: string, kidId: string | null) => void
  onClose: () => void
}

function MarkAttendanceModal({ date, kids, selectedKid, existingAttendance, onSave, onClose }: MarkAttendanceModalProps) {
  const [status, setStatus] = useState<'full_day' | 'half_day' | 'no_school'>(existingAttendance?.status || 'full_day')
  const [hours, setHours] = useState(existingAttendance?.hours || 4)
  const [notes, setNotes] = useState(existingAttendance?.notes || '')
  const [kidId, setKidId] = useState<string | null>(
    existingAttendance?.kid_id || (selectedKid !== 'all' ? selectedKid : null)
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(date, status, hours, notes, kidId)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Mark Attendance for {new Date(date).toLocaleDateString()}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Child Selection */}
            {kids.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Child</label>
                <select
                  value={kidId || 'all'}
                  onChange={(e) => setKidId(e.target.value === 'all' ? null : e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                >
                  <option value="all">All Children</option>
                  {kids.map(kid => (
                    <option key={kid.id} value={kid.id}>{kid.displayname}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="full_day"
                    checked={status === 'full_day'}
                    onChange={(e) => {
                      setStatus('full_day')
                      setHours(4)
                    }}
                    className="mr-2"
                  />
                  <span className="text-gray-900">Full Day (4 hours)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="half_day"
                    checked={status === 'half_day'}
                    onChange={(e) => {
                      setStatus('half_day')
                      setHours(2)
                    }}
                    className="mr-2"
                  />
                  <span className="text-gray-900">Half Day (2 hours)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="no_school"
                    checked={status === 'no_school'}
                    onChange={(e) => {
                      setStatus('no_school')
                      setHours(0)
                    }}
                    className="mr-2"
                  />
                  <span className="text-gray-900">No School</span>
                </label>
              </div>
            </div>

            {/* Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                placeholder="Field trip, sick day, etc."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}