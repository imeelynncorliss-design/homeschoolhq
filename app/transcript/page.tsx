'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GradeBook from '@/components/GradeBook'
import TranscriptSettings from '@/components/TranscriptSettings'
import TranscriptGenerator from '@/components/TranscriptGenerator'
import AuthGuard from '@/components/AuthGuard'
import { getOrganizationId } from '@/src/lib/getOrganizationId' // NEW

function TranscriptContent() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('gradebook')
  const [kids, setKids] = useState<any[]>([])
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [isCoTeacher, setIsCoTeacher] = useState(false) // NEW

  // FIX: Use getOrganizationId utility to support co-teachers
  const loadKids = async (userId: string) => {
    const { orgId, isCoTeacher } = await getOrganizationId(userId)
    setIsCoTeacher(isCoTeacher)

    const { data } = await supabase
      .from('kids')
      .select('*')
      .eq('organization_id', orgId) // was .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      setKids(data)
      setSelectedKid(data[0].id)
    }
  }

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }
    setUser(user)
    await loadKids(user.id)
    setLoading(false)
  }

  useEffect(() => {
    checkUser()
  }, [])

  const tabs = [
    { id: 'gradebook', label: '📊 Grade Book', description: 'Grades' },
    { id: 'settings', label: '⚙️ Settings', description: 'Info' },
    { id: 'generate', label: '📄 Generate', description: 'PDF' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl font-bold text-gray-900">Loading Transcripts...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-10 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-start">
          <div>
            <Link href="/dashboard" className="text-white/80 hover:text-white mb-6 font-bold text-sm block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-black mb-2">Transcript Manager</h1>
            <p className="text-purple-200 text-sm">Enter grades and generate official transcripts</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/courses')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors"
            >
              📚 Manage Courses
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 -mt-8">

        <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">📚</span>
            <p className="text-sm text-indigo-900">
              <strong>Need to add or manage courses?</strong> Courses now have their own dedicated section.
            </p>
          </div>
          <button
            onClick={() => router.push('/courses')}
            className="shrink-0 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Courses →
          </button>
        </div>

        {/* FIX: Role-aware empty state */}
        {kids.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-5xl mb-4">🤷‍♀️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No students found</h2>
            <p className="text-gray-600 mb-6">
              {isCoTeacher
                ? "No students have been added to this account yet. Check back once the account admin has set things up."
                : "Add a child to your account before creating courses."}
            </p>
            {!isCoTeacher && (
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">
                  Active Student
                </label>
                <select
                  value={selectedKid || ''}
                  onChange={(e) => setSelectedKid(e.target.value)}
                  className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-black text-slate-500 outline-none focus:border-purple-600 transition-all cursor-pointer min-w-[200px]"
                >
                  {kids.map((kid) => (
                    <option key={kid.id} value={kid.id}>{kid.displayname || kid.firstname}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6 flex gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 rounded-xl font-bold transition-all ${
                    activeTab === tab.id ? 'bg-white text-blue-600 shadow-md transform -translate-y-1' : 'text-gray-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 min-h-[500px]">
              {activeTab === 'gradebook' && selectedKid && user && <GradeBook kidId={selectedKid} userId={user.id} />}
              {activeTab === 'settings' && selectedKid && user && <TranscriptSettings kidId={selectedKid} userId={user.id} />}
              {activeTab === 'generate' && selectedKid && user && (
                <TranscriptGenerator kidId={selectedKid} userId={user.id} kidData={kids.find(k => k.id === selectedKid)} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function TranscriptPage() {
  return (
    <AuthGuard>
      <TranscriptContent />
    </AuthGuard>
  )
}