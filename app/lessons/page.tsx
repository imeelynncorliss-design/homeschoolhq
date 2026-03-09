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
import { type UserTier, getTierForTesting, hasFeature as checkFeature, getUpgradeMessage } from '@/lib/tierTesting'
import CurriculumImporter from '@/components/CurriculumImporter'
import { formatLessonDescription } from '@/lib/formatLessonDescription'
import { DEFAULT_HOLIDAYS_2025_2026 } from '@/app/utils/holidayUtils'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import GenerateAssessmentModal from '@/components/GenerateAssessmentModal'

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

// ─── Page Content ─────────────────────────────────────────────────────────────

function LessonsContent() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<any[]>([])
  const [lessonsByKid, setLessonsByKid] = useState<{ [kidId: string]: Lesson[] }>({})
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [collaborators, setCollaborators] = useState<{ id: string; user_id: string; name: string; email: string }[]>([])
  const [userTier, setUserTier] = useState<UserTier>('FREE')
  const [vacationPeriods, setVacationPeriods] = useState<any[]>([])
  const [isCoTeacher, setIsCoTeacher] = useState(false)  // NEW

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
      .order('created_at', { ascending: false })

    if (kidsData) {
      setKids(kidsData)
      if (kidsData.length > 0 && !selectedKidForLesson) {
        setSelectedKidForLesson(kidsData[0].id)
      }
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
      setUserTier(getTierForTesting())

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

  const handleDeleteLesson = async (id: string) => {
    const lesson = Object.values(lessonsByKid).flat().find(l => l.id === id)
    const msg = lesson?.duration_minutes
      ? `This lesson has ${lesson.duration_minutes} min tracked.\n\nDeleting will remove these hours. Continue?`
      : 'Delete this lesson?'
    if (!confirm(msg)) return
    await supabase.from('lessons').delete().eq('id', id).eq('user_id', user.id)
    await loadData(user.id, organizationId)
  }

  const handleCycleStatus = async (lessonId: string, currentStatus: string) => {
    const next: Record<string, 'not_started' | 'in_progress' | 'completed'> = {
      not_started: 'in_progress',
      in_progress: 'completed',
      completed: 'not_started',
    }
    const newStatus = next[currentStatus] ?? 'not_started'
    // Confirm before marking complete
    if (newStatus === 'completed') {
      if (!confirm('Mark this lesson as complete?')) return
    }
    const updates: any = { status: newStatus }
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
    if (newStatus === 'not_started') updates.completed_at = null
    await supabase.from('lessons').update(updates).eq('id', lessonId)
    await loadData(user.id, organizationId)
  }

  const handleGenerateAssessment = (lesson: Lesson) => {
    setAssessmentLesson(lesson)
    setShowAssessmentGenerator(true)
  }

  const handleViewPastAssessments = (kidId: string, kidName: string) => {
    setPastAssessmentsKidId(kidId)
    setPastAssessmentsKidName(kidName)
    setShowPastAssessments(true)
  }

  const hasFeature = (feature: string) => checkFeature(userTier, feature)
  const today = new Date(new Date().toLocaleDateString('en-CA') + 'T12:00:00').toISOString().split('T')[0]
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff' }}>
      <div style={{ color: '#7c3aed', fontWeight: 700, fontSize: 16 }}>Loading lessons...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff', fontFamily: 'var(--font-dm-sans), sans-serif' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 45%, #a855f7 75%, #ec4899 100%)',
        padding: '0 24px',
        height: 58,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 600,
              padding: '6px 14px', cursor: 'pointer',
            }}
          >
            ← Dashboard
          </button>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: 0 }}>
            📚 Lessons
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasFeature('ai_generation') ? (
            <button
              onClick={() => setShowGenerator(true)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8, color: '#fff',
                fontSize: 13, fontWeight: 600,
                padding: '6px 14px', cursor: 'pointer',
              }}
            >
              ✨ Generate Lessons
            </button>
          ) : (
            <button
              onClick={() => { alert(getUpgradeMessage('ai_generation')); router.push('/pricing') }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, color: 'rgba(255,255,255,0.5)',
                fontSize: 13, fontWeight: 600,
                padding: '6px 14px', cursor: 'pointer',
              }}
            >
              ✨ Generate Lessons 🔒
            </button>
          )}

          <button
            onClick={() => {
              setSelectedKidForImport(kids[0] || null)
              setShowImporter(true)
            }}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 600,
              padding: '6px 14px', cursor: 'pointer',
            }}
          >
            ⬆️ Import Curriculum
          </button>

          <button
            onClick={() => setShowLessonForm(true)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 700,
              padding: '6px 16px', cursor: 'pointer',
            }}
          >
            + Add Lesson
          </button>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 64px' }}>
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
      />
        {kids.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 14,
            border: '1.5px solid #ede9fe',
            padding: '48px 32px', textAlign: 'center',
            boxShadow: '0 4px 16px rgba(124,58,237,0.08)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: '0 0 8px' }}>No lessons yet</h2>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 20px' }}>
              {isCoTeacher
                ? "No lessons found. The account admin hasn't added any lessons yet."
                : "Add your first child and lesson to get started."}
            </p>
            {!isCoTeacher && (
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '12px 28px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Go to Dashboard
              </button>
            )}
          </div>
        ) : (
          <AllChildrenList
            kids={kids}
            lessonsByKid={lessonsByKid}
            onEditLesson={handleEditLesson}
            onDeleteLesson={handleDeleteLesson}
            onCycleStatus={handleCycleStatus}
            onGenerateAssessment={handleGenerateAssessment}
            onViewPastAssessments={handleViewPastAssessments}
            onRefresh={() => loadData(user.id, organizationId)}
          />
        )}
      </main>

      {/* ── Add Lesson Modal ──────────────────────────────────────────── */}
      {showLessonForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-500 to-teal-500 px-6 py-4 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">+ Add New Lesson</h3>
                <button
                  onClick={() => { setShowLessonForm(false); resetForm() }}
                  className="text-white hover:text-gray-200 text-2xl leading-none font-light"
                >×</button>
              </div>
            </div>

            <form onSubmit={addLesson} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Child *</label>
                <select
                  value={selectedKidForLesson}
                  onChange={(e) => setSelectedKidForLesson(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <select
                  value={lessonSubjectSelect}
                  onChange={(e) => setLessonSubjectSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Latin, Robotics, Home Economics"
                    required
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Title *</label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Introduction to Fractions"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="What will you cover in this lesson?"
                  rows={3}
                />
              </div>

              {collaborators.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={lessonAssignedTo}
                    onChange={(e) => setLessonAssignedTo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Me (primary teacher)</option>
                    {collaborators.map(c => (
                      <option key={c.id} value={c.user_id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700">How long will this lesson take?</label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map(min => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => { setLessonDurationValue(min); setLessonDurationUnit('minutes') }}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all ${
                        lessonDurationValue === min && lessonDurationUnit === 'minutes'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={lessonDurationValue}
                    onChange={(e) => setLessonDurationValue(parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                  <select
                    value={lessonDurationUnit}
                    onChange={(e) => setLessonDurationUnit(e.target.value as DurationUnit)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="minutes">minutes</option>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                  </select>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="schedule-now"
                    checked={!!lessonDate}
                    onChange={(e) => {
                      if (!e.target.checked) setLessonDate('')
                      else setLessonDate(new Date().toLocaleDateString('en-CA'))  // ← local date
                    }}
                    className="rounded"
                  />
                  <label htmlFor="schedule-now" className="text-sm font-medium text-gray-700">
                    Schedule for a specific date
                  </label>
                </div>
                {lessonDate && (
                  <input
                    type="date"
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={addingLesson}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {addingLesson ? 'Adding Lesson...' : 'Add Lesson'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Lesson Modal ─────────────────────────────────────────── */}
      {showLessonEditModal && editingLessonId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">✏️ Edit Lesson</h3>
                <button onClick={cancelEditLesson} className="text-white hover:text-gray-200 text-2xl leading-none font-light">×</button>
              </div>
              {selectedLessonChild && (
                <p className="text-blue-100 text-sm mt-1">
                  {selectedLessonChild.displayname}
                  {selectedLessonChild.grade ? ` • Grade ${selectedLessonChild.grade}` : ''}
                </p>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <select
                  value={editLessonSubjectSelect}
                  onChange={(e) => setEditLessonSubjectSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
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
                    className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="e.g., Latin, Robotics, Home Economics"
                    required
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Title *</label>
                <input
                  type="text"
                  value={editLessonTitle}
                  onChange={(e) => setEditLessonTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={editLessonDescription}
                  onChange={(e) => setEditLessonDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  rows={3}
                />
              </div>

              {/* Status field — allows undoing accidental completion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex gap-2">
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
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {labels[s]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {collaborators.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={editLessonAssignedTo}
                    onChange={(e) => setEditLessonAssignedTo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
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
                    <button
                      key={min}
                      type="button"
                      onClick={() => { setEditLessonDurationValue(min); setEditLessonDurationUnit('minutes') }}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all ${
                        editLessonDurationValue === min && editLessonDurationUnit === 'minutes'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={editLessonDurationValue}
                    onChange={(e) => setEditLessonDurationValue(parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                  <select
                    value={editLessonDurationUnit}
                    onChange={(e) => setEditLessonDurationUnit(e.target.value as DurationUnit)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="minutes">minutes</option>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                  </select>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-schedule-date"
                    checked={!!editLessonDate}
                    onChange={(e) => {
                      if (!e.target.checked) setEditLessonDate('')
                        else setEditLessonDate(new Date().toLocaleDateString('en-CA'))
                    }}
                    className="rounded"
                  />
                  <label htmlFor="edit-schedule-date" className="text-sm font-medium text-gray-700">
                    Schedule for a specific date
                  </label>
                </div>
                {editLessonDate && (
                  <input
                    type="date"
                    value={editLessonDate}
                    onChange={(e) => setEditLessonDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelEditLesson}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveEditLesson(editingLessonId)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
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

      {showImporter && selectedKidForImport && (
        <CurriculumImporter
          childId={selectedKidForImport.id}
          childName={selectedKidForImport.displayname}
          onClose={() => setShowImporter(false)}
          onImportComplete={() => {
            setShowImporter(false)
            loadData(user.id, organizationId)
          }}
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