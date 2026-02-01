'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'
import { isValidHomeschoolDay, isWithinSchoolYear } from '@/utils/schoolYearUtils'
import { DEFAULT_HOLIDAYS_2025_2026, Holiday } from '@/app/utils/holidayUtils'
import { Calendar, AlertTriangle } from 'lucide-react'

interface RescheduleButtonProps {
  lessonId: string
  currentDate: string | null
  kidId: string
  subjectId: string
  onRescheduleComplete: () => void
}

export default function RescheduleButton({
  lessonId,
  currentDate,
  kidId,
  subjectId,
  onRescheduleComplete
}: RescheduleButtonProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [newDate, setNewDate] = useState(currentDate || '')
  const [loading, setLoading] = useState(false)
  const [dateWarning, setDateWarning] = useState<string | null>(null)
  const [cascadeWarning, setCascadeWarning] = useState<string | null>(null)
  const [schoolYearSettings, setSchoolYearSettings] = useState<any>(null)
  const [vacationHolidays, setVacationHolidays] = useState<Holiday[]>([])

  useEffect(() => {
    let mounted = true
    
    const load = async () => {
      if (!mounted) return
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !mounted) return

        const { data: settings } = await supabase
          .from('school_year_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (settings && mounted) {
          setSchoolYearSettings(settings)
        }

        // Try to fetch vacation periods
        if (settings && mounted) {
          const orgId = settings.organization_id || user.id
          const { data: vacations } = await supabase
            .from('vacation_periods')
            .select('*')
            .eq('organization_id', orgId)

          if (vacations && mounted) {
            const holidays: Holiday[] = vacations.map(v => ({
              name: v.name,
              start: v.start_date,
              end: v.end_date,
              enabled: true
            }))
            setVacationHolidays(holidays)
          }
        }
      } catch (err) {
        // Silently handle errors
        console.debug("Error loading settings:", err)
      }
    }
    
    load()
    
    return () => {
      mounted = false
    }
  }, [])

  const checkCascadeEffect = async (selectedDate: string) => {
    if (!currentDate || !selectedDate || !schoolYearSettings) {
      setCascadeWarning(null)
      return
    }

    try {
      // Calculate the number of days this lesson is being moved
      const currentDateObj = new Date(currentDate + 'T00:00:00')
      const newDateObj = new Date(selectedDate + 'T00:00:00')
      const daysDifference = Math.floor((newDateObj.getTime() - currentDateObj.getTime()) / (1000 * 60 * 60 * 24))

      // Only check if moving forward (positive difference)
      if (daysDifference <= 0) {
        setCascadeWarning(null)
        return
      }

      // Get all subsequent lessons for this subject and kid
      const { data: subsequentLessons, error } = await supabase
        .from('lessons')
        .select('id, lesson_date, lesson_title')
        .eq('kid_id', kidId)
        .eq('subject', subjectId)
        .gt('lesson_date', currentDate)
        .order('lesson_date', { ascending: true })

      if (error) {
        console.error("Error fetching subsequent lessons:", error)
        return
      }

      if (!subsequentLessons || subsequentLessons.length === 0) {
        setCascadeWarning(null)
        return
      }

      // Check if any subsequent lessons would be pushed outside the school year
      const schoolYearEnd = new Date(schoolYearSettings.school_year_end + 'T00:00:00')
      let lessonsOutsideYear = 0

      for (const lesson of subsequentLessons) {
        if (!lesson.lesson_date) continue
        
        const lessonDateObj = new Date(lesson.lesson_date + 'T00:00:00')
        const projectedDate = new Date(lessonDateObj.getTime() + (daysDifference * 24 * 60 * 60 * 1000))
        
        if (projectedDate > schoolYearEnd) {
          lessonsOutsideYear++
        }
      }

      if (lessonsOutsideYear > 0) {
        const warningMsg = `Moving this lesson forward by ${daysDifference} day${daysDifference > 1 ? 's' : ''} will push ${lessonsOutsideYear} subsequent lesson${lessonsOutsideYear > 1 ? 's' : ''} outside the school year (ends ${schoolYearSettings.school_year_end}).`
        setCascadeWarning(warningMsg)
      } else {
        setCascadeWarning(null)
      }
    } catch (err) {
      console.error("Error checking cascade effect:", err)
    }
  }

  const handleDateChange = async (date: string) => {
    setNewDate(date)
    
    if (!date || !schoolYearSettings) {
      setDateWarning(null)
      setCascadeWarning(null)
      return
    }

    // Check if the selected date itself is valid
    if (!isWithinSchoolYear(date, schoolYearSettings.school_year_start, schoolYearSettings.school_year_end)) {
      setDateWarning('⚠️ Date is outside school year')
      setCascadeWarning(null)
      return
    }

    // Check custom vacations
    const customVacation = vacationHolidays.find(h => date >= h.start && date <= h.end)
    if (customVacation) {
      const vacationName = typeof customVacation.name === 'string' ? customVacation.name : 'Vacation'
      setDateWarning(`⚠️ ${vacationName}`)
      await checkCascadeEffect(date)
      return
    }

    // Check default holidays
    const defaultHoliday = DEFAULT_HOLIDAYS_2025_2026.find((h: any) => {
      const holidayDate = h.date || h.start
      return holidayDate === date
    })
    
    if (defaultHoliday) {
      const holidayName = typeof defaultHoliday.name === 'string' ? defaultHoliday.name : 'Holiday'
      setDateWarning(`⚠️ ${holidayName}`)
      await checkCascadeEffect(date)
      return
    }

    // Check if it's a valid homeschool day
    const allHolidays = [...DEFAULT_HOLIDAYS_2025_2026, ...vacationHolidays]
    const homeschoolDays = schoolYearSettings.homeschool_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    
    if (!isValidHomeschoolDay(date, homeschoolDays, allHolidays)) {
      const dateObj = new Date(date + 'T00:00:00')
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
      setDateWarning(`⚠️ ${dayName} is not a configured homeschool day`)
      await checkCascadeEffect(date)
      return
    }

    setDateWarning(null)
    await checkCascadeEffect(date)
  }
  
  async function handleReschedule() {
    if (!newDate) return
    
    // Build confirmation message
    let confirmMsg = ''
    if (dateWarning) {
      confirmMsg += `${dateWarning}\n\n`
    }
    if (cascadeWarning) {
      confirmMsg += `${cascadeWarning}\n\n`
    }
    if (confirmMsg && !confirm(`${confirmMsg}Reschedule anyway?`)) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ lesson_date: newDate })
        .eq('id', lessonId)
      
      if (error) throw error
      
      setShowDatePicker(false)
      onRescheduleComplete()
    } catch (error) {
      console.error(error)
      alert('Failed to reschedule.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDatePicker(!showDatePicker)} 
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        Reschedule
      </button>

      {showDatePicker && (
        <div className="absolute right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10 min-w-[280px]">
          <label className="block text-sm font-medium text-slate-900 mb-2 flex items-center gap-2">
            <Calendar size={16} className={dateWarning || cascadeWarning ? 'text-amber-600' : 'text-slate-500'} />
            New Date:
          </label>
          
          <input
            type="date"
            value={newDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className={`w-full p-2 border rounded text-slate-950 mb-2 outline-none ${
              dateWarning || cascadeWarning ? 'border-amber-500 bg-amber-50' : 'border-slate-300'
            }`}
          />
          
          {dateWarning && (
            <div className="mb-2 p-2 bg-amber-100 border border-amber-300 rounded text-xs text-amber-900 font-medium">
              {String(dateWarning)}
            </div>
          )}

          {cascadeWarning && (
            <div className="mb-2 p-2 bg-orange-100 border border-orange-300 rounded text-xs text-orange-900 font-medium flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{String(cascadeWarning)}</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <button 
              onClick={() => setShowDatePicker(false)} 
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-900"
            >
              Cancel
            </button>
            <button 
              onClick={handleReschedule} 
              disabled={loading} 
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}