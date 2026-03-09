'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

/**
 * useAttendanceStats
 *
 * Single source of truth for school day / hour counts.
 * Used by both AttendanceTracker and ProgressDashboard so numbers
 * are always identical across routes.
 *
 * Counting rules (agreed 2026-03-08):
 *  - A day is "confirmed" if it has a daily_attendance row with
 *    status = 'full_day' | 'half_day'.
 *  - A day is "lesson-inferred" if it has lessons but NO attendance row.
 *  - Both types contribute to totalDays and totalHours.
 *  - The UI should surface the split so parents know what's confirmed.
 */

export interface DayStats {
  date: string
  confirmedHours: number      // from daily_attendance
  lessonHours: number         // from lessons (may overlap confirmed days)
  totalHours: number          // confirmedHours if confirmed, else lessonHours
  isConfirmed: boolean        // has a daily_attendance record
  isLessonInferred: boolean   // lesson-only day (no attendance record)
  isSchoolDay: boolean        // either confirmed OR lesson-inferred
}

export interface AttendanceStats {
  totalDays: number           // confirmed + lesson-inferred
  confirmedDays: number       // daily_attendance rows only
  lessonInferredDays: number  // lesson-only days
  totalHours: number
  confirmedHours: number
  lessonHours: number
  avgHoursPerDay: number
  completion: number          // percentage of requiredDays
  requiredDays: number
  days: DayStats[]
  loading: boolean
}

interface UseAttendanceStatsOptions {
  organizationId: string
  userId: string
  kidId?: string              // 'all' or a specific kid id
  startDate?: string
  endDate?: string
  requiredDays?: number
}

export function useAttendanceStats({
  organizationId,
  userId,
  kidId = 'all',
  startDate,
  endDate,
  requiredDays = 180,
}: UseAttendanceStatsOptions): AttendanceStats {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  const [loading, setLoading] = useState(true)
  const [attendanceRows, setAttendanceRows] = useState<any[]>([])
  const [lessonRows, setLessonRows] = useState<any[]>([])

  useEffect(() => {
    if (!organizationId || !userId) return
    load()
  }, [organizationId, userId, kidId, startDate, endDate])

  async function load() {
    setLoading(true)
    try {
      // ── Attendance ──────────────────────────────────────────────
      let attendanceQuery = supabase
        .from('daily_attendance')
        .select('id, attendance_date, status, hours, kid_id')
        .eq('organization_id', organizationId)
        .in('status', ['full_day', 'half_day'])

      if (startDate) attendanceQuery = attendanceQuery.gte('attendance_date', startDate)
      if (endDate)   attendanceQuery = attendanceQuery.lte('attendance_date', endDate)

      const { data: attendance } = await attendanceQuery
      setAttendanceRows(attendance || [])

      // ── Lessons ─────────────────────────────────────────────────
      let lessonQuery = supabase
        .from('lessons')
        .select('id, lesson_date, duration_minutes, kid_id')
        .not('lesson_date', 'is', null)

      // Scope to org via kid_id list
      const { data: kidsData } = await supabase
        .from('kids')
        .select('id')
        .eq('organization_id', organizationId)

      const allKidIds = (kidsData || []).map((k: any) => k.id)
      if (allKidIds.length === 0) {
        setLessonRows([])
        setLoading(false)
        return
      }

      if (kidId !== 'all') {
        lessonQuery = lessonQuery.eq('kid_id', kidId)
      } else {
        lessonQuery = lessonQuery.in('kid_id', allKidIds)
      }

      if (startDate) lessonQuery = lessonQuery.gte('lesson_date', startDate)
      if (endDate)   lessonQuery = lessonQuery.lte('lesson_date', endDate)

      const { data: lessons } = await lessonQuery
      setLessonRows(lessons || [])
    } catch (err) {
      console.error('useAttendanceStats load error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Derived stats ──────────────────────────────────────────────
  const stats = useMemo((): Omit<AttendanceStats, 'loading'> => {
    // Index attendance by date
    const attendanceByDate = new Map<string, any>()
    attendanceRows.forEach(a => {
      // If filtering by kid, skip rows for other kids (null kid_id = whole family)
      if (kidId !== 'all' && a.kid_id !== null && a.kid_id !== kidId) return
      attendanceByDate.set(a.attendance_date, a)
    })

    // Index lesson hours by date
    const lessonHoursByDate = new Map<string, number>()
    lessonRows.forEach(l => {
      const existing = lessonHoursByDate.get(l.lesson_date) || 0
      lessonHoursByDate.set(l.lesson_date, existing + (l.duration_minutes || 0) / 60)
    })

    // Union of all dates
    const allDates = new Set([
      ...Array.from(attendanceByDate.keys()),
      ...Array.from(lessonHoursByDate.keys()),
    ])

    const days: DayStats[] = Array.from(allDates).map(date => {
      const attendance = attendanceByDate.get(date)
      const lessonHrs = lessonHoursByDate.get(date) || 0
      const isConfirmed = !!attendance
      const isLessonInferred = !isConfirmed && lessonHrs > 0
      const isSchoolDay = isConfirmed || isLessonInferred
      const confirmedHours = attendance?.hours || 0
      const totalHours = isConfirmed ? confirmedHours : lessonHrs

      return {
        date,
        confirmedHours,
        lessonHours: lessonHrs,
        totalHours,
        isConfirmed,
        isLessonInferred,
        isSchoolDay,
      }
    }).filter(d => d.isSchoolDay)

    const confirmedDays = days.filter(d => d.isConfirmed).length
    const lessonInferredDays = days.filter(d => d.isLessonInferred).length
    const totalDays = days.length

    const confirmedHours = days.reduce((s, d) => s + d.confirmedHours, 0)
    const lessonHours = days.filter(d => d.isLessonInferred).reduce((s, d) => s + d.lessonHours, 0)
    const totalHours = days.reduce((s, d) => s + d.totalHours, 0)
    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0
    const completion = Math.round((totalDays / requiredDays) * 100)

    return {
      totalDays,
      confirmedDays,
      lessonInferredDays,
      totalHours,
      confirmedHours,
      lessonHours,
      avgHoursPerDay,
      completion,
      requiredDays,
      days,
    }
  }, [attendanceRows, lessonRows, kidId, requiredDays])

  return { ...stats, loading }
}