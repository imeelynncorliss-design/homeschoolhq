'use client'

import { useRouter } from 'next/navigation'

interface Lesson {
  id: string
  kid_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  duration_minutes: number | null
}

interface Kid {
  id: string
  displayname: string
  firstname: string
  lastname: string
  age?: number
  grade?: string
  photo_url?: string
  current_hook?: string
  todays_vibe?: string
  current_focus?: string
}

interface KidQuickPanelProps {
  kid: Kid
  lessons: Lesson[]
  onEditProfile: () => void
  onViewAssessments: () => void
  onViewCoverage: () => void
  isPro: boolean
}

export default function KidQuickPanel({
  kid,
  lessons,
  onEditProfile,
  onViewAssessments,
  onViewCoverage,
  isPro
}: KidQuickPanelProps) {
  const router = useRouter()

  // Calculate stats from lessons
  const totalLessons = lessons.length
  const completedLessons = lessons.filter(l => l.status === 'completed').length
  const completionPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const totalMinutes = lessons
    .filter(l => l.status === 'completed' || l.status === 'in_progress')
    .reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
  const totalHours = (totalMinutes / 60).toFixed(1)

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-4">
      
      {/* Avatar */}
      <div className="flex-shrink-0">
        {kid.photo_url ? (
          <img
            src={kid.photo_url}
            alt={kid.displayname}
            className="w-11 h-11 rounded-full object-cover border-2 border-purple-200"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg border-2 border-purple-200">
            {kid.displayname.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name + tags */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-900 text-sm">{kid.displayname}</span>
          {kid.age && (
            <span className="text-xs text-gray-500">Age {kid.age}{kid.grade ? ` • Grade ${kid.grade}` : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {kid.current_hook && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
              🎣 {kid.current_hook}
            </span>
          )}
          {kid.todays_vibe && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-100">
              😊 {kid.todays_vibe}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="text-center">
          <div className="text-lg font-black text-purple-600">{totalLessons}</div>
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Lessons</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-black ${completionPercent >= 70 ? 'text-green-600' : completionPercent >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
            {completionPercent}%
          </div>
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Complete</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-black text-blue-600">{totalHours}h</div>
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Tracked</div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-gray-200 flex-shrink-0" />

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isPro ? (
          <button
            onClick={onViewCoverage}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1"
          >
            📊 Coverage
            <span className="text-[9px] bg-purple-200 text-purple-800 px-1 py-0.5 rounded font-bold uppercase tracking-wide">Pro</span>
          </button>
        ) : (
          <button
            onClick={() => router.push('/pricing')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed flex items-center gap-1"
            title="Upgrade to Pro"
          >
            📊 Coverage 🔒
          </button>
        )}

        <button
          onClick={onViewAssessments}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          📋 Assessments
        </button>

        <button
          onClick={onEditProfile}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          ⚙️ Edit Profile
        </button>
      </div>
    </div>
  )
}