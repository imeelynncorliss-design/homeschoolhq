'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type AssessmentCardProps = {
  assessment: {
    id: string
    title: string
    description: string
    subject: string
    type: 'quiz' | 'test' | 'project' | 'essay'
    grade_level: number
    question_count: number
    created_at: string
    status: 'draft' | 'active' | 'archived'
    standards_count: number
    assignments?: Array<{
      kid: {
        displayname: string
      }
      completed_at: string | null
    }>
  }
}

const subjectIcons: Record<string, string> = {
  Mathematics: '🔢',
  Science: '🔬',
  History: '📚',
  'Language Arts': '📖',
  English: '📝',
  Reading: '📕',
  Writing: '✍️',
  Art: '🎨',
  Music: '🎵',
  'Physical Education': '⚽',
}

export default function AssessmentCard({ assessment }: AssessmentCardProps) {
  const hasStandards = assessment.standards_count > 0
  const isDraft = assessment.status === 'draft'
  
  // Check if any kid has been assigned
  const assignedKids = assessment.assignments?.filter(a => a) || []
  const completedCount = assignedKids.filter(a => a.completed_at).length
  
  const assignmentStatus = assignedKids.length > 0
    ? assignedKids.length === completedCount && completedCount > 0
      ? `Completed by ${completedCount} student${completedCount !== 1 ? 's' : ''}`
      : `Assigned to ${assignedKids[0].kid.displayname}${assignedKids.length > 1 ? ` +${assignedKids.length - 1}` : ''}`
    : 'Never assigned'

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-900">
            {assessment.title}
          </h3>
          {isDraft && (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800">
              Draft
            </span>
          )}
        </div>
        <p className="text-gray-600 text-sm">{assessment.description}</p>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-5 pb-5 border-b border-gray-200">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Subject
          </div>
          <div className="text-sm font-medium text-gray-900">{assessment.subject}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Type
          </div>
          <div className="text-sm font-medium text-gray-900 capitalize">{assessment.type}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Grade
          </div>
          <div className="text-sm font-medium text-gray-900">{assessment.grade_level}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Questions
          </div>
          <div className="text-sm font-medium text-gray-900">{assessment.question_count}</div>
        </div>
      </div>

      {/* Standards Indicator - PROMINENT */}
      <div
        className={`rounded-lg p-4 mb-5 flex items-center gap-3 ${
          hasStandards
            ? 'bg-green-100 border-2 border-green-300'
            : 'bg-red-50 border-2 border-red-200'
        }`}
      >
        <span className="text-2xl flex-shrink-0">{hasStandards ? '🎯' : '⚠️'}</span>
        <span
          className={`text-sm font-semibold ${
            hasStandards ? 'text-green-900' : 'text-red-900'
          }`}
        >
          {hasStandards
            ? `${assessment.standards_count} educational standard${assessment.standards_count !== 1 ? 's' : ''} aligned`
            : 'No standards aligned yet'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-4">
        <Link
          href={`/admin/assessments/${assessment.id}`}
          className="flex-1 px-4 py-2.5 text-center text-sm font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
        >
          View & Edit
        </Link>
        <Link
          href={`/admin/assessments/${assessment.id}/assign`}
          className="flex-1 px-4 py-2.5 text-center text-sm font-bold text-indigo-600 bg-white border-2 border-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
        >
          Assign
        </Link>
      </div>

      {/* Footer Metadata */}
      <div className="pt-4 border-t border-gray-200 text-xs text-gray-500">
        Created {formatDistanceToNow(new Date(assessment.created_at), { addSuffix: true })} • {assignmentStatus}
      </div>
    </div>
  )
}