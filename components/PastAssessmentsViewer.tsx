// components/PastAssessmentsViewer.tsx
// View and review all past assessments for a child

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AssessmentTaking from './AssessmentTaking';

interface Assessment {
  id: string;
  lesson_id: string;
  kid_id: string;
  type: string;
  difficulty: string;
  content: any;
  created_at: string;
  lesson_title?: string;
  lesson_subject?: string;
}

interface AssessmentResult {
  id: string;
  assessment_id: string;
  answers: any;
  auto_score: number | null;
  needs_manual_grading: boolean;
  submitted_at: string;
}

interface AssessmentWithResult extends Assessment {
  result?: AssessmentResult;
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

  useEffect(() => {
    loadAssessments();
  }, [kidId]);

  const loadAssessments = async () => {
    setLoading(true);
    
    // Fetch all assessments for this child
    const { data: assessmentsData, error: assessmentsError } = await supabase
      .from('assessments')
      .select(`
        *,
        lessons!inner(title, subject)
      `)
      .eq('kid_id', kidId)
      .order('created_at', { ascending: false });

    if (assessmentsError) {
      console.error('Error loading assessments:', assessmentsError);
      setLoading(false);
      return;
    }

    // Fetch results for all assessments
    const { data: resultsData, error: resultsError } = await supabase
      .from('assessment_results')
      .select('*')
      .in('assessment_id', assessmentsData.map(a => a.id));

    if (resultsError) {
      console.error('Error loading results:', resultsError);
    }

    // Combine assessments with their results
    const combined = assessmentsData.map(assessment => ({
      ...assessment,
      lesson_title: assessment.lessons?.title,
      lesson_subject: assessment.lessons?.subject,
      result: resultsData?.find(r => r.assessment_id === assessment.id)
    }));

    setAssessments(combined);
    setLoading(false);
  };

  const filteredAssessments = assessments.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'completed') return a.result && !a.result.needs_manual_grading;
    if (filter === 'needs_review') return a.result?.needs_manual_grading;
    return true;
  });

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-600';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreEmoji = (score: number | null) => {
    if (score === null) return '📝';
    if (score >= 90) return '🌟';
    if (score >= 70) return '👍';
    return '📚';
  };

  if (selectedAssessment && selectedAssessment.result) {
    // Show full results screen for selected assessment
    return (
      <AssessmentTaking
        assessmentData={selectedAssessment.content}
        assessmentId={selectedAssessment.id}
        childName={kidName}
        lessonTitle={selectedAssessment.lesson_title || 'Assessment'}
        onClose={() => setSelectedAssessment(null)}
        onSubmit={() => {}} // Already submitted, this is view-only
        isViewOnly={true}
        existingResults={selectedAssessment.result}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 rounded-t-lg z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">📊 Past Assessments</h2>
              <p className="text-purple-100">{kidName}'s Assessment History</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-purple-600'
                  : 'bg-purple-600 bg-opacity-50 text-white hover:bg-opacity-70'
              }`}
            >
              All ({assessments.length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'completed'
                  ? 'bg-white text-purple-600'
                  : 'bg-purple-600 bg-opacity-50 text-white hover:bg-opacity-70'
              }`}
            >
              Completed ({assessments.filter(a => a.result && !a.result.needs_manual_grading).length})
            </button>
            <button
              onClick={() => setFilter('needs_review')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'needs_review'
                  ? 'bg-white text-purple-600'
                  : 'bg-purple-600 bg-opacity-50 text-white hover:bg-opacity-70'
              }`}
            >
              Needs Review ({assessments.filter(a => a.result?.needs_manual_grading).length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-600">
              <div className="text-4xl mb-4">⏳</div>
              Loading assessments...
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg font-medium text-gray-900">No assessments yet</p>
              <p className="text-sm text-gray-600 mt-2">
                {filter === 'all' 
                  ? 'Generate an assessment from any lesson to get started!'
                  : `No ${filter === 'completed' ? 'completed' : 'pending review'} assessments`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssessments.map(assessment => (
                <div
                  key={assessment.id}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => assessment.result && setSelectedAssessment(assessment)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - Assessment info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">
                          {getScoreEmoji(assessment.result?.auto_score || null)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">
                            {assessment.lesson_title || 'Assessment'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {assessment.lesson_subject} • {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 ml-11">
                        <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          {assessment.difficulty.charAt(0).toUpperCase() + assessment.difficulty.slice(1)}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          📅 Created: {new Date(assessment.created_at).toLocaleDateString()}
                        </span>
                        {assessment.result && (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            ✅ Submitted: {new Date(assessment.result.submitted_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side - Score */}
                    <div className="text-right">
                      {assessment.result ? (
                        <>
                          <div className={`text-3xl font-bold ${getScoreColor(assessment.result.auto_score)}`}>
                            {assessment.result.auto_score !== null ? `${assessment.result.auto_score}%` : 'N/A'}
                          </div>
                          {assessment.result.needs_manual_grading && (
                            <div className="text-xs text-orange-600 font-medium mt-1">
                              Needs Review
                            </div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            Click to review
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-600 italic">
                          Not yet taken
                        </div>
                      )}
                    </div>
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