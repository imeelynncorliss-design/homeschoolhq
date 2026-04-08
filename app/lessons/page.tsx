'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import AllChildrenList from '@/components/AllChildrenList'
import PastAssessmentsViewer from '@/components/PastAssessmentsViewer'
import LessonGenerator from '@/components/LessonGenerator'
import DevTierToggle from '@/components/DevTierToggle'
import PastUnstartedLessonsBanner from '@/components/PastUnstartedLessonsBanner'
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'
import { type UserTier, getTierForTesting, hasFeature as checkFeature } from '@/lib/tierTesting'
import CurriculumImporter from '@/components/CurriculumImporter'
import { formatLessonDescription } from '@/lib/formatLessonDescription'
import { DEFAULT_HOLIDAYS_2025_2026 } from '@/app/utils/holidayUtils'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import GenerateAssessmentModal from '@/components/GenerateAssessmentModal'
import UpgradeModal from '@/components/UpgradeModal'
import { useAppHeader } from '@/components/layout/AppHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

type Lesson = {
  id: string
  kid_id: string
  title: string
  subject: string
  description?: string
  lesson_date: string | null
  duration_minutes: number | null
  status: 'not_started' | 'in_progress' | 'completed'
  materials_needed?: string[]
}

const DURATION_UNITS = ['minutes', 'days', 'weeks'] as const
type DurationUnit = typeof DURATION_UNITS[number]

const convertDurationToMinutes = (value: number, unit: DurationUnit): number => {
  if (unit === 'minutes') return value
  if (unit === 'days') return value * 6 * 60
  return value * 5 * 6 * 60
}

const convertMinutesToDuration = (minutes: number | null): { value: number; unit: DurationUnit } => {
  if (!minutes) return { value: 30, unit: 'minutes' }
  if (minutes >= 1800 && minutes % 1800 === 0) return { value: minutes / 1800, unit: 'weeks' }
  if (minutes >= 360 && minutes % 360 === 0) return { value: minutes / 360, unit: 'days' }
  if (minutes >= 360) return { value: Math.round(minutes / 360), unit: 'days' }
  return { value: minutes, unit: 'minutes' }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KID_COLORS = ['#7c3aed', '#0d9488', '#ec4899', '#f59e0b', '#3b82f6']

// ─── Page Content ─────────────────────────────────────────────────────────────

function LessonsContent() {
  const router = useRouter()
  useAppHeader({ title: '📚 Lessons' })
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<any[]>([])
  const [lessonsByKid, setLessonsByKid] = useState<{ [kidId: string]: Lesson[] }>({})
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [collaborators, setCollaborators] = useState<{ id: string; user_id: string; name: string; email: string }[]>([])
  const [userTier, setUserTier] = useState<UserTier>('FREE')
  const [vacationPeriods, setVacationPeriods] = useState<any[]>([])
  const [isCoTeacher, setIsCoTeacher] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [stateCode, setStateCode] = useState<string | null>(null)
  const [activeKidId, setActiveKidId] = useState<string | null>(null)

  // Add Lesson modal state
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [addingLesson, setAddingLesson] = useState(false)
  const [selectedKidForLesson, setSelectedKidForLesson] = useState<string>('')
  const [lessonSubjectSelect, setLessonSubjectSelect] = useState('')
  const [lessonSubjectCustom, setLessonSubjectCustom] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [lessonDate, setLessonDate] = useState('')
  const [lessonDurationValue, setLessonDurationValue] = useState<number>(30)
  const [lessonDurationUnit, setLessonDurationUnit] = useState<DurationUnit>('minutes')
  const [lessonAssignedTo, setLessonAssignedTo] = useState('')
  const [showImporter, setShowImporter] = useState(false)
  const [selectedKidForImport, setSelectedKidForImport] = useState<any>(null)

  // Edit Lesson modal state
  const [showLessonEditModal, setShowLessonEditModal] = useState(false)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [editLessonTitle, setEditLessonTitle] = useState('')
  const [editLessonSubjectSelect, setEditLessonSubjectSelect] = useState('')
  const [editLessonSubjectCustom, setEditLessonSubjectCustom] = useState('')
  const [editLessonDescription, setEditLessonDescription] = useState('')
  const [editLessonDate, setEditLessonDate] = useState('')
  const [editLessonDurationValue, setEditLessonDurationValue] = useState<number>(30)
  const [editLessonDurationUnit, setEditLessonDurationUnit] = useState<DurationUnit>('minutes')
  const [editLessonAssignedTo, setEditLessonAssignedTo] = useState('')
  const [editLessonMaterials, setEditLessonMaterials] = useState<string[]>([])
  const [editLessonMaterialInput, setEditLessonMaterialInput] = useState('')
  const [selectedLessonChild, setSelectedLessonChild] = useState<any | null>(null)

  // Cascade modal state
  const [showCascadeModal, setShowCascadeModal] = useState(false)
  const [cascadeData, setCascadeData] = useState<{
    lessonId: string
    originalDate: string
    newDate: string
    affectedCount: number
    kidId: string
  } | null>(null)
  const [cascadeDays, setCascadeDays] = useState<number>(1)

  // Generate Lessons modal state
  const [showGenerator, setShowGenerator] = useState(false)

  // Per-kid Add Lesson choice sheet
  const [showAddLessonSheet, setShowAddLessonSheet] = useState(false)
  const [addLessonKidId, setAddLessonKidId] = useState<string>('')

  //Generate Assessment
  const [showAssessmentGenerator, setShowAssessmentGenerator] = useState(false)
  const [assessmentLesson, setAssessmentLesson] = useState<Lesson | null>(null)

  // Past assessments viewer state
  const [showPastAssessments, setShowPastAssessments] = useState(false)
  const [pastAssessmentsKidId, setPastAssessmentsKidId] = useState<string | null>(null)
  const [pastAssessmentsKidName, setPastAssessmentsKidName] = useState('')

  // Derived flat list of all lessons (needed for cascade detection)
  const allLessons = Object.values(lessonsByKid).flat()

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = async (userId: string, orgId?: string | null) => {
    const resolvedOrgId = orgId ?? organizationId
    if (!resolvedOrgId) return
    // FIX: Query kids by organization_id so co-teachers see the same kids
    const { data: kidsData } = await supabase
      .from('kids')
      .select('*')
      .eq('organization_id', resolvedOrgId)
      .neq('archived', true)
      .order('created_at', { ascending: false })

    if (kidsData) {
      setKids(kidsData)
      if (kidsData.length > 0 && !selectedKidForLesson) {
        setSelectedKidForLesson(kidsData[0].id)
      }
      setActiveKidId(prev => prev ?? kidsData[0]?.id ?? null)
    }

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('organization_id', resolvedOrgId)
      .order('lesson_date', { ascending: true })

    if (lessonsData) {
      const grouped: { [kidId: string]: Lesson[] } = {}
      lessonsData.forEach((lesson: Lesson) => {
        if (!grouped[lesson.kid_id]) grouped[lesson.kid_id] = []
        grouped[lesson.kid_id].push(lesson)
      })
      setLessonsByKid(grouped)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      // Read actual subscription tier from DB, fall back to dev toggle if no subscription row
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .maybeSingle()
      setUserTier((subData?.tier as UserTier) || getTierForTesting())

      const { orgId: resolvedOrgId, isCoTeacher: coTeacher } = await getOrganizationId(user.id)
      if (!resolvedOrgId) { router.push('/onboarding'); return }
      setIsCoTeacher(coTeacher)
      setOrganizationId(resolvedOrgId)

      const { data: collabData } = await supabase
        .from('family_collaborators')
        .select('id, user_id, name, email')
        .eq('organization_id', resolvedOrgId)
      if (collabData) setCollaborators(collabData)

      // Load vacation periods for date validation
      const { data: vacations } = await supabase
        .from('vacation_periods')
        .select('*')
        .eq('organization_id', resolvedOrgId)
      if (vacations) setVacationPeriods(vacations)

      const { data: schoolSettings } = await supabase
        .from('school_year_settings')
        .select('state_code')
        .eq('organization_id', resolvedOrgId)
        .maybeSingle()
      if (schoolSettings?.state_code) setStateCode(schoolSettings.state_code)

      await loadData(user.id, resolvedOrgId)
      setLoading(false)
    // Read ?date= param and pre-fill Add Lesson form
    const params = new URLSearchParams(window.location.search)
    const dateParam = params.get('date')
    console.log('RAW dateParam from URL:', dateParam)
    if (dateParam) {
      const localDate = new Date(dateParam + 'T12:00:00').toISOString().split('T')[0]
      console.log('localDate after conversion:', localDate)
      setLessonDate(localDate)
      setShowLessonForm(true)
    }
    }
    init()
  }, [])

  // ── Add Lesson ──────────────────────────────────────────────────────────────

  const resetForm = () => {
    setLessonSubjectSelect('')
    setLessonSubjectCustom('')
    setLessonTitle('')
    setLessonDescription('')
    setLessonDate('')
    setLessonDurationValue(30)
    setLessonDurationUnit('minutes')
    setLessonAssignedTo('')
  }

  const addLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKidForLesson) return
    setAddingLesson(true)

    const orgId = organizationId
    if (!orgId) return
    const durationInMinutes = convertDurationToMinutes(lessonDurationValue, lessonDurationUnit)
    const resolvedSubject = lessonSubjectSelect === '__custom__' ? lessonSubjectCustom : lessonSubjectSelect

    const { error } = await supabase.from('lessons').insert([{
      user_id: user.id,
      organization_id: orgId,
      kid_id: selectedKidForLesson,
      subject: resolvedSubject,
      title: lessonTitle,
      description: lessonDescription,
      lesson_date: lessonDate || null,
      duration_minutes: durationInMinutes,
      status: 'not_started',
      assigned_to_user_id: lessonAssignedTo || null,
    }])

    if (error) {
      alert('Error adding lesson: ' + error.message)
    } else {
      resetForm()
      setShowLessonForm(false)
      await loadData(user.id, organizationId)
    }
    setAddingLesson(false)
  }

  // ── Edit Lesson ─────────────────────────────────────────────────────────────

  const startEditLesson = (lesson: any) => {
    setEditingLessonId(lesson.id)
    setEditLessonTitle(lesson.title)
    const isCustom = lesson.subject && !CANONICAL_SUBJECTS.includes(lesson.subject)
    setEditLessonSubjectSelect(isCustom ? '__custom__' : (lesson.subject || ''))
    setEditLessonSubjectCustom(isCustom ? lesson.subject : '')
    setEditLessonDescription(formatLessonDescription(lesson.description) || '')
    setEditLessonDate(lesson.lesson_date || '')
    const duration = convertMinutesToDuration(lesson.duration_minutes)
    setEditLessonDurationValue(duration.value)
    setEditLessonDurationUnit(duration.unit)
    setEditLessonAssignedTo(lesson.assigned_to_user_id || '')
    setEditLessonMaterials(Array.isArray(lesson.materials_needed) ? lesson.materials_needed : [])
    setEditLessonMaterialInput('')
  }

  const cancelEditLesson = () => {
    setEditingLessonId(null)
    setShowLessonEditModal(false)
  }

  const saveEditLesson = async (id: string) => {
    const durationInMinutes = convertDurationToMinutes(editLessonDurationValue, editLessonDurationUnit)
    const resolvedSubject = editLessonSubjectSelect === '__custom__' ? editLessonSubjectCustom : editLessonSubjectSelect
    const updates = {
      title: editLessonTitle,
      subject: resolvedSubject,
      description: editLessonDescription,
      lesson_date: editLessonDate || null,
      duration_minutes: durationInMinutes,
      assigned_to_user_id: editLessonAssignedTo || null,
      materials_needed: editLessonMaterials.length > 0 ? editLessonMaterials : null,
    }

    // Vacation period check
    if (editLessonDate && vacationPeriods.length > 0) {
      const vacation = vacationPeriods.find(v => editLessonDate >= v.start_date && editLessonDate <= v.end_date)
      if (vacation) {
        if (!confirm(`⚠️ ${editLessonDate} falls during ${vacation.name}.\n\nSave lesson anyway?`)) return
      }
    }

    // Holiday check
    if (editLessonDate) {
      const holiday = DEFAULT_HOLIDAYS_2025_2026.find((h: any) => {
        const holidayDate = h.date || h.start
        return holidayDate === editLessonDate
      })
      if (holiday) {
        if (!confirm(`⚠️ ${editLessonDate} is ${holiday.name}.\n\nSave lesson anyway?`)) return
      }
    }

    // Cascade check
    const currentLesson = allLessons.find(l => l.id === id)
    if (currentLesson && currentLesson.lesson_date && editLessonDate && currentLesson.lesson_date !== editLessonDate) {
      const currentLessonDate = currentLesson.lesson_date
      
      const subsequentLessons = allLessons.filter(lesson =>
        lesson.kid_id === currentLesson.kid_id &&
        lesson.id !== id &&
        lesson.lesson_date &&
        lesson.lesson_date > currentLessonDate
      )
      if (subsequentLessons.length > 0) {
        const oldDate = new Date(currentLessonDate)
        const newDateObj = new Date(editLessonDate)
        const suggestedShift = Math.round((newDateObj.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24))
        setCascadeData({
          lessonId: id,
          originalDate: currentLessonDate,
          newDate: editLessonDate,
          affectedCount: subsequentLessons.length,
          kidId: currentLesson.kid_id,
        })
        setCascadeDays(suggestedShift)
        setShowCascadeModal(true)
        return
      }
    }

    await performLessonUpdate(id, updates)
  }

  const performLessonUpdate = async (id: string, updates: any) => {
    const { error } = await supabase.from('lessons').update(updates).eq('id', id)
    if (error) {
      console.error('Error saving lesson:', error)
      alert('Failed to save lesson changes')
    } else {
      setEditingLessonId(null)
      setShowLessonEditModal(false)
      await loadData(user.id, organizationId)
    }
  }

  const handleCascadeUpdate = async (updateAll: boolean) => {
    if (!cascadeData) return
    const { lessonId, originalDate, kidId } = cascadeData
    const daysDiff = cascadeDays
    const durationInMinutes = convertDurationToMinutes(editLessonDurationValue, editLessonDurationUnit)
    const resolvedSubject = editLessonSubjectSelect === '__custom__' ? editLessonSubjectCustom : editLessonSubjectSelect
    const updates = {
      title: editLessonTitle,
      subject: resolvedSubject,
      description: editLessonDescription,
      lesson_date: editLessonDate || null,
      duration_minutes: durationInMinutes,
      assigned_to_user_id: editLessonAssignedTo || null,
      materials_needed: editLessonMaterials.length > 0 ? editLessonMaterials : null,
    }

    await performLessonUpdate(lessonId, updates)

    if (updateAll && daysDiff !== 0) {
      const subsequentLessons = allLessons.filter(lesson =>
        lesson.kid_id === kidId &&
        lesson.id !== lessonId &&
        lesson.lesson_date &&
        lesson.lesson_date > originalDate
      )
      const updatePromises = subsequentLessons.map(lesson => {
        const lessonDate = new Date(lesson.lesson_date!)
        lessonDate.setDate(lessonDate.getDate() + daysDiff)
        return supabase
          .from('lessons')
          .update({ lesson_date: lessonDate.toISOString().split('T')[0] })
          .eq('id', lesson.id)
      })
      const results = await Promise.all(updatePromises)
      const updatedCount = results.filter(r => !r.error).length
      await loadData(user.id, organizationId)
      setShowCascadeModal(false)
      setCascadeData(null)
      setCascadeDays(1)
      setTimeout(() => {
        alert(`✅ Updated ${updatedCount} subsequent lesson${updatedCount !== 1 ? 's' : ''}. All dates shifted by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) !== 1 ? 's' : ''} ${daysDiff > 0 ? 'later' : 'earlier'}.`)
      }, 100)
    } else {
      setShowCascadeModal(false)
      setCascadeData(null)
      setCascadeDays(1)
    }
  }

  // ── Other handlers ──────────────────────────────────────────────────────────

  const handleEditLesson = (lesson: Lesson) => {
    setSelectedLessonChild(kids.find(k => k.id === lesson.kid_id) || null)
    startEditLesson(lesson)
    setShowLessonEditModal(true)
  }

  // Optimistic local update — UI responds instantly, DB write happens in background
  const applyStatusOptimistic = (lessonId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => {
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null
    setLessonsByKid(prev => {
      const next = { ...prev }
      for (const kidId of Object.keys(next)) {
        next[kidId] = next[kidId].map(l =>
          l.id === lessonId ? { ...l, status: newStatus } : l
        )
      }
      return next
    })
    const updates: any = { status: newStatus, completed_at: completedAt }
    supabase.from('lessons').update(updates).eq('id', lessonId)
  }

  const handleCycleStatus = (lessonId: string, currentStatus: string) => {
    const next: Record<string, 'not_started' | 'in_progress' | 'completed'> = {
      not_started: 'in_progress',
      in_progress: 'completed',
      completed: 'not_started',
    }
    const newStatus = next[currentStatus] ?? 'not_started'
    if (newStatus === 'completed') {
      if (!confirm('Mark this lesson as complete?')) return
    }
    applyStatusOptimistic(lessonId, newStatus)
  }

  const handleSetStatus = (lessonId: string, status: 'not_started' | 'in_progress' | 'completed') => {
    applyStatusOptimistic(lessonId, status)
  }


  const hasFeature = (feature: string) => checkFeature(userTier, feature)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const pastUnstartedLessons = Object.values(lessonsByKid).flat()
  .filter(l => l.lesson_date !== null && l.lesson_date < today && l.status === 'not_started')
  .map(l => ({
    id: l.id,
    title: l.title,
    subject: l.subject,
    lesson_date: l.lesson_date!,
    kid_id: l.kid_id,
    kid_name: kids.find(k => k.id === l.kid_id)?.displayname
  }))

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3d3a52' }}>
      <div style={{ color: '#7c3aed', fontWeight: 800, fontSize: 16, fontFamily: "'Nunito', sans-serif" }}>Loading lessons...</div>
    </div>
  )

  return (
    <div className="hr-page" style={{ fontFamily: "'Nunito', sans-serif", paddingBottom: 88 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .kid-pill:hover { opacity: 0.85; }
        .cal-btn:hover { opacity: 0.85; }
      `}</style>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 className="hr-h1" style={{ fontSize: 26, margin: 0, fontFamily: "'Nunito', sans-serif" }}>
            Lessons
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="hr-back-btn"
              onClick={() => router.push('/subjects')}
              style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13 }}>
              📚 Subjects
            </button>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 600, margin: '0 0 20px' }}>
          Lesson plans by child
        </p>

        {/* ── Kid switcher pills ──────────────────────────────────────── */}
        {kids.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 24 }}>
            {kids.map((kid, idx) => {
              const color = KID_COLORS[idx % KID_COLORS.length]
              const isActive = kid.id === activeKidId
              return (
                <button
                  key={kid.id}
                  className="kid-pill"
                  onClick={() => setActiveKidId(kid.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px 8px 10px', borderRadius: 30,
                    border: `2px solid ${isActive ? color : color + '45'}`,
                    background: isActive ? color + '18' : 'rgba(255,255,255,0.65)',
                    fontFamily: "'Nunito', sans-serif", fontWeight: isActive ? 800 : 600,
                    fontSize: 14, color: isActive ? color : '#6b7280',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: color + '30', border: `2px solid ${color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900, color,
                  }}>
                    {kid.displayname.charAt(0).toUpperCase()}
                  </div>
                  {kid.displayname}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '0 16px 100px' }}>
        <PastUnstartedLessonsBanner
          lessons={pastUnstartedLessons}
          onMarkCompleted={async (ids) => {
            await Promise.all(ids.map(id =>
              supabase.from('lessons').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
            ))
            await loadData(user.id, organizationId)
          }}
          onDelete={async (ids) => {
            await Promise.all(ids.map(id =>
              supabase.from('lessons').delete().eq('id', id)
            ))
            await loadData(user.id, organizationId)
          }}
          onViewLesson={(lessonId) => {
            const lesson = allLessons.find(l => l.id === lessonId)
            if (lesson) handleEditLesson(lesson)
          }}
        />
        {kids.length === 0 ? (
          <div className="hr-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: '0 0 8px', fontFamily: "'Nunito', sans-serif" }}>No lessons yet</h2>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 20px', fontFamily: "'Nunito', sans-serif" }}>
              {isCoTeacher
                ? "No lessons found. The account admin hasn't added any lessons yet."
                : "Add your first child and lesson to get started."}
            </p>
          </div>
        ) : (
          <AllChildrenList
            kids={activeKidId ? kids.filter(k => k.id === activeKidId) : kids}
            lessonsByKid={activeKidId ? { [activeKidId]: lessonsByKid[activeKidId] || [] } : lessonsByKid}
            onEditLesson={handleEditLesson}
            onCycleStatus={handleCycleStatus}
            onSetStatus={handleSetStatus}

            onRefresh={() => loadData(user.id, organizationId)}
            organizationId={organizationId ?? undefined}
            stateCode={stateCode}
            onAddLesson={(kidId) => {
              setAddLessonKidId(kidId)
              setShowAddLessonSheet(true)
            }}
          />
        )}
      </main>

      {/* ── Add Lesson Choice Sheet ───────────────────────────────────── */}
      {showAddLessonSheet && (() => {
        const choiceKid = kids.find(k => k.id === addLessonKidId)
        return (
          <>
            <div onClick={() => setShowAddLessonSheet(false)} style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400,
            }} />
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
              background: '#fff', borderRadius: '24px 24px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
              fontFamily: "'Nunito', sans-serif",
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
              </div>
              <div style={{ padding: '16px 20px 40px' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b', marginBottom: 4 }}>
                  Add a Lesson {choiceKid ? `for ${choiceKid.displayname}` : ''}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>
                  How would you like to create this lesson?
                </div>

                {/* Write your own */}
                <button
                  onClick={() => {
                    setSelectedKidForLesson(addLessonKidId)
                    setShowAddLessonSheet(false)
                    setShowLessonForm(true)
                  }}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 14,
                    border: '1.5px solid #e5e7eb', background: '#f9fafb',
                    textAlign: 'left' as const, cursor: 'pointer', marginBottom: 10,
                    fontFamily: "'Nunito', sans-serif",
                  }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b', marginBottom: 3 }}>✏️ Write your own</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Add a custom lesson with your own title and notes</div>
                </button>

                {/* Generate with Scout */}
                <button
                  onClick={() => {
                    setShowAddLessonSheet(false)
                    if (hasFeature('ai_lesson_generation')) {
                      setShowGenerator(true)
                    } else {
                      setShowUpgradeModal(true)
                    }
                  }}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 14,
                    border: '1.5px solid #ede9fe', background: '#faf5ff',
                    textAlign: 'left' as const, cursor: 'pointer', marginBottom: 10,
                    fontFamily: "'Nunito', sans-serif",
                  }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#7c3aed', marginBottom: 3 }}>
                    ✨ Generate with Scout{!hasFeature('ai_lesson_generation') ? ' 🔒' : ''}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>
                    {hasFeature('ai_lesson_generation') ? 'Let Scout create a lesson plan for you' : 'Pro feature — upgrade to unlock Scout-generated plans'}
                  </div>
                </button>

                {/* From curriculum */}
                <button
                  onClick={() => {
                    setSelectedKidForImport(choiceKid || null)
                    setShowAddLessonSheet(false)
                    setShowImporter(true)
                  }}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 14,
                    border: '1.5px solid #e5e7eb', background: '#f9fafb',
                    textAlign: 'left' as const, cursor: 'pointer',
                    fontFamily: "'Nunito', sans-serif",
                  }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b', marginBottom: 3 }}>📋 From curriculum</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Import from your curriculum or a pre-planned lesson</div>
                </button>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Add Lesson Modal ──────────────────────────────────────────── */}
      {showLessonForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', fontFamily: "'Nunito', sans-serif" }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)', padding: '14px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff' }}>Add New Lesson</h3>
              <button onClick={() => { setShowLessonForm(false); resetForm() }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', width: 28, height: 28, cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={addLesson} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1 }}>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 5 }}>SELECT CHILD *</label>
                <select
                  value={selectedKidForLesson}
                  onChange={(e) => setSelectedKidForLesson(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                  required
                >
                  <option value="">Choose a child...</option>
                  {kids.map(kid => (
                    <option key={kid.id} value={kid.id}>
                      {kid.displayname}{kid.grade ? ` (Grade ${kid.grade})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 5 }}>SUBJECT *</label>
                <select
                  value={lessonSubjectSelect}
                  onChange={(e) => setLessonSubjectSelect(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                  required
                >
                  <option value="">Choose a subject...</option>
                  {CANONICAL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__custom__">✏️ Custom subject...</option>
                </select>
                {lessonSubjectSelect === '__custom__' && (
                  <input
                    type="text"
                    value={lessonSubjectCustom}
                    onChange={(e) => setLessonSubjectCustom(e.target.value)}
                    style={{ marginTop: 6, width: '100%', padding: '9px 12px', border: '1.5px solid #7c3aed', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                    placeholder="e.g., Latin, Robotics, Home Economics"
                    required
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 5 }}>LESSON TITLE *</label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                  placeholder="e.g., Introduction to Fractions"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 5 }}>DESCRIPTION <span style={{ fontWeight: 600, color: '#9ca3af' }}>(optional)</span></label>
                <textarea
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box', resize: 'none' }}
                  placeholder="What will you cover in this lesson?"
                  rows={2}
                />
              </div>

              {collaborators.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 5 }}>ASSIGN TO <span style={{ fontWeight: 600, color: '#9ca3af' }}>(optional)</span></label>
                  <select
                    value={lessonAssignedTo}
                    onChange={(e) => setLessonAssignedTo(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                  >
                    <option value="">Me (primary teacher)</option>
                    {collaborators.map(c => (
                      <option key={c.id} value={c.user_id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Duration */}
              <div style={{ background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: '12px 14px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 8 }}>DURATION</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {[15, 30, 45, 60].map(min => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => { setLessonDurationValue(min); setLessonDurationUnit('minutes') }}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 8, fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none',
                        background: lessonDurationValue === min && lessonDurationUnit === 'minutes' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#fff',
                        color: lessonDurationValue === min && lessonDurationUnit === 'minutes' ? '#fff' : '#374151',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    value={lessonDurationValue}
                    onChange={(e) => setLessonDurationValue(parseInt(e.target.value) || 1)}
                    style={{ width: 70, padding: '7px 10px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif" }}
                  />
                  <select
                    value={lessonDurationUnit}
                    onChange={(e) => setLessonDurationUnit(e.target.value as DurationUnit)}
                    style={{ flex: 1, padding: '7px 10px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif" }}
                  >
                    <option value="minutes">minutes</option>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                  </select>
                </div>
              </div>

              {/* Schedule */}
              <div style={{ background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="schedule-now"
                    checked={!!lessonDate}
                    onChange={(e) => {
                      if (!e.target.checked) setLessonDate('')
                      else setLessonDate(new Date().toLocaleDateString('en-CA'))
                    }}
                    style={{ accentColor: '#7c3aed', width: 16, height: 16 }}
                  />
                  <label htmlFor="schedule-now" style={{ fontSize: 13, fontWeight: 700, color: '#4c1d95', cursor: 'pointer' }}>
                    Schedule for a specific date
                  </label>
                </div>
                {lessonDate && (
                  <input
                    type="date"
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    style={{ marginTop: 8, width: '100%', padding: '7px 10px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={addingLesson}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                  background: addingLesson ? '#c4b5fd' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  color: '#fff', fontSize: 15, fontWeight: 800, cursor: addingLesson ? 'not-allowed' : 'pointer',
                  fontFamily: "'Nunito', sans-serif", flexShrink: 0,
                }}
              >
                {addingLesson ? 'Adding Lesson…' : 'Add Lesson'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Lesson Modal ─────────────────────────────────────────── */}
      {showLessonEditModal && editingLessonId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', fontFamily: "'Nunito', sans-serif" }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)', padding: '10px 16px', borderRadius: '20px 20px 0 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#fff' }}>✏️ Edit Lesson</h3>
                <button onClick={cancelEditLesson} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', width: 26, height: 26, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              {selectedLessonChild && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                  {selectedLessonChild.displayname}{selectedLessonChild.grade ? ` • Grade ${selectedLessonChild.grade}` : ''}
                </p>
              )}
            </div>

            {/* Scrollable body */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 3 }}>SUBJECT *</label>
                <select
                  value={editLessonSubjectSelect}
                  onChange={(e) => setEditLessonSubjectSelect(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                  required
                >
                  <option value="">Choose a subject...</option>
                  {CANONICAL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__custom__">✏️ Custom subject...</option>
                </select>
                {editLessonSubjectSelect === '__custom__' && (
                  <input
                    type="text"
                    value={editLessonSubjectCustom}
                    onChange={(e) => setEditLessonSubjectCustom(e.target.value)}
                    style={{ marginTop: 4, width: '100%', padding: '7px 10px', border: '1.5px solid #7c3aed', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                    placeholder="e.g., Latin, Robotics, Home Economics"
                    required autoFocus
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 3 }}>LESSON TITLE *</label>
                <input
                  type="text"
                  value={editLessonTitle}
                  onChange={(e) => setEditLessonTitle(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 3 }}>DESCRIPTION <span style={{ fontWeight: 600, color: '#9ca3af' }}>(optional)</span></label>
                <textarea
                  value={editLessonDescription}
                  onChange={(e) => setEditLessonDescription(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box', resize: 'none' }}
                  rows={2}
                />
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 3 }}>STATUS</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['not_started', 'in_progress', 'completed'] as const).map((s) => {
                    const labels = { not_started: '⬜ Not Started', in_progress: '🔵 In Progress', completed: '✅ Complete' }
                    const isSelected = (editingLessonId && Object.values(lessonsByKid).flat().find(l => l.id === editingLessonId)?.status === s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={async () => {
                          if (!editingLessonId) return
                          const updates: any = { status: s }
                          if (s === 'completed') updates.completed_at = new Date().toISOString()
                          if (s === 'not_started') updates.completed_at = null
                          await supabase.from('lessons').update(updates).eq('id', editingLessonId)
                          await loadData(user.id, organizationId)
                        }}
                        style={{
                          flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                          cursor: 'pointer', border: 'none', fontFamily: "'Nunito', sans-serif",
                          background: isSelected ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#f3f4f6',
                          color: isSelected ? '#fff' : '#374151',
                        }}
                      >
                        {labels[s]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {collaborators.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 3 }}>ASSIGN TO <span style={{ fontWeight: 600, color: '#9ca3af' }}>(optional)</span></label>
                  <select
                    value={editLessonAssignedTo}
                    onChange={(e) => setEditLessonAssignedTo(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                  >
                    <option value="">Me (primary teacher)</option>
                    {collaborators.map(c => (
                      <option key={c.id} value={c.user_id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Duration */}
              <div style={{ background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: '10px 12px' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 6 }}>DURATION</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  {[15, 30, 45, 60].map(min => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => { setEditLessonDurationValue(min); setEditLessonDurationUnit('minutes') }}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 8, fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none',
                        background: editLessonDurationValue === min && editLessonDurationUnit === 'minutes' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#fff',
                        color: editLessonDurationValue === min && editLessonDurationUnit === 'minutes' ? '#fff' : '#374151',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    value={editLessonDurationValue}
                    onChange={(e) => setEditLessonDurationValue(parseInt(e.target.value) || 1)}
                    style={{ width: 70, padding: '7px 10px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif" }}
                  />
                  <select
                    value={editLessonDurationUnit}
                    onChange={(e) => setEditLessonDurationUnit(e.target.value as DurationUnit)}
                    style={{ flex: 1, padding: '7px 10px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif" }}
                  >
                    <option value="minutes">minutes</option>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                  </select>
                </div>
              </div>

              {/* Schedule */}
              <div style={{ background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="edit-schedule-date"
                    checked={!!editLessonDate}
                    onChange={(e) => {
                      if (!e.target.checked) setEditLessonDate('')
                      else setEditLessonDate(new Date().toLocaleDateString('en-CA'))
                    }}
                    style={{ accentColor: '#7c3aed', width: 16, height: 16 }}
                  />
                  <label htmlFor="edit-schedule-date" style={{ fontSize: 12, fontWeight: 700, color: '#4c1d95', cursor: 'pointer' }}>
                    Schedule for a specific date
                  </label>
                </div>
                {editLessonDate && (
                  <input
                    type="date"
                    value={editLessonDate}
                    onChange={(e) => setEditLessonDate(e.target.value)}
                    style={{ marginTop: 6, width: '100%', padding: '6px 10px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                  />
                )}
              </div>

              {/* Materials needed */}
              <div style={{ background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: '10px 12px' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 6 }}>
                  MATERIALS NEEDED <span style={{ fontWeight: 600, color: '#9ca3af' }}>(optional)</span>
                </label>
                {editLessonMaterials.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {editLessonMaterials.map((mat, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ede9fe', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: '#5b21b6' }}>
                        <span>{mat}</span>
                        <button
                          type="button"
                          onClick={() => setEditLessonMaterials(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={editLessonMaterialInput}
                    onChange={e => setEditLessonMaterialInput(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && editLessonMaterialInput.trim()) {
                        e.preventDefault()
                        setEditLessonMaterials(prev => [...prev, editLessonMaterialInput.trim()])
                        setEditLessonMaterialInput('')
                      }
                    }}
                    placeholder="e.g. graph paper, ruler…"
                    style={{ flex: 1, padding: '6px 10px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editLessonMaterialInput.trim()) {
                        setEditLessonMaterials(prev => [...prev, editLessonMaterialInput.trim()])
                        setEditLessonMaterialInput('')
                      }
                    }}
                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
                  >+ Add</button>
                </div>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, margin: '5px 0 0' }}>Press Enter or comma to add each item</p>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={cancelEditLesson}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveEditLesson(editingLessonId)}
                  style={{ flex: 2, padding: '10px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cascade Modal ─────────────────────────────────────────────── */}
      {showCascadeModal && cascadeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">⚠️ Date Change Detected</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-900">
                You're changing the lesson date from{' '}
                <strong>{new Date(cascadeData.originalDate + 'T00:00:00').toLocaleDateString()}</strong> to{' '}
                <strong>{new Date(cascadeData.newDate + 'T00:00:00').toLocaleDateString()}</strong>.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  📅 This affects {cascadeData.affectedCount} subsequent lesson{cascadeData.affectedCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-blue-800">Would you like to shift all subsequent lessons by the same amount?</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift subsequent lessons by:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={cascadeDays}
                    onChange={(e) => setCascadeDays(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-900"
                  />
                  <span className="text-sm text-gray-600">days</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => { setShowCascadeModal(false); setCascadeData(null); setCascadeDays(1) }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <div className="flex-1" />
              <button
                onClick={() => handleCascadeUpdate(false)}
                className="px-4 py-2 border border-blue-300 bg-blue-50 rounded text-blue-700 hover:bg-blue-100 font-medium"
              >
                This Lesson Only
              </button>
              <button
                onClick={() => handleCascadeUpdate(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Update All ({cascadeData.affectedCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Generate Lessons Modal ────────────────────────────────────── */}
      {showGenerator && (
        <LessonGenerator
          kids={kids}
          userId={user.id}
          initialDate={lessonDate || undefined}
          onClose={() => { setShowGenerator(false); loadData(user.id, organizationId) }}
        />
      )}

      {showImporter && (() => {
        const importKid = selectedKidForImport || kids.find(k => k.id === addLessonKidId)
        if (!importKid) return null
        return (
          <CurriculumImporter
            childId={importKid.id}
            childName={importKid.displayname}
            onClose={() => setShowImporter(false)}
            onImportComplete={() => {
              setShowImporter(false)
              loadData(user.id, organizationId)
            }}
          />
        )
      })()}

      {/* ── Upgrade Modal ────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <UpgradeModal
          featureName="Generate with Scout"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {/* ── Generate Assessments  ───────────────────────────────────── */}
      {showAssessmentGenerator && assessmentLesson && (
        <GenerateAssessmentModal
          lesson={assessmentLesson}
          kids={kids}
          onClose={() => {
            setShowAssessmentGenerator(false)
            setAssessmentLesson(null)
          }}
        />
      )}

      {/* ── Past Assessments Viewer ───────────────────────────────────── */}
      {showPastAssessments && pastAssessmentsKidId && (
        <PastAssessmentsViewer
          kidId={pastAssessmentsKidId}
          kidName={pastAssessmentsKidName}
          onClose={() => {
            setShowPastAssessments(false)
            setPastAssessmentsKidId(null)
            setPastAssessmentsKidName('')
          }}
        />
      )}

      <DevTierToggle />

    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function LessonsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <LessonsContent />
      </Suspense>
    </AuthGuard>
  )
}