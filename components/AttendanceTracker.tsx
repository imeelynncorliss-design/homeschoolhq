'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface AttendanceDay {
  id: string
  kid_id: string
  date: string
  is_school_day: boolean
  total_minutes: number
  notes?: string
}

interface AttendanceTrackerProps {
  kids: any[]
}

export default function AttendanceTracker({ kids }: AttendanceTrackerProps) {
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  
  // ✅ FIXED: Detect current school year (Aug-Jun)
  const getCurrentSchoolYear = () => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() // 0-11 (Jan=0, Aug=7)
    
    // If we're in Aug-Dec, school year is currentYear-nextYear
    // If we're in Jan-Jul, school year is previousYear-currentYear
    return currentMonth >= 7 ? currentYear : currentYear - 1
  }
  
  const [selectedYear, setSelectedYear] = useState(getCurrentSchoolYear())
  const [attendanceData, setAttendanceData] = useState<AttendanceDay[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddDay, setShowAddDay] = useState(false)
  const [newDayDate, setNewDayDate] = useState(new Date().toISOString().split('T')[0])
  const [newDayNotes, setNewDayNotes] = useState('')
  
  // ✅ NEW: Load school year config from database
  const [schoolYearStart, setSchoolYearStart] = useState<string>('')
  const [schoolYearEnd, setSchoolYearEnd] = useState<string>('')

  // ✅ NEW: Load school year configuration
  useEffect(() => {
    loadSchoolYearConfig()
  }, [selectedYear])

  const loadSchoolYearConfig = async () => {
    // Try to load custom school year config from database
    const { data } = await supabase
      .from('school_year_config')
      .select('start_date, end_date')
      .eq('year', selectedYear)
      .single()
    
    if (data && data.start_date && data.end_date) {
      // Use custom configured dates
      setSchoolYearStart(data.start_date)
      setSchoolYearEnd(data.end_date)
    } else {
      // Fall back to default Aug-Jun
      setSchoolYearStart(`${selectedYear}-08-01`)
      setSchoolYearEnd(`${selectedYear + 1}-06-30`)
    }
  }

  useEffect(() => {
    if (selectedKid && schoolYearStart && schoolYearEnd) {
      loadAttendance()
    }
  }, [selectedKid, selectedYear, schoolYearStart, schoolYearEnd])

  const loadAttendance = async () => {
    if (!selectedKid) return
    setLoading(true)

    // Get all lessons with dates for this kid in the school year
    const { data: lessons } = await supabase
      .from('lessons')
      .select('*')
      .eq('kid_id', selectedKid)
      .gte('lesson_date', schoolYearStart)
      .lte('lesson_date', schoolYearEnd)
      .not('lesson_date', 'is', null)
      .order('lesson_date', { ascending: true })

    if (lessons) {
      // Group lessons by date and calculate total minutes per day
      const dayMap = new Map<string, { minutes: number; lessons: any[] }>()
      
      lessons.forEach(lesson => {
        const date = lesson.lesson_date.split('T')[0]
        if (!dayMap.has(date)) {
          dayMap.set(date, { minutes: 0, lessons: [] })
        }
        const day = dayMap.get(date)!
        day.minutes += lesson.duration_minutes || 0
        day.lessons.push(lesson)
      })

      // Convert to attendance array
      const attendance: AttendanceDay[] = Array.from(dayMap.entries()).map(([date, data]) => ({
        id: date,
        kid_id: selectedKid,
        date,
        is_school_day: true,
        total_minutes: data.minutes,
        notes: `${data.lessons.length} lesson(s) scheduled`
      }))

      setAttendanceData(attendance)
    }

    setLoading(false)
  }

  const addSchoolDay = async () => {
    if (!selectedKid || !newDayDate) return

    // Check if this date already exists
    const existing = attendanceData.find(d => d.date === newDayDate)
    if (existing) {
      alert('This date already has lessons scheduled!')
      return
    }

    // Add a placeholder lesson for this day
    const { error } = await supabase
      .from('lessons')
      .insert([{
        kid_id: selectedKid,
        subject: 'Attendance',
        title: 'School Day',
        description: newDayNotes || 'Manual attendance entry',
        lesson_date: newDayDate,
        duration_minutes: 360, // 6 hours default
        status: 'completed'
      }])

    if (!error) {
      setShowAddDay(false)
      setNewDayDate(new Date().toISOString().split('T')[0])
      setNewDayNotes('')
      loadAttendance()
    }
  }

  const calculateStats = () => {
    const totalDays = attendanceData.length
    const totalHours = attendanceData.reduce((sum, day) => sum + day.total_minutes, 0) / 60
    const requiredDays = 180 // Most states require 180 days
    const percentComplete = totalDays > 0 ? Math.round((totalDays / requiredDays) * 100) : 0

    return { totalDays, totalHours, requiredDays, percentComplete }
  }

  const stats = calculateStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Tracking</h2>
          <p className="text-sm text-gray-600">Track school days and hours for compliance and transcripts</p>
        </div>
        <button
          onClick={() => setShowAddDay(!showAddDay)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add School Day
        </button>
      </div>

      {/* Child & Year Selector */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
          <select
            value={selectedKid || ''}
            onChange={(e) => setSelectedKid(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-gray-900"
          >
            <option value="">Choose a child...</option>
            {kids.map(kid => (
              <option key={kid.id} value={kid.id}>{kid.displayname}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">School Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 text-gray-900"
          >
            <option value={2023}>2023-2024</option>
            <option value={2024}>2024-2025</option>
            <option value={2025}>2025-2026</option>
            <option value={2026}>2026-2027</option>
            <option value={2027}>2027-2028</option>
          </select>
          {selectedYear === getCurrentSchoolYear() && (
            <p className="text-xs text-blue-600 mt-1">Current school year</p>
          )}
          {schoolYearStart && schoolYearEnd && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(schoolYearStart).toLocaleDateString()} - {new Date(schoolYearEnd).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* ✅ NEW: Show configured school year dates */}
      {schoolYearStart && schoolYearEnd && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="text-gray-700">
            📅 Tracking attendance from <strong>{new Date(schoolYearStart).toLocaleDateString()}</strong> to <strong>{new Date(schoolYearEnd).toLocaleDateString()}</strong>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Configure custom school year dates in the School Year tab
          </p>
        </div>
      )}

      {/* Add School Day Form */}
      {showAddDay && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Add School Day</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={newDayDate}
                onChange={(e) => setNewDayDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={newDayNotes}
                onChange={(e) => setNewDayNotes(e.target.value)}
                placeholder="e.g., Field trip to museum"
                className="w-full border rounded px-3 py-2 text-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addSchoolDay}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Day
              </button>
              <button
                onClick={() => setShowAddDay(false)}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedKid ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-600">School Days</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalDays}</div>
              <div className="text-xs text-gray-500">of {stats.requiredDays} required</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-600">Total Hours</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}</div>
              <div className="text-xs text-gray-500">instructional time</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-600">Completion</div>
              <div className="text-3xl font-bold text-gray-900">{stats.percentComplete}%</div>
              <div className="text-xs text-gray-500">of school year</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-600">Avg Hours/Day</div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.totalDays > 0 ? (stats.totalHours / stats.totalDays).toFixed(1) : '0'}
              </div>
              <div className="text-xs text-gray-500">per school day</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress to {stats.requiredDays} days</span>
              <span>{stats.totalDays} days completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  stats.percentComplete >= 100 ? 'bg-green-600' :
                  stats.percentComplete >= 75 ? 'bg-blue-600' :
                  stats.percentComplete >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(stats.percentComplete, 100)}%` }}
              />
            </div>
          </div>

          {/* Attendance Calendar */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">School Days Log</h3>
            {loading ? (
              <p className="text-gray-600">Loading...</p>
            ) : attendanceData.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-gray-600">No school days recorded yet</p>
                <p className="text-sm text-gray-500 mt-1">Schedule lessons or manually add school days to start tracking</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {attendanceData.map(day => (
                  <div key={day.id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100">
                    <div>
                      <div className="font-medium text-gray-900">
                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      {day.notes && (
                        <div className="text-sm text-gray-600">{day.notes}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {(day.total_minutes / 60).toFixed(1)} hours
                      </div>
                      <div className="text-xs text-gray-500">
                        {day.total_minutes} minutes
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export Options */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reports & Export</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  const csv = `Date,Hours,Notes\n${attendanceData.map(d => 
                    `${d.date},${(d.total_minutes/60).toFixed(1)},"${d.notes || ''}"`
                  ).join('\n')}`
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `attendance-${kids.find(k => k.id === selectedKid)?.displayname}-${selectedYear}.csv`
                  a.click()
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                📊 Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                🖨️ Print Report
              </button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                title="Coming soon with Transcripts"
              >
                📄 Add to Transcript
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-3">👨‍🎓</div>
          <p className="text-gray-600">Select a child to view their attendance</p>
        </div>
      )}
    </div>
  )
}