'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase'

type Kid = {
  id: string
  displayname: string
  grade?: string
  photo_url?: string
}

type Lesson = {
  id: string
  title: string
  subject: string
  lesson_date: string | null
  duration_minutes: number | null
  status: string
  kid_id: string
  assigned_to_user_id: string | null
  description?: string
}

type Collaborator = {
  organization_id: string
  name: string
  role: string
}

export default function TeachingSchedulePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [collaboratorInfo, setCollaboratorInfo] = useState<Collaborator | null>(null)
  const [kids, setKids] = useState<Kid[]>([])
  const [allLessons, setAllLessons] = useState<Lesson[]>([])
  const [selectedKidFilter, setSelectedKidFilter] = useState<string>('all')
  const [selectedWeek, setSelectedWeek] = useState<'this' | 'next' | 'all'>('this')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      // Check if this user is a collaborator
      const { data: collab } = await supabase
        .from('family_collaborators')
        .select('organization_id, name, role')
        .eq('user_id', user.id)
        .maybeSingle()

        if (!collab) {
            router.push('/dashboard')
            return
          }

      setCollaboratorInfo(collab)


// Load kids for this organization
        const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname, grade, photo_url')
        .eq('organization_id', collab.organization_id)
        .order('displayname')

      if (kidsData) setKids(kidsData)

      // Load all lessons for this organization
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, subject, lesson_date, duration_minutes, status, kid_id, assigned_to_user_id, description')
        .eq('organization_id', collab.organization_id)
        .order('lesson_date', { ascending: true })

      if (lessonsData) setAllLessons(lessonsData)

      setLoading(false)
    }

    init()
  }, [])

  const getWeekRange = (offset: 0 | 1) => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay() + offset * 7)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  const filteredLessons = allLessons.filter(lesson => {
    // Kid filter
    if (selectedKidFilter !== 'all' && lesson.kid_id !== selectedKidFilter) return false

    // Week filter
    if (selectedWeek !== 'all' && lesson.lesson_date) {
      const lessonDate = new Date(lesson.lesson_date + 'T12:00:00')
      const { start, end } = getWeekRange(selectedWeek === 'this' ? 0 : 1)
      if (lessonDate < start || lessonDate > end) return false
    }

    return true
  })

  const myLessons = filteredLessons.filter(l => l.assigned_to_user_id === user?.id)
  const otherLessons = filteredLessons.filter(l => l.assigned_to_user_id !== user?.id)

  const markComplete = async (lessonId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed'
    setUpdatingId(lessonId)
    const updates: any = { status: newStatus }
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
    if (newStatus === 'not_started') updates.completed_at = null

    const { error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', lessonId)

    if (!error) {
      setAllLessons(prev => prev.map(l => l.id === lessonId ? { ...l, ...updates } : l))
    }
    setUpdatingId(null)
  }

  const getKidName = (kidId: string) => kids.find(k => k.id === kidId)?.displayname || 'Unknown'

  const getKidPhoto = (kidId: string) => {
    const kid = kids.find(k => k.id === kidId)
    return kid?.photo_url || null
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date set'
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    })
  }

  const LessonCard = ({ lesson, isAssignedToMe }: { lesson: Lesson, isAssignedToMe: boolean }) => (
    <div className={`rounded-lg border p-4 transition-all ${
      isAssignedToMe
        ? 'bg-white border-purple-200 shadow-sm'
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-start gap-3">
        {/* Kid avatar */}
        <div className="flex-shrink-0">
          {getKidPhoto(lesson.kid_id) ? (
            <img src={getKidPhoto(lesson.kid_id)!} alt={getKidName(lesson.kid_id)}
              className="w-9 h-9 rounded-full object-cover border-2 border-gray-200" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {getKidName(lesson.kid_id).charAt(0)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900 truncate">{lesson.title}</p>
              <p className="text-sm text-gray-500">
                {getKidName(lesson.kid_id)} • {lesson.subject}
              </p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(lesson.lesson_date)}</p>
            </div>

            {/* Status / action */}
            {isAssignedToMe ? (
              <button
                onClick={() => markComplete(lesson.id, lesson.status)}
                disabled={updatingId === lesson.id}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  lesson.status === 'completed'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {updatingId === lesson.id ? '...' : lesson.status === 'completed' ? '✓ Done' : 'Mark Done'}
              </button>
            ) : (
              <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${
                lesson.status === 'completed' ? 'bg-green-100 text-green-700' :
                lesson.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {lesson.status === 'completed' ? '✓ Done' :
                 lesson.status === 'in_progress' ? 'In Progress' : 'Not Started'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Loading your teaching schedule...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-indigo-900">Homeschool</span>
              <span className="text-lg font-black text-purple-600">HQ</span>
            </div>
            <p className="text-sm text-gray-500">
              Teaching Schedule — {collaboratorInfo?.name}
            </p>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Week</label>
            <div className="flex gap-2">
              {(['this', 'next', 'all'] as const).map(w => (
                <button key={w} onClick={() => setSelectedWeek(w)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedWeek === w ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {w === 'this' ? 'This Week' : w === 'next' ? 'Next Week' : 'All'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Child</label>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setSelectedKidFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedKidFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                All
              </button>
              {kids.map(kid => (
                <button key={kid.id} onClick={() => setSelectedKidFilter(kid.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedKidFilter === kid.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {kid.displayname}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* My Lessons */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-gray-900">👩‍🏫 My Lessons</h2>
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {myLessons.length}
            </span>
          </div>
          {myLessons.length === 0 ? (
            <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-400">No lessons assigned to you for this period.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myLessons.map(lesson => (
                <LessonCard key={lesson.id} lesson={lesson} isAssignedToMe={true} />
              ))}
            </div>
          )}
        </div>

        {/* All Other Lessons - read only context */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-gray-900">📚 Full Schedule</h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {otherLessons.length}
            </span>
            <span className="text-xs text-gray-400">(view only)</span>
          </div>
          {otherLessons.length === 0 ? (
            <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-400">No other lessons for this period.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {otherLessons.map(lesson => (
                <LessonCard key={lesson.id} lesson={lesson} isAssignedToMe={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}