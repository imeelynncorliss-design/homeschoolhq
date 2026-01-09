// app/teacher/assessments/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Assessment {
  id: string;
  title: string;
  description?: string;
  assessment_type: string;
  subject?: string;
  grade_level?: string;
  created_at: string;
  standards_count?: number;
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    subject: '',
    assessmentType: '',
    gradeLevel: ''
  });
  
  const router = useRouter();

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assessments');
      
      if (!response.ok) {
        throw new Error('Failed to fetch assessments');
      }
      
      const data = await response.json();
      setAssessments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    if (filter.subject && assessment.subject !== filter.subject) return false;
    if (filter.assessmentType && assessment.assessment_type !== filter.assessmentType) return false;
    if (filter.gradeLevel && assessment.grade_level !== filter.gradeLevel) return false;
    return true;
  });

  const uniqueSubjects = [...new Set(assessments.map(a => a.subject).filter(Boolean))];
  const uniqueTypes = [...new Set(assessments.map(a => a.assessment_type).filter(Boolean))];
  const uniqueGrades = [...new Set(assessments.map(a => a.grade_level).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessments</h1>
          <p className="text-gray-600">Manage educational standards for your assessments</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <select
                value={filter.subject}
                onChange={(e) => setFilter({ ...filter, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">All Subjects</option>
                {uniqueSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Type
              </label>
              <select
                value={filter.assessmentType}
                onChange={(e) => setFilter({ ...filter, assessmentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade Level
              </label>
              <select
                value={filter.gradeLevel}
                onChange={(e) => setFilter({ ...filter, gradeLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">All Grades</option>
                {uniqueGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>

          {(filter.subject || filter.assessmentType || filter.gradeLevel) && (
            <button
              onClick={() => setFilter({ subject: '', assessmentType: '', gradeLevel: '' })}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Assessments Grid */}
        {filteredAssessments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No assessments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {assessments.length === 0 
                ? "Get started by creating your first assessment."
                : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((assessment) => (
              <Link
                key={assessment.id}
                href={`/teacher/assessments/${assessment.id}`}
                className="block"
              >
                <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 h-full border border-gray-200 hover:border-blue-300">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {assessment.title}
                    </h3>
                  </div>

                  {assessment.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {assessment.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    {assessment.subject && (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-500 w-24">Subject:</span>
                        <span className="text-gray-900 font-medium">{assessment.subject}</span>
                      </div>
                    )}

                    {assessment.assessment_type && (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-500 w-24">Type:</span>
                        <span className="text-gray-900 font-medium">{assessment.assessment_type}</span>
                      </div>
                    )}

                    {assessment.grade_level && (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-500 w-24">Grade:</span>
                        <span className="text-gray-900 font-medium">{assessment.grade_level}</span>
                      </div>
                    )}

                    <div className="flex items-center text-sm pt-2 border-t border-gray-100">
                      <span className="text-gray-500 w-24">Standards:</span>
                      <span className="text-blue-600 font-semibold">
                        {assessment.standards_count || 0}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      Created {new Date(assessment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{assessments.length}</div>
              <div className="text-sm text-gray-500">Total Assessments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {assessments.filter(a => (a.standards_count || 0) > 0).length}
              </div>
              <div className="text-sm text-gray-500">With Standards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {assessments.filter(a => !a.standards_count || a.standards_count === 0).length}
              </div>
              <div className="text-sm text-gray-500">Needs Standards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{uniqueSubjects.length}</div>
              <div className="text-sm text-gray-500">Subjects</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}