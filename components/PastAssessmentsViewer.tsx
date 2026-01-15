// components/PastAssessmentsViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { getPastAssessments, deleteAssessment } from '@/app/actions/assessments';
import AssessmentTaking from './AssessmentTaking';

interface AssessmentWithResult {
  id: string;
  lesson_id: string;
  kid_id: string;
  type: string;
  difficulty: string;
  content: any;
  created_at: string;
  lesson_title: string;
  lesson_subject: string;
  result?: {
    id: string;
    assessment_id: string;
    answers: any;
    auto_score: number | null;
    needs_manual_grading: boolean;
    submitted_at: string;
  };
}

interface PastAssessmentsViewerProps {
  kidId: string;
  kidName: string;
  onClose: () => void;
}

export default function PastAssessmentsViewer({ kidId, kidName, onClose }: PastAssessmentsViewerProps) {
  const [assessments, setAssessments] = useState<AssessmentWithResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentWithResult | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'needs_review'>('all');
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadAssessments();
  }, [kidId, refreshKey]);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const { assessments: assessmentsData, results: resultsData } = await getPastAssessments(kidId);
      if (!assessmentsData) {
        setAssessments([]);
        return;
      }

      const combined: AssessmentWithResult[] = assessmentsData.map((a: any) => {
        const lessonData = Array.isArray(a.lessons) ? a.lessons[0] : a.lessons;
        const result = resultsData?.find((r: any) => r.assessment_id === a.id);

        return {
          id: a.id,
          lesson_id: a.lesson_id,
          kid_id: a.kid_id,
          type: a.type,
          difficulty: a.difficulty,
          content: a.content,
          created_at: a.created_at,
          lesson_title: lessonData?.title || 'Unknown Lesson',
          lesson_subject: lessonData?.subject || 'Unknown Subject',
          result: result || undefined
        };
      });

      setAssessments(combined);
    } catch (err) {
      console.error('Error loading assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForceSubmit = async (e: React.MouseEvent, assessment: AssessmentWithResult) => {
    e.stopPropagation();
    if (!confirm("This will end the assessment for the student and allow you to grade it. Continue?")) return;
    
    setIsSubmitting(assessment.id);
    try {
      const response = await fetch('/api/submit-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assessmentId: assessment.id, 
          answers: [],
          autoScore: null,
          needsManualGrading: true
        })
      });

      if (response.ok) {
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error("Force submission failed:", error);
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, assessment: AssessmentWithResult) => {
    e.stopPropagation();
    
    const confirmMessage = assessment.result
      ? `Are you sure you want to delete this ${assessment.result.needs_manual_grading ? 'ungraded' : 'completed'} assessment for "${assessment.lesson_title}"? This cannot be undone.`
      : `Are you sure you want to delete this in-progress assessment for "${assessment.lesson_title}"? This cannot be undone.`;
    
    if (!confirm(confirmMessage)) return;
    
    setIsDeleting(assessment.id);
    try {
      await deleteAssessment(assessment.id);  // ← Direct server action call, no fetch
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Delete failed:", error);
      alert('Failed to delete assessment. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredAssessments = assessments.filter(a => {
    if (filter === 'all') return true;
    const needsReview = !!a.result?.needs_manual_grading;
    const isCompleted = !!a.result && !needsReview;
    if (filter === 'needs_review') return needsReview;
    if (filter === 'completed') return isCompleted;
    return true;
  });

  // Group assessments by month
  const groupedAssessments = filteredAssessments.reduce((groups, assessment) => {
    const dateObj = assessment.result?.submitted_at 
      ? new Date(assessment.result.submitted_at) 
      : new Date(assessment.created_at);
    
    const currentYear = new Date().getFullYear();
    const assessmentYear = dateObj.getFullYear();
    const month = dateObj.toLocaleDateString(undefined, { month: 'long' });
    
    // Format: "January 2026" for current year, "2025 - December" for previous years
    const groupKey = assessmentYear === currentYear 
      ? `${month} ${assessmentYear}`
      : `${assessmentYear} - ${month}`;
    
    if (!groups[groupKey]) {
      groups[groupKey] = {
        assessments: [],
        sortDate: dateObj // For sorting groups
      };
    }
    groups[groupKey].assessments.push(assessment);
    return groups;
  }, {} as Record<string, { assessments: AssessmentWithResult[], sortDate: Date }>);

  // Sort groups by date (most recent first)
  const sortedGroupKeys = Object.keys(groupedAssessments).sort((a, b) => {
    return groupedAssessments[b].sortDate.getTime() - groupedAssessments[a].sortDate.getTime();
  });

  if (selectedAssessment && selectedAssessment.result) {
    return (
      <AssessmentTaking
        assessmentData={selectedAssessment.content}
        assessmentId={selectedAssessment.id}
        childName={kidName}
        lessonTitle={selectedAssessment.lesson_title}
        onClose={() => {
          setSelectedAssessment(null);
          setRefreshKey(prev => prev + 1);
        }}
        onSubmit={() => setRefreshKey(prev => prev + 1)}
        isViewOnly={true}
        existingResults={selectedAssessment.result}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black tracking-tight">📊 {kidName}'s History</h2>
            <button onClick={onClose} className="text-4xl font-light hover:rotate-90 transition-transform">×</button>
          </div>
          <div className="flex gap-3">
            {(['all', 'completed', 'needs_review'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  filter === f ? 'bg-white text-indigo-600 scale-105' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {f === 'needs_review' ? 'Needs Review' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-slate-400">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold">Loading records...</p>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-slate-400">
              <div className="text-6xl">📝</div>
              <p className="font-bold text-lg">No assessments found</p>
              <p className="text-sm">Assessments will appear here once they're created</p>
            </div>
          ) : (
            <div className="space-y-8">
              {sortedGroupKeys.map(groupKey => (
                <div key={groupKey}>
                  <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
                    <span className="text-indigo-600">📅</span>
                    {groupKey}
                    <span className="text-sm font-normal text-slate-400">
                      ({groupedAssessments[groupKey].assessments.length})
                    </span>
                  </h3>
                  <div className="space-y-4">
                    {groupedAssessments[groupKey].assessments.map(assessment => {
                      const needsReview = !!assessment.result?.needs_manual_grading;
                      
                      const dateObj = assessment.result?.submitted_at 
                        ? new Date(assessment.result.submitted_at) 
                        : new Date(assessment.created_at);
                      
                      const displayDate = dateObj.toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric' 
                      });
                  
                      return (
                        <div
                          key={assessment.id}
                          className={`bg-white border border-slate-200 rounded-2xl p-6 transition-all ${assessment.result ? 'hover:border-indigo-300 cursor-pointer' : 'opacity-80'}`}
                          onClick={() => assessment.result && setSelectedAssessment(assessment)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex gap-5 items-start flex-1">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                                needsReview ? 'bg-amber-100' : assessment.result ? 'bg-emerald-50' : 'bg-slate-100'
                              }`}>
                                {needsReview ? '📝' : assessment.result ? '✅' : '⏳'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-black text-slate-900 text-lg leading-tight">{assessment.lesson_title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    {assessment.lesson_subject} • {assessment.type}
                                  </p>
                                  <span className="text-[10px] text-slate-300">•</span>
                                  <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">
                                    {displayDate}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3 ml-4">
                              <div className="text-right">
                                {assessment.result ? (
                                  <>
                                    <div className={`text-3xl font-black ${needsReview ? 'text-amber-500' : 'text-emerald-600'}`}>
                                      {assessment.result.auto_score !== null ? `${assessment.result.auto_score}%` : '—'}
                                    </div>
                                    {needsReview && <div className="text-[9px] font-black text-amber-600 uppercase">Review Required</div>}
                                  </>
                                ) : (
                                  <div className="flex flex-col items-end gap-2">
                                    <span className="text-xs font-bold text-slate-400 italic">In Progress</span>
                                    <button 
                                      onClick={(e) => handleForceSubmit(e, assessment)}
                                      disabled={isSubmitting === assessment.id}
                                      className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black hover:bg-rose-600 hover:text-white transition-all uppercase shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isSubmitting === assessment.id ? 'Submitting...' : 'Force Submit'}
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              {/* Delete Button */}
                              <button
                                onClick={(e) => handleDelete(e, assessment)}
                                disabled={isDeleting === assessment.id}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete assessment"
                              >
                                {isDeleting === assessment.id ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  '🗑️'
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}