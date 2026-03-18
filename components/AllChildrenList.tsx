'use client'

import { useState, useEffect, useRef } from 'react'
import { formatLessonDescription } from '@/lib/formatLessonDescription'
import LessonViewModal from './LessonViewModal'

interface Lesson {
  id: string
  kid_id: string
  title: string
  subject: string
  description?: string
  lesson_source?: string | null
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
  onCycleStatus: (id: string, currentStatus: string) => void
  onSetStatus?: (id: string, status: 'not_started' | 'in_progress' | 'completed') => void
  onRefresh?: () => void
  organizationId?: string
  stateCode?: string | null
  onAddLesson?: (kidId: string) => void
}

export default function AllChildrenList({
  kids,
  lessonsByKid,
  onEditLesson,
  onCycleStatus,
  onSetStatus,
  onRefresh,
  organizationId,
  stateCode,
  onAddLesson,
}: AllChildrenListProps) {
  const [selectedModalLesson, setSelectedModalLesson] = useState<Lesson | null>(null)
  const [statusToast, setStatusToast] = useState<{ message: string; emoji: string; lessonId: string; prevStatus: 'not_started' | 'in_progress' | 'completed' } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [deleteToast, setDeleteToast] = useState<{ lessons: Lesson[] } | null>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const softDeleteLessons = (lessonsToDelete: Lesson[]) => {
    const ids = new Set(lessonsToDelete.map(l => l.id))
    setLocalLessonsByKid(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(kidId => {
        updated[kidId] = updated[kidId].filter(l => !ids.has(l.id))
      })
      return updated
    })
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    setDeleteToast({ lessons: lessonsToDelete })
    deleteTimerRef.current = setTimeout(async () => {
      const { supabase } = await import('@/src/lib/supabase')
      await supabase.from('lessons').delete().in('id', Array.from(ids))
      setDeleteToast(null)
      onRefresh?.()
    }, 5000)
  }

  const undoDelete = () => {
    if (!deleteToast) return
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    setLocalLessonsByKid(prev => {
      const updated = { ...prev }
      deleteToast.lessons.forEach(lesson => {
        if (!updated[lesson.kid_id]) updated[lesson.kid_id] = []
        updated[lesson.kid_id] = [...updated[lesson.kid_id], lesson]
          .sort((a, b) => (a.lesson_date || '').localeCompare(b.lesson_date || ''))
      })
      return updated
    })
    setDeleteToast(null)
  }

  const showStatusToast = (lessonId: string, prevStatus: 'not_started' | 'in_progress' | 'completed', newStatus: 'not_started' | 'in_progress' | 'completed') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    const messages = {
      in_progress: { emoji: '🔵', message: "Moved to In Progress." },
      completed:   { emoji: '✅', message: "Marked as Done." },
      not_started: { emoji: '⬜', message: "Reset to Not Started." },
    }
    setStatusToast({ ...messages[newStatus], lessonId, prevStatus })
    toastTimerRef.current = setTimeout(() => setStatusToast(null), 4000)
  }
  
  const formatLocalDate = (dateString: string | null) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('T')[0].split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.toLocaleDateString()
  }

  const calculateEndDate = (startDate: string | null, durationMinutes: number | null): string => {
    if (!startDate || !durationMinutes) return 'No end date'
    const start = new Date(startDate)
    const durationDays = Math.ceil(durationMinutes / 360)
    const end = new Date(start)
    end.setDate(start.getDate() + durationDays)
    return end.toLocaleDateString()
  }

  const [localLessonsByKid, setLocalLessonsByKid] = useState<{ [kidId: string]: Lesson[] }>(lessonsByKid)

  useEffect(() => {
    setLocalLessonsByKid(lessonsByKid)
  }, [lessonsByKid])

  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set())
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0])
  
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyTargetChildId, setCopyTargetChildId] = useState('')
  
  const [collapsedSubjects, setCollapsedSubjects] = useState<Set<string>>(new Set())
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set())
  const [initializedKids, setInitializedKids] = useState<Set<string>>(new Set())

  const [showBulkShiftModal, setShowBulkShiftModal] = useState(false)
  const [pendingShift, setPendingShift] = useState<{
    lessons: Lesson[]
    daysDelta: number
  } | null>(null)

  useEffect(() => {
    if (Object.keys(lessonsByKid).length === 0) return
    const uninitializedKids = kids.filter(k => !initializedKids.has(k.id))
    if (uninitializedKids.length === 0) return
    setCollapsedStatuses(prev => {
      const next = new Set(prev)
      uninitializedKids.forEach(kid => {
        next.add(`${kid.id}-Not Started`)
        next.add(`${kid.id}-In Progress`)
        next.add(`${kid.id}-Completed`)
      })
      return next
    })
    setInitializedKids(prev => {
      const next = new Set(prev)
      uninitializedKids.forEach(k => next.add(k.id))
      return next
    })
  }, [lessonsByKid, kids])

  const toggleSubject = (key: string) => {
    const newCollapsed = new Set(collapsedSubjects)
    if (newCollapsed.has(key)) newCollapsed.delete(key)
    else newCollapsed.add(key)
    setCollapsedSubjects(newCollapsed)
  }

  const toggleStatus = (key: string) => {
    const newCollapsed = new Set(collapsedStatuses)
    if (newCollapsed.has(key)) newCollapsed.delete(key)
    else newCollapsed.add(key)
    setCollapsedStatuses(newCollapsed)
  }

  const toggleLessonSelect = (lessonId: string) => {
    const newSelected = new Set(selectedLessons)
    if (newSelected.has(lessonId)) newSelected.delete(lessonId)
    else newSelected.add(lessonId)
    setSelectedLessons(newSelected)
  }

  const selectAllForStatus = (lessons: Lesson[]) => {
    const newSelected = new Set(selectedLessons)
    lessons.forEach(lesson => newSelected.add(lesson.id))
    setSelectedLessons(newSelected)
  }

  const deselectAllForStatus = (lessons: Lesson[]) => {
    const newSelected = new Set(selectedLessons)
    lessons.forEach(lesson => newSelected.delete(lesson.id))
    setSelectedLessons(newSelected)
  }

  const areAllStatusLessonsSelected = (lessons: Lesson[]) => {
    if (lessons.length === 0) return false
    return lessons.every(lesson => selectedLessons.has(lesson.id))
  }

  const bulkSchedule = async () => {
    if (selectedLessons.size === 0) return
  
    const selectedWithDates = Object.values(localLessonsByKid)
      .flat()
      .filter(l => selectedLessons.has(l.id) && l.lesson_date)
      .sort((a, b) => a.lesson_date!.localeCompare(b.lesson_date!))
  
    if (selectedWithDates.length === 0) {
      alert('No selected lessons have dates to shift. Use this to reschedule lessons that already have dates.')
      return
    }
  
    const earliestDate = new Date(selectedWithDates[0].lesson_date! + 'T00:00:00')
    const newAnchorDate = new Date(bulkDate + 'T00:00:00')
    const daysDelta = Math.round((newAnchorDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24))
  
    if (daysDelta === 0) return
  
    setPendingShift({ lessons: selectedWithDates, daysDelta })
    setShowBulkShiftModal(true)
  }

  const executeBulkShift = async (updateAll: boolean) => {
    if (!pendingShift) return
    const { lessons, daysDelta } = pendingShift
    const { supabase } = await import('@/src/lib/supabase')
  
    for (const lesson of lessons) {
      const shifted = new Date(lesson.lesson_date! + 'T00:00:00')
      shifted.setDate(shifted.getDate() + daysDelta)
      await supabase
        .from('lessons')
        .update({ lesson_date: shifted.toISOString().split('T')[0] })
        .eq('id', lesson.id)
    }
  
    if (updateAll) {
      const selectedIds = new Set(lessons.map(l => l.id))
      const earliestDate = lessons[0].lesson_date!
      const subsequentUnselected = Object.values(localLessonsByKid)
        .flat()
        .filter(l => !selectedIds.has(l.id) && l.lesson_date && l.lesson_date > earliestDate)

      for (const lesson of subsequentUnselected) {
        const shifted = new Date(lesson.lesson_date! + 'T00:00:00')
        shifted.setDate(shifted.getDate() + daysDelta)
        await supabase
          .from('lessons')
          .update({ lesson_date: shifted.toISOString().split('T')[0] })
          .eq('id', lesson.id)
      }
    }

    onRefresh?.()
    setSelectedLessons(new Set())
    setShowBulkShiftModal(false)
    setPendingShift(null)
  }

  const bulkDelete = () => {
    if (selectedLessons.size === 0) return
    const lessonsToDelete: Lesson[] = Object.values(localLessonsByKid)
      .flat()
      .filter(l => selectedLessons.has(l.id))
    setSelectedLessons(new Set())
    softDeleteLessons(lessonsToDelete)
  }

  const bulkCopyToChild = async () => {
    if (selectedLessons.size === 0 || !copyTargetChildId) return
    const targetChild = kids.find(k => k.id === copyTargetChildId)
    if (!targetChild) return
    
    if (confirm(`Copy ${selectedLessons.size} lesson(s) to ${targetChild.displayname}?`)) {
      const { supabase } = await import('@/src/lib/supabase')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert('You must be logged in to copy lessons'); return }
      
      const lessonsToCopy: Lesson[] = []
      Object.values(localLessonsByKid).forEach(lessons => {
        lessons.forEach(lesson => {
          if (selectedLessons.has(lesson.id)) lessonsToCopy.push(lesson)
        })
      })
      
      const lessonsToInsert = lessonsToCopy.map(lesson => ({
        kid_id: copyTargetChildId,
        user_id: user.id,
        subject: lesson.subject,
        title: lesson.title,
        description: lesson.description,
        lesson_date: lesson.lesson_date,
        duration_minutes: lesson.duration_minutes,
        status: 'not_started'
      }))
      
      const { error } = await supabase.from('lessons').insert(lessonsToInsert)
      
      if (error) {
        console.error('Bulk copy error:', error)
        alert(`Failed to copy lessons: ${error.message}`)
      } else {
        alert(`✅ ${lessonsToCopy.length} lesson(s) copied to ${targetChild.displayname}!`)
        const updatedLessonsByKid = { ...localLessonsByKid }
        if (!updatedLessonsByKid[copyTargetChildId]) updatedLessonsByKid[copyTargetChildId] = []
        setLocalLessonsByKid(updatedLessonsByKid)
        setSelectedLessons(new Set())
        setShowCopyModal(false)
        setCopyTargetChildId('')
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
      'Completed': {},
    }
    lessons.forEach(lesson => {
      const status = getLessonStatus(lesson)
      const subject = lesson.subject || 'Other'
      if (!groups[status][subject]) groups[status][subject] = []
      groups[status][subject].push(lesson)
    })
    Object.values(groups).forEach(subjects => {
      Object.values(subjects).forEach(lessonList => {
        lessonList.sort((a, b) => {
          const numA = parseInt(a.title.match(/\d+/)?.[0] || '0')
          const numB = parseInt(b.title.match(/\d+/)?.[0] || '0')
          return numA - numB
        })
      })
    })
    return groups
  }

  const getChildStats = (lessons: Lesson[]) => {
    const total = lessons.length
    const completed = lessons.filter(l => l.status === 'completed').length
    const totalMinutes = lessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, totalHours: (totalMinutes / 60).toFixed(1), completedPercent }
  }

  return (
    <div className="space-y-6">

      {/* ── Bulk Actions Toolbar ─────────────────────────────────────── */}
      {selectedLessons.size > 0 && (
        <div className="sticky top-0 z-10 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="font-semibold">{selectedLessons.size} lesson(s) selected</span>
              <button onClick={() => setSelectedLessons(new Set())} className="text-sm underline hover:no-underline">
                Clear Selection
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                <label className="text-sm text-gray-900 font-medium">Shift to start:</label>
                <input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className="border-0 text-gray-900 text-sm focus:ring-0 p-0"
                />
              </div>
              <button onClick={bulkSchedule} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors">
                📅 Shift Date
              </button>
              <button onClick={() => setShowCopyModal(true)} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-colors">
                📋 Copy to Child
              </button>
              <button onClick={bulkDelete} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors">
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Kids List ────────────────────────────────────────────────── */}
      {kids.map(kid => {
        const kidLessons = localLessonsByKid[kid.id] || []
        const stats = getChildStats(kidLessons)

        return (
          <div key={kid.id} className="bg-white rounded-lg shadow overflow-hidden">

            {/* Child Header */}
            <div className="w-full p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {kid.photo_url && (
                  <img src={kid.photo_url} alt={kid.displayname} className="w-16 h-16 rounded-full object-cover" />
                )}
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-gray-900">{kid.displayname}</h2>
                  <p className="text-gray-600">
                    {kid.age && `Age: ${kid.age}`}
                    {kid.age && kid.grade && ' • '}
                    {kid.grade && `Grade: ${kid.grade}`}
                  </p>
                  {kidLessons.length > 0 && (
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                      <span>{stats.total} lessons</span>
                      <span>·</span>
                      <span>{stats.completedPercent}% complete</span>
                      <span>·</span>
                      <span>{stats.totalHours} hrs</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Child Content */}
            <div className="px-6 pb-6 space-y-6 border-t border-gray-100">

                {onAddLesson && (
                  <div className="pt-4">
                    <button
                      onClick={() => onAddLesson(kid.id)}
                      className="w-full px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                        color: '#fff', border: 'none', cursor: 'pointer',
                        fontSize: 15, fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      + Add Lesson for {kid.displayname}
                    </button>
                  </div>
                )}

                {/* Lessons grouped by status */}
                {kidLessons.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No lessons yet for {kid.displayname}</p>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const grouped = groupLessonsByStatus(kidLessons)
                      return Object.entries(grouped).map(([status, subjects]) => {
                        const statusLessons = Object.values(subjects).flat()
                        if (statusLessons.length === 0) return null

                        const statusKey = `${kid.id}-${status}`
                        const isStatusCollapsed = collapsedStatuses.has(statusKey)
                        const allSelected = areAllStatusLessonsSelected(statusLessons)

                        return (
                          <div key={statusKey} className="border-2 border-gray-200 rounded-lg">

                            {/* Status Header */}
                            <div className={`px-4 py-3 flex items-center justify-between rounded-t-lg font-bold text-gray-800 ${
                              status === 'Completed' ? 'bg-gradient-to-r from-green-50 to-emerald-50' :
                              status === 'In Progress' ? 'bg-gradient-to-r from-yellow-50 to-amber-50' :
                              'bg-gradient-to-r from-indigo-50 to-purple-50'
                            }`}>
                              <div className="flex items-center gap-3">
                                <button onClick={() => toggleStatus(statusKey)}>
                                  <span className="text-lg">{isStatusCollapsed ? '▶' : '▼'}</span>
                                </button>
                                <span className="text-lg">
                                  {status === 'Completed' ? '✅' : status === 'In Progress' ? '🔄' : '📋'} {status}
                                </span>
                                <span className="text-sm font-normal text-gray-600">({statusLessons.length} lessons)</span>
                              </div>
                              <div className="text-xs">
                                {allSelected ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deselectAllForStatus(statusLessons) }}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    Deselect All
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); selectAllForStatus(statusLessons) }}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    Select All
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Subjects within Status */}
                            {!isStatusCollapsed && (
                              <div className="p-2 space-y-2">
                                {Object.entries(subjects).map(([subject, subjectLessons]) => {
                                  if (subjectLessons.length === 0) return null
                                  const subjectKey = `${kid.id}-${status}-${subject}`
                                  const isSubjectCollapsed = collapsedSubjects.has(subjectKey)

                                  return (
                                    <div key={subjectKey} className="border rounded-lg">
                                      <button
                                        onClick={() => toggleSubject(subjectKey)}
                                        className="w-full px-4 py-2 flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                                      >
                                        <span>{isSubjectCollapsed ? '▶' : '▼'}</span>
                                        <span>📚 {subject}</span>
                                        <span className="font-normal text-gray-500">({subjectLessons.length})</span>
                                      </button>

                                      {!isSubjectCollapsed && (
                                        <div className="p-2 space-y-2">
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
                                                <input
                                                  type="checkbox"
                                                  checked={selectedLessons.has(lesson.id)}
                                                  onChange={() => toggleLessonSelect(lesson.id)}
                                                  className="mt-1 w-5 h-5 cursor-pointer"
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    const next: Record<string, 'not_started' | 'in_progress' | 'completed'> = {
                                                      not_started: 'in_progress',
                                                      in_progress: 'completed',
                                                      completed: 'not_started',
                                                    }
                                                    const newStatus = next[lesson.status] ?? 'not_started'
                                                    showStatusToast(lesson.id, lesson.status, newStatus)
                                                    onCycleStatus(lesson.id, lesson.status)
                                                  }}
                                                  className={`mt-0.5 flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-700 cursor-pointer transition-colors flex-shrink-0 ${
                                                    lesson.status === 'completed' ? 'bg-green-100 border-green-300 text-green-700' :
                                                    lesson.status === 'in_progress' ? 'bg-yellow-100 border-yellow-300 text-yellow-700' :
                                                    'bg-gray-100 border-gray-300 text-gray-500'
                                                  }`}
                                                >
                                                  <span>{lesson.status === 'completed' ? '✅' : lesson.status === 'in_progress' ? '🔵' : '⬜'}</span>
                                                  <span>{lesson.status === 'completed' ? 'Done' : lesson.status === 'in_progress' ? 'In Progress' : 'Not Started'}</span>
                                                </button>
                                                <div
                                                  className="flex-1 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded transition-colors"
                                                  onClick={() => setSelectedModalLesson(lesson)}
                                                >
                                                  <h3 className={`font-semibold text-gray-900 text-sm ${lesson.status === 'completed' ? 'line-through' : ''}`}>
                                                    {String(lesson.title || 'Untitled')}
                                                  </h3>
                                                  {lesson.description && (
                                                    <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                                                      {(() => {
                                                        try {
                                                          const formatted = formatLessonDescription(lesson.description)
                                                          return typeof formatted === 'string' ? formatted : String(formatted)
                                                        } catch {
                                                          return typeof lesson.description === 'string' ? lesson.description : JSON.stringify(lesson.description)
                                                        }
                                                      })()}
                                                    </p>
                                                  )}
                                                  <div className="flex flex-wrap items-center gap-2 mt-2">
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
                      })
                    })()}
                  </div>
                )}
              </div>
          </div>
        )
      })}

      {/* ── Lesson View Modal ────────────────────────────────────────── */}
      {selectedModalLesson && (() => {
        const kid = kids.find(k => k.id === selectedModalLesson.kid_id)
        return (
          <LessonViewModal
            lesson={selectedModalLesson}
            kidName={kid?.displayname}
            kidGrade={kid?.grade}
            organizationId={organizationId}
            stateCode={stateCode}
            onClose={() => setSelectedModalLesson(null)}
            onEdit={() => { onEditLesson(selectedModalLesson); setSelectedModalLesson(null) }}
            onDelete={() => { softDeleteLessons([selectedModalLesson]); setSelectedModalLesson(null) }}
            onCycleStatus={(id, status) => { onCycleStatus(id, status); onRefresh?.() }}
            onSetStatus={onSetStatus ? (id, status) => { onSetStatus(id, status); onRefresh?.() } : undefined}
            onSave={() => onRefresh?.()}
          />
        )
      })()}

      {/* ── Status Toast ─────────────────────────────────────────────── */}
      {statusToast && (
        <div style={{
          position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          background: '#1f2937', color: '#fff', borderRadius: 14,
          padding: '12px 16px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
          maxWidth: 360, width: 'calc(100% - 40px)',
          animation: 'fadeInUp 0.2s ease',
          fontFamily: "'Nunito', sans-serif",
        }}>
          <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{statusToast.emoji}</span>
          <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{statusToast.message}</span>
          {onSetStatus && (
            <button
              onClick={() => {
                onSetStatus(statusToast.lessonId, statusToast.prevStatus)
                setStatusToast(null)
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
              }}
              style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 800,
                padding: '5px 12px', cursor: 'pointer', flexShrink: 0,
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* ── Delete Toast ─────────────────────────────────────────────── */}
      {deleteToast && (
        <div style={{
          position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          background: '#1f2937', color: '#fff', borderRadius: 14,
          padding: '12px 16px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
          maxWidth: 360, width: 'calc(100% - 40px)',
          animation: 'fadeInUp 0.2s ease',
          fontFamily: "'Nunito', sans-serif",
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🗑️</span>
          <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
            {deleteToast.lessons.length === 1 ? 'Lesson deleted.' : `${deleteToast.lessons.length} lessons deleted.`}
          </span>
          <button
            onClick={undoDelete}
            style={{
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 800,
              padding: '5px 12px', cursor: 'pointer', flexShrink: 0,
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            Undo
          </button>
        </div>
      )}

      {/* ── Bulk Copy Modal ──────────────────────────────────────────── */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">📋</div>
              <h3 className="text-xl font-bold text-gray-900">Copy Lessons to Another Child</h3>
              <p className="text-sm text-gray-600 mt-2">{selectedLessons.size} lesson(s) selected</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">Select Child</label>
              <select
                value={copyTargetChildId}
                onChange={(e) => setCopyTargetChildId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              >
                <option value="">Choose a child...</option>
                {kids.map(kid => (
                  <option key={kid.id} value={kid.id}>
                    {kid.displayname}{kid.grade ? ` (${kid.grade})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={bulkCopyToChild}
                disabled={!copyTargetChildId}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                Copy to {copyTargetChildId ? kids.find(k => k.id === copyTargetChildId)?.displayname : 'Child'}
              </button>
              <button
                onClick={() => { setShowCopyModal(false); setCopyTargetChildId('') }}
                className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Shift Modal ─────────────────────────────────────────── */}
      {showBulkShiftModal && pendingShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                ⚠️ Date Change Detected
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-900">
                You're shifting <strong>{pendingShift.lessons.length} lesson(s)</strong> by{' '}
                <strong>{Math.abs(pendingShift.daysDelta)} day(s) {pendingShift.daysDelta > 0 ? 'later' : 'earlier'}</strong>.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  📅 This affects {pendingShift.lessons.length} selected lesson(s)
                </p>
                <p className="text-sm text-blue-800">
                  Would you like to shift all subsequent lessons by the same amount?
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift lessons by:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={Math.abs(pendingShift.daysDelta)}
                    onChange={(e) => setPendingShift({
                      ...pendingShift,
                      daysDelta: pendingShift.daysDelta < 0
                        ? -(parseInt(e.target.value) || 0)
                        : (parseInt(e.target.value) || 0)
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-900"
                  />
                  <span className="text-sm text-gray-600">days</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => { setShowBulkShiftModal(false); setPendingShift(null) }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <div className="flex-1" />
              <button
                onClick={() => executeBulkShift(false)}
                className="px-4 py-2 border border-blue-300 bg-blue-50 rounded text-blue-700 hover:bg-blue-100 font-medium"
              >
                Selected Only
              </button>
              <button
                onClick={() => executeBulkShift(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Shift All ({pendingShift.lessons.length})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}