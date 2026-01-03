'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import HoursTracker from './HoursTracker'
import { formatLessonDescription } from '@/lib/formatLessonDescription'

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
  firstname: string
  lastname: string
  displayname: string
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
  autoExpandKid?: string | null
}

export default function AllChildrenList({ 
  kids, 
  lessonsByKid, 
  onEditLesson, 
  onDeleteLesson,
  onCycleStatus,
  autoExpandKid 
}: AllChildrenListProps) {
  const router = useRouter()
  
  // Helper function to parse date strings as local dates
  const formatLocalDate = (dateString: string | null) => {
    if (!dateString) return ''
    // Parse as local date instead of UTC
    const [year, month, day] = dateString.split('T')[0].split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.toLocaleDateString()
  }

  // Helper function to parse AI-generated lesson descriptions
  const parseDescription = (description?: string) => {
    if (!description) return null
    
    try {
      // Try to parse as JSON (AI-generated lessons)
      const parsed = JSON.parse(description)
      return parsed.approach || description
    } catch {
      // If not JSON, return as-is (manually created lessons)
      return description
    }
  }

  // Local state to track lessons (initialized from props, updates locally)
  const [localLessonsByKid, setLocalLessonsByKid] = useState<{ [kidId: string]: Lesson[] }>(lessonsByKid)

  // Sync local state when props change
  useEffect(() => {
    setLocalLessonsByKid(lessonsByKid)
  }, [lessonsByKid])

  // Auto-expand the specified child if autoExpandKid prop is provided
  const [expandedKids, setExpandedKids] = useState<Set<string>>(() => {
    if (autoExpandKid) {
      return new Set([autoExpandKid])
    }
    return new Set()
  })

  // Update expanded kids when autoExpandKid changes
  useEffect(() => {
    if (autoExpandKid) {
      setExpandedKids(new Set([autoExpandKid]))
    }
  }, [autoExpandKid])
  
  // Multiselect state
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0])
  
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

  const toggleLessonSelect = (lessonId: string) => {
    const newSelected = new Set(selectedLessons)
    if (newSelected.has(lessonId)) {
      newSelected.delete(lessonId)
    } else {
      newSelected.add(lessonId)
    }
    setSelectedLessons(newSelected)
  }

  const selectAllForKid = (kidId: string) => {
    const kidLessons = localLessonsByKid[kidId] || []
    const newSelected = new Set(selectedLessons)
    kidLessons.forEach(lesson => newSelected.add(lesson.id))
    setSelectedLessons(newSelected)
  }

  const deselectAllForKid = (kidId: string) => {
    const kidLessons = localLessonsByKid[kidId] || []
    const newSelected = new Set(selectedLessons)
    kidLessons.forEach(lesson => newSelected.delete(lesson.id))
    setSelectedLessons(newSelected)
  }

  // Select all lessons for a specific status
  const selectAllForStatus = (lessons: Lesson[]) => {
    const newSelected = new Set(selectedLessons)
    lessons.forEach(lesson => newSelected.add(lesson.id))
    setSelectedLessons(newSelected)
  }

  // Deselect all lessons for a specific status
  const deselectAllForStatus = (lessons: Lesson[]) => {
    const newSelected = new Set(selectedLessons)
    lessons.forEach(lesson => newSelected.delete(lesson.id))
    setSelectedLessons(newSelected)
  }

  // Check if all lessons in a status are selected
  const areAllStatusLessonsSelected = (lessons: Lesson[]) => {
    if (lessons.length === 0) return false
    return lessons.every(lesson => selectedLessons.has(lesson.id))
  }

  const bulkSchedule = async () => {
    if (selectedLessons.size === 0) return
    
    if (confirm(`Schedule ${selectedLessons.size} lesson(s) for ${formatLocalDate(bulkDate)}?`)) {
      const { supabase } = await import('@/lib/supabase')
      
      // Update database
      for (const lessonId of selectedLessons) {
        await supabase
          .from('lessons')
          .update({ lesson_date: bulkDate })
          .eq('id', lessonId)
      }
      
      // Update local state immediately
      const updatedLessonsByKid = { ...localLessonsByKid }
      Object.keys(updatedLessonsByKid).forEach(kidId => {
        updatedLessonsByKid[kidId] = updatedLessonsByKid[kidId].map(lesson => {
          if (selectedLessons.has(lesson.id)) {
            return { ...lesson, lesson_date: bulkDate }
          }
          return lesson
        })
      })
      setLocalLessonsByKid(updatedLessonsByKid)
      
      setSelectedLessons(new Set())
      setShowBulkActions(false)
    }
  }

  const bulkDelete = async () => {
    if (selectedLessons.size === 0) return
    
    if (confirm(`Are you sure you want to delete ${selectedLessons.size} lesson(s)? This cannot be undone.`)) {
      const { supabase } = await import('@/lib/supabase')
      
      // Delete all lessons in one operation
      const { error } = await supabase
        .from('lessons')
        .delete()
        .in('id', Array.from(selectedLessons))
      
      if (error) {
        console.error('Bulk delete error:', error)
        alert(`Failed to delete lessons: ${error.message}`)
      } else {
        // Update local state immediately by filtering out deleted lessons
        const updatedLessonsByKid = { ...localLessonsByKid }
        Object.keys(updatedLessonsByKid).forEach(kidId => {
          updatedLessonsByKid[kidId] = updatedLessonsByKid[kidId].filter(
            lesson => !selectedLessons.has(lesson.id)
          )
        })
        setLocalLessonsByKid(updatedLessonsByKid)
        
        setSelectedLessons(new Set())
        setShowBulkActions(false)
      }
    }
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

  // Calculate stats for a child
  const getChildStats = (lessons: Lesson[]) => {
    const total = lessons.length
    const completed = lessons.filter(l => l.status === 'completed').length
    const totalMinutes = lessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0
    
    return {
      total,
      completed,
      totalHours: (totalMinutes / 60).toFixed(1),
      completedPercent
    }
  }

  return (
    <div className="space-y-6">
      {/* Bulk Actions Toolbar */}
      {selectedLessons.size > 0 && (
        <div className="sticky top-0 z-10 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="font-semibold">{selectedLessons.size} lesson(s) selected</span>
              <button
                onClick={() => setSelectedLessons(new Set())}
                className="text-sm underline hover:no-underline"
              >
                Clear Selection
              </button>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                <label className="text-sm text-gray-900 font-medium">Schedule for:</label>
                <input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className="border-0 text-gray-900 text-sm focus:ring-0 p-0"
                />
              </div>
              
              <button
                onClick={bulkSchedule}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                📅 Set Date
              </button>
              
              <button
                onClick={bulkDelete}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {kids.map(kid => {
        const kidLessons = localLessonsByKid[kid.id] || []
        const isExpanded = expandedKids.has(kid.id)
        const grouped = groupLessonsByStatus(kidLessons)
        const stats = getChildStats(kidLessons)

        return (
          <div key={kid.id} className="bg-white rounded-lg shadow overflow-hidden">
            {/* Child Header */}
            <button
              onClick={() => toggleKid(kid.id)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {kid.photo_url && (
                  <img 
                    src={kid.photo_url} 
                    alt={kid.displayname}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-gray-900">{kid.displayname}</h2>
                  <p className="text-gray-600">
                    {kid.age && `Age: ${kid.age}`}
                    {kid.age && kid.grade && ' • '}
                    {kid.grade && `Grade: ${kid.grade}`}
                  </p>
                  {/* Summary when collapsed */}
                  {!isExpanded && kidLessons.length > 0 && (
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      <span>{stats.total} lessons</span>
                      <span>•</span>
                      <span>{stats.completedPercent}% complete</span>
                      <span>•</span>
                      <span>{stats.totalHours} hours</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Progress indicator when collapsed */}
                {!isExpanded && kidLessons.length > 0 && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{stats.completedPercent}%</div>
                    <div className="text-xs text-gray-500">
                      {stats.completed} of {stats.total}
                    </div>
                  </div>
                )}
                <span className="text-2xl text-gray-400">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
            </button>

            {/* Child Content */}
            {isExpanded && (
              <div className="px-6 pb-6 space-y-6 border-t border-gray-100">
                {/* Hours Tracker */}
                <div className="pt-6">
                  <HoursTracker
                    lessons={kidLessons}
                    childName={kid.displayname}
                    childId={kid.id}
                    photoUrl={kid.photo_url}
                  />
                </div>

                {/* Lessons */}
                {kidLessons.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No lessons yet for {kid.displayname}</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(grouped).map(([status, subjects]) => {
                      const statusLessons = Object.values(subjects).flat()
                      const statusLessonCount = statusLessons.length
                      if (statusLessonCount === 0) return null
                      
                      const statusKey = `${kid.id}-${status}`
                      const isStatusCollapsed = collapsedStatuses.has(statusKey)
                      const allStatusSelected = areAllStatusLessonsSelected(statusLessons)
                      
                      return (
                        <div key={statusKey} className="border rounded-lg">
                          <div
                            className={`w-full px-4 py-3 flex items-center justify-between font-semibold ${
                              status === 'Completed' ? 'bg-green-50 text-green-800' :
                              status === 'In Progress' ? 'bg-yellow-50 text-yellow-800' :
                              'bg-blue-50 text-blue-800'
                            } rounded-t-lg`}
                          >
                            {/* Left side: Arrow + Status name + Select All label + Checkbox */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleStatus(statusKey)}
                                className="hover:opacity-80 transition-opacity"
                              >
                                <span>{isStatusCollapsed ? '▶' : '▼'}</span>
                              </button>
                              <span>{status} ({statusLessonCount})</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Select All</span>
                                <input
                                  type="checkbox"
                                  checked={allStatusSelected}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    if (allStatusSelected) {
                                      deselectAllForStatus(statusLessons)
                                    } else {
                                      selectAllForStatus(statusLessons)
                                    }
                                  }}
                                  className="w-5 h-5 cursor-pointer"
                                  title={`Select all ${status} lessons`}
                                />
                              </div>
                            </div>
                          </div>
                          
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
                                              {/* Multiselect Checkbox */}
                                              <input
                                                type="checkbox"
                                                checked={selectedLessons.has(lesson.id)}
                                                onChange={() => toggleLessonSelect(lesson.id)}
                                                className="mt-1 w-5 h-5 cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                              
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
                                                    {lesson.description && (
                                                      <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                                                        {formatLessonDescription(lesson.description)}
                                                      </p>
                                                    )}
                                                    {lesson.duration_minutes && (
                                                      <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded mt-1">
                                                        ⏱️ {lesson.duration_minutes} min
                                                      </span>
                                                    )}
                                                    {lesson.lesson_date && (
                                                      <p className="text-gray-500 text-xs mt-1">
                                                        📅 {formatLocalDate(lesson.lesson_date)}
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