// SubjectPacingManager.tsx
'use client'

import { useState, useEffect } from 'react'

interface SubjectProficiency {
  id?: string
  subject: string
  proficiency: 'needs_time' | 'standard' | 'mastery'
  notes: string
}

interface SubjectPacingManagerProps {
  kidId?: string
  initialSubjects: SubjectProficiency[]
  onChange: (subjects: SubjectProficiency[]) => void
}

const CORE_SUBJECTS = ['Reading/Writing', 'Math', 'Science', 'History']

export default function SubjectPacingManager({ 
  kidId, 
  initialSubjects, 
  onChange 
}: SubjectPacingManagerProps) {
  const [subjects, setSubjects] = useState<SubjectProficiency[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [showAddSubject, setShowAddSubject] = useState(false)

  // Initialize subjects once
  useEffect(() => {
    if (isInitialized) return
    
    const existingSubjectNames = initialSubjects.map(s => s.subject)
    const missingCoreSubjects = CORE_SUBJECTS
      .filter(core => !existingSubjectNames.includes(core))
      .map(subject => ({
        subject,
        proficiency: 'standard' as const,
        notes: ''
      }))
    
    const allSubjects = [...initialSubjects, ...missingCoreSubjects]
      .sort((a, b) => {
        const aIsCore = CORE_SUBJECTS.includes(a.subject)
        const bIsCore = CORE_SUBJECTS.includes(b.subject)
        
        if (aIsCore && !bIsCore) return -1
        if (!aIsCore && bIsCore) return 1
        
        if (aIsCore && bIsCore) {
          return CORE_SUBJECTS.indexOf(a.subject) - CORE_SUBJECTS.indexOf(b.subject)
        }
        
        return a.subject.localeCompare(b.subject)
      })
    
    setSubjects(allSubjects)
    setIsInitialized(true)
  }, [initialSubjects, isInitialized])

  // Notify parent of changes (but not during initialization)
  useEffect(() => {
    if (isInitialized && subjects.length > 0) {
      onChange(subjects)
    }
  }, [subjects, isInitialized])

  const updateSubject = (index: number, field: keyof SubjectProficiency, value: any) => {
    setSubjects(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addCustomSubject = () => {
    if (!newSubjectName.trim()) return
    
    const newSubject: SubjectProficiency = {
      subject: newSubjectName.trim(),
      proficiency: 'standard',
      notes: ''
    }
    
    setSubjects(prev => [...prev, newSubject])
    setNewSubjectName('')
    setShowAddSubject(false)
  }

  const removeSubject = (index: number) => {
    const subject = subjects[index]
    if (CORE_SUBJECTS.includes(subject.subject)) {
      alert('Cannot remove core subjects. You can set them to "Standard" if not currently focusing on them.')
      return
    }
    
    setSubjects(prev => prev.filter((_, i) => i !== index))
  }

  const getPaceColor = (pace: string) => {
    switch (pace) {
      case 'needs_time': return 'bg-orange-100 border-orange-300'
      case 'standard': return 'bg-blue-100 border-blue-300'
      case 'mastery': return 'bg-green-100 border-green-300'
      default: return 'bg-gray-100 border-gray-300'
    }
  }

  if (!isInitialized) {
    return <div className="text-center py-8 text-gray-500">Loading subjects...</div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">📚 Subject Pacing:</span> Track how each student progresses through different subjects. This helps personalize their learning path.
        </p>
      </div>

      {/* Core Subjects */}
      <div className="space-y-3">
        {subjects.map((subject, index) => {
          const isCore = CORE_SUBJECTS.includes(subject.subject)
          
          return (
            <div 
              key={`${subject.subject}-${index}`}
              className={`border-2 rounded-lg p-4 ${getPaceColor(subject.proficiency)}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {isCore ? (
                      <div className="font-semibold text-gray-900 min-w-[140px]">
                        {subject.subject}
                      </div>
                    ) : (
                      <div className="font-semibold text-gray-900 min-w-[140px] flex items-center gap-2">
                        <span>{subject.subject}</span>
                        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                          Custom
                        </span>
                      </div>
                    )}
                    
                    <select
                      value={subject.proficiency}
                      onChange={(e) => updateSubject(index, 'proficiency', e.target.value)}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 bg-white font-medium"
                    >
                      <option value="needs_time">🐢 Needs Time</option>
                      <option value="standard">📖 Standard</option>
                      <option value="mastery">🚀 Mastery</option>
                    </select>
                  </div>
                  
                  {/* Optional Notes */}
                  <div className="mt-2">
                    <input
                      type="text"
                      value={subject.notes}
                      onChange={(e) => updateSubject(index, 'notes', e.target.value)}
                      placeholder="Optional notes (e.g., 'Working on multiplication', 'Loves reading fantasy')..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-gray-700 bg-white"
                    />
                  </div>
                </div>

                {!isCore && (
                  <button
                    type="button"
                    onClick={() => removeSubject(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Remove subject"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Custom Subject */}
      <div className="pt-4 border-t-2 border-gray-200">
        {!showAddSubject ? (
          <button
            type="button"
            onClick={() => setShowAddSubject(true)}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors font-medium"
          >
            + Add Custom Subject
          </button>
        ) : (
          <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Subject Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomSubject()
                  }
                }}
                placeholder="e.g., Art, Music, Foreign Language..."
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                autoFocus
              />
              <button
                type="button"
                onClick={addCustomSubject}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddSubject(false)
                  setNewSubjectName('')
                }}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-700 mb-2">Pacing Guide:</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span>🐢</span>
            <span className="text-gray-700"><strong>Needs Time:</strong> Requires more practice and repetition</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📖</span>
            <span className="text-gray-700"><strong>Standard:</strong> Progressing at expected pace</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🚀</span>
            <span className="text-gray-700"><strong>Mastery:</strong> Grasps concepts quickly, ready for more</span>
          </div>
        </div>
      </div>
    </div>
  )
}