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

interface ManualAttendance {
  id: string
  organization_id: string
  attendance_date: string
  kid_id: string | null
  status: 'full_day' | 'half_day' | 'no_school'
  hours: number
  notes: string | null
  auto_generated: boolean
}

interface DayData {
  date: string
  lessonHours: number
  lessonCount: number
  manualAttendance?: ManualAttendance
  isSchoolDay: boolean
  totalHours: number
}

interface MonthGroup {
  month: string
  year: number
  days: DayData[]
  totalDays: number
  totalHours: number
  isExpanded: boolean
}

export default function AttendanceTracker({ kids, organizationId }: AttendanceTrackerProps) {
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

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    groupByMonth()
  }, [lessons, manualAttendance, selectedKid, startDateFilter, endDateFilter, searchTerm])

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

      setLessons(lessonsData || [])
      setManualAttendance(attendanceData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function groupByMonth() {
    // Get all unique dates from both lessons and manual attendance
    const allDates = new Set<string>()
    
    lessons.forEach(l => allDates.add(l.lesson_date))
    manualAttendance.forEach(a => allDates.add(a.attendance_date))

    // Convert to array and create day data for each date
    const daysData: DayData[] = Array.from(allDates).map(date => {
      // Get lessons for this date
      let dateLessons = lessons.filter(l => l.lesson_date === date)
      
      // Filter by kid if selected
      if (selectedKid !== 'all') {
        dateLessons = dateLessons.filter(l => l.kid_id === selectedKid)
      }

      const lessonMinutes = dateLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
      const lessonHours = lessonMinutes / 60

      // Get manual attendance for this date
      let dateAttendance = manualAttendance.find(a => a.attendance_date === date)
      
      // Filter by kid if selected
      if (selectedKid !== 'all' && dateAttendance) {
        if (dateAttendance.kid_id !== selectedKid && dateAttendance.kid_id !== null) {
          dateAttendance = undefined
        }
      }

      // Determine if this is a school day and total hours
      let isSchoolDay = false
      let totalHours = 0

      if (dateAttendance) {
        // Manual attendance takes precedence
        isSchoolDay = dateAttendance.status !== 'no_school'
        totalHours = dateAttendance.hours
      } else if (lessonHours > 0) {
        // No manual attendance, but has lessons
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

    // Filter by date range
    let filtered = daysData
    if (startDateFilter) {
      filtered = filtered.filter(d => d.date >= startDateFilter)
    }
    if (endDateFilter) {
      filtered = filtered.filter(d => d.date <= endDateFilter)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.date.includes(searchTerm) ||
        new Date(d.date).toLocaleDateString().includes(searchTerm)
      )
    }

    // Group by month
    const groups: { [key: string]: DayData[] } = {}
    filtered.forEach(day => {
      const date = new Date(day.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(day)
    })

    // Convert to array with metadata
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
      // Check if attendance already exists for this date
      const existing = manualAttendance.find(a => 
        a.attendance_date === date && 
        (kidId === null ? a.kid_id === null : a.kid_id === kidId)
      )

      if (existing) {
        // Update existing
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
        // Insert new
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

      // Reload data
      await loadData()
      setShowMarkModal(false)
    } catch (error) {
      console.error('Error marking attendance:', error)
      alert('Failed to save attendance. Please try again.')
    }
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

  // Calculate overall stats
  const stats = useMemo(() => {
    let filtered = monthGroups.flatMap(g => g.days)

    const totalDays = filtered.filter(d => d.isSchoolDay).length
    const totalHours = filtered.reduce((sum, d) => sum + d.totalHours, 0)
    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0

    return {
      totalDays,
      totalHours: totalHours.toFixed(1),
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
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

      {/* School Days Log */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">School Days Log</h3>

        {monthGroups.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No attendance records found</p>
        ) : (
          <div className="space-y-2">
            {monthGroups.map((group, index) => (
              <div key={`${group.month}-${group.year}`} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Month Header */}
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

                {/* Month Content */}
                {group.isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {group.days.map((day) => (
                      <div key={day.date} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">
                                {new Date(day.date).toLocaleDateString('en-US', { 
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
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

      {/* Reports & Export */}
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

  // Quick hour presets based on status
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
          {/* Date Display */}
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

          {/* Apply To */}
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

          {/* Status - Button Group */}
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

          {/* Hours */}
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

          {/* Notes */}
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

          {/* Action Buttons */}
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