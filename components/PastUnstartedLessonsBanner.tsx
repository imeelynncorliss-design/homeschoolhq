'use client'

import { useState, useMemo } from 'react'

type PastLesson = {
  id: string
  title: string
  subject: string
  lesson_date: string
  kid_id: string
  kid_name?: string
}

type PastUnstartedLessonsBannerProps = {
  lessons: PastLesson[]
  onMarkCompleted: (ids: string[]) => Promise<void>
  onDelete: (ids: string[]) => Promise<void>
  onViewLesson?: (lessonId: string) => void
}

export default function PastUnstartedLessonsBanner({
  lessons,
  onMarkCompleted,
  onDelete,
  onViewLesson,
}: PastUnstartedLessonsBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterKidId, setFilterKidId] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<'complete' | 'delete' | null>(null)

  // Unique kids from lessons
  const kids = useMemo(() => {
    const map = new Map<string, string>()
    lessons.forEach(l => {
      if (!map.has(l.kid_id)) map.set(l.kid_id, l.kid_name || 'Unknown')
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [lessons])

  if (dismissed || lessons.length === 0) return null

  const filteredLessons = filterKidId === 'all'
    ? lessons
    : lessons.filter(l => l.kid_id === filterKidId)

  const allFilteredSelected = filteredLessons.length > 0 &&
    filteredLessons.every(l => selectedIds.has(l.id))

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredLessons.forEach(l => next.delete(l.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredLessons.forEach(l => next.add(l.id))
        return next
      })
    }
  }

  const handleAction = async (ids: string[], action: 'complete' | 'delete') => {
    if (!confirm(`${action === 'complete' ? 'Mark' : 'Delete'} ${ids.length} lesson${ids.length !== 1 ? 's' : ''}?${action === 'delete' ? ' This cannot be undone.' : ''}`)) return
    setLoading(true)
    setLoadingAction(action)
    if (action === 'complete') await onMarkCompleted(ids)
    else await onDelete(ids)
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
    setLoading(false)
    setLoadingAction(null)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })

  const selectedCount = selectedIds.size

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {lessons.length} past lesson{lessons.length !== 1 ? 's are' : ' is'} still marked Not Started
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Scheduled before today but never marked complete. Review and resolve below.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-amber-700 hover:text-amber-900 font-medium underline"
          >
            {expanded ? 'Hide' : 'Review'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-400 hover:text-amber-600 text-xl leading-none"
            title="Dismiss"
          >×</button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">

          {/* ── Kid filter tabs ── */}
          {kids.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterKidId('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  filterKidId === 'all'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
                }`}
              >
                All Kids ({lessons.length})
              </button>
              {kids.map(kid => (
                <button
                  key={kid.id}
                  onClick={() => setFilterKidId(kid.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    filterKidId === kid.id
                      ? 'bg-amber-500 text-white'
                      : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {kid.name} ({lessons.filter(l => l.kid_id === kid.id).length})
                </button>
              ))}
            </div>
          )}

          {/* ── Select all row ── */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                className="rounded"
              />
              <span className="text-xs font-medium text-amber-800">
                {allFilteredSelected ? 'Deselect all' : `Select all (${filteredLessons.length})`}
              </span>
            </label>
            {selectedCount > 0 && (
              <span className="text-xs text-amber-700 font-medium">
                {selectedCount} selected
              </span>
            )}
          </div>

          {/* ── Lesson list ── */}
          <div className="border border-amber-200 rounded-lg overflow-hidden">
            <div className="max-h-56 overflow-y-auto divide-y divide-amber-100">
              {filteredLessons.map(lesson => (
                <div
                  key={lesson.id}
                  className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                    selectedIds.has(lesson.id) ? 'bg-amber-100' : 'bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lesson.id)}
                    onChange={() => toggleSelect(lesson.id)}
                    className="rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    {onViewLesson ? (
                      <button
                        onClick={() => onViewLesson(lesson.id)}
                        className="text-sm font-medium text-gray-900 truncate block w-full text-left hover:text-purple-700 hover:underline"
                      >
                        {lesson.title}
                      </button>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 truncate">{lesson.title}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {lesson.subject}
                      {lesson.kid_name ? ` · ${lesson.kid_name}` : ''}
                      {' · '}{formatDate(lesson.lesson_date)}
                    </p>
                  </div>
                  {/* ── Per-row actions ── */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleAction([lesson.id], 'complete')}
                      disabled={loading}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium disabled:opacity-50"
                      title="Mark completed"
                    >✅</button>
                    <button
                      onClick={() => handleAction([lesson.id], 'delete')}
                      disabled={loading}
                      className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium disabled:opacity-50"
                      title="Delete"
                    >🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bulk action bar — only shows when items selected ── */}
          {selectedCount > 0 && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleAction([...selectedIds], 'complete')}
                disabled={loading}
                className="flex-1 py-2 px-3 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading && loadingAction === 'complete'
                  ? 'Marking...'
                  : `✅ Mark ${selectedCount} Completed`}
              </button>
              <button
                onClick={() => handleAction([...selectedIds], 'delete')}
                disabled={loading}
                className="flex-1 py-2 px-3 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 border border-red-200 disabled:opacity-50 transition-colors"
              >
                {loading && loadingAction === 'delete'
                  ? 'Deleting...'
                  : `🗑️ Delete ${selectedCount}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}