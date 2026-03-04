'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import CurriculumImporter from '@/components/CurriculumImporter'
import ChildPhotoUpload from '@/components/ChildPhotoUpload'
import LessonCalendar from '@/components/LessonCalendar'
import AllChildrenList from '@/components/AllChildrenList'
import KidQuickPanel from '@/components/KidQuickPanel'
import KidProfileForm from '@/components/KidProfileForm'
import CalendarFilters from '@/components/CalendarFilters'
import DevTierToggle from '@/components/DevTierToggle'
import { formatLessonDescription } from '@/lib/formatLessonDescription'
import { ReactNode } from 'react'
import PersonalizedAssessmentCreator from '@/components/PersonalizedAssessmentCreator'
import { DEFAULT_HOLIDAYS_2025_2026 } from '@/app/utils/holidayUtils'
import AssessmentTaking from '@/components/AssessmentTaking'
import AutoScheduleModal from '@/components/AutoScheduleModal'
import HelpWidget from '../../components/HelpWidget'
import PastAssessmentsViewer from '@/components/PastAssessmentsViewer'
import AttendanceReminder from '@/components/AttendanceReminder'
import AttendanceTracker from '@/components/AttendanceTracker'
import ParentProfileManager from '@/components/ParentProfileManager'
import AuthGuard from '@/components/AuthGuard'
import ComplianceWizard from '@/components/ComplianceWizard'
import { type UserTier, hasFeature as checkFeature, getTierForTesting, getChildLimit, getUpgradeMessage } from '@/lib/tierTesting'
import UserMenu from '@/src/components/UserMenu'
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'
import StatsBar from "@/src/components/dashboard/StatsBar"
import { useAppHeader } from '@/components/layout/AppHeader'

const DURATION_UNITS = ['minutes', 'days', 'weeks'] as const
type DurationUnit = typeof DURATION_UNITS[number]

const convertMinutesToDuration = (minutes: number | null): { value: number; unit: DurationUnit } => {
  if (!minutes) return { value: 30, unit: 'minutes' }
  if (minutes >= 1800 && minutes % 1800 === 0) return { value: minutes / 1800, unit: 'weeks' }
  if (minutes >= 360 && minutes % 360 === 0) return { value: minutes / 360, unit: 'days' }
  if (minutes >= 360) return { value: Math.round(minutes / 360), unit: 'days' }
  return { value: minutes, unit: 'minutes' }
}

const convertDurationToMinutes = (value: number, unit: DurationUnit): number => {
  if (unit === 'minutes') return value
  if (unit === 'days') return value * 6 * 60
  return value * 5 * 6 * 60
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const [showImporter, setShowImporter] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<any[]>([])
  const [userTier, setUserTier] = useState<UserTier>('FREE')
  const [allLessons, setAllLessons] = useState<any[]>([])
  const [lessonsByKid, setLessonsByKid] = useState<{ [kidId: string]: any[] }>({})
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [isCoTeacher, setIsCoTeacher] = useState(false) // NEW
  const [showAssessmentGenerator, setShowAssessmentGenerator] = useState(false)
  const [showAutoSchedule, setShowAutoSchedule] = useState(false)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>(
    searchParams.get('view') === 'list' ? 'list' : 'calendar'
  )
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null)
  const [selectedLessonChild, setSelectedLessonChild] = useState<any | null>(null)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyTargetChildId, setCopyTargetChildId] = useState('')
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [editingKid, setEditingKid] = useState<any | null>(null)
  const [showLessonEditModal, setShowLessonEditModal] = useState(false)


  const [editLessonSubject, setEditLessonSubject] = useState('')
  const [editLessonSubjectSelect, setEditLessonSubjectSelect] = useState('')
  const [editLessonSubjectCustom, setEditLessonSubjectCustom] = useState('')
  const [editLessonTitle, setEditLessonTitle] = useState('')
  const [editLessonDescription, setEditLessonDescription] = useState('')
  const [editLessonDate, setEditLessonDate] = useState('')
  const [editLessonEndDate, setEditLessonEndDate] = useState('')
  const [editLessonDurationValue, setEditLessonDurationValue] = useState<number>(30)
  const [editLessonDurationUnit, setEditLessonDurationUnit] = useState<DurationUnit>('minutes')
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [editLessonAssignedTo, setEditLessonAssignedTo] = useState('')

  const [showCascadeModal, setShowCascadeModal] = useState(false)
  const [cascadeData, setCascadeData] = useState<{
    lessonId: string
    originalDate: string
    newDate: string
    affectedCount: number
    kidId: string
  } | null>(null)
  const [cascadeDays, setCascadeDays] = useState<number>(1)

  const [showPersonalizedAssessment, setShowPersonalizedAssessment] = useState(false)
  const [showAssessmentTaking, setShowAssessmentTaking] = useState(false)
  const [generatedAssessment, setGeneratedAssessment] = useState<any>(null)
  const [assessmentForLesson, setAssessmentForLesson] = useState<any>(null)
  const [showPastAssessments, setShowPastAssessments] = useState(false)
  const [pastAssessmentsKidId, setPastAssessmentsKidId] = useState<string | null>(null)
  const [pastAssessmentsKidName, setPastAssessmentsKidName] = useState('')
  const [lessonAssessmentScore, setLessonAssessmentScore] = useState<number | null>(null)

  const [vacationPeriods, setVacationPeriods] = useState<any[]>([])
  const [schoolYearSettings, setSchoolYearSettings] = useState<any>(null)
  const [complianceHealthScore, setComplianceHealthScore] = useState<number | null>(null)
  const [collaborators, setCollaborators] = useState<{id: string, user_id: string, name: string, email: string}[]>([])

  const [socialEvents, setSocialEvents] = useState<any[]>([])
  const [coopEnrollments, setCoopEnrollments] = useState<any[]>([])
  const [manualAttendance, setManualAttendance] = useState<any[]>([])
  const [calendarFilters, setCalendarFilters] = useState({
    showLessons: true,
    showSocialEvents: true,
    showCoopClasses: true,
    showManualAttendance: true
  })

  const router = useRouter()
  useAppHeader({ title: '📅 Calendar', backHref: '/dashboard' })

  // FIX: loadKids now accepts orgId and queries by organization_id
  const loadKids = async (orgId?: string | null) => {
    if (!user && !orgId) return
    const resolvedOrgId = orgId || organizationId
    if (!resolvedOrgId) return

    const { data, error } = await supabase
      .from('kids')
      .select('*')
      .eq('organization_id', resolvedOrgId)
      .order('created_at', { ascending: false })

    if (error) { console.error('Error loading kids:', error.message); return }
    if (data) {
      setKids(data)
      if (data.length > 0 && !selectedKid) setSelectedKid(data[0].id)
    }
  }

  // FIX: loadAllLessons now queries by organization_id
  const loadAllLessons = async (orgId?: string | null) => {
    if (!user) return
    const resolvedOrgId = orgId || organizationId || user.id

    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('organization_id', resolvedOrgId)
      .order('lesson_date', { ascending: false })

    if (lessonsError) { console.error('Error loading lessons:', lessonsError.message); return }
    if (lessonsData) {
      setAllLessons(lessonsData)
      const grouped: { [kidId: string]: any[] } = {}
      lessonsData.forEach((lesson: any) => {
        if (!grouped[lesson.kid_id]) grouped[lesson.kid_id] = []
        grouped[lesson.kid_id].push(lesson)
      })
      setLessonsByKid(grouped)
    }
    const { data: eventsData } = await supabase.from('social_events').select('*').or(`is_public.eq.true,created_by.eq.${user.id}`).order('event_date', { ascending: false })
    if (eventsData) setSocialEvents(eventsData)
    const { data: enrollmentsData } = await supabase.from('class_enrollments').select('*, coop_classes(*)').eq('user_id', user.id)
    if (enrollmentsData) setCoopEnrollments(enrollmentsData)
    const { data: attendanceData } = await supabase.from('daily_attendance').select('*').eq('organization_id', resolvedOrgId).order('attendance_date', { ascending: false })
    if (attendanceData) setManualAttendance(attendanceData)
  }

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    await supabase
      .from('user_profiles')
      .update({ calendar_visited_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('calendar_visited_at', null)
  }

  const checkUserTier = async () => {
    if (!user) return
    setUserTier(getTierForTesting())
  }

  useEffect(() => { getUser() }, [])
  useEffect(() => { if (kids.length > 0) loadAllLessons() }, [kids])
  useEffect(() => { if (user) checkUserTier() }, [user])

  useEffect(() => {
    if (!kids.length || !schoolYearSettings || !allLessons.length) return
    const goalValue = parseInt(schoolYearSettings.annual_goal_value) || 180
    const completedLessons = allLessons.filter(l => l.status === 'completed').length
    const score = Math.min(100, Math.round((completedLessons / goalValue) * 100))
    setComplianceHealthScore(score)
  }, [kids, schoolYearSettings, allLessons])

  useEffect(() => {
    if (!user) return
    let mounted = true

    const loadSettings = async () => {
      try {
        // Try to get orgId from kids table (parent-admin path)
        const { data: kidsData } = await supabase
          .from('kids')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        let orgId = kidsData?.organization_id || null

        // FIX: Co-teacher fallback — check family_collaborators if no kids found
        if (!orgId) {
          const { data: collabData } = await supabase
            .from('family_collaborators')
            .select('organization_id, role')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle()

          if (collabData) {
            orgId = collabData.organization_id
            if (mounted) setIsCoTeacher(true)
          }
        }

        const resolvedOrgId = orgId || user.id
        if (mounted) setOrganizationId(resolvedOrgId)

        // Load kids using the resolved orgId
        await loadKids(resolvedOrgId)
        if (mounted) setLoading(false) 

        const { data: collabData } = await supabase
          .from('family_collaborators')
          .select('id, user_id, name, email')
          .eq('organization_id', resolvedOrgId)
        if (collabData && mounted) setCollaborators(collabData)

        const { data: settings, error: settingsError } = await supabase
          .from('school_year_settings')
          .select('*')
          .eq('organization_id', resolvedOrgId)
          .maybeSingle()

        if (settingsError) { console.error('Settings error:', settingsError.message); return }
        if (settings && mounted) {
          setSchoolYearSettings(settings)
          const { data: vacations } = await supabase
            .from('vacation_periods')
            .select('*')
            .eq('organization_id', resolvedOrgId)
          if (vacations && mounted) setVacationPeriods(vacations)
        }
      } catch (err) { console.error('Error loading settings:', err) }
    }

    loadSettings()
    return () => { mounted = false }
  }, [user])

  useEffect(() => {
    const loadLessonAssessmentScore = async () => {
      if (!selectedLesson) { setLessonAssessmentScore(null); return }
      const { data: assessments } = await supabase.from('assessments').select('id, assessment_results(auto_score, submitted_at)').eq('lesson_id', selectedLesson.id).limit(1)
      if (assessments?.length > 0 && assessments[0].assessment_results.length > 0) {
        setLessonAssessmentScore(assessments[0].assessment_results[0].auto_score)
      } else {
        setLessonAssessmentScore(null)
      }
    }
    loadLessonAssessmentScore()
  }, [selectedLesson])

  const hasFeature = (feature: string) => checkFeature(userTier, feature)
  const canAddChild = () => !isCoTeacher && kids.length < getChildLimit(userTier) // co-teachers cannot add children
  const selectedKidData = kids.find(k => k.id === selectedKid) || null
  const selectedKidLessons = selectedKid ? (lessonsByKid[selectedKid] || []) : []
  const complianceBtnClass = (complianceHealthScore ?? 0) >= 80
    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
    : (complianceHealthScore ?? 0) >= 40
    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'

  const deleteKid = async (id: string, kidDisplayName: string) => {
    if (confirm(`Delete ${kidDisplayName}? This will also delete all their lessons.`)) {
      await supabase.from('kids').delete().eq('id', id)
      if (selectedKid === id) setSelectedKid(kids[0]?.id || null)
      loadKids()
    }
  }

  const startEditLesson = (lesson: any) => {
    setEditingLessonId(lesson.id)
    setEditLessonTitle(lesson.title)
    setEditLessonSubject(lesson.subject)
    const isCustom = lesson.subject && !CANONICAL_SUBJECTS.includes(lesson.subject)
    setEditLessonSubjectSelect(isCustom ? '__custom__' : (lesson.subject || ''))
    setEditLessonSubjectCustom(isCustom ? lesson.subject : '')
    setEditLessonDescription(formatLessonDescription(lesson.description) || '')
    setEditLessonDate(lesson.lesson_date || '')
    const duration = convertMinutesToDuration(lesson.duration_minutes)
    setEditLessonDurationValue(duration.value)
    setEditLessonDurationUnit(duration.unit)
    if (lesson.lesson_date && lesson.duration_minutes) {
      const start = new Date(lesson.lesson_date + 'T12:00:00')
      const durationDays = Math.ceil(lesson.duration_minutes / 360)
      const end = new Date(start)
      end.setDate(start.getDate() + durationDays)
      setEditLessonEndDate(end.toISOString().split('T')[0])
    } else {
      setEditLessonEndDate('')
    }
    setEditLessonAssignedTo(lesson.assigned_to_user_id || '')
  }

  const cancelEditLesson = () => {
    setEditingLessonId(null)
    setShowLessonEditModal(false)
  }

  const saveEditLesson = async (id: string) => {
    const durationInMinutes = convertDurationToMinutes(editLessonDurationValue, editLessonDurationUnit)
    const resolvedSubject = editLessonSubjectSelect === '__custom__' ? editLessonSubjectCustom : editLessonSubjectSelect
    const updates = {
      title: editLessonTitle, subject: resolvedSubject, description: editLessonDescription,
      lesson_date: editLessonDate || null, duration_minutes: durationInMinutes
    }
    if (editLessonDate && vacationPeriods.length > 0) {
      const vacation = vacationPeriods.find(v => editLessonDate >= v.start_date && editLessonDate <= v.end_date)
      if (vacation) {
        if (!confirm(`⚠️ ${editLessonDate} falls during ${vacation.name}.\n\nSave lesson anyway?`)) return
      }
    }
    if (editLessonDate) {
      const holiday = DEFAULT_HOLIDAYS_2025_2026.find((h: any) => {
        const holidayDate = h.date || h.start
        return holidayDate === editLessonDate
      })
      if (holiday) {
        if (!confirm(`⚠️ ${editLessonDate} is ${holiday.name}.\n\nSave lesson anyway?`)) return
      }
    }
    const currentLesson = allLessons.find(l => l.id === id)
    if (currentLesson && currentLesson.lesson_date && editLessonDate && currentLesson.lesson_date !== editLessonDate) {
      const subsequentLessons = allLessons.filter(lesson =>
        lesson.kid_id === currentLesson.kid_id && lesson.id !== id &&
        lesson.lesson_date && lesson.lesson_date > currentLesson.lesson_date
      )
      if (subsequentLessons.length > 0) {
        const oldDate = new Date(currentLesson.lesson_date)
        const newDateObj = new Date(editLessonDate)
        const suggestedShift = Math.round((newDateObj.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24))
        setCascadeData({ lessonId: id, originalDate: currentLesson.lesson_date, newDate: editLessonDate, affectedCount: subsequentLessons.length, kidId: currentLesson.kid_id })
        setCascadeDays(suggestedShift)
        setShowCascadeModal(true)
        return
      }
    }
    await performLessonUpdate(id, updates)
  }

  const performLessonUpdate = async (id: string, updates: any) => {
    setAllLessons(prev => prev.map(lesson => lesson.id === id ? { ...lesson, ...updates } : lesson))
    setLessonsByKid(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(kidId => {
        updated[kidId] = updated[kidId].map(lesson => lesson.id === id ? { ...lesson, ...updates } : lesson)
      })
      return updated
    })
    if (selectedLesson?.id === id) setSelectedLesson({ ...selectedLesson, ...updates })
    const { error } = await supabase.from('lessons').update(updates).eq('id', id)
    if (error) { console.error('Error saving lesson:', error); alert('Failed to save lesson changes'); loadAllLessons() }
    else { setEditingLessonId(null); setShowLessonEditModal(false) }
  }

  const handleStatusChange = async (lessonId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => {
    const updates: any = { status: newStatus }
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
    if (newStatus === 'not_started') updates.completed_at = null
    setAllLessons(prev => prev.map(lesson => lesson.id === lessonId ? { ...lesson, ...updates } : lesson))
    setLessonsByKid(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(kidId => {
        updated[kidId] = updated[kidId].map(lesson => lesson.id === lessonId ? { ...lesson, ...updates } : lesson)
      })
      return updated
    })
    if (selectedLesson?.id === lessonId) setSelectedLesson({ ...selectedLesson, ...updates })
    const { error } = await supabase.from('lessons').update(updates).eq('id', lessonId)
    if (error) { console.error('Error updating lesson status:', error); alert('Failed to update lesson status'); loadAllLessons() }
  }

  const handleCascadeUpdate = async (updateAll: boolean) => {
    if (!cascadeData) return
    const { lessonId, originalDate, kidId } = cascadeData
    const daysDiff = cascadeDays
    const durationInMinutes = convertDurationToMinutes(editLessonDurationValue, editLessonDurationUnit)
    const resolvedSubject = editLessonSubjectSelect === '__custom__' ? editLessonSubjectCustom : editLessonSubjectSelect
    const updates = {
      title: editLessonTitle, subject: resolvedSubject, description: editLessonDescription,
      lesson_date: editLessonDate || null, duration_minutes: durationInMinutes,
      assigned_to_user_id: editLessonAssignedTo || null
    }
    await performLessonUpdate(lessonId, updates)
    if (updateAll && daysDiff !== 0) {
      const subsequentLessons = allLessons.filter(lesson =>
        lesson.kid_id === kidId && lesson.id !== lessonId &&
        lesson.lesson_date && lesson.lesson_date > originalDate
      )
      const updatePromises = subsequentLessons.map(lesson => {
        const lessonDate = new Date(lesson.lesson_date!)
        lessonDate.setDate(lessonDate.getDate() + daysDiff)
        return supabase.from('lessons').update({ lesson_date: lessonDate.toISOString().split('T')[0] }).eq('id', lesson.id)
      })
      const results = await Promise.all(updatePromises)
      const updatedCount = results.filter(r => !r.error).length
      await loadAllLessons()
      setShowCascadeModal(false); setCascadeData(null); setCascadeDays(1)
      setTimeout(() => {
        alert(`✅ Updated ${updatedCount} subsequent lesson${updatedCount !== 1 ? 's' : ''}. All dates shifted by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) !== 1 ? 's' : ''} ${daysDiff > 0 ? 'later' : 'earlier'}.`)
      }, 100)
    } else {
      setShowCascadeModal(false); setCascadeData(null); setCascadeDays(1)
      setTimeout(() => { alert('✅ Lesson date updated. Other lessons unchanged.') }, 100)
    }
  }

  const cycleLessonStatus = async (lessonId: string, currentStatus: string) => {
    let newStatus: string
    if (currentStatus === 'not_started') newStatus = 'in_progress'
    else if (currentStatus === 'in_progress') newStatus = 'completed'
    else newStatus = 'not_started'
    await handleStatusChange(lessonId, newStatus as any)
  }

  const deleteLesson = async (id: string) => {
    const lesson = allLessons.find(l => l.id === id)
    let confirmMessage = 'Are you sure you want to delete this lesson?'
    if (lesson?.duration_minutes) {
      const hours = (lesson.duration_minutes / 60).toFixed(1)
      confirmMessage = `This lesson has ${lesson.duration_minutes} minutes (${hours} hours) of tracked time.\n\nDeleting this lesson will remove these hours from your total.\n\nAre you sure you want to delete it?`
    }
    if (confirm(confirmMessage)) {
      await supabase.from('lessons').delete().eq('id', id).eq('user_id', user.id)
      await loadAllLessons()
    }
  }

  const copyLessonToChild = async () => {
    if (!copyTargetChildId || !selectedLesson) return
    const orgId = organizationId || user.id
    const targetChild = kids.find(k => k.id === copyTargetChildId)
    if (!targetChild) return
    const { error } = await supabase.from('lessons').insert([{
      user_id: user.id, organization_id: orgId, kid_id: copyTargetChildId,
      subject: selectedLesson.subject, title: selectedLesson.title, description: selectedLesson.description,
      lesson_date: selectedLesson.lesson_date, duration_minutes: selectedLesson.duration_minutes, status: 'not_started'
    }])
    if (!error) {
      alert(`Lesson copied to ${targetChild.displayname}!`)
      setShowCopyModal(false); setCopyTargetChildId('')
      await loadAllLessons()
    } else {
      console.error('Copy error:', error)
      alert('Failed to copy lesson. Please try again.')
    }
  }

  const handleViewPastAssessments = (kidId: string, kidName: string) => {
    setPastAssessmentsKidId(kidId); setPastAssessmentsKidName(kidName); setShowPastAssessments(true)
  }

  const handleGeneratePersonalizedAssessment = (lesson: any) => {
    setAssessmentForLesson(lesson); setShowPersonalizedAssessment(true)
  }

  const handleAssessmentCreated = (assessmentData: any) => {
    setGeneratedAssessment(assessmentData); setShowPersonalizedAssessment(false); setShowAssessmentTaking(true)
  }

  const handleAssessmentSubmitted = (results: any) => { loadAllLessons() }

  const handleClosePersonalizedAssessment = () => {
    setShowPersonalizedAssessment(false); setShowAssessmentTaking(false)
    setGeneratedAssessment(null); setAssessmentForLesson(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
          <div className="relative group">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide cursor-default">Kids</span>
            <div className="absolute left-0 top-6 z-50 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
              Click a photo to view child details
              <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-800 rotate-45" />
            </div>
          </div>
            {kids.map((kid) => (
              <button key={kid.id} onClick={() => setSelectedKid(kid.id)} title={kid.displayname}
                className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all flex-shrink-0 ${selectedKid === kid.id ? 'border-purple-500 shadow-md ring-2 ring-purple-200' : 'border-gray-200 hover:border-purple-300'}`}
              >
                {kid.photo_url ? (
                  <img src={kid.photo_url} alt={kid.displayname} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {kid.displayname.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            ))}
            {canAddChild() && (
              <button onClick={() => { setEditingKid(null); setShowProfileForm(true) }} title="Add a child"
                className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 hover:border-purple-400 flex items-center justify-center text-gray-400 hover:text-purple-500 transition-all text-lg font-light"
              >+</button>
            )}
          </div>
        <AttendanceReminder
          onTakeAttendance={() => { router.push('/admin'); setTimeout(() => { window.dispatchEvent(new Event('openAttendance')) }, 500) }}
          kids={kids}
          organizationId={organizationId ?? user.id}
        />

        {kids.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">👋</div>
            {/* FIX: Role-aware welcome message and empty state */}
            {isCoTeacher ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to HomeschoolReady!</h2>
                <p className="text-gray-600 mb-6">No students have been added to this account yet. Check back once the account admin has set things up.</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to HomeschoolReady!</h2>
                <p className="text-gray-600 mb-6">Let's get started by adding your first child.</p>
                <button onClick={() => { setEditingKid(null); setShowProfileForm(true) }} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg">
                  + Add Your First Child
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {selectedKidData && (
              <KidQuickPanel
                kid={selectedKidData}
                lessons={selectedKidLessons}
                onEditProfile={() => { setEditingKid(selectedKidData); setShowProfileForm(true) }}
                onViewAssessments={() => handleViewPastAssessments(selectedKidData.id, selectedKidData.displayname)}
                onViewCoverage={() => router.push('/coverage')}
                viewMode={viewMode}
                onViewLessons={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                isPro={hasFeature('subject_coverage')}
              />
            )}

            {/* ── Action Bar ────────────────────────────────────────────────── */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowAutoSchedule(true)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                📅 Auto-Schedule
              </button>

              {hasFeature('curriculum_import') ? (
                <button
                  onClick={() => setShowImporter(true)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  📥 Import
                </button>
              ) : (
                <button
                  onClick={() => { alert(getUpgradeMessage('curriculum_import')); router.push('/pricing') }}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                >
                  📥 Import 🔒
                </button>
              )}

              <div className="w-px h-7 bg-gray-200 mx-1" />

              <div className="relative group">
                <button
                  onClick={() => router.push('/admin?tab=school-year')}
                  className={`px-4 py-2 text-sm rounded-lg border font-medium transition-colors ${complianceBtnClass}`}
                >
                  📋 Compliance
                  {(complianceHealthScore ?? 0) < 80 && (
                    <span className="ml-1.5 text-xs font-bold">{complianceHealthScore ?? 0}%</span>
                  )}
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg z-50">
                  % of completed lessons vs. your {schoolYearSettings?.annual_goal_value || 180}-day annual goal
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45" />
                </div>
              </div>

              <button
                onClick={() => router.push('/lessons')}
                className="ml-auto px-4 py-2 text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 font-medium transition-colors"
              >
                📚 All Lessons
              </button>
            </div>

            <StatsBar organizationId={organizationId} />

            {viewMode === 'calendar' && (
              <CalendarFilters
                filters={calendarFilters}
                onChange={setCalendarFilters}
                counts={{ lessons: allLessons.filter(l => l.lesson_date).length, socialEvents: socialEvents.length, coopClasses: coopEnrollments.length, manualAttendance: manualAttendance.length }}
              />
            )}

            {viewMode === 'calendar' ? (
              <LessonCalendar
                kids={kids}
                lessonsByKid={lessonsByKid}
                socialEvents={socialEvents}
                coopEnrollments={coopEnrollments}
                manualAttendance={manualAttendance}
                filters={calendarFilters}
                onLessonClick={(lesson, child) => { setSelectedLesson(lesson); setSelectedLessonChild(child); startEditLesson(lesson); setShowLessonEditModal(true) }}
                onStatusChange={handleStatusChange}
                userId={user.id}
                organizationId={organizationId ?? user.id}
                onEditLesson={(lesson) => { setSelectedLesson(lesson); setSelectedLessonChild(kids.find(k => k.id === lesson.kid_id) || null); startEditLesson(lesson); setShowLessonEditModal(true) }}
              />
            ) : (
              <AllChildrenList
                kids={kids}
                lessonsByKid={lessonsByKid}
                autoExpandKid={selectedKid}
                onEditLesson={(lesson) => { setSelectedLesson(lesson); setSelectedLessonChild(kids.find(k => k.id === lesson.kid_id) || null); startEditLesson(lesson); setShowLessonEditModal(true) }}
                onDeleteLesson={deleteLesson}
                onCycleStatus={cycleLessonStatus}
                onGenerateAssessment={handleGeneratePersonalizedAssessment}
                onViewPastAssessments={handleViewPastAssessments}
              />
            )}

            {showImporter && selectedKid && (
              <CurriculumImporter
                childId={selectedKid}
                childName={kids.find(k => k.id === selectedKid)?.displayname || ''}
                onClose={() => setShowImporter(false)}
                onImportComplete={() => { setShowImporter(false); loadAllLessons() }}
              />
            )}
          </>
        )}
      </div>

      {/* MODALS */}

      {showProfileForm && (
        <KidProfileForm
          kid={editingKid || undefined}
          onSave={async (data) => {
            try {
              const orgId = organizationId ?? user.id
              if (data.id) {
                const updateData: any = {
                  user_id: user.id, organization_id: orgId,
                  firstname: data.firstname, lastname: data.lastname,
                  displayname: data.displayname || data.firstname, age: data.age, grade: data.grade,
                  learning_style: data.learning_style, pace_of_learning: data.pace_of_learning,
                  environmental_needs: data.environmental_needs, current_hook: data.current_hook,
                  todays_vibe: data.todays_vibe, current_focus: data.current_focus
                }
                if (data.photoFile) {
                  const fileExt = data.photoFile.name.split('.').pop()
                  const fileName = `${data.id}/${Date.now()}.${fileExt}`
                  const { error: uploadError } = await supabase.storage.from('child-photos').upload(fileName, data.photoFile)
                  if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('child-photos').getPublicUrl(fileName)
                    updateData.photo_url = publicUrl
                  }
                }
                const { error: updateError } = await supabase.from('kids').update(updateData).eq('id', data.id)
                if (updateError) { alert('Error updating child: ' + updateError.message); return }
                if (data.subject_proficiencies?.length > 0) {
                  await supabase.from('subject_proficiency').delete().eq('kid_id', data.id)
                  await supabase.from('subject_proficiency').insert(data.subject_proficiencies.map((sp: any) => ({ kid_id: data.id, subject: sp.subject, proficiency: sp.proficiency, notes: sp.notes || '' })))
                }
              } else {
                const { data: newKid, error } = await supabase.from('kids').insert([{
                  user_id: user.id, organization_id: orgId,
                  firstname: data.firstname, lastname: data.lastname,
                  displayname: data.displayname || data.firstname, age: data.age, grade: data.grade,
                  learning_style: data.learning_style, pace_of_learning: data.pace_of_learning,
                  environmental_needs: data.environmental_needs, current_hook: data.current_hook,
                  todays_vibe: data.todays_vibe, current_focus: data.current_focus
                }]).select()
                if (error || !newKid || newKid.length === 0) { alert('Error creating child. Please try again.'); return }
                const newKidId = newKid[0].id
                if (data.photoFile) {
                  const fileExt = data.photoFile.name.split('.').pop()
                  const fileName = `${newKidId}/${Date.now()}.${fileExt}`
                  const { error: uploadError } = await supabase.storage.from('child-photos').upload(fileName, data.photoFile)
                  if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('child-photos').getPublicUrl(fileName)
                    await supabase.from('kids').update({ photo_url: publicUrl }).eq('id', newKidId)
                  }
                }
                if (data.subject_proficiencies?.length > 0) {
                  await supabase.from('subject_proficiency').insert(data.subject_proficiencies.map((sp: any) => ({ kid_id: newKidId, subject: sp.subject, proficiency: sp.proficiency, notes: sp.notes || '' })))
                }
              }
              await loadKids()
              setShowProfileForm(false); setEditingKid(null)
              if (data.id) setSelectedKid(data.id)
            } catch (err) {
              console.error('Unexpected error saving kid profile:', err)
              alert('An unexpected error occurred. Please try again.')
            }
          }}
          onCancel={() => { setShowProfileForm(false); setEditingKid(null) }}
        />
      )}

      {showAutoSchedule && selectedKid && (
        <AutoScheduleModal
          isOpen={showAutoSchedule}
          onClose={() => setShowAutoSchedule(false)}
          kidId={selectedKid}
          kidName={kids.find(k => k.id === selectedKid)?.displayname}
          onScheduleComplete={() => { loadAllLessons(); setShowAutoSchedule(false); setViewMode('calendar') }}
        />
      )}

      {showPersonalizedAssessment && assessmentForLesson && (
        <PersonalizedAssessmentCreator
          lessonId={assessmentForLesson.id}
          lessonTitle={assessmentForLesson.title}
          kidId={assessmentForLesson.kid_id}
          kidName={kids.find(k => k.id === assessmentForLesson.kid_id)?.displayname || 'Student'}
          onClose={handleClosePersonalizedAssessment}
          onAssessmentCreated={handleAssessmentCreated}
        />
      )}

      {showAssessmentTaking && generatedAssessment && assessmentForLesson && (
        <AssessmentTaking
          assessmentData={generatedAssessment.assessment}
          assessmentId={generatedAssessment.assessmentId}
          childName={kids.find(k => k.id === assessmentForLesson.kid_id)?.displayname || 'Student'}
          lessonTitle={generatedAssessment.lessonTitle}
          onClose={handleClosePersonalizedAssessment}
          onSubmit={handleAssessmentSubmitted}
        />
      )}

      {showPastAssessments && pastAssessmentsKidId && (
        <PastAssessmentsViewer
          kidId={pastAssessmentsKidId}
          kidName={pastAssessmentsKidName}
          onClose={() => { setShowPastAssessments(false); setPastAssessmentsKidId(null); setPastAssessmentsKidName('') }}
        />
      )}

      {showLessonEditModal && editingLessonId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">✏️ Edit Lesson</h3>
                <button onClick={cancelEditLesson} className="text-white hover:text-gray-200 text-2xl leading-none font-light">×</button>
              </div>
              {selectedLessonChild && (
                <p className="text-blue-100 text-sm mt-1">{selectedLessonChild.displayname}{selectedLessonChild.grade ? ` • Grade ${selectedLessonChild.grade}` : ''}</p>
              )}
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <select value={editLessonSubjectSelect} onChange={(e) => setEditLessonSubjectSelect(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" required>
                  <option value="">Choose a subject...</option>
                  {CANONICAL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__custom__">✏️ Custom subject...</option>
                </select>
                {editLessonSubjectSelect === '__custom__' && (
                  <input type="text" value={editLessonSubjectCustom} onChange={(e) => setEditLessonSubjectCustom(e.target.value)} className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" placeholder="e.g., Latin, Robotics, Home Economics" required autoFocus />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Title *</label>
                <input type="text" value={editLessonTitle} onChange={(e) => setEditLessonTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea value={editLessonDescription} onChange={(e) => setEditLessonDescription(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" rows={3} />
              </div>
              {collaborators.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select value={editLessonAssignedTo} onChange={(e) => setEditLessonAssignedTo(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900">
                    <option value="">Me (primary teacher)</option>
                    {collaborators.map(c => (
                      <option key={c.id} value={c.user_id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700">How long is this lesson?</label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map(min => (
                    <button key={min} type="button" onClick={() => { setEditLessonDurationValue(min); setEditLessonDurationUnit('minutes') }}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all ${editLessonDurationValue === min && editLessonDurationUnit === 'minutes' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
                    >{min} min</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="number" min="1" value={editLessonDurationValue} onChange={(e) => setEditLessonDurationValue(parseInt(e.target.value) || 1)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
                  <select value={editLessonDurationUnit} onChange={(e) => setEditLessonDurationUnit(e.target.value as DurationUnit)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
                    <option value="minutes">minutes</option>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                  </select>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="edit-schedule-date" checked={!!editLessonDate} onChange={(e) => { if (!e.target.checked) setEditLessonDate(''); else setEditLessonDate(new Date().toISOString().split('T')[0]) }} className="rounded" />
                  <label htmlFor="edit-schedule-date" className="text-sm font-medium text-gray-700">Schedule for a specific date</label>
                </div>
                {editLessonDate && <input type="date" value={editLessonDate} onChange={(e) => setEditLessonDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" />}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cancelEditLesson} className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button type="button" onClick={() => saveEditLesson(editingLessonId)} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCascadeModal && cascadeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">⚠️ Date Change Detected</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-900">
                You're changing the lesson date from <strong>{new Date(cascadeData.originalDate + 'T00:00:00').toLocaleDateString()}</strong> to <strong>{new Date(cascadeData.newDate + 'T00:00:00').toLocaleDateString()}</strong>.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">📅 This affects {cascadeData.affectedCount} subsequent lesson{cascadeData.affectedCount !== 1 ? 's' : ''}</p>
                <p className="text-sm text-blue-800">Would you like to shift all subsequent lessons by the same amount?</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift subsequent lessons by:</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={cascadeDays} onChange={(e) => setCascadeDays(parseInt(e.target.value) || 0)} className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-900" />
                  <span className="text-sm text-gray-600">days</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
              <button onClick={() => { setShowCascadeModal(false); setCascadeData(null); setCascadeDays(1); loadAllLessons() }} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 font-medium">Cancel</button>
              <div className="flex-1" />
              <button onClick={() => handleCascadeUpdate(false)} className="px-4 py-2 border border-blue-300 bg-blue-50 rounded text-blue-700 hover:bg-blue-100 font-medium">This Lesson Only</button>
              <button onClick={() => handleCascadeUpdate(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Update All ({cascadeData.affectedCount})</button>
            </div>
          </div>
        </div>
      )}

      <DevTierToggle />
      <HelpWidget />
    </div>
  )
}

export default function CalendarPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  )
}