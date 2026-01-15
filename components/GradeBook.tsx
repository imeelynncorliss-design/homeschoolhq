'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// --- Types ---
interface Course {
  id: string
  course_name: string
  subject: string
  grade_level: string
  course_type: string
  credits: number
  letter_grade: string
  final_percentage: number
  status: string
}

interface AssessmentStats {
  avg: number
  pending: boolean
}

interface GradeBookProps {
  kidId: string
  userId: string
}

const LETTER_GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']

export default function GradeBook({ kidId, userId }: GradeBookProps) {
  // --- State ---
  const [courses, setCourses] = useState<Course[]>([])
  const [assessmentAverages, setAssessmentAverages] = useState<Record<string, AssessmentStats>>({})
  const [loading, setLoading] = useState(true)
  const [unweightedGPA, setUnweightedGPA] = useState(0)
  const [weightedGPA, setWeightedGPA] = useState(0)
  const [totalCredits, setTotalCredits] = useState(0)

  // Review Modal States
  const [reviewSubject, setReviewSubject] = useState<string | null>(null)
  const [pendingItems, setPendingItems] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [kidId])

  useEffect(() => {
    if (courses.length > 0) calculateGPA()
  }, [courses])

  // --- Data Loading ---
  const loadData = async () => {
    setLoading(true)
    
    // 1. Fetch Courses
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('kid_id', kidId)
      .order('grade_level', { ascending: true })

    // 2. Fetch Assessment Results with nested joins
    const { data: resultData } = await supabase
      .from('assessment_results')
      .select(`
        auto_score,
        needs_manual_grading,
        status,
        assessments!inner(
          kid_id,
          lessons!inner(subject)
        )
      `)
      .eq('assessments.kid_id', kidId)

    if (courseData) setCourses(courseData)
    
    // 3. Process Averages by Subject
    if (resultData) {
      const statsMap: Record<string, { total: number; count: number; pending: boolean }> = {}
      
      resultData.forEach((r: any) => {
        const sub = r.assessments.lessons.subject.toLowerCase()
        if (!statsMap[sub]) statsMap[sub] = { total: 0, count: 0, pending: false }
        
        statsMap[sub].total += r.auto_score || 0
        statsMap[sub].count += 1
        if (r.needs_manual_grading || r.status === 'needs_review') {
          statsMap[sub].pending = true
        }
      })

      const finalStats: Record<string, AssessmentStats> = {}
      Object.keys(statsMap).forEach(sub => {
        finalStats[sub] = {
          avg: Math.round(statsMap[sub].total / statsMap[sub].count),
          pending: statsMap[sub].pending
        }
      })
      setAssessmentAverages(finalStats)
    }

    setLoading(false)
  }

  // --- Actions ---
  const handleReviewClick = async (subject: string) => {
    const { data } = await supabase
      .from('assessment_results')
      .select(`
        id,
        auto_score,
        assessments!inner(
          id,
          lessons!inner(title, subject)
        )
      `)
      .eq('assessments.kid_id', kidId)
      .eq('assessments.lessons.subject', subject)
      .or('needs_manual_grading.eq.true,status.eq.needs_review')

    if (data) {
      setPendingItems(data)
      setReviewSubject(subject)
    }
  }

  const updateGrade = async (courseId: string, letterGrade: string, percentage: number) => {
    await supabase
      .from('courses')
      .update({ letter_grade: letterGrade, final_percentage: percentage })
      .eq('id', courseId)
    loadData()
  }

  const calculateGPA = () => {
    const gradeValues: Record<string, number> = {
      'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0
    }

    let unweightedPoints = 0, weightedPoints = 0, credits = 0

    courses.forEach(course => {
      if (course.letter_grade && course.status === 'completed') {
        const baseGPA = gradeValues[course.letter_grade] || 0
        const courseCredits = course.credits || 0
        unweightedPoints += baseGPA * courseCredits
        weightedPoints += (baseGPA + (['Honors', 'AP', 'IB'].includes(course.course_type) ? 1.0 : 0)) * courseCredits
        credits += courseCredits
      }
    })

    setUnweightedGPA(credits > 0 ? unweightedPoints / credits : 0)
    setWeightedGPA(credits > 0 ? weightedPoints / credits : 0)
    setTotalCredits(credits)
  }

  if (loading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse text-sm uppercase tracking-widest">Updating Gradebook...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end px-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Grade Book</h2>
          <p className="text-slate-500 font-medium">Finalize course grades based on performance</p>
        </div>
      </div>

      {/* GPA Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unweighted GPA</p>
          <div className="text-5xl font-black text-slate-900">{unweightedGPA.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-slate-500">Weighted GPA</p>
          <div className="text-5xl font-black text-white">{weightedGPA.toFixed(2)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b-2 border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Avg</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((course) => {
              const stats = assessmentAverages[course.subject] || { avg: 0, pending: false };
              return (
                <tr key={course.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="font-bold text-slate-900">{course.course_name}</div>
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-tight">{course.subject} • {course.course_type}</div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`text-xl font-black ${stats.avg >= 90 ? 'text-emerald-500' : 'text-slate-700'}`}>
                      {stats.avg > 0 ? `${stats.avg}%` : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      {stats.pending ? (
                        <button 
                          onClick={() => handleReviewClick(course.subject)}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-700 text-[9px] px-3 py-1.5 rounded-full font-black uppercase border border-amber-200 transition-all flex items-center gap-2"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Review
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Settled</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <select
                        value={course.letter_grade || ''}
                        onChange={(e) => updateGrade(course.id, e.target.value, course.final_percentage || 0)}
                        className="bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold"
                      >
                        <option value="">—</option>
                        {LETTER_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <input
                        type="number"
                        value={course.final_percentage || ''}
                        onChange={(e) => updateGrade(course.id, course.letter_grade || '', parseFloat(e.target.value))}
                        className="w-16 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold"
                        placeholder="%"
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {reviewSubject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-900 uppercase tracking-tight italic">Review {reviewSubject}</h3>
              <button onClick={() => setReviewSubject(null)} className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold hover:bg-slate-100 transition-colors">×</button>
            </div>
            <div className="p-4 space-y-2">
              {pendingItems.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-indigo-100 flex justify-between items-center transition-all group">
                <div className="flex flex-col">
                  <div className="font-bold text-slate-700 text-sm">{item.assessments.lessons.title}</div>
                  <div className="text-[10px] font-black text-amber-600 uppercase">Auto-Score: {item.auto_score}%</div>
                </div>
                
                <button 
                  onClick={() => {
                    // Option A: If using a router
                    // router.push(`/teacher/history?review=${item.id}`)
                    
                    // Option B: If you just want to alert the user for now
                    window.location.href = '#history-section'; // Scroll to your history view
                    setReviewSubject(null);
                  }}
                  className="opacity-0 group-hover:opacity-100 bg-indigo-600 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-200 uppercase tracking-widest"
                >
                  Grade Now
                </button>
              </div>
              ))}
              <p className="text-[10px] text-center text-slate-400 font-bold uppercase py-2">Head to History to finalize these grades</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}