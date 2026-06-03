'use client';

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import { useAppHeader } from '@/components/layout/AppHeader'
import AuthGuard from '@/components/AuthGuard'
import AssessmentStandardsManager from '@/components/AssessmentStandardsManager'
import StandardsImporter from '@/components/StandardsImporter'
import StandardsManager from '@/components/StandardsManager'
import AssessmentsHelpModal from '@/components/AssessmentsHelpModal'
import { Lightbulb, ChevronDown, ChevronRight } from 'lucide-react'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { pageShell } from '@/src/lib/designTokens'
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'

const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = createClient()
    return client[prop as keyof typeof client]
  },
})

// ─── Types ────────────────────────────────────────────────────────────────────

type AssessmentWithDetails = {
  id: string
  lesson_id: string
  kid_id: string
  type: string
  difficulty: string
  created_at: string
  content: unknown
  lesson_title: string
  lesson_subject: string
  kid_name: string
  standards_count: number
  result?: {
    id: string
    auto_score: number | null
    submitted_at: string
    needs_manual_grading: boolean
  }
}

type AssessmentRow = {
  id: string
  lesson_id: string
  kid_id: string
  type: string
  difficulty: string
  created_at: string
  content: unknown
  lessons: { id: string; title: string; subject: string } | { id: string; title: string; subject: string }[] | null
  kids: { id: string; displayname: string } | { id: string; displayname: string }[] | null
}

type AssessmentResultRow = {
  id: string
  assessment_id: string
  auto_score: number | null
  submitted_at: string
  needs_manual_grading: boolean
}

type AssessmentStandardRow = {
  assessment_id: string
}

type Standard = {
  id: string
  state_code: string
  grade_level: string
  subject: string
  standard_code: string
  description: string
  domain: string
  source: string
  customized: boolean
  active: boolean
}

type KidOption = {
  id: string
  displayname: string
}

type DailyLogEvidence = {
  id: string
  kid_id: string
  log_date: string
  subjects: string[]
  notes: string | null
  hours: number | null
  created_at: string | null
}

type LessonCheckInEvidence = {
  id: string
  kid_id: string
  lesson_id: string
  proficiency: 'needs_support' | 'progressing' | 'got_it'
  notes: string | null
  checked_in_at: string
  lessons: { title: string; subject: string } | { title: string; subject: string }[] | null
}

type EvidenceItem = {
  id: string
  source: 'assessment' | 'daily_log' | 'lesson_checkin'
  created_at: string
  evidence_date: string
  kid_id: string
  kid_name: string
  subject: string
  title: string
  type: string
  note?: string | null
  hours?: number | null
  standards_count?: number
  assessment?: AssessmentWithDetails
}

type MonthGroup = {
  month: string
  year: number
  evidence: EvidenceItem[]
  isCollapsed: boolean
}

// ─── Page Content ─────────────────────────────────────────────────────────────

function AssessmentsContent() {
  const router = useRouter()
  useAppHeader({ title: 'Progress Evidence & Assessments', backHref: '/reports' })
  const [currentView, setCurrentView] = useState<'results' | 'standards'>('results')
  const [assessments, setAssessments] = useState<AssessmentWithDetails[]>([])
  const [dailyLogs, setDailyLogs] = useState<DailyLogEvidence[]>([])
  const [lessonCheckIns, setLessonCheckIns] = useState<LessonCheckInEvidence[]>([])
  const [kids, setKids] = useState<KidOption[]>([])
  const [loading, setLoading] = useState(true)
  const [managingStandards, setManagingStandards] = useState<AssessmentWithDetails | null>(null)
  const [showImporter, setShowImporter] = useState(false)
  const [showStandardsManager, setShowStandardsManager] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [standards, setStandards] = useState<Standard[]>([])
  const [standardsLoading, setStandardsLoading] = useState(false)
  const [filters, setFilters] = useState({ subject: '', grade_level: '', search: '' })
  const [assessmentFilters, setAssessmentFilters] = useState({ kid: '', subject: '', schoolYear: '' })
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [showLogEvidence, setShowLogEvidence] = useState(false)
  const [logForm, setLogForm] = useState({ kid_id: '', log_date: new Date().toISOString().slice(0, 10), subject: '', notes: '', hours: '' })
  const [logSaving, setLogSaving] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  // ── Auth + co-teacher guard ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Co-teacher guard — assessments is admin-only
      const { orgId, isCoTeacher } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }
      if (isCoTeacher) { router.push('/dashboard'); return }

      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname')
        .eq('organization_id', orgId)
        .neq('archived', true)
        .order('created_at', { ascending: true })

      const kidList = (kidsData || []) as KidOption[]
      setKids(kidList)
      if (kidList.length > 0) setLogForm(prev => ({ ...prev, kid_id: kidList[0].id }))
      setOrganizationId(orgId)
    }
    init()
  }, [])

  useEffect(() => {
    if (organizationId) {
      loadAssessments()
      loadDailyLogs()
      loadLessonCheckIns()
    }
  }, [organizationId])

  useEffect(() => {
    if (currentView === 'standards' && organizationId) loadStandards()
  }, [currentView, filters, organizationId])

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadAssessments = async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessments')
        .select(`*, lessons!inner(id, title, subject), kids!inner(id, displayname)`)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (assessmentsError) throw assessmentsError
      if (!assessmentsData) { setAssessments([]); return }

      const typedAssessments = assessmentsData as AssessmentRow[]
      const assessmentIds = typedAssessments.map(a => a.id)
      const { data: results } = await supabase.from('assessment_results').select('*').in('assessment_id', assessmentIds)
      const { data: standardsCounts } = await supabase.from('assessment_standards').select('assessment_id').in('assessment_id', assessmentIds)
      const typedResults = (results || []) as AssessmentResultRow[]
      const typedStandardsCounts = (standardsCounts || []) as AssessmentStandardRow[]

      const standardsMap = new Map<string, number>()
      typedStandardsCounts.forEach((s) => {
        standardsMap.set(s.assessment_id, (standardsMap.get(s.assessment_id) || 0) + 1)
      })

      const combined = typedAssessments.map((assessment) => {
        const lessonData = Array.isArray(assessment.lessons) ? assessment.lessons[0] : assessment.lessons
        const kidData = Array.isArray(assessment.kids) ? assessment.kids[0] : assessment.kids
        const result = typedResults.find((r) => r.assessment_id === assessment.id)
        return {
          id: assessment.id,
          lesson_id: assessment.lesson_id,
          kid_id: assessment.kid_id,
          type: assessment.type,
          difficulty: assessment.difficulty,
          created_at: assessment.created_at,
          content: assessment.content,
          lesson_title: lessonData?.title || 'Unknown Lesson',
          lesson_subject: lessonData?.subject || 'Unknown Subject',
          kid_name: kidData?.displayname || 'Unknown Student',
          standards_count: standardsMap.get(assessment.id) || 0,
          result: result ? {
            id: result.id,
            auto_score: result.auto_score,
            submitted_at: result.submitted_at,
            needs_manual_grading: result.needs_manual_grading
          } : undefined
        }
      })
      setAssessments(combined)
    } catch (err) {
      console.error('Error fetching assessments:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDailyLogs = async () => {
    if (!organizationId) return
    try {
      const { data, error } = await supabase
        .from('daily_subject_logs')
        .select('id, kid_id, log_date, subjects, notes, hours, created_at')
        .eq('organization_id', organizationId)
        .order('log_date', { ascending: false })
        .limit(100)
      if (error) throw error
      setDailyLogs((data || []) as DailyLogEvidence[])
    } catch (error) {
      console.error('Error loading daily evidence logs:', error)
    }
  }

  const loadLessonCheckIns = async () => {
    if (!organizationId) return
    try {
      const { data, error } = await supabase
        .from('lesson_checkins')
        .select('id, kid_id, lesson_id, proficiency, notes, checked_in_at, lessons(title, subject)')
        .eq('organization_id', organizationId)
        .order('checked_in_at', { ascending: false })
        .limit(100)
      if (error) throw error
      setLessonCheckIns((data || []) as LessonCheckInEvidence[])
    } catch (error) {
      console.error('Error loading lesson check-ins:', error)
    }
  }

  const loadStandards = async () => {
    if (!organizationId) return
    setStandardsLoading(true)
    try {
      let query = supabase.from('available_templates').select('*')
      if (filters.subject) query = query.ilike('subject', `%${filters.subject}%`)
      if (filters.grade_level) query = query.eq('grade_level', filters.grade_level)
      if (filters.search) query = query.or(`standard_code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      const { data, error } = await query.order('grade_level', { ascending: true })
      if (error) throw error
      setStandards(data || [])
    } catch (error) {
      console.error('Error loading standards:', error)
    } finally {
      setStandardsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return
    const { error } = await supabase.from('assessments').delete().eq('id', id)
    if (error) alert("Error deleting assessment")
    else loadAssessments()
  }

  const handleDeleteDailyLog = async (id: string) => {
    if (!confirm('Delete this progress evidence note?')) return
    const { error } = await supabase.from('daily_subject_logs').delete().eq('id', id)
    if (error) alert('Error deleting progress evidence')
    else loadDailyLogs()
  }

  const handleDeleteLessonCheckIn = async (id: string) => {
    if (!confirm('Delete this lesson check-in from progress evidence?')) return
    const { error } = await supabase.from('lesson_checkins').delete().eq('id', id)
    if (error) alert('Error deleting lesson check-in')
    else loadLessonCheckIns()
  }

  const handleLogEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !logForm.kid_id || !logForm.subject) {
      setLogError('Choose a child and subject.')
      return
    }
    setLogSaving(true)
    setLogError(null)

    const { data: existingLog } = await supabase
      .from('daily_subject_logs')
      .select('subjects, notes, hours')
      .eq('organization_id', organizationId)
      .eq('kid_id', logForm.kid_id)
      .eq('log_date', logForm.log_date)
      .maybeSingle()

    const note = logForm.notes.trim()
    const mergedSubjects = Array.from(new Set([...(existingLog?.subjects || []), logForm.subject]))
    const mergedNotes = [existingLog?.notes, note].filter(Boolean).join('\n\n') || null
    const mergedHours = logForm.hours ? parseFloat(logForm.hours) : existingLog?.hours || null

    const { error } = await supabase
      .from('daily_subject_logs')
      .upsert({
        organization_id: organizationId,
        kid_id: logForm.kid_id,
        log_date: logForm.log_date,
        subjects: mergedSubjects,
        notes: mergedNotes,
        hours: mergedHours,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'kid_id,log_date' })

    setLogSaving(false)
    if (error) {
      setLogError('Could not save this evidence note. Please try again.')
      return
    }

    setShowLogEvidence(false)
    setLogForm(prev => ({ ...prev, subject: '', notes: '', hours: '' }))
    await loadDailyLogs()
  }

  // ── Filters + grouping ─────────────────────────────────────────────────────

  const kidNameById = useMemo(() => new Map(kids.map(kid => [kid.id, kid.displayname])), [kids])

  const evidenceItems = useMemo<EvidenceItem[]>(() => {
    const assessmentItems: EvidenceItem[] = assessments.map(assessment => ({
      id: `assessment-${assessment.id}`,
      source: 'assessment',
      created_at: assessment.created_at,
      evidence_date: assessment.created_at,
      kid_id: assessment.kid_id,
      kid_name: assessment.kid_name,
      subject: assessment.lesson_subject,
      title: assessment.lesson_title,
      type: assessment.type || 'Assessment',
      standards_count: assessment.standards_count,
      assessment,
    }))

    const logItems: EvidenceItem[] = dailyLogs.map(log => ({
      id: `daily-log-${log.id}`,
      source: 'daily_log',
      created_at: log.created_at || `${log.log_date}T12:00:00`,
      evidence_date: `${log.log_date}T12:00:00`,
      kid_id: log.kid_id,
      kid_name: kidNameById.get(log.kid_id) || 'Unknown Student',
      subject: log.subjects?.join(', ') || 'Daily learning',
      title: log.subjects?.length ? `${log.subjects.join(', ')} evidence note` : 'Progress evidence note',
      type: 'Progress Note',
      note: log.notes,
      hours: log.hours,
    }))

    const checkInItems: EvidenceItem[] = lessonCheckIns.map(checkIn => {
      const lesson = Array.isArray(checkIn.lessons) ? checkIn.lessons[0] : checkIn.lessons
      const proficiencyLabel = checkIn.proficiency === 'got_it'
        ? 'Got it'
        : checkIn.proficiency === 'progressing'
          ? 'Progressing'
          : 'Needs support'
      return {
        id: `lesson-checkin-${checkIn.id}`,
        source: 'lesson_checkin',
        created_at: checkIn.checked_in_at,
        evidence_date: checkIn.checked_in_at,
        kid_id: checkIn.kid_id,
        kid_name: kidNameById.get(checkIn.kid_id) || 'Unknown Student',
        subject: lesson?.subject || 'Lesson check-in',
        title: lesson?.title ? `${lesson.title} check-in` : 'Lesson check-in',
        type: `Check-In: ${proficiencyLabel}`,
        note: checkIn.notes,
      }
    })

    return [...assessmentItems, ...logItems, ...checkInItems].sort((a, b) => new Date(b.evidence_date).getTime() - new Date(a.evidence_date).getTime())
  }, [assessments, dailyLogs, lessonCheckIns, kidNameById])

  const availableKids = useMemo(() => [...new Set(evidenceItems.map(a => a.kid_name))].sort(), [evidenceItems])
  const availableSubjectsForAssessments = useMemo(() => [...new Set(evidenceItems.map(a => a.subject))].filter(Boolean).sort(), [evidenceItems])

  const getSchoolYear = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth()
    return month >= 8 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`
  }

  const availableSchoolYears = useMemo(() => {
    const years = new Set(evidenceItems.map(a => getSchoolYear(a.evidence_date)))
    return Array.from(years).sort().reverse()
  }, [evidenceItems])

  const filteredEvidence = useMemo(() => {
    return evidenceItems.filter(item => {
      if (assessmentFilters.kid && item.kid_name !== assessmentFilters.kid) return false
      if (assessmentFilters.subject && item.subject !== assessmentFilters.subject) return false
      if (assessmentFilters.schoolYear && getSchoolYear(item.evidence_date) !== assessmentFilters.schoolYear) return false
      return true
    })
  }, [evidenceItems, assessmentFilters])

  const monthlyGroups = useMemo(() => {
    const groups = new Map<string, EvidenceItem[]>()
    filteredEvidence.forEach(item => {
      const date = new Date(item.evidence_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups.has(monthKey)) groups.set(monthKey, [])
      groups.get(monthKey)!.push(item)
    })

    const monthGroups: MonthGroup[] = []
    groups.forEach((evidence, key) => {
      const [year, month] = key.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      monthGroups.push({
        month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        year: parseInt(year),
        evidence,
        isCollapsed: collapsedMonths.has(key)
      })
    })

    return monthGroups.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return new Date(b.month).getMonth() - new Date(a.month).getMonth()
    })
  }, [filteredEvidence, collapsedMonths])

  const toggleMonth = (monthKey: string) => {
    const newCollapsed = new Set(collapsedMonths)
    if (newCollapsed.has(monthKey)) newCollapsed.delete(monthKey)
    else newCollapsed.add(monthKey)
    setCollapsedMonths(newCollapsed)
  }

  const availableSubjects = [...new Set(standards.map(s => s.subject))].filter(Boolean).sort()
  const availableGrades = [...new Set(standards.map(s => s.grade_level))].filter(Boolean).sort()

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={css.root}>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <main style={css.main}>
        <div className="hr-section-label" style={{ marginBottom: 14, marginTop: 8 }}>TRACK PROGRESS EVIDENCE & LEARNING GOALS</div>

        <div className="max-w-7xl mx-auto" style={{ paddingBottom: 80 }}>

            {/* View Toggle */}
            <div style={{ marginBottom: 24 }}>
              <div className="hr-pill-row">
                <button
                  onClick={() => setCurrentView('results')}
                  className={`hr-pill${currentView === 'results' ? ' active' : ''}`}
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  📊 Progress Evidence
                </button>
                <button
                  onClick={() => setCurrentView('standards')}
                  className={`hr-pill${currentView === 'standards' ? ' active' : ''}`}
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  📚 Learning Goals
                </button>
              </div>
            </div>

            {/* Tips */}
            {currentView === 'results' && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 mb-6 border-2 border-purple-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-purple-900 mb-1">Track Learning Progress</h3>
                    <p className="text-purple-700 text-sm mb-3">
                      Save progress notes, optional scores, parent-administered assessment records, and learning-goal links when you need proof for records, portfolios, or reviews.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs text-purple-800">
                      <div className="bg-white/70 rounded-xl px-3 py-2"><strong>Lessons:</strong> check-ins + notes</div>
                      <div className="bg-white/70 rounded-xl px-3 py-2"><strong>Projects:</strong> review + optional score</div>
                      <div className="bg-white/70 rounded-xl px-3 py-2"><strong>Assessments & tests:</strong> parent-administered, optional score/review</div>
                      <div className="bg-white/70 rounded-xl px-3 py-2"><strong>Courses:</strong> final grade</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'standards' && (
              <div className="rounded-2xl p-6 mb-6 border-2" style={{ background: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.3)' }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                    <Lightbulb className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black mb-1" style={{ color: '#c4b5fd' }}>Your Learning Goals Library</h3>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      You have <strong>{standards.length} goals or standards</strong> in your library. Add more only if you want coverage notes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Results View */}
            {currentView === 'results' && (
              <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowLogEvidence(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all"
                >
                  + Log Evidence
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Child</label>
                        <select value={assessmentFilters.kid} onChange={(e) => setAssessmentFilters({ ...assessmentFilters, kid: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-purple-600 outline-none">
                          <option value="">All Kids</option>
                          {availableKids.map(kid => <option key={kid} value={kid}>{kid}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Subject</label>
                        <select value={assessmentFilters.subject} onChange={(e) => setAssessmentFilters({ ...assessmentFilters, subject: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-purple-600 outline-none">
                          <option value="">All Subjects</option>
                          {availableSubjectsForAssessments.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">School Year</label>
                        <select value={assessmentFilters.schoolYear} onChange={(e) => setAssessmentFilters({ ...assessmentFilters, schoolYear: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-purple-600 outline-none">
                          <option value="">All Years</option>
                          {availableSchoolYears.map(year => <option key={year} value={year}>{year}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {loading || !organizationId ? (
                    <div className="bg-white rounded-3xl p-12 text-center">
                      <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <div className="text-slate-400 font-bold">Loading progress evidence...</div>
                    </div>
                  ) : filteredEvidence.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center">
                      <div className="text-6xl mb-4">📝</div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">
                        {evidenceItems.length === 0 ? 'No Progress Evidence Yet' : 'No Matching Progress Evidence'}
                      </h3>
                      <p className="text-slate-500">
                        {evidenceItems.length === 0 ? 'Add notes, artifacts, parent-administered assessments, or an optional score when you want a record of learning.' : 'Try adjusting your filters.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {monthlyGroups.map((group) => {
                        const monthKey = `${group.year}-${new Date(group.month).getMonth() + 1}`
                        const isCollapsed = collapsedMonths.has(monthKey)
                        return (
                          <div key={monthKey} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <button onClick={() => toggleMonth(monthKey)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3">
                                {isCollapsed ? <ChevronRight className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                <h3 className="font-black text-slate-900 text-lg">{group.month}</h3>
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                                  {group.evidence.length} evidence item{group.evidence.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="text-sm text-slate-500 font-medium">
                                {group.evidence.filter(a => a.assessment?.result?.auto_score !== null && a.assessment?.result?.auto_score !== undefined).length > 0
                                  ? `Avg: ${Math.round(group.evidence.filter(a => a.assessment?.result?.auto_score !== null && a.assessment?.result?.auto_score !== undefined).reduce((sum, a) => sum + (a.assessment?.result?.auto_score || 0), 0) / group.evidence.filter(a => a.assessment?.result?.auto_score !== null && a.assessment?.result?.auto_score !== undefined).length)}%`
                                  : ''}
                              </div>
                            </button>
                            {!isCollapsed && (
                              <div className="border-t border-slate-100 divide-y divide-slate-100">
                                {group.evidence.map((item) => (
                                  <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="text-lg font-black text-slate-900">{item.title}</h4>
                                        <p className="text-slate-500 font-medium text-sm">{item.kid_name} • {item.type}{item.hours ? ` • ${item.hours} hr${item.hours === 1 ? '' : 's'}` : ''}</p>
                                        {item.note && <p className="text-slate-600 text-sm mt-2 max-w-xl">{item.note}</p>}
                                        <div className="flex gap-3 mt-3">
                                          <button onClick={() => item.assessment && setManagingStandards(item.assessment)} className={`bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all ${item.assessment ? 'hover:bg-purple-50 hover:text-purple-600' : 'cursor-default'}`}>
                                            {item.assessment ? (item.standards_count && item.standards_count > 0 ? `📚 ${item.standards_count} Goals` : '+ Link Learning Goals') : 'Logged Note'}
                                          </button>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className={`text-2xl font-black ${item.assessment?.result ? 'text-emerald-600' : item.source === 'daily_log' ? 'text-purple-600' : 'text-slate-300'}`}>
                                          {item.assessment?.result
                                            ? item.assessment.result.auto_score !== null && item.assessment.result.auto_score !== undefined
                                              ? `${item.assessment.result.auto_score}%`
                                              : '✓'
                                            : item.source === 'daily_log' ? '📝' : '--'}
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                          {item.assessment?.result
                                            ? item.assessment.result.auto_score !== null && item.assessment.result.auto_score !== undefined
                                              ? 'Optional Score'
                                              : 'Saved Review'
                                            : item.source === 'daily_log' ? 'Progress Note' : 'Pending'}
                                        </p>
                                        <button
                                          onClick={() => {
                                            if (item.assessment) handleDelete(item.assessment.id)
                                            else if (item.source === 'lesson_checkin') handleDeleteLessonCheckIn(item.id.replace('lesson-checkin-', ''))
                                            else handleDeleteDailyLog(item.id.replace('daily-log-', ''))
                                          }}
                                          className="text-rose-500 font-bold text-xs hover:bg-rose-50 px-3 py-1 rounded-lg mt-2"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <h3 className="font-black text-slate-900 mb-6">Quick Overview</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                        <span className="text-slate-500 font-bold text-sm uppercase">Total</span>
                        <span className="text-2xl font-black text-slate-900">{filteredEvidence.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl">
                        <span className="text-emerald-600 font-bold text-sm uppercase">Completed</span>
                        <span className="text-2xl font-black text-emerald-700">{filteredEvidence.filter(a => a.source === 'daily_log' || !!a.assessment?.result).length}</span>
                      </div>
                      {filteredEvidence.filter(a => a.assessment?.result?.auto_score !== null && a.assessment?.result?.auto_score !== undefined).length > 0 && (
                        <div className="flex justify-between items-center p-4 rounded-2xl" style={{ background: 'rgba(124,58,237,0.08)' }}>
                          <span className="font-bold text-sm uppercase" style={{ color: '#7c3aed' }}>Avg Optional Score</span>
                          <span className="text-2xl font-black" style={{ color: '#7c3aed' }}>
                            {Math.round(filteredEvidence.filter(a => a.assessment?.result?.auto_score !== null && a.assessment?.result?.auto_score !== undefined).reduce((sum, a) => sum + (a.assessment?.result?.auto_score || 0), 0) / filteredEvidence.filter(a => a.assessment?.result?.auto_score !== null && a.assessment?.result?.auto_score !== undefined).length)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </>
            )}

            {/* Standards View */}
            {currentView === 'standards' && (
              <div className="space-y-6">
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowStandardsManager(true)} className="px-6 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-all">
                    Manage Goals
                  </button>
                  <button onClick={() => setShowImporter(true)} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all">
                    + Import Goals
                  </button>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Subject</label>
                      <select value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-purple-600 outline-none">
                        <option value="">All Subjects</option>
                        {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Grade Level</label>
                      <select value={filters.grade_level} onChange={(e) => setFilters({ ...filters, grade_level: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-purple-600 outline-none">
                        <option value="">All Grades</option>
                        {availableGrades.map(g => <option key={g} value={g}>Grade {g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Search</label>
                      <input type="text" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search goals or standards..." className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 outline-none focus:border-purple-600" />
                    </div>
                  </div>
                </div>
                {standardsLoading ? (
                  <div className="bg-white rounded-3xl p-12 text-center text-slate-400 font-bold">Loading...</div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-black text-white drop-shadow-sm">{standards.length} Goals or Standards</h3>
                    {standards.map((standard) => (
                      <div key={standard.id} className="bg-white rounded-3xl p-6 border border-slate-200 flex gap-6">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 border text-xl">
                            {standard.subject?.toLowerCase().includes('math') ? '🔢' : '📚'}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">{standard.standard_code}</span>
                            <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>{standard.subject}</span>
                            <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider">Grade {standard.grade_level}</span>
                          </div>
                          <p className="text-slate-600 font-medium text-lg leading-snug">{standard.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
      </main>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showLogEvidence && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pt-4 pb-24">
          <form onSubmit={handleLogEvidence} className="bg-white rounded-3xl shadow-xl max-w-xl w-full p-6 border border-slate-200">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Log Progress Evidence</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Add a quick parent note to the Progress Evidence record.</p>
              </div>
              <button type="button" onClick={() => setShowLogEvidence(false)} className="text-slate-400 hover:text-slate-900 text-2xl font-bold">×</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Child</label>
                <select value={logForm.kid_id} onChange={(e) => setLogForm({ ...logForm, kid_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 outline-none focus:border-purple-600">
                  {kids.map(kid => <option key={kid.id} value={kid.id}>{kid.displayname}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Date</label>
                <input type="date" value={logForm.log_date} onChange={(e) => setLogForm({ ...logForm, log_date: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 outline-none focus:border-purple-600" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Subject</label>
              <select value={logForm.subject} onChange={(e) => setLogForm({ ...logForm, subject: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 outline-none focus:border-purple-600">
                <option value="">Choose subject…</option>
                {CANONICAL_SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Parent Note</label>
              <textarea value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} placeholder="What did you notice? What did they practice, complete, or demonstrate?" rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 outline-none focus:border-purple-600" />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Hours Optional</label>
              <input type="number" min="0" step="0.25" value={logForm.hours} onChange={(e) => setLogForm({ ...logForm, hours: e.target.value })} placeholder="Example: 1.5" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 outline-none focus:border-purple-600" />
            </div>

            {logError && <div className="bg-rose-50 text-rose-700 rounded-xl p-3 text-sm font-bold mb-4">{logError}</div>}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowLogEvidence(false)} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={logSaving} className="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-60">{logSaving ? 'Saving…' : 'Save Evidence'}</button>
            </div>
          </form>
        </div>
      )}
      {managingStandards && organizationId && (
        <AssessmentStandardsManager
          assessmentId={managingStandards.id}
          assessmentTitle={managingStandards.lesson_title}
          onClose={() => setManagingStandards(null)}
          onUpdate={() => loadAssessments()}
        />
      )}
      {showImporter && (
        <StandardsImporter onClose={() => setShowImporter(false)} onImport={() => { setShowImporter(false); loadStandards() }} />
      )}
      {showStandardsManager && organizationId && (
        <StandardsManager organizationId={organizationId} onClose={() => { setShowStandardsManager(false); loadStandards() }} />
      )}
      {showHelp && <AssessmentsHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssessmentsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <AssessmentsContent />
      </Suspense>
    </AuthGuard>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  ...pageShell,
}