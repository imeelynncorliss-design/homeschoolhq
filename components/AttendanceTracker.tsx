'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface AttendanceTrackerProps {
  kids: any[]
  organizationId: string 
}

interface LessonData {
  id: string
  lesson_date: string
  duration_minutes: number
  kid_id: string
  completed: boolean
}

interface MonthGroup {
  month: string
  year: number
  lessons: LessonData[]
  totalDays: number
  totalHours: number
  isExpanded: boolean
}

export default function AttendanceTracker({ kids }: AttendanceTrackerProps) {
  const [lessons, setLessons] = useState<LessonData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKid, setSelectedKid] = useState<string>('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadLessons()
  }, [])

  useEffect(() => {
    groupLessonsByMonth()
  }, [lessons, selectedKid, startDateFilter, endDateFilter, searchTerm])

  async function loadLessons() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .not('lesson_date', 'is', null)
        .order('lesson_date', { ascending: false })

      if (error) throw error
      setLessons(data || [])
    } catch (error) {
      console.error('Error loading lessons:', error)
    } finally {
      setLoading(false)
    }
  }

  function groupLessonsByMonth() {
    // Filter lessons
    let filtered = lessons

    // Filter by kid
    if (selectedKid !== 'all') {
      filtered = filtered.filter(l => l.kid_id === selectedKid)
    }

    // Filter by date range
    if (startDateFilter) {
      filtered = filtered.filter(l => l.lesson_date >= startDateFilter)
    }
    if (endDateFilter) {
      filtered = filtered.filter(l => l.lesson_date <= endDateFilter)
    }

    // Filter by search term (date search)
    if (searchTerm) {
      filtered = filtered.filter(l => 
        l.lesson_date.includes(searchTerm) ||
        new Date(l.lesson_date).toLocaleDateString().includes(searchTerm)
      )
    }

    // Group by month
    const groups: { [key: string]: LessonData[] } = {}
    filtered.forEach(lesson => {
      const date = new Date(lesson.lesson_date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(lesson)
    })

    // Convert to array with metadata
    const currentMonth = new Date().toISOString().slice(0, 7)
    const monthGroupsArray: MonthGroup[] = Object.keys(groups)
      .sort((a, b) => b.localeCompare(a)) // Newest first
      .map(key => {
        const [year, month] = key.split('-')
        const monthLessons = groups[key]
        
        // Count unique dates for total days
        const uniqueDates = new Set(monthLessons.map(l => l.lesson_date))
        const totalDays = uniqueDates.size
        
        // Sum hours
        const totalMinutes = monthLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
        const totalHours = totalMinutes / 60

        return {
          month: new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' }),
          year: parseInt(year),
          lessons: monthLessons,
          totalDays,
          totalHours,
          isExpanded: key === currentMonth // Expand current month by default
        }
      })

    setMonthGroups(monthGroupsArray)
  }

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

  // Calculate overall stats
  const stats = useMemo(() => {
    let filtered = lessons
    if (selectedKid !== 'all') {
      filtered = filtered.filter(l => l.kid_id === selectedKid)
    }
    if (startDateFilter) {
      filtered = filtered.filter(l => l.lesson_date >= startDateFilter)
    }
    if (endDateFilter) {
      filtered = filtered.filter(l => l.lesson_date <= endDateFilter)
    }

    const uniqueDates = new Set(filtered.map(l => l.lesson_date))
    const totalDays = uniqueDates.size
    const totalMinutes = filtered.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
    const totalHours = totalMinutes / 60
    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0

    return {
      totalDays,
      totalHours: totalHours.toFixed(1),
      avgHoursPerDay: avgHoursPerDay.toFixed(1),
      completion: 9, // This would come from school year settings
      required: 180
    }
  }, [lessons, selectedKid, startDateFilter, endDateFilter])

  if (loading) {
    return <div className="text-center py-8 text-gray-900">Loading attendance data...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Attendance Tracking</h2>
        <p className="text-gray-600">Track school days and instructional hours</p>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters & Search</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
          {/* Kid Filter */}
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

          {/* Date Range */}
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

          {/* Search */}
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

      {/* School Days Log - Grouped by Month */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">School Days Log</h3>

        {monthGroups.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No attendance records found</p>
        ) : (
          <div className="space-y-2">
            {monthGroups.map((group, index) => (
              <div key={`${group.month}-${group.year}`} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Month Header - Clickable */}
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
                        {group.totalDays} days • {group.totalHours.toFixed(1)} hours
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {group.lessons.length} lesson{group.lessons.length !== 1 ? 's' : ''}
                  </div>
                </button>

                {/* Month Content - Collapsible */}
                {group.isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {group.lessons
                      .sort((a, b) => a.lesson_date.localeCompare(b.lesson_date))
                      .reduce((acc: { date: string; lessons: LessonData[] }[], lesson) => {
                        const existing = acc.find(item => item.date === lesson.lesson_date)
                        if (existing) {
                          existing.lessons.push(lesson)
                        } else {
                          acc.push({ date: lesson.lesson_date, lessons: [lesson] })
                        }
                        return acc
                      }, [])
                      .map(({ date, lessons: dayLessons }) => {
                        const totalMinutes = dayLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
                        const totalHours = totalMinutes / 60

                        return (
                          <div key={date} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {new Date(date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {dayLessons.length} lesson{dayLessons.length !== 1 ? 's' : ''} scheduled
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{totalHours.toFixed(1)} hours</p>
                                <p className="text-xs text-gray-500">{totalMinutes} minutes</p>
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

      {/* Reports & Export placeholder */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports & Export</h3>
        <p className="text-sm text-gray-600 mb-4">
          Generate attendance reports for state compliance
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          📄 Export to PDF
        </button>
      </div>
    </div>
  )
}