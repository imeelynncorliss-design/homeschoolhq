'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import CalendarView from './CalendarView'
import CalendarFilters from './CalendarFilters'
import ReconciliationPanel from './ReconciliationPanel'
import AttendanceInsights from './AttendanceInsights'
import ComplianceChecker from './ComplianceChecker'
import AttendanceGoals from './AttendanceGoals'
import PDFExport from './PDFExport'
import DayDetails from './DayDetails'
import ResolveAttendanceModal from './ResolveAttendanceModal'
import { parseLocalDate } from '@/src/lib/utils'


interface AttendanceTrackerProps {
  kids: any[] // or define a proper Kid type
  organizationId: string
  userId: string
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
  socialEventCount: number
  coopClassCount: number
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

export default function AttendanceTracker({ kids, organizationId, userId }: AttendanceTrackerProps) {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

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
  const [markingDate, setMarkingDate] = useState<string>(new Date().toLocaleDateString('en-CA'))
  const [markingDefaultHours, setMarkingDefaultHours] = useState<number | undefined>(undefined)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [activeTab, setActiveTab] = useState<TabMode>('overview')
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [attendanceMarkedToday, setAttendanceMarkedToday] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)  
  const [stateInfo, setStateInfo] = useState<any>(null)
  const [loadingState, setLoadingState] = useState(true)
  const [organizationName, setOrganizationName] = useState<string>('My Homeschool')
  const [schoolYear, setSchoolYear] = useState<string>('2025-2026')
  const [requiredDays, setRequiredDays] = useState(180)
  const [schoolYearStart, setSchoolYearStart] = useState<string>('')
  const [schoolYearEnd, setSchoolYearEnd] = useState<string>('')
  const [resolveDate, setResolveDate] = useState<string | null>(null)
  const [resolveAttendance, setResolveAttendance] = useState<ManualAttendance | null>(null)
  const [dismissedDiscrepancies, setDismissedDiscrepancies] = useState<Set<string>>(new Set())

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
  loadDismissedSuggestions()
}, [])

// Wait for organizationId and userId before loading data
useEffect(() => {
  if (organizationId && userId) {
    loadData()
  }
}, [organizationId, userId])

  useEffect(() => {
    checkTodaysAttendance()
  }, [manualAttendance]) 

  useEffect(() => {
    groupByMonth()
  }, [lessons, manualAttendance, socialEvents, coopEnrollments, selectedKid, startDateFilter, endDateFilter, searchTerm])

  // Load state from school_year_settings
  useEffect(() => {
    if (!organizationId) return
    
    async function loadStateFromSettings() {
      setLoadingState(true)
      try {
        // After setting stateInfo, also read the user's goal:
        const { data: complianceData, error: complianceError } = await supabase
        .from('user_compliance_settings')
        .select('annual_days_goal')
        .eq('organization_id', organizationId)
        .maybeSingle() 

          if (complianceData?.annual_days_goal) {
          setRequiredDays(complianceData.annual_days_goal)
          }
        // CRITICAL: Wait for auth session first
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setLoadingState(false)
          return
        }
        
        const { data, error } = await supabase
        .from('school_year_settings')
        .select('selected_state, custom_state_name, school_year_start, school_year_end')
        .eq('organization_id', organizationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings record yet — perfectly normal for new orgs
        } else {
          console.error('🚨 Supabase error:', error)
        }
      }
        if (data?.school_year_start) setSchoolYearStart(data.school_year_start)
        if (data?.school_year_end)   setSchoolYearEnd(data.school_year_end)
        
        if (data?.selected_state) {
          
          if (data.selected_state === 'CUSTOM') {
            setStateInfo({
              state_code: 'CUSTOM',
              state_name: data.custom_state_name || 'Custom',
              isCustom: true
            })
          } else {
            const { data: stateData } = await supabase
              .from('state_compliance_templates')
              .select('*')
              .eq('state_code', data.selected_state)
              .single()
            
            if (stateData) {
              setStateInfo({
                ...stateData,
                isCustom: false
              })
            }
          }
        }
      } catch (error) {
        console.error('❌ Exception in loadStateFromSettings:', error)
      } finally {
        setLoadingState(false)
      }
    }
    
    loadStateFromSettings()
  }, [organizationId, supabase])
  

  function loadDismissedSuggestions() {
    const dismissed = localStorage.getItem('dismissed_attendance_suggestions')
    if (dismissed) {
      setDismissedSuggestions(new Set(JSON.parse(dismissed)))
    }
  }

  function checkTodaysAttendance() {
    const today = new Date().toLocaleDateString('en-CA')
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
      const { data: kidsData } = await supabase
  .from('kids')
  .select('id')
  .eq('organization_id', organizationId)

  const kidIds = (kidsData || []).map((k: any) => k.id)

  const { data: lessonsData, error: lessonsError } = kidIds.length > 0
  ? await supabase
      .from('lessons')
      .select('*')
      .in('kid_id', kidIds)
      .not('lesson_date', 'is', null)
      .order('lesson_date', { ascending: false })
  : { data: [], error: null }

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
          allDates.add(current.toLocaleDateString('en-CA'))
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
        new Date(d.date + 'T12:00:00').toLocaleDateString()
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

  // Reconciliation discrepancies
  const discrepancies = useMemo(() => {
    const result: {
      date: string
      type: 'hours_mismatch' | 'no_school_with_lessons' | 'attendance_no_lessons' | 'outside_school_year'
      attendanceHours?: number
      lessonHours?: number
      attendanceStatus?: string
      lessonCount?: number
    }[] = []

    const lessonHoursByDate = new Map<string, { hours: number; count: number }>()
    lessons.forEach(l => {
      if (selectedKid !== 'all' && l.kid_id !== selectedKid) return
      const existing = lessonHoursByDate.get(l.lesson_date) || { hours: 0, count: 0 }
      lessonHoursByDate.set(l.lesson_date, {
        hours: existing.hours + (l.duration_minutes || 0) / 60,
        count: existing.count + 1
      })
    })

    manualAttendance.forEach(a => {
      if (selectedKid !== 'all' && a.kid_id !== null && a.kid_id !== selectedKid) return

      const lessonData = lessonHoursByDate.get(a.attendance_date)
      const lessonHours = lessonData?.hours || 0
      const lessonCount = lessonData?.count || 0

      if (a.status === 'no_school' && lessonCount > 0) {
        result.push({ date: a.attendance_date, type: 'no_school_with_lessons', attendanceStatus: a.status, lessonHours, lessonCount })
        return
      }
      if (a.status !== 'no_school' && lessonCount === 0) {
        result.push({ date: a.attendance_date, type: 'attendance_no_lessons', attendanceHours: a.hours, attendanceStatus: a.status, lessonCount: 0 })
      }
      if (a.status !== 'no_school' && lessonCount > 0 && Math.abs(a.hours - lessonHours) > 1) {
        result.push({ date: a.attendance_date, type: 'hours_mismatch', attendanceHours: a.hours, lessonHours, lessonCount })
      }
      if (schoolYearStart && schoolYearEnd && a.status !== 'no_school') {
        if (a.attendance_date < schoolYearStart || a.attendance_date > schoolYearEnd) {
          result.push({ date: a.attendance_date, type: 'outside_school_year', attendanceHours: a.hours, attendanceStatus: a.status })
        }
      }
    })

    return result
      .filter(d => !dismissedDiscrepancies.has(d.date + ':' + d.type))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [lessons, manualAttendance, selectedKid, schoolYearStart, schoolYearEnd, dismissedDiscrepancies])

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
          allDates.add(current.toLocaleDateString('en-CA'))
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
      const isToday = date === new Date().toLocaleDateString('en-CA')

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
      
      const existing = manualAttendance.find(a => 
        a.attendance_date === date && 
        (kidId === null ? a.kid_id === null : a.kid_id === kidId)
      );
  
      if (existing) {
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
  
        if (error) throw error;
      } else {
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
      required: requiredDays
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
            setMarkingDate(new Date().toLocaleDateString('en-CA'))
            setShowMarkModal(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          ✓ Mark Today
        </button>
      )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              className={`px-3 py-3 text-sm md:px-6 font-medium whitespace-nowrap border-b-2 transition-colors ${
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
              {(suggestions.length > 0 || discrepancies.length > 0) && (
                <ReconciliationPanel
                  suggestions={suggestions}
                  discrepancies={discrepancies}
                  onBulkConfirm={bulkConfirmAttendance}
                  onDismissSuggestion={dismissSuggestion}
                  onDismissAll={dismissAllSuggestions}
                  onDismissDiscrepancy={(date: string, type: string) => {
                    setDismissedDiscrepancies(prev => new Set([...prev, date + ':' + type]))
                  }}
                  onFixDate={(date) => {
                    const discrepancy = discrepancies.find(d => d.date === date)
                    if (discrepancy?.type === 'attendance_no_lessons') {
                      const att = manualAttendance.find(a => a.attendance_date === date)
                      setResolveDate(date)
                      setResolveAttendance(att || null)
                    } else {
                      setMarkingDate(date)
                      setShowMarkModal(true)
                    }
                  }}
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
                        {/* Month Header */}
                        <button
                          onClick={() => toggleMonth(index)}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">
                              {group.isExpanded ? '▼' : '▶'}
                            </span>
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {group.month} {group.year}
                              </h4>
                              <p className="text-sm text-gray-900">
                                {group.totalDays} days • {group.totalHours.toFixed(1)} hours
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Month Days */}
                        {group.isExpanded && (
                          <div className="divide-y divide-gray-100">
                            {group.days.map(day => (
                              <div key={day.date} className="p-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-900">
                                        {new Date(day.date).toLocaleDateString('en-US', { 
                                          weekday: 'short',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </span>
                                      
                                      {day.isSchoolDay && (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                          School Day
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="mt-1 text-sm text-gray-600">
                                      {day.lessonCount > 0 && (
                                        <span className="mr-3">📚 {day.lessonCount} lessons</span>
                                      )}
                                      {day.totalHours > 0 && (
                                        <span>{day.totalHours.toFixed(1)} hours</span>
                                      )}
                                      {day.manualAttendance?.notes && (
                                        <span className="ml-3 italic">"{day.manualAttendance.notes}"</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 ml-4 shrink-0">
                                    <button
                                      onClick={() => {
                                        setMarkingDate(day.date)
                                        setMarkingDefaultHours(day.totalHours || undefined)
                                        setShowMarkModal(true)
                                      }}
                                      className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                                      title="Edit hours for this day"
                                    >
                                      ✏️
                                    </button>
                                    {day.manualAttendance && (
                                      <button
                                        onClick={() => deleteAttendance(day.manualAttendance!.id)}
                                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                                        title="Remove manual attendance record"
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Kid filter pills */}
              {kids.length > 1 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {[{ id: 'all', displayname: 'All kids' }, ...kids].map((kid, idx) => {
                    const KID_COLORS = ['#7c3aed', '#0d9488', '#ec4899', '#f59e0b', '#3b82f6']
                    const isAll = kid.id === 'all'
                    const isActive = selectedKid === kid.id
                    const color = isAll ? '#7c3aed' : KID_COLORS[(idx - 1) % KID_COLORS.length]
                    return (
                      <button
                        key={kid.id}
                        onClick={() => setSelectedKid(kid.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: isAll ? 0 : 8,
                          padding: isAll ? '7px 16px' : '7px 16px 7px 10px',
                          borderRadius: 999, fontFamily: "'Nunito', sans-serif",
                          fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                          border: `2px solid ${isActive ? color : '#e5e7eb'}`,
                          background: isActive ? `${color}18` : '#fff',
                          color: isActive ? color : '#6b7280',
                        }}
                      >
                        {!isAll && (
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: isActive ? color : '#d1d5db',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0,
                          }}>
                            {kid.displayname.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {kid.displayname}
                      </button>
                    )
                  })}
                </div>
              )}
              <AttendanceInsights
                days={allDays}
                requiredDays={stats.required}
              />
            </div>
          )}

            {activeTab === 'goals' && organizationId && (
              <AttendanceGoals
                totalDays={stats.totalDays}
                totalHours={stats.totalHoursNumber}
                organizationId={organizationId}
                onGoalsUpdate={loadData}
              />
            )}

        {activeTab === 'compliance' && organizationId && (
          <ComplianceChecker
            totalDays={stats.totalDays}
            totalHours={stats.totalHoursNumber}
            stateInfo={stateInfo}
            loadingState={loadingState}
          />
        )}

          {activeTab === 'reports'&& organizationId && (
            <PDFExport
              days={allDays}
              totalDays={stats.totalDays}
              totalHours={stats.totalHoursNumber}
              requiredDays={stats.required}
              organizationName={organizationName}
              studentNames={kids.map(k => k.displayname)}
              schoolYear={schoolYear}
              state={stateInfo?.state_code || 'Not Set'}
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
          defaultHours={markingDefaultHours}
          organizationId={organizationId}
          userId={userId}
          supabaseClient={supabase}
          onSave={markAttendance}
          onClose={() => { setShowMarkModal(false); setMarkingDefaultHours(undefined) }}
        />
      )}

     {/* Day Details Modal */}
{selectedDate && organizationId && userId && (
  <DayDetails
    date={selectedDate}
    onClose={() => setSelectedDate(null)}
    userId={userId}
    organizationId={organizationId}
  />
)}
{resolveDate && resolveAttendance && (
  <ResolveAttendanceModal
    date={resolveDate}
    attendanceHours={resolveAttendance.hours}
    attendanceStatus={resolveAttendance.status}
    onDelete={async (date) => {
      await deleteAttendance(resolveAttendance.id)
      setResolveDate(null)
      setResolveAttendance(null)
    }}
    onDismiss={() => {
      setDismissedDiscrepancies(prev => new Set([...prev, resolveDate + ':attendance_no_lessons']))
      setResolveDate(null)
      setResolveAttendance(null)
    }}
    onClose={() => {
      setResolveDate(null)
      setResolveAttendance(null)
    }}
  />
)}
    </div>
  )
}

// Mark Attendance Modal Component
interface MarkAttendanceModalProps {
  date: string
  kids: any[]
  selectedKid: string
  existingAttendance?: ManualAttendance
  defaultHours?: number
  organizationId: string
  userId: string
  supabaseClient: ReturnType<typeof createBrowserClient>
  onSave: (date: string, status: 'full_day' | 'half_day' | 'no_school', hours: number, notes: string, kidId: string | null) => void
  onClose: () => void
}

function MarkAttendanceModal({ date, kids, selectedKid, existingAttendance, defaultHours, organizationId, userId, supabaseClient, onSave, onClose }: MarkAttendanceModalProps) {
  const [status, setStatus] = useState<'full_day' | 'half_day' | 'no_school'>(existingAttendance?.status || 'full_day')
  const [hours, setHours] = useState(existingAttendance?.hours ?? defaultHours ?? 4)
  const [notes, setNotes] = useState(existingAttendance?.notes || '')
  const [kidId, setKidId] = useState<string | null>(
    existingAttendance?.kid_id || (selectedKid !== 'all' ? selectedKid : null)
  )

  // Portfolio uploads
  const [pendingFiles, setPendingFiles]     = useState<File[]>([])
  const [existingUploads, setExistingUploads] = useState<any[]>([])
  const [uploading, setUploading]           = useState(false)
  const [uploadError, setUploadError]       = useState<string | null>(null)

  useEffect(() => {
    // Load any existing uploads for this date
    const loadUploads = async () => {
      const query = supabaseClient
        .from('portfolio_uploads')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('attendance_date', date)
        .order('created_at', { ascending: true })
      if (kidId) query.eq('kid_id', kidId)
      const { data } = await query
      setExistingUploads(data || [])
    }
    loadUploads()
  }, [date, kidId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const oversized = files.filter(f => f.size > 10 * 1024 * 1024)
    if (oversized.length > 0) {
      setUploadError(`${oversized.map(f => f.name).join(', ')} exceeds the 10 MB limit.`)
      return
    }
    setUploadError(null)
    setPendingFiles(prev => [...prev, ...files].slice(0, 10))
    e.target.value = ''
  }

  const removeFile = (index: number) =>
    setPendingFiles(prev => prev.filter((_, i) => i !== index))

  const deleteExisting = async (upload: any) => {
    await supabaseClient.storage.from('portfolio-uploads').remove([upload.file_path])
    await supabaseClient.from('portfolio_uploads').delete().eq('id', upload.id)
    setExistingUploads(prev => prev.filter(u => u.id !== upload.id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    setUploadError(null)

    // Upload pending files before saving attendance
    for (const file of pendingFiles) {
      const ext  = file.name.split('.').pop()
      const path = `${organizationId}/${kidId || 'all'}/${date}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: storageError } = await supabaseClient.storage
        .from('portfolio-uploads')
        .upload(path, file, { upsert: false })

      if (storageError) {
        setUploadError(`Failed to upload ${file.name}: ${storageError.message}`)
        setUploading(false)
        return
      }

      const { data: { publicUrl } } = supabaseClient.storage
        .from('portfolio-uploads')
        .getPublicUrl(path)

      const { error: insertError } = await supabaseClient.from('portfolio_uploads').insert({
        organization_id: organizationId,
        kid_id:          kidId || null,
        attendance_date: date,
        file_name:       file.name,
        file_url:        publicUrl,
        file_path:       path,
        file_type:       file.type,
        file_size:       file.size,
        uploaded_by:     userId,
      })
      if (insertError) {
        setUploadError(`Failed to save file record: ${insertError.message}`)
        setUploading(false)
        return
      }
    }

    setUploading(false)
    onSave(date, status, hours, notes, kidId)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 overflow-y-auto flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Mark Attendance for {parseLocalDate(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
                    onChange={() => setStatus('full_day')}
                    className="mr-2"
                  />
                  <span className="text-gray-900">Full Day</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="half_day"
                    checked={status === 'half_day'}
                    onChange={() => setStatus('half_day')}
                    className="mr-2"
                  />
                  <span className="text-gray-900">Half Day</span>
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

            {/* Portfolio Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📎 Portfolio Attachments <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Upload work samples, photos, or documents for this day's portfolio. Images and PDFs up to 10 MB each.
              </p>

              {/* Existing uploads */}
              {existingUploads.length > 0 && (
                <div className="mb-2 space-y-1">
                  {existingUploads.map(upload => (
                    <div key={upload.id} className="flex items-center justify-between bg-purple-50 rounded px-3 py-2 text-sm">
                      <a
                        href={upload.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-700 font-medium truncate max-w-[220px] hover:underline"
                      >
                        📄 {upload.file_name}
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteExisting(upload)}
                        className="ml-2 text-red-400 hover:text-red-600 font-bold text-xs flex-shrink-0"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending files */}
              {pendingFiles.length > 0 && (
                <div className="mb-2 space-y-1">
                  {pendingFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between bg-blue-50 rounded px-3 py-2 text-sm">
                      <span className="text-blue-700 font-medium truncate max-w-[220px]">
                        🆕 {file.name} <span className="text-blue-400 font-normal">({(file.size / 1024).toFixed(0)} KB)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="ml-2 text-red-400 hover:text-red-600 font-bold text-xs flex-shrink-0"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* File input */}
              <label className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 cursor-pointer transition-colors">
                <span>+ Add files</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {uploadError && (
                <p className="mt-2 text-xs text-red-500">{uploadError}</p>
              )}
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
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}