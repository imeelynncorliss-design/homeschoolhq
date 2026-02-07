'use client';

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import AssessmentStandardsManager from '@/components/AssessmentStandardsManager'
import StandardsImporter from '@/components/StandardsImporter'
import StandardsManager from '@/components/StandardsManager'
import AssessmentsHelpModal from '@/components/AssessmentsHelpModal'
import { HelpCircle, Lightbulb, ChevronDown, ChevronRight } from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createBrowserClient(supabaseUrl, supabaseKey)

type AssessmentWithDetails = {
  id: string
  lesson_id: string
  kid_id: string
  type: string
  difficulty: string
  created_at: string
  content: any
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

type MonthGroup = {
  month: string
  year: number
  assessments: AssessmentWithDetails[]
  isCollapsed: boolean
}

export default function AssessmentsPage() {
  const [currentView, setCurrentView] = useState<'results' | 'standards'>('results')
  const [assessments, setAssessments] = useState<AssessmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [managingStandards, setManagingStandards] = useState<AssessmentWithDetails | null>(null)
  const [showImporter, setShowImporter] = useState(false)
  const [showStandardsManager, setShowStandardsManager] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  
  const [standards, setStandards] = useState<Standard[]>([])
  const [standardsLoading, setStandardsLoading] = useState(false)
  const [filters, setFilters] = useState({
    subject: '',
    grade_level: '',
    search: ''
  })

  // Assessment filters
  const [assessmentFilters, setAssessmentFilters] = useState({
    kid: '',
    subject: '',
    schoolYear: ''
  })

  // Collapsed months state
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  // Fetch organization ID
  useEffect(() => {
    const fetchOrgId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: kids } = await supabase
        .from('kids')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)

      if (kids && kids.length > 0) {
        setOrganizationId(kids[0].organization_id)
      }
    }

    fetchOrgId()
  }, [])

  useEffect(() => {
    if (organizationId) {
      loadAssessments()
    }
  }, [organizationId])

  useEffect(() => {
    if (currentView === 'standards' && organizationId) {
      loadStandards()
    }
  }, [currentView, filters, organizationId])

  const loadAssessments = async () => {
    if (!organizationId) return
    
    setLoading(true)
    try {
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessments')
        .select(`
          *,
          lessons!inner(id, title, subject),
          kids!inner(id, displayname)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (assessmentsError) throw assessmentsError
      if (!assessmentsData) {
        setAssessments([])
        return
      }

      const assessmentIds = assessmentsData.map(a => a.id)
      
      const { data: results } = await supabase
        .from('assessment_results')
        .select('*')
        .in('assessment_id', assessmentIds)
      
      const { data: standardsCounts } = await supabase
        .from('assessment_standards')
        .select('assessment_id')
        .in('assessment_id', assessmentIds)

      const standardsMap = new Map<string, number>()
      standardsCounts?.forEach(s => {
        standardsMap.set(s.assessment_id, (standardsMap.get(s.assessment_id) || 0) + 1)
      })

      const combined = assessmentsData.map(assessment => {
        const lessonData = Array.isArray(assessment.lessons) ? assessment.lessons[0] : assessment.lessons
        const kidData = Array.isArray(assessment.kids) ? assessment.kids[0] : assessment.kids
        const result = results?.find(r => r.assessment_id === assessment.id)

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

  const loadStandards = async () => {
    if (!organizationId) return
    
    setStandardsLoading(true)
    try {
      let query = supabase
        .from('available_templates')  // Use the view for official + community templates
        .select('*')

      if (filters.subject) query = query.ilike('subject', `%${filters.subject}%`)
      if (filters.grade_level) query = query.eq('grade_level', filters.grade_level)
      if (filters.search) {
        query = query.or(`standard_code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

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

  // Get unique filter options
  const availableKids = useMemo(() => {
    return [...new Set(assessments.map(a => a.kid_name))].sort()
  }, [assessments])

  const availableSubjectsForAssessments = useMemo(() => {
    return [...new Set(assessments.map(a => a.lesson_subject))].filter(Boolean).sort()
  }, [assessments])

  // School year calculation (Sept-Aug)
  const getSchoolYear = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() // 0-11
    
    // If Sept-Dec, school year is current-next (e.g., 2024-25)
    // If Jan-Aug, school year is previous-current (e.g., 2024-25)
    if (month >= 8) { // Sept (8) through Dec (11)
      return `${year}-${(year + 1).toString().slice(2)}`
    } else {
      return `${year - 1}-${year.toString().slice(2)}`
    }
  }

  const availableSchoolYears = useMemo(() => {
    const years = new Set(assessments.map(a => getSchoolYear(a.created_at)))
    return Array.from(years).sort().reverse()
  }, [assessments])

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter(assessment => {
      if (assessmentFilters.kid && assessment.kid_name !== assessmentFilters.kid) return false
      if (assessmentFilters.subject && assessment.lesson_subject !== assessmentFilters.subject) return false
      if (assessmentFilters.schoolYear && getSchoolYear(assessment.created_at) !== assessmentFilters.schoolYear) return false
      return true
    })
  }, [assessments, assessmentFilters])

  // Group by month
  const monthlyGroups = useMemo(() => {
    const groups = new Map<string, AssessmentWithDetails[]>()
    
    filteredAssessments.forEach(assessment => {
      const date = new Date(assessment.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!groups.has(monthKey)) {
        groups.set(monthKey, [])
      }
      groups.get(monthKey)!.push(assessment)
    })

    const monthGroups: MonthGroup[] = []
    groups.forEach((assessments, key) => {
      const [year, month] = key.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      
      monthGroups.push({
        month: monthName,
        year: parseInt(year),
        assessments,
        isCollapsed: collapsedMonths.has(key)
      })
    })

    return monthGroups.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return new Date(b.month).getMonth() - new Date(a.month).getMonth()
    })
  }, [filteredAssessments, collapsedMonths])

  const toggleMonth = (monthKey: string) => {
    const newCollapsed = new Set(collapsedMonths)
    if (newCollapsed.has(monthKey)) {
      newCollapsed.delete(monthKey)
    } else {
      newCollapsed.add(monthKey)
    }
    setCollapsedMonths(newCollapsed)
  }

  const availableSubjects = [...new Set(standards.map(s => s.subject))].filter(Boolean).sort()
  const availableGrades = [...new Set(standards.map(s => s.grade_level))].filter(Boolean).sort()

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-10 pb-20">
        <div className="max-w-7xl mx-auto">
          <Link href="/admin" className="text-white/80 hover:text-white flex items-center gap-2 mb-6 font-medium">
            ← Back to Admin
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-black mb-2">Assessments & Standards</h1>
              <p className="text-white/70">Manage student quizzes and curriculum alignment</p>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-2xl font-bold transition-all backdrop-blur-sm"
            >
              <HelpCircle className="w-5 h-5" />
              Help & Guide
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12">
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setCurrentView('results')}
            className={`px-8 py-4 rounded-2xl font-bold transition-all shadow-sm ${
              currentView === 'results' 
                ? 'bg-white text-purple-600 scale-105' 
                : 'bg-white/50 text-slate-500 hover:bg-white'
            }`}
          >
            📊 Assessment Results
          </button>
          <button 
            onClick={() => setCurrentView('standards')}
            className={`px-8 py-4 rounded-2xl font-bold transition-all shadow-sm ${
              currentView === 'standards' 
                ? 'bg-white text-purple-600 scale-105' 
                : 'bg-white/50 text-slate-500 hover:bg-white'
            }`}
          >
            📚 Standards Tracking
          </button>
        </div>

        {/* Quick Tips */}
        {currentView === 'results' && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 mb-6 border-2 border-purple-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-black text-purple-900 mb-1">Track Learning Progress</h3>
                <p className="text-purple-700 text-sm">
                  Click <strong>+ Add Standards</strong> on any assessment to link it to specific learning goals. This helps you see exactly which skills your child has mastered!
                </p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'standards' && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 mb-6 border-2 border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-black text-blue-900 mb-1">Your Standards Library</h3>
                <p className="text-blue-700 text-sm">
                  You have <strong>{standards.length} standards</strong> in your library! Use filters to find specific subjects or grades. Click <strong>+ Import Standards</strong> to add more using AI extraction from PDFs or websites.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'results' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Assessment Filters */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Child</label>
                    <select
                      value={assessmentFilters.kid}
                      onChange={(e) => setAssessmentFilters({ ...assessmentFilters, kid: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-purple-600 outline-none"
                    >
                      <option value="">All Kids</option>
                      {availableKids.map(kid => <option key={kid} value={kid}>{kid}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Subject</label>
                    <select
                      value={assessmentFilters.subject}
                      onChange={(e) => setAssessmentFilters({ ...assessmentFilters, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-purple-600 outline-none"
                    >
                      <option value="">All Subjects</option>
                      {availableSubjectsForAssessments.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">School Year</label>
                    <select
                      value={assessmentFilters.schoolYear}
                      onChange={(e) => setAssessmentFilters({ ...assessmentFilters, schoolYear: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-purple-600 outline-none"
                    >
                      <option value="">All Years</option>
                      {availableSchoolYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Monthly Grouped Assessments */}
              {loading || !organizationId ? (
                <div className="bg-white rounded-3xl p-12 text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <div className="text-slate-400 font-bold">Loading assessments...</div>
                </div>
              ) : filteredAssessments.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">
                    {assessments.length === 0 ? 'No Assessments Yet' : 'No Matching Assessments'}
                  </h3>
                  <p className="text-slate-500">
                    {assessments.length === 0 
                      ? 'Create your first assessment to get started!' 
                      : 'Try adjusting your filters to see more results.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyGroups.map((group) => {
                    const monthKey = `${group.year}-${new Date(group.month).getMonth() + 1}`
                    const isCollapsed = collapsedMonths.has(monthKey)
                    
                    return (
                      <div key={monthKey} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Month Header */}
                        <button
                          onClick={() => toggleMonth(monthKey)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isCollapsed ? (
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                            <h3 className="font-black text-slate-900 text-lg">{group.month}</h3>
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                              {group.assessments.length} assessment{group.assessments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-sm text-slate-500 font-medium">
                            Avg: {Math.round(
                              group.assessments
                                .filter(a => a.result?.auto_score !== null)
                                .reduce((sum, a) => sum + (a.result?.auto_score || 0), 0) / 
                              group.assessments.filter(a => a.result?.auto_score !== null).length || 0
                            )}%
                          </div>
                        </button>

                        {/* Assessment Cards */}
                        {!isCollapsed && (
                          <div className="border-t border-slate-100 divide-y divide-slate-100">
                            {group.assessments.map((assessment) => (
                              <div key={assessment.id} className="p-6 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="text-lg font-black text-slate-900">{assessment.lesson_title}</h4>
                                    <p className="text-slate-500 font-medium text-sm">{assessment.kid_name} • {assessment.type}</p>
                                    <div className="flex gap-3 mt-3">
                                      <button 
                                        onClick={() => setManagingStandards(assessment)}
                                        className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-50 hover:text-purple-600 transition-all"
                                      >
                                        {assessment.standards_count > 0 ? `📚 ${assessment.standards_count} Standards` : '+ Add Standards'}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-2xl font-black ${assessment.result ? 'text-emerald-600' : 'text-slate-300'}`}>
                                      {assessment.result ? `${assessment.result.auto_score}%` : '--'}
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                      {assessment.result ? 'Score' : 'Pending'}
                                    </p>
                                    <button 
                                      onClick={() => handleDelete(assessment.id)} 
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
                    <span className="text-2xl font-black text-slate-900">{filteredAssessments.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl">
                    <span className="text-emerald-600 font-bold text-sm uppercase">Completed</span>
                    <span className="text-2xl font-black text-emerald-700">{filteredAssessments.filter(a => !!a.result).length}</span>
                  </div>
                  {filteredAssessments.filter(a => a.result?.auto_score !== null).length > 0 && (
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl">
                      <span className="text-blue-600 font-bold text-sm uppercase">Avg Score</span>
                      <span className="text-2xl font-black text-blue-700">
                        {Math.round(
                          filteredAssessments
                            .filter(a => a.result?.auto_score !== null)
                            .reduce((sum, a) => sum + (a.result?.auto_score || 0), 0) / 
                          filteredAssessments.filter(a => a.result?.auto_score !== null).length
                        )}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'standards' && (
          <div className="space-y-6">
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStandardsManager(true)}
                className="px-6 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center gap-2"
              >
                Manage Standards
              </button>
              <button
                onClick={() => setShowImporter(true)}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center gap-2"
              >
                + Import Standards
              </button>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Subject</label>
                  <select
                    value={filters.subject}
                    onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-purple-600 outline-none"
                  >
                    <option value="">All Subjects</option>
                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Grade Level</label>
                  <select
                    value={filters.grade_level}
                    onChange={(e) => setFilters({ ...filters, grade_level: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-purple-600 outline-none"
                  >
                    <option value="">All Grades</option>
                    {availableGrades.map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Search</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search standards..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 outline-none focus:border-purple-600"
                  />
                </div>
              </div>
            </div>

            {standardsLoading ? (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-400 font-bold">Loading...</div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-black text-slate-900">{standards.length} Standards</h3>
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
                        <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider">{standard.subject}</span>
                        <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider">Grade {standard.grade_level}</span>
                      </div>
                      <p className="text-slate-600 font-medium text-lg leading-snug mb2">{standard.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {managingStandards && organizationId && (
        <AssessmentStandardsManager
          assessmentId={managingStandards.id}
          assessmentTitle={managingStandards.lesson_title}
          onClose={() => setManagingStandards(null)}
          onUpdate={() => loadAssessments()}
        />
      )}

      {showImporter && (
        <StandardsImporter
          onClose={() => setShowImporter(false)}
          onImport={() => {
            setShowImporter(false);
            loadStandards();
          }}
        />
      )}

      {showStandardsManager && organizationId && (
        <StandardsManager
          organizationId={organizationId}
          onClose={() => {
            setShowStandardsManager(false);
            loadStandards();
          }}
        />
      )}

      {showHelp && (
        <AssessmentsHelpModal onClose={() => setShowHelp(false)} />
      )}
    </div>
  )
}