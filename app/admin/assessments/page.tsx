// app/admin/assessments/page.tsx
'use client';

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import AssessmentStandardsManager from '@/components/AssessmentStandardsManager'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

type FilterStatus = 'all' | 'completed' | 'pending' | 'needs_review' | null;

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'results' | 'standards'>('results')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(null);
  const [managingStandards, setManagingStandards] = useState<AssessmentWithDetails | null>(null)

  useEffect(() => {
    loadAssessments()
  }, [])

  const loadAssessments = async () => {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const organizationId = 'd52497c0-42a9-49b7-ba3b-849bffa27fc4'
    setLoading(true)

    const { data: assessmentsData, error } = await supabase
      .from('assessments')
      .select(`*, lessons!inner(title, subject), kids!inner(displayname)`)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error || !assessmentsData) {
      console.error('Error fetching assessments:', error)
      setLoading(false)
      return
    }

    const assessmentIds = assessmentsData.map(a => a.id)
    const { data: results } = await supabase.from('assessment_results').select('*').in('assessment_id', assessmentIds)
    const { data: standardsCounts } = await supabase.from('assessment_standards').select('assessment_id').in('assessment_id', assessmentIds)

    const standardsMap = new Map<string, number>()
    standardsCounts?.forEach(s => standardsMap.set(s.assessment_id, (standardsMap.get(s.assessment_id) || 0) + 1))

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
    setLoading(false)
  }

  // --- NEW HANDLER FUNCTIONS ---

  const handleAssign = (id: string) => {
    alert(`Assigning Assessment ${id}. You can now trigger your student selection logic here!`);
  }

  const handleEdit = (id: string) => {
    window.location.href = `/admin/assessments/edit/${id}`;
  }

  const handleDuplicate = async (assessment: AssessmentWithDetails) => {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase
      .from('assessments')
      .insert([{
        lesson_id: assessment.lesson_id,
        kid_id: assessment.kid_id,
        type: assessment.type,
        difficulty: assessment.difficulty,
        content: assessment.content,
        organization_id: 'd52497c0-42a9-49b7-ba3b-849bffa27fc4'
      }]);

    if (error) alert("Failed to duplicate");
    else loadAssessments();
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment? This cannot be undone.")) return;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('assessments').delete().eq('id', id);
    
    if (error) alert("Error deleting assessment");
    else loadAssessments();
  }

  const filteredAssessments = assessments.filter(assessment => {
    if (!statusFilter || statusFilter === 'all') return true;
    const needsReview = assessment.result?.needs_manual_grading;
    const isFinished = !!assessment.result;
    if (statusFilter === 'needs_review') return needsReview;
    if (statusFilter === 'completed') return isFinished && !needsReview;
    if (statusFilter === 'pending') return !isFinished;
    return true;
  });

  if (loading) return <div className="p-20 text-center text-slate-500 font-bold">Loading Assessments...</div>

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-[#9333ea] to-[#4f46e5] text-white p-10 pb-20">
        <div className="max-w-7xl mx-auto">
          <Link href="/admin" className="text-white/80 hover:text-white flex items-center gap-2 mb-6 font-medium">
            ← Back to Admin
          </Link>
          <h1 className="text-4xl font-black mb-2">Assessments & Standards</h1>
          <p className="text-white/70">Manage student quizzes and curriculum alignment</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12">
        {/* VIEW TOGGLE */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setCurrentView('results')}
            className={`px-8 py-4 rounded-2xl font-bold transition-all shadow-sm ${currentView === 'results' ? 'bg-white text-[#9333ea] scale-105' : 'bg-white/50 text-slate-500 hover:bg-white'}`}
          >
            📊 Assessment Results
          </button>
          <button 
            onClick={() => setCurrentView('standards')}
            className={`px-8 py-4 rounded-2xl font-bold transition-all shadow-sm ${currentView === 'standards' ? 'bg-white text-[#9333ea] scale-105' : 'bg-white/50 text-slate-500 hover:bg-white'}`}
          >
            📚 Standards Tracking
          </button>
        </div>

        {currentView === 'results' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: LIST OF ASSESSMENTS */}
            <div className="lg:col-span-2 space-y-4">
              {filteredAssessments.map((assessment) => (
                <div key={assessment.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-[#9333ea]/30 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{assessment.lesson_title}</h3>
                      <p className="text-slate-500 font-medium">{assessment.kid_name} • {assessment.type}</p>
                      
                      <div className="flex gap-3 mt-4">
                        <button 
                          onClick={() => setManagingStandards(assessment)}
                          className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-50 hover:text-[#9333ea] transition-all"
                        >
                          {assessment.standards_count > 0 ? `📚 ${assessment.standards_count} Standards Aligned` : '+ Add Standards'}
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-3xl font-black ${assessment.result ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {assessment.result ? `${assessment.result.auto_score}%` : '--'}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {assessment.result ? 'Score' : 'Pending'}
                      </p>
                    </div>
                  </div>

                  {/* QUICK ACTIONS FOR EACH LIST ITEM */}
                  <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-slate-50">
                    <button onClick={() => handleAssign(assessment.id)} className="py-2 bg-[#9333ea] text-white rounded-lg text-xs font-bold hover:opacity-90">Assign</button>
                    <button onClick={() => handleEdit(assessment.id)} className="py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">Edit</button>
                    <button onClick={() => handleDuplicate(assessment)} className="py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">Duplicate</button>
                    <button onClick={() => handleDelete(assessment.id)} className="py-2 text-rose-500 font-bold text-xs hover:bg-rose-50 rounded-lg">Delete</button>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT COLUMN: STATS & TOOLS */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <h3 className="font-black text-slate-900 mb-6">Quick Overview</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <span className="text-slate-500 font-bold text-sm uppercase">Total</span>
                    <span className="text-2xl font-black text-slate-900">{assessments.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl">
                    <span className="text-emerald-600 font-bold text-sm uppercase">Completed</span>
                    <span className="text-2xl font-black text-emerald-700">{assessments.filter(a => !!a.result).length}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* STANDARDS MODAL */}
      {managingStandards && (
        <AssessmentStandardsManager
          assessmentId={managingStandards.id}
          assessmentTitle={managingStandards.lesson_title}
          onClose={() => setManagingStandards(null)}
          onUpdate={() => loadAssessments()}
        />
      )}
    </div>
  )
}