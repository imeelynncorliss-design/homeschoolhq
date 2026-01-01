// SubjectPacingManager.tsx - Component for managing subject-level proficiency
'use client'

import { useState, useEffect } from 'react'

interface SubjectProficiency {
  id?: string
  subject: string
  proficiency: 'emerging' | 'proficient' | 'deep_dive'
  notes: string
}

interface SubjectPacingManagerProps {
  kidId?: string
  initialSubjects?: SubjectProficiency[]
  onChange: (subjects: SubjectProficiency[]) => void
}

const COMMON_SUBJECTS = [
  'Reading',
  'Math',
  'Science',
  'Writing',
  'Social Studies',
  'Spelling',
  'Grammar',
  'History',
  'Geography',
  'Art',
  'Music',
  'Physical Education'
]

const PROFICIENCY_CONFIG = {
  emerging: {
    label: 'Emerging',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Needs support and foundational work'
  },
  proficient: {
    label: 'Proficient',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'On track, standard pace'
  },
  deep_dive: {
    label: 'Deep Dive',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Needs time/repetition for mastery'
  }
}

export default function SubjectPacingManager({ kidId, initialSubjects = [], onChange }: SubjectPacingManagerProps) {
  const [subjects, setSubjects] = useState<SubjectProficiency[]>(initialSubjects)
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [customSubject, setCustomSubject] = useState('')

  useEffect(() => {
    onChange(subjects)
  }, [subjects])

  const addSubject = () => {
    const subjectName = newSubject === 'custom' ? customSubject : newSubject
    
    if (!subjectName || subjects.some(s => s.subject === subjectName)) {
      return
    }

    setSubjects([...subjects, {
      subject: subjectName,
      proficiency: 'proficient',
      notes: ''
    }])

    setNewSubject('')
    setCustomSubject('')
    setShowAddSubject(false)
  }

  const updateSubject = (index: number, field: keyof SubjectProficiency, value: string) => {
    const updated = [...subjects]
    updated[index] = { ...updated[index], [field]: value as any }
    setSubjects(updated)
  }

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index))
  }

  const availableSubjects = COMMON_SUBJECTS.filter(
    s => !subjects.some(sub => sub.subject === s)
  )

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm text-purple-900">
          <span className="font-semibold">📊 Subject Pacing:</span> Track how your student learns in each subject. This helps AI generate appropriately-paced lessons.
        </p>
      </div>

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="font-medium mb-1">No subjects added yet</p>
          <p className="text-sm">Add subjects to track learning pace and proficiency</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject, index) => {
            const config = PROFICIENCY_CONFIG[subject.proficiency]
            
            return (
              <div key={index} className={`border-2 ${config.borderColor} rounded-lg p-4 ${config.bgColor}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-lg mb-1">{subject.subject}</h4>
                    <select
                      value={subject.proficiency}
                      onChange={(e) => updateSubject(index, 'proficiency', e.target.value)}
                      className={`w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium ${config.color}`}
                    >
                      <option value="emerging">Emerging - Needs support</option>
                      <option value="proficient">Proficient - On track</option>
                      <option value="deep_dive">Deep Dive - Needs time/mastery</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSubject(index)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="Remove subject"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Notes field - show for non-proficient subjects */}
                {subject.proficiency !== 'proficient' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Why the extra {subject.proficiency === 'emerging' ? 'support' : 'time'}?
                    </label>
                    <textarea
                      value={subject.notes}
                      onChange={(e) => updateSubject(index, 'notes', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                      rows={2}
                      placeholder={
                        subject.proficiency === 'emerging' 
                          ? "e.g., Still learning letter sounds, needs phonics support"
                          : "e.g., Needs time/repetition with 'regrouping' concepts"
                      }
                    />
                  </div>
                )}

                {/* Show description for proficiency level */}
                <p className="text-xs text-gray-600 mt-2 italic">
                  {config.description}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Subject Section */}
      {showAddSubject ? (
        <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
          <h4 className="font-semibold text-gray-900 mb-3">Add Subject</h4>
          
          <div className="space-y-3">
            <select
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
            >
              <option value="">Select a subject...</option>
              {availableSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
              <option value="custom">+ Custom Subject</option>
            </select>

            {newSubject === 'custom' && (
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                placeholder="Enter custom subject name"
              />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={addSubject}
                disabled={!newSubject || (newSubject === 'custom' && !customSubject)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                Add Subject
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddSubject(false)
                  setNewSubject('')
                  setCustomSubject('')
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-900 rounded-lg hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddSubject(true)}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors font-medium"
        >
          + Add Subject
        </button>
      )}
    </div>
  )
}