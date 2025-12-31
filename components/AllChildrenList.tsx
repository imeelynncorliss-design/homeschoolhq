'use client'

import { useState } from 'react'
import HoursTracker from './HoursTracker'

interface Lesson {
  id: string
  kid_id: string
  title: string
  subject: string
  description?: string
  lesson_date: string | null
  duration_minutes: number | null
  status: 'not_started' | 'in_progress' | 'completed'
}

interface Child {
  id: string
  name: string
  age?: number
  grade?: string
  photo_url?: string
}

interface AllChildrenListProps {
  kids: Child[]
  lessonsByKid: { [kidId: string]: Lesson[] }
  onEditLesson: (lesson: Lesson) => void
  onDeleteLesson: (id: string) => void
  onCycleStatus: (id: string, currentStatus: string) => void
}

export default function AllChildrenList({ 
  kids, 
  lessonsByKid, 
  onEditLesson, 
  onDeleteLesson,
  onCycleStatus 
}: AllChildrenListProps) {
  const [expandedKids, setExpandedKids] = useState<Set<string>>(
    new Set(kids.map(k => k.id)) // All expanded by default
  )
  
  // Collapse all statuses by default
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(() => {
    const defaultCollapsed = new Set<string>()
    kids.forEach(kid => {
      defaultCollapsed.add(`${kid.id}-Not Started`)
      defaultCollapsed.add(`${kid.id}-In Progress`)
      defaultCollapsed.add(`${kid.id}-Completed`)
    })
    return defaultCollapsed
  })
  const [collapsedSubjects, setCollapsedSubjects] = useState<Set<string>>(new Set())

  const toggleKid = (kidId: string) => {
    const newExpanded = new Set(expandedKids)
    if (newExpanded.has(kidId)) {
      newExpanded.delete(kidId)
    } else {
      newExpanded.add(kidId)
    }
    setExpandedKids(newExpanded)
  }

  const toggleStatus = (key: string) => {
    const newCollapsed = new Set(collapsedStatuses)
    if (newCollapsed.has(key)) {
      newCollapsed.delete(key)
    } else {
      newCollapsed.add(key)
    }
    setCollapsedStatuses(newCollapsed)
  }

  const toggleSubject = (key: string) => {
    const newCollapsed = new Set(collapsedSubjects)
    if (newCollapsed.has(key)) {
      newCollapsed.delete(key)
    } else {
      newCollapsed.add(key)
    }
    setCollapsedSubjects(newCollapsed)
  }

  const getLessonStatus = (lesson: Lesson) => {
    const statusMap: { [key: string]: string } = {
      'not_started': 'Not Started',
      'in_progress': 'In Progress',
      'completed': 'Completed'
    }
    return statusMap[lesson.status] || 'Not Started'
  }

  const groupLessonsByStatus = (lessons: Lesson[]) => {
    const groups: { [status: string]: { [subject: string]: Lesson[] } } = {
      'Not Started': {},
      'In Progress': {},
      'Completed': {}
    }

    lessons.forEach(lesson => {
      const status = getLessonStatus(lesson)
      const subject = lesson.subject || 'Other'
      
      if (!groups[status][subject]) {
        groups[status][subject] = []
      }
      groups[status][subject].push(lesson)
    })

    // Sort lessons within each subject
    Object.keys(groups).forEach(status => {
      Object.keys(groups[status]).forEach(subject => {
        groups[status][subject].sort((a, b) => {
          const numA = parseInt(a.title.match(/\d+/)?.[0] || '0')
          const numB = parseInt(b.title.match(/\d+/)?.[0] || '0')
          return numA - numB
        })
      })
    })

    return groups
  }

  return (
    <div className="space-y-6">
      {kids.map(kid => {
        const kidLessons = lessonsByKid[kid.id] || []
        const isExpanded = expandedKids.has(kid.id)
        const grouped = groupLessonsByStatus(kidLessons)

        return (
          <div key={kid.id} className="bg-white rounded-lg shadow">
            {/* Child Header */}
            <button
              onClick={() => toggleKid(kid.id)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {kid.photo_url && (
                  <img 
                    src={kid.photo_url} 
                    alt={kid.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-gray-900">{kid.name}</h2>
                  <p className="text-gray-600">
                    {kid.age && `Age: ${kid.age}`}
                    {kid.age && kid.grade && ' • '}
                    {kid.grade && `Grade: ${kid.grade}`}
                  </p>
                </div>
              </div>
              <span className="text-2xl text-gray-600">
                {isExpanded ? '▼' : '▶'}
              </span>
            </button>

            {/* Child Content */}
            {isExpanded && (
              <div className="px-6 pb-6 space-y-6">
                {/* Hours Tracker */}
                <HoursTracker 
                  lessons={kidLessons}
                  childName={kid.name}
                  photoUrl={kid.photo_url}
                />

                {/* Lessons */}
                {kidLessons.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No lessons yet for {kid.name}</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(grouped).map(([status, subjects]) => {
                      const statusLessonCount = Object.values(subjects).flat().length
                      if (statusLessonCount === 0) return null
                      
                      const statusKey = `${kid.id}-${status}`
                      const isStatusCollapsed = collapsedStatuses.has(statusKey)
                      
                      return (
                        <div key={statusKey} className="border rounded-lg">
                          <button
                            onClick={() => toggleStatus(statusKey)}
                            className={`w-full px-4 py-3 flex items-center justify-between font-semibold text-left ${
                              status === 'Completed' ? 'bg-green-50 text-green-800' :
                              status === 'In Progress' ? 'bg-yellow-50 text-yellow-800' :
                              'bg-blue-50 text-blue-800'
                            } hover:opacity-80 transition-opacity rounded-t-lg`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{isStatusCollapsed ? '▶' : '▼'}</span>
                              <span>{status} ({statusLessonCount})</span>
                            </span>
                          </button>
                          
                          {!isStatusCollapsed && (
                            <div className="p-2">
                              {Object.entries(subjects).map(([subject, subjectLessons]) => {
                                const subjectKey = `${kid.id}-${status}-${subject}`
                                const isSubjectCollapsed = collapsedSubjects.has(subjectKey)
                                
                                return (
                                  <div key={subjectKey} className="mb-2">
                                    <button
                                      onClick={() => toggleSubject(subjectKey)}
                                      className="w-full px-3 py-2 flex items-center justify-between text-left bg-gray-50 hover:bg-gray-100 rounded font-medium text-gray-700"
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="text-sm">{isSubjectCollapsed ? '▶' : '▼'}</span>
                                        <span>{subject} ({subjectLessons.length})</span>
                                      </span>
                                    </button>
                                    
                                    {!isSubjectCollapsed && (
                                      <div className="ml-4 mt-2 space-y-2">
                                        {subjectLessons.map((lesson) => (
                                          <div 
                                            key={lesson.id} 
                                            className={`border rounded p-3 ${
                                              lesson.status === 'completed' ? 'bg-green-50' : 
                                              lesson.status === 'in_progress' ? 'bg-yellow-50' : 
                                              'bg-white'
                                            }`}
                                          >
                                            <div className="flex items-start gap-3">
                                              <button
                                                onClick={() => onCycleStatus(lesson.id, lesson.status)}
                                                className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold cursor-pointer ${
                                                  lesson.status === 'completed' ? 'bg-green-500 border-green-600 text-white' :
                                                  lesson.status === 'in_progress' ? 'bg-yellow-400 border-yellow-500 text-gray-800' :
                                                  'bg-white border-gray-300 text-gray-400'
                                                }`}
                                                title={`Status: ${lesson.status.replace('_', ' ')} - Click to change`}
                                              >
                                                {lesson.status === 'completed' ? '✓' : 
                                                 lesson.status === 'in_progress' ? '◐' : '○'}
                                              </button>
                                              <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                  <div>
                                                    <h3 className={`font-semibold text-gray-900 text-sm ${lesson.status === 'completed' ? 'line-through' : ''}`}>
                                                      {lesson.title}
                                                    </h3>
                                                    {lesson.duration_minutes && (
                                                      <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded mt-1">
                                                        ⏱️ {lesson.duration_minutes} min
                                                      </span>
                                                    )}
                                                    {lesson.lesson_date && (
                                                      <p className="text-gray-500 text-xs mt-1">
                                                        📅 {new Date(lesson.lesson_date).toLocaleDateString()}
                                                      </p>
                                                    )}
                                                  </div>
                                                  <div className="flex gap-1">
                                                    <button
                                                      onClick={() => onEditLesson(lesson)}
                                                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                                    >
                                                      Edit
                                                    </button>
                                                    <button
                                                      onClick={() => onDeleteLesson(lesson.id)}
                                                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                                    >
                                                      Delete
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}