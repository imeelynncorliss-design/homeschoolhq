// app/teacher/assessments/[id]/page.tsx
'use client';

import React, { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StandardsPicker } from '@/components/StandardsPicker';
import type { Standard } from '@/types/standards';
import { createClient } from '@supabase/supabase-js';

interface Assessment {
  id: string;
  title: string;
  description?: string;
  assessment_type: string;
  subject?: string;
  grade_level?: string;
  created_at: string;
  updated_at: string;
}

interface AssessmentStandard {
  id: string;
  standard_id: string;
  added_at: string;
  standard: Standard;
}

export default function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const assessmentId = unwrappedParams.id;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessmentStandards, setAssessmentStandards] = useState<AssessmentStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStandardsPicker, setShowStandardsPicker] = useState(false);
  const [removingStandardId, setRemovingStandardId] = useState<string | null>(null);
  
  const router = useRouter();

  const fetchAssessmentData = async () => {
    if (!assessmentId || assessmentId === 'undefined') return;

    try {
      setLoading(true);
      
      const assessmentResponse = await fetch(`/api/assessments/${assessmentId}`);
      if (!assessmentResponse.ok) {
        throw new Error('Failed to fetch assessment');
      }
      const assessmentData = await assessmentResponse.json();
      setAssessment(assessmentData);

      const standardsResponse = await fetch(`/api/assessments/${assessmentId}/standards`);
      if (!standardsResponse.ok) {
        throw new Error('Failed to fetch standards');
      }
      const standardsData = await standardsResponse.json();
      setAssessmentStandards(standardsData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assessmentId && assessmentId !== 'undefined') {
      fetchAssessmentData();
    }
  }, [assessmentId]);

  const handleAddStandards = async (selected: Standard[]) => {
    if (!assessmentId) return;
    
    // Add validation
  if (!selected || selected.length === 0) {
    alert('Please select at least one standard');
    return;
  }
  
  console.log('Selected standards:', selected); // Debug log
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('You must be logged in to add standards');
        return;
      }

      const selectedStandardIds = selected.map(s => s.id);
      console.log('Selected IDs:', selectedStandardIds); // Debug log
    
      if (selectedStandardIds.length === 0 || selectedStandardIds.some(id => !id)) {
        alert('Invalid standard IDs');
        console.error('Invalid IDs:', selectedStandardIds);
        return;
      }

      const response = await fetch(`/api/assessments/${assessmentId}/standards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ standard_ids: selectedStandardIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to add standards');
      }

      await fetchAssessmentData();
      setShowStandardsPicker(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add standards');
    }
  };

  const handleRemoveStandard = async (assessmentStandardId: string) => {
    if (!confirm('Are you sure you want to remove this standard from the assessment?')) {
      return;
    }

    try {
      setRemovingStandardId(assessmentStandardId);
      
      const response = await fetch(`/api/assessments/${assessmentId}/standards`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assessment_standard_id: assessmentStandardId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove standard');
      }

      await fetchAssessmentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove standard');
    } finally {
      setRemovingStandardId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error || 'Assessment not found'}</p>
          </div>
          <Link href="/teacher/assessments" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Assessments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/teacher/assessments" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            ← Back to Assessments
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{assessment.title}</h1>
          {assessment.description && <p className="text-gray-600 mb-4">{assessment.description}</p>}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div><span className="text-sm text-gray-500">Subject</span><p className="font-semibold text-gray-900">{assessment.subject}</p></div>
            <div><span className="text-sm text-gray-500">Type</span><p className="font-semibold text-gray-900">{assessment.assessment_type}</p></div>
            <div><span className="text-sm text-gray-500">Grade</span><p className="font-semibold text-gray-900">{assessment.grade_level}</p></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Educational Standards</h2>
            <button onClick={() => setShowStandardsPicker(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <span>+ Add Standards</span>
            </button>
          </div>

          {assessmentStandards.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
              No standards aligned yet.
            </div>
          ) : (
            <div className="space-y-3">
              {assessmentStandards.map((as) => (
                <div key={as.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {as.standard.code}
                        </span>
                        <span className="text-xs text-gray-500">
                          {as.standard.framework}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">
                        {as.standard.description}
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        {as.standard.domain}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveStandard(as.id)} 
                      disabled={removingStandardId === as.id}
                      className="ml-4 text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm font-medium transition-colors"
                    >
                      {removingStandardId === as.id ? '...' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showStandardsPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold">Select Standards</h3>
                <button onClick={() => setShowStandardsPicker(false)} className="text-gray-400 text-2xl">×</button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <StandardsPicker
                  isOpen={showStandardsPicker}
                  onClose={() => setShowStandardsPicker(false)}
                  onSelect={handleAddStandards}
                  selectedStandards={assessmentStandards.map(as => as.standard)}
                  defaultSubject={assessment?.subject || 'Mathematics'}
                  defaultGradeLevel={assessment?.grade_level?.replace('Grade ', '') || '5'}
                  multiSelect={true}
                  title="Select Standards"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}