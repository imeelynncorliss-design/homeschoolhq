'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import CalendarView from './CalendarView'
import ReconciliationPanel from './ReconciliationPanel'
import AttendanceInsights from './AttendanceInsights'
import ComplianceChecker from './ComplianceChecker'
import AttendanceGoals from './AttendanceGoals'
import PDFExport from './PDFExport'

interface AttendanceTrackerProps {
  kids: any[]
  organizationId: string
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
  organizationName = 'My Homeschool',
  schoolYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  state = 'NC'
}: AttendanceTrackerProps) {
  const [lessons, setLessons] = useState<LessonData[]>([])
  const [manualAttendance, setManualAttendance] = useState<ManualAttendance[]>([])
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

  useEffect(() => {
    loadData()
    loadDismissedSuggestions()
  }, [])

  useEffect(() => {
    groupByMonth()
  }, [lessons, manualAttendance, selectedKid, startDateFilter, endDateFilter, searchTerm])

  function loadDismissedSuggestions() {
    const dismissed = localStorage.getItem('dismissed_attendance_suggestions')
    if (dismissed) {
      setDismissedSuggestions(new Set(JSON.parse(dismissed)))
    }
  }

  function saveDismissedSuggestions(dismissed: Set<string>) {
    localStorage.setItem('dismissed_attendance_suggestions', JSON.stringify(Array.from(dismissed)))
    setDismissedSuggestions(dismissed)
  }

  async function loadData() {
    setLoading(true)
    try {
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .not('lesson_date', 'is', null)
        .order('lesson_date', { ascending: false })

      if (lessonsError) throw lessonsError

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('organization_id', organizationId)
        .order('attendance_date', { ascending: false })

      if (attendanceError) throw attendanceError

      setLessons(lessonsData || [])
      setManualAttendance(attendanceData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function groupByMonth() {
    const allDates = new Set<string>()
    lessons.forEach(l => allDates.add(l.lesson_date))
    manualAttendance.forEach(a => allDates.add(a.attendance_date))

    const daysData: DayData[] = Array.from(allDates).map(date => {
      let dateLessons = lessons.filter(l => l.lesson_date === date)
      if (selectedKid !== 'all') {
        dateLessons = dateLessons.filter(l => l.kid_id === selectedKid)
      }

      const lessonMinutes = dateLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
      const lessonHours = lessonMinutes / 60

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

    return Array.from(allDates).map(date => {
      let dateLessons = lessons.filter(l => l.lesson_date === date)
      if (selectedKid !== 'all') {
        dateLessons = dateLessons.filter(l => l.kid_id === selectedKid)
      }

      const lessonMinutes = dateLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
      const lessonHours = lessonMinutes / 60

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
        manualAttendance: dateAttendance,
        isSchoolDay,
        totalHours,
        isCurrentMonth,
        isToday
      }
    })
  }, [lessons, manualAttendance, selectedKid, calendarYear, calendarMonth])

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
      )

      if (existing) {
        const { error } = await supabase
          .from('daily_attendance')
          .update({
            status,
            hours,
            notes: notes || null,
            auto_generated: false
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        const { error } = await supabase
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

        if (error) throw error
      }

      await loadData()
      setShowMarkModal(false)
    } catch (error) {
      console.error('Error marking attendance:', error)
      alert('Failed to save attendance. Please try again.')
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
        <button
          onClick={() => {
            setMarkingDate(new Date().toISOString().split('T')[0])
            setShowMarkModal(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          ✓ Mark Today
        </button>
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
                  onDayClick={(date) => {
                    setMarkingDate(date)
                    setShowMarkModal(true)
                  }}
                  onMonthChange={(year, month) => {
                    setCalendarYear(year)
                    setCalendarMonth(month)
                  }}
                />
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">School Days Log</h3>

                  {monthGroups.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No attendance records found</p>
                  ) : (
                    <div className="space-y-2">
                      {monthGroups.map((group, index) => (
                        <div key={`${group.month}-${group.year}`} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleMonth(index)}
                            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-gray-900 text-lg">
                                {group.isExpanded ? '▼' : '▶'}
                              </span>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {group.month} {group.year}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {group.totalDays} school days • {group.totalHours.toFixed(1)} hours
                                </p>
                              </div>
                            </div>
                          </button>

                          {group.isExpanded && (
                            <div className="divide-y divide-gray-100">
                              {group.days
                                .sort((a, b) => a.date.localeCompare(b.date))
                                .reduce((acc: { date: string; lessons: DayData[] }[], day) => {
                                  const existing = acc.find(item => item.date === day.date)
                                  if (existing) {
                                    existing.lessons.push(day)
                                  } else {
                                    acc.push({ date: day.date, lessons: [day] })
                                  }
                                  return acc
                                }, [])
                                .map(({ date, lessons: dayLessons }) => {
                                  const day = dayLessons[0]

                                  return (
                                    <div key={date} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900">
                                              {new Date(date).toLocaleDateString('en-US', { 
                                                weekday: 'short', 
                                                month: 'short', 
                                                day: 'numeric', 
                                                year: 'numeric' 
                                              })}
                                            </p>
                                            {day.manualAttendance && (
                                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                                                {day.manualAttendance.status === 'full_day' ? 'Full Day' : 
                                                 day.manualAttendance.status === 'half_day' ? 'Half Day' : 'No School'}
                                              </span>
                                            )}
                                            {!day.manualAttendance && day.lessonCount > 0 && (
                                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                                                Auto (from lessons)
                                              </span>
                                            )}
                                          </div>
                                          <div className="mt-1 text-sm text-gray-600">
                                            {day.lessonCount > 0 && (
                                              <span>{day.lessonCount} lesson{day.lessonCount !== 1 ? 's' : ''}</span>
                                            )}
                                            {day.manualAttendance?.notes && (
                                              <p className="text-xs text-gray-500 mt-1 italic">{day.manualAttendance.notes}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="text-right">
                                            <p className="font-semibold text-gray-900">{day.totalHours.toFixed(1)} hours</p>
                                            {day.lessonHours > 0 && day.manualAttendance && day.lessonHours !== day.totalHours && (
                                              <p className="text-xs text-gray-500">({day.lessonHours.toFixed(1)}h from lessons)</p>
                                            )}
                                          </div>
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => {
                                                setMarkingDate(day.date)
                                                setShowMarkModal(true)
                                              }}
                                              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
                                              title="Edit"
                                            >
                                              ✎
                                            </button>
                                            {day.manualAttendance && (
                                              <button
                                                onClick={() => deleteAttendance(day.manualAttendance!.id)}
                                                className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
                                                title="Delete manual attendance"
                                              >
                                                ✕
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
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

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <AttendanceInsights
              days={allDays}
              requiredDays={stats.required}
            />
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <AttendanceGoals
              totalDays={stats.totalDays}
              totalHours={stats.totalHoursNumber}
              organizationId={organizationId}
              onGoalsUpdate={loadData}
            />
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <ComplianceChecker
              totalDays={stats.totalDays}
              totalHours={stats.totalHoursNumber}
              requiredDays={stats.required}
              state={state}
            />
          )}

          {/* Reports Tab */}
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
    </div>
  )
}

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
  const [applyToKid, setApplyToKid] = useState<string>(
    existingAttendance?.kid_id || (selectedKid !== 'all' ? selectedKid : 'family')
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(
      date, 
      status, 
      hours, 
      notes, 
      applyToKid === 'family' ? null : applyToKid
    )
  }

  useEffect(() => {
    if (status === 'full_day' && !existingAttendance) {
      setHours(4)
    } else if (status === 'half_day' && !existingAttendance) {
      setHours(2)
    } else if (status === 'no_school') {
      setHours(0)
    }
  }, [status])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Mark Attendance</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {}}
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-gray-50"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apply To</label>
            <select
              value={applyToKid}
              onChange={(e) => setApplyToKid(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
            >
              <option value="family">Whole Family</option>
              {kids.map(kid => (
                <option key={kid.id} value={kid.id}>{kid.displayname}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Day Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('full_day')}
                className={`px-3 py-2 rounded font-medium transition-colors ${
                  status === 'full_day'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Full Day
              </button>
              <button
                type="button"
                onClick={() => setStatus('half_day')}
                className={`px-3 py-2 rounded font-medium transition-colors ${
                  status === 'half_day'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Half Day
              </button>
              <button
                type="button"
                onClick={() => setStatus('no_school')}
                className={`px-3 py-2 rounded font-medium transition-colors ${
                  status === 'no_school'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                No School
              </button>
            </div>
          </div>

          {status !== 'no_school' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hours <span className="text-gray-500 text-xs">(instructional time)</span>
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(parseFloat(e.target.value))}
                  step="0.5"
                  min="0"
                  max="12"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-900"
                />
                <div className="flex gap-1">
                  {[2, 4, 6].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(h)}
                      className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Field trip, sick day, project day..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Save Attendance
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}