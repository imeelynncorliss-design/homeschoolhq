'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type AssessmentFiltersProps = {
  currentSubject?: string
  currentType?: string
  currentGrade?: string
}

export default function AssessmentFilters({
  currentSubject,
  currentType,
  currentGrade,
}: AssessmentFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const subjects = ['Mathematics', 'Science', 'History', 'English', 'Language Arts', 'Reading', 'Writing']
  const types = ['quiz', 'test', 'project', 'essay']
  const grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (value === 'all' || !value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }

    router.push(`/admin/assessments?${params.toString()}`)
  }

  const clearAllFilters = () => {
    router.push('/admin/assessments')
  }

  const hasActiveFilters = currentSubject || currentType || currentGrade

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {/* Subject Filter */}
        <div>
          <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
            Subject
          </label>
          <select
            id="subject"
            value={currentSubject || 'all'}
            onChange={(e) => updateFilter('subject', e.target.value)}
            className="block w-full px-4 py-2.5 text-base border-2 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label htmlFor="type" className="block text-sm font-semibold text-gray-700 mb-2">
            Assessment Type
          </label>
          <select
            id="type"
            value={currentType || 'all'}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="block w-full px-4 py-2.5 text-base border-2 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Grade Filter */}
        <div>
          <label htmlFor="grade" className="block text-sm font-semibold text-gray-700 mb-2">
            Grade Level
          </label>
          <select
            id="grade"
            value={currentGrade || 'all'}
            onChange={(e) => updateFilter('grade', e.target.value)}
            className="block w-full px-4 py-2.5 text-base border-2 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Grades</option>
            {grades.map((grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Active filters:</span>
          
          {currentSubject && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
              Subject: {currentSubject}
              <button
                onClick={() => updateFilter('subject', 'all')}
                className="ml-2 inline-flex items-center"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          )}

          {currentType && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
              Type: {currentType.charAt(0).toUpperCase() + currentType.slice(1)}
              <button
                onClick={() => updateFilter('type', 'all')}
                className="ml-2 inline-flex items-center"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          )}

          {currentGrade && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
              Grade: {currentGrade}
              <button
                onClick={() => updateFilter('grade', 'all')}
                className="ml-2 inline-flex items-center"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}