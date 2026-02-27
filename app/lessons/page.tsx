'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import AllChildrenList from '@/components/AllChildrenList'
import PastAssessmentsViewer from '@/components/PastAssessmentsViewer'
import LessonGenerator from '@/components/LessonGenerator'
import DevTierToggle from '@/components/DevTierToggle'
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'
import { type UserTier, getTierForTesting, hasFeature as checkFeature, getUpgradeMessage } from '@/lib/tierTesting'
import CurriculumImporter from '@/components/CurriculumImporter'

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

  // Generate Lessons modal state
  const [showGenerator, setShowGenerator] = useState(false)

  // Past assessments viewer state
  const [showPastAssessments, setShowPastAssessments] = useState(false)
  const [pastAssessmentsKidId, setPastAssessmentsKidId] = useState<string | null>(null)
  const [pastAssessmentsKidName, setPastAssessmentsKidName] = useState('')

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = async (userId: string) => {
    const { data: kidsData } = await supabase
      .from('kids')
      .select('*')
      .eq('user_id', userId)
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
      .eq('user_id', userId)
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

      // Load org ID and collaborators
      const { data: kidData } = await supabase
        .from('kids')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      const orgId = kidData?.organization_id || user.id
      setOrganizationId(orgId)

      const { data: collabData } = await supabase
        .from('family_collaborators')
        .select('id, user_id, name, email')
        .eq('organization_id', orgId)
      if (collabData) setCollaborators(collabData)

      await loadData(user.id)
      setLoading(false)
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

    const orgId = organizationId || user.id
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
      await loadData(user.id)
    }
    setAddingLesson(false)
  }

  // ── Other handlers ──────────────────────────────────────────────────────────

  const handleEditLesson = (lesson: Lesson) => {
    router.push(`/calendar?editLesson=${lesson.id}`)
  }

  const handleDeleteLesson = async (id: string) => {
    const lesson = Object.values(lessonsByKid).flat().find(l => l.id === id)
    const msg = lesson?.duration_minutes
      ? `This lesson has ${lesson.duration_minutes} min tracked.\n\nDeleting will remove these hours. Continue?`
      : 'Delete this lesson?'
    if (!confirm(msg)) return
    await supabase.from('lessons').delete().eq('id', id).eq('user_id', user.id)
    await loadData(user.id)
  }

  const handleCycleStatus = async (lessonId: string, currentStatus: string) => {
    const next: Record<string, 'not_started' | 'in_progress' | 'completed'> = {
      not_started: 'in_progress',
      in_progress: 'completed',
      completed: 'not_started',
    }
    const newStatus = next[currentStatus] ?? 'not_started'
    const updates: any = { status: newStatus }
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
    if (newStatus === 'not_started') updates.completed_at = null
    await supabase.from('lessons').update(updates).eq('id', lessonId)
    await loadData(user.id)
  }

  const handleViewPastAssessments = (kidId: string, kidName: string) => {
    setPastAssessmentsKidId(kidId)
    setPastAssessmentsKidName(kidName)
    setShowPastAssessments(true)
  }

  const hasFeature = (feature: string) => checkFeature(userTier, feature)

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
        {/* Left: Home + Title */}
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
            ← Home
          </button>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: 0 }}>
            📚 Lessons
          </h1>
        </div>

        {/* Right: Action buttons */}
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
              Add your first child and lesson to get started.
            </p>
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
          </div>
        ) : (
          <AllChildrenList
            kids={kids}
            lessonsByKid={lessonsByKid}
            onEditLesson={handleEditLesson}
            onDeleteLesson={handleDeleteLesson}
            onCycleStatus={handleCycleStatus}
            onViewPastAssessments={handleViewPastAssessments}
          />
        )}
      </main>

      {/* ── Add Lesson Modal ──────────────────────────────────────────── */}
      {showLessonForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
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
              {/* Child */}
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

              {/* Subject */}
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

              {/* Title */}
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

              {/* Description */}
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

              {/* Assign To */}
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

              {/* Duration */}
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

              {/* Date (optional) */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="schedule-now"
                    checked={!!lessonDate}
                    onChange={(e) => {
                      if (!e.target.checked) setLessonDate('')
                      else setLessonDate(new Date().toISOString().split('T')[0])
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

      {/* ── Generate Lessons Modal ────────────────────────────────────── */}
      {showGenerator && (
        <LessonGenerator
          kids={kids}
          userId={user.id}
          onClose={() => { setShowGenerator(false); loadData(user.id) }}
        />
      )}

      {showImporter && selectedKidForImport && (
        <CurriculumImporter
          childId={selectedKidForImport.id}
          childName={selectedKidForImport.displayname}
          onClose={() => setShowImporter(false)}
          onImportComplete={() => {
            setShowImporter(false)
            loadData(user.id)
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