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
  onGenerateAssessment?: (lesson: Lesson) => void  // ✅ NEW: Generate assessment callback
  autoExpandKid?: string | null
}

export default function AllChildrenList({ 
  kids, 
  lessonsByKid, 
  onEditLesson, 
  onDeleteLesson,
  onCycleStatus,
  onGenerateAssessment,  // ✅ NEW
  autoExpandKid 
}: AllChildrenListProps) {
  const router = useRouter()
  
  // ✅ NEW: Track which lesson menu is open
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  
  // Helper function to parse date strings as local dates
  const formatLocalDate = (dateString: string | null) => {
    if (!dateString) return ''
    // Parse as local date instead of UTC
    const [year, month, day] = dateString.split('T')[0].split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.toLocaleDateString()
  }

  // ✅ NEW: Calculate end date from start date + duration
  const calculateEndDate = (startDate: string | null, durationMinutes: number | null): string => {
    if (!startDate || !durationMinutes) return 'No end date'
    
    const start = new Date(startDate)
    
    // Simple calculation (will be improved with school calendar later)
    // 1 day = 360 minutes (6 hours)
    const durationDays = Math.ceil(durationMinutes / 360)
    
    // Add duration days to start date
    const end = new Date(start)
    end.setDate(start.getDate() + durationDays)
    
    return end.toLocaleDateString()
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
  
  // ✅ UPDATED: Collapse subjects and statuses
  const [collapsedSubjects, setCollapsedSubjects] = useState<Set<string>>(new Set())
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set())
  const [hasInitialized, setHasInitialized] = useState(false) // ✅ NEW: Track if we've initialized

  // ✅ FIXED: Only initialize collapsed subjects ONCE, not on every data update
  useEffect(() => {
    if (Object.keys(lessonsByKid).length > 0 && !hasInitialized) {
      const newCollapsed = new Set<string>()
      // Collapse all subjects by default
      kids.forEach(kid => {
        const kidLessons = lessonsByKid[kid.id] || []
        const grouped = groupLessonsBySubject(kidLessons)
        Object.keys(grouped).forEach(subject => {
          newCollapsed.add(`${kid.id}-${subject}`)
        })
      })
      setCollapsedSubjects(newCollapsed)
      setHasInitialized(true) // ✅ Mark as initialized
    }
  }, [lessonsByKid, kids, hasInitialized])

  const toggleKid = (kidId: string) => {
    const newExpanded = new Set(expandedKids)
    if (newExpanded.has(kidId)) {
      newExpanded.delete(kidId)
    } else {
      newExpanded.add(kidId)
    }
    setExpandedKids(newExpanded)
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

  const toggleStatus = (key: string) => {
    const newCollapsed = new Set(collapsedStatuses)
    if (newCollapsed.has(key)) {
      newCollapsed.delete(key)
    } else {
      newCollapsed.add(key)
    }
    setCollapsedStatuses(newCollapsed)
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

  // ✅ NEW: Group by SUBJECT first, then STATUS
  const groupLessonsBySubject = (lessons: Lesson[]) => {
    const groups: { [subject: string]: { [status: string]: Lesson[] } } = {}

    lessons.forEach(lesson => {
      const subject = lesson.subject || 'Other'
      const status = getLessonStatus(lesson)
      
      if (!groups[subject]) {
        groups[subject] = {
          'Not Started': [],
          'In Progress': [],
          'Completed': []
        }
      }
      
      groups[subject][status].push(lesson)
    })

    // Sort lessons within each status
    Object.keys(groups).forEach(subject => {
      Object.keys(groups[subject]).forEach(status => {
        groups[subject][status].sort((a, b) => {
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
        const grouped = groupLessonsBySubject(kidLessons) // ✅ CHANGED: Now groups by subject first
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
                    {/* ✅ NEW STRUCTURE: Subject → Status → Lessons */}
                    {Object.entries(grouped).map(([subject, statuses]) => {
                      const subjectLessonCount = Object.values(statuses).flat().length
                      if (subjectLessonCount === 0) return null
                      
                      const subjectKey = `${kid.id}-${subject}`
                      const isSubjectCollapsed = collapsedSubjects.has(subjectKey)
                      
                      return (
                        <div key={subjectKey} className="border-2 border-gray-200 rounded-lg">
                          {/* Subject Header */}
                          <button
                            onClick={() => toggleSubject(subjectKey)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors rounded-t-lg font-bold text-gray-800"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{isSubjectCollapsed ? '▶' : '▼'}</span>
                              <span className="text-lg">📚 {subject}</span>
                              <span className="text-sm font-normal text-gray-600">({subjectLessonCount} lessons)</span>
                            </div>
                          </button>
                          
                          {/* Status Groups within Subject */}
                          {!isSubjectCollapsed && (
                            <div className="p-2 space-y-2">
                              {Object.entries(statuses).map(([status, statusLessons]) => {
                                if (statusLessons.length === 0) return null
                                
                                const statusKey = `${kid.id}-${subject}-${status}`
                                const isStatusCollapsed = collapsedStatuses.has(statusKey)
                                const allStatusSelected = areAllStatusLessonsSelected(statusLessons)
                                
                                return (
                                  <div key={statusKey} className="border rounded-lg">
                                    <div
                                      className={`w-full px-4 py-2 flex items-center justify-between font-semibold text-sm ${
                                        status === 'Completed' ? 'bg-green-50 text-green-800' :
                                        status === 'In Progress' ? 'bg-yellow-50 text-yellow-800' :
                                        'bg-blue-50 text-blue-800'
                                      } rounded-t-lg`}
                                    >
                                      {/* Left side: Arrow + Status name */}
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => toggleStatus(statusKey)}
                                          className="hover:opacity-80 transition-opacity"
                                        >
                                          <span className="text-xs">{isStatusCollapsed ? '▶' : '▼'}</span>
                                        </button>
                                        <span>{status} ({statusLessons.length})</span>
                                      </div>
                                      
                                      {/* Right side: Select All / Deselect All text buttons */}
                                      <div className="flex items-center gap-3 text-xs">
                                        {allStatusSelected ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              deselectAllForStatus(statusLessons)
                                            }}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                          >
                                            Deselect All
                                          </button>
                                        ) : (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              selectAllForStatus(statusLessons)
                                            }}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                          >
                                            Select All
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {!isStatusCollapsed && (
                                      <div className="p-2 space-y-2">
                                        {statusLessons.map((lesson) => (
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
                                                  <div className="flex-1">
                                                    <h3 className={`font-semibold text-gray-900 text-sm ${lesson.status === 'completed' ? 'line-through' : ''}`}>
                                                      {lesson.title}
                                                    </h3>
                                                    {lesson.description && (
                                                      <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                                                        {formatLessonDescription(lesson.description)}
                                                      </p>
                                                    )}
                                                    
                                                    {/* ✅ NEW: Duration and Dates */}
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                      {lesson.duration_minutes && (
                                                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                                          ⏱️ {lesson.duration_minutes} min
                                                        </span>
                                                      )}
                                                      {lesson.lesson_date && (
                                                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                          📅 Start: {formatLocalDate(lesson.lesson_date)}
                                                        </span>
                                                      )}
                                                      {lesson.lesson_date && lesson.duration_minutes && (
                                                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                                          🏁 End: {calculateEndDate(lesson.lesson_date, lesson.duration_minutes)}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  {/* ✅ NEW: Ellipses Menu */}
                                                  <div className="relative ml-2">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        setOpenMenuId(openMenuId === lesson.id ? null : lesson.id)
                                                      }}
                                                      className="p-1 hover:bg-gray-100 rounded"
                                                      title="More actions"
                                                    >
                                                      <span className="text-gray-600 text-xl">⋮</span>
                                                    </button>
                                                    
                                                    {openMenuId === lesson.id && (
                                                      <>
                                                        {/* Backdrop to close menu when clicking outside */}
                                                        <div 
                                                          className="fixed inset-0 z-10" 
                                                          onClick={() => setOpenMenuId(null)}
                                                        />
                                                        
                                                        {/* Dropdown Menu */}
                                                        <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                                                          <button
                                                            onClick={() => {
                                                              onEditLesson(lesson)
                                                              setOpenMenuId(null)
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900 text-sm flex items-center gap-2"
                                                          >
                                                            <span>✏️</span> Edit Lesson
                                                          </button>
                                                          
                                                          {onGenerateAssessment && (
                                                            <button
                                                              onClick={() => {
                                                                onGenerateAssessment(lesson)
                                                                setOpenMenuId(null)
                                                              }}
                                                              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900 text-sm flex items-center gap-2"
                                                            >
                                                              <span>✨</span> Generate Assessment
                                                            </button>
                                                          )}
                                                          
                                                          <div className="border-t border-gray-200 my-1" />
                                                          
                                                          <button
                                                            onClick={() => {
                                                              onDeleteLesson(lesson.id)
                                                              setOpenMenuId(null)
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2"
                                                          >
                                                            <span>🗑️</span> Delete Lesson
                                                          </button>
                                                        </div>
                                                      </>
                                                    )}
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