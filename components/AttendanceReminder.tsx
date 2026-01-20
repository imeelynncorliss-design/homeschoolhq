'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface AttendanceReminderProps {
  onTakeAttendance: () => void
  kids: any[]
  organizationId: string
}

export default function AttendanceReminder({ onTakeAttendance, kids, organizationId }: AttendanceReminderProps) {
  const [showReminder, setShowReminder] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkIfShouldShowReminder()
  }, [kids, organizationId])

  const checkIfShouldShowReminder = async () => {
    if (kids.length === 0 || !organizationId) {
      setIsChecking(false)
      return
    }

    // Check if dismissed today
    const dismissedDate = localStorage.getItem('attendance_reminder_dismissed')
    const today = new Date().toISOString().split('T')[0]
    
    if (dismissedDate === today) {
      setIsChecking(false)
      return
    }

    // Check if it's a weekday (Monday = 1, Friday = 5)
    const dayOfWeek = new Date().getDay()
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

    if (!isWeekday) {
      setIsChecking(false)
      return
    }

    // Check if attendance has been marked today for this organization
    const { data: attendanceRecords } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('attendance_date', today)

    const hasMarkedAttendance = attendanceRecords && attendanceRecords.length > 0

    if (!hasMarkedAttendance) {
      setShowReminder(true)
    }

    setIsChecking(false)
  }

  const handleDismiss = () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('attendance_reminder_dismissed', today)
    setShowReminder(false)
  }

  const handleTakeAttendance = () => {
    handleDismiss()
    onTakeAttendance()
  }

  if (isChecking || !showReminder) return null

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-5 mb-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 text-4xl animate-bounce">
          📋
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            Don't forget to take attendance today!
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            Track your school days and hours to stay organized and meet state requirements.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleTakeAttendance}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm transition-all active:scale-95"
            >
              ✓ Mark Attendance Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm border border-gray-300 transition-all"
            >
              Remind Me Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-2xl leading-none"
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}