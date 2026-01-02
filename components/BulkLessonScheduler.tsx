'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import moment from 'moment'

interface BulkLessonSchedulerProps {
  userId: string
}

interface Child {
  id: string
  displayname: string
}

interface Lesson {
  id: string
  kid_id: string
  title: string
  subject: string
  lesson_date: string | null
  duration_minutes: number | null
}

export default function BulkLessonScheduler({ userId }: BulkLessonSchedulerProps) {
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<Child[]>([])
  const [selectedKid, setSelectedKid] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [unscheduledLessons, setUnscheduledLessons] = useState<Lesson[]>([])
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set())
  const [scheduleMode, setScheduleMode] = useState<'sequential' | 'weekly'>('sequential')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [daysPerWeek, setDaysPerWeek] = useState(5)
  const [lessonsPerDay, setLessonsPerDay] = useState(1)
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    loadData()
  }, [userId])

  useEffect(() => {
    if (selectedKid) {
      loadUnscheduledLessons()
    }
  }, [selectedKid, selectedSubject])

  const loadData = async () => {
    const { data: kidsData } = await supabase
      .from('kids')
      .select('id, displayname')
      .eq('user_id', userId)
      .order('displayname')

    if (kidsData) {
      setKids(kidsData)
      if (kidsData.length > 0) {
        setSelectedKid(kidsData[0].id)
      }
    }
    setLoading(false)
  }

  const loadUnscheduledLessons = async () => {
    let query = supabase
      .from('lessons')
      .select('*')
      .eq('kid_id', selectedKid)
      .is('lesson_date', null)
      .order('subject')
      .order('title')

    if (selectedSubject) {
      query = query.eq('subject', selectedSubject)
    }

    const { data } = await query

    if (data) {
      setUnscheduledLessons(data)
      
      // Get unique subjects
      const uniqueSubjects = [...new Set(data.map(l => l.subject))]
      setSubjects(uniqueSubjects)
    }
  }

  const toggleLessonSelect = (lessonId: string) => {
    const newSelected = new Set(selectedLessons)
    if (newSelected.has(lessonId)) {
      newSelected.delete(lessonId)
    } else {
      newSelected.add(lessonId)
    }
    setSelectedLessons(newSelected)
  }

  const selectAll = () => {
    setSelectedLessons(new Set(unscheduledLessons.map(l => l.id)))
  }

  const deselectAll = () => {
    setSelectedLessons(new Set())
  }

  const bulkSchedule = async () => {
    if (selectedLessons.size === 0) {
      alert('Please select at least one lesson')
      return
    }

    setScheduling(true)

    // Get selected lessons in order
    const lessonsToSchedule = unscheduledLessons.filter(l => selectedLessons.has(l.id))
    
    let currentDate = moment(startDate)
    let lessonCount = 0

    for (const lesson of lessonsToSchedule) {
      // Skip weekends if using weekly mode
      if (scheduleMode === 'weekly') {
        while (currentDate.day() === 0 || currentDate.day() === 6) {
          currentDate.add(1, 'day')
        }
      }

      await supabase
        .from('lessons')
        .update({ lesson_date: currentDate.format('YYYY-MM-DD') })
        .eq('id', lesson.id)

      lessonCount++

      // Move to next date based on mode
      if (scheduleMode === 'sequential') {
        currentDate.add(1, 'day')
      } else if (scheduleMode === 'weekly') {
        // Check if we've hit the daily limit
        if (lessonCount % lessonsPerDay === 0) {
          currentDate.add(1, 'day')
          // Skip weekends
          while (currentDate.day() === 0 || currentDate.day() === 6) {
            currentDate.add(1, 'day')
          }
        }
      }
    }

    alert(`Scheduled ${selectedLessons.size} lessons successfully!`)
    setSelectedLessons(new Set())
    loadUnscheduledLessons()
    setScheduling(false)
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bulk Lesson Scheduler</h2>
        <p className="text-gray-600">Quickly assign dates to imported lessons from curriculum</p>
      </div>

      {/* Selection Controls */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-4">Select Lessons</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Child
            </label>
            <select
              value={selectedKid}
              onChange={(e) => {
                setSelectedKid(e.target.value)
                setSelectedSubject('')
                setSelectedLessons(new Set())
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            >
              {kids.map(kid => (
                <option key={kid.id} value={kid.id}>{kid.displayname}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject (optional)
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scheduling Options */}
      <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
        <h3 className="font-semibold text-gray-900 mb-4">Scheduling Options</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Schedule Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Schedule Mode
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-white transition-colors"
                style={{ borderColor: scheduleMode === 'sequential' ? '#9333ea' : '#d1d5db' }}>
                <input
                  type="radio"
                  value="sequential"
                  checked={scheduleMode === 'sequential'}
                  onChange={(e) => setScheduleMode(e.target.value as 'sequential')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">Sequential (Daily)</div>
                  <div className="text-xs text-gray-600">One lesson per day, consecutive days</div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-white transition-colors"
                style={{ borderColor: scheduleMode === 'weekly' ? '#9333ea' : '#d1d5db' }}>
                <input
                  type="radio"
                  value="weekly"
                  checked={scheduleMode === 'weekly'}
                  onChange={(e) => setScheduleMode(e.target.value as 'weekly')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">Weekly Schedule</div>
                  <div className="text-xs text-gray-600">Skip weekends, customize lessons per day</div>
                </div>
              </label>
            </div>
          </div>

          {/* Date Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>

            {scheduleMode === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lessons Per Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={lessonsPerDay}
                  onChange={(e) => setLessonsPerDay(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unscheduled Lessons */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">
            Unscheduled Lessons ({unscheduledLessons.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Deselect All
            </button>
          </div>
        </div>

        {unscheduledLessons.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Lessons Scheduled!</h3>
            <p className="text-gray-600">No unscheduled lessons found for this selection</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y max-h-96 overflow-y-auto">
            {unscheduledLessons.map(lesson => (
              <label
                key={lesson.id}
                className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedLessons.has(lesson.id)}
                  onChange={() => toggleLessonSelect(lesson.id)}
                  className="mr-3 w-5 h-5"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{lesson.title}</div>
                  <div className="text-sm text-gray-600">
                    {lesson.subject}
                    {lesson.duration_minutes && ` • ${lesson.duration_minutes} min`}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Button */}
      {selectedLessons.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Ready to schedule {selectedLessons.size} lessons</p>
              <p className="text-sm text-gray-600">
                Starting {moment(startDate).format('MMM D, YYYY')} using {scheduleMode} mode
              </p>
            </div>
            <button
              onClick={bulkSchedule}
              disabled={scheduling}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-green-400"
            >
              {scheduling ? 'Scheduling...' : `Schedule ${selectedLessons.size} Lessons`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}