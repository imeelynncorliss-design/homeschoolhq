'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CourseManager from '@/components/CourseManager'
import AuthGuard from '@/components/AuthGuard'

function CoursesContent() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<any[]>([])
  const [selectedKid, setSelectedKid] = useState<string | null>(null)

  const loadKids = async (userId: string) => {
    const { data } = await supabase
      .from('kids')
      .select('*')
      .eq('user_id', userId)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl font-bold text-gray-900">Loading Courses...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-10 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-start">
          <div>
            <Link href="/dashboard" className="text-white/80 hover:text-white mb-6 font-bold text-sm block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-black mb-2">Course Manager</h1>
            <p className="text-indigo-200 text-sm">
              Build your course catalog — the foundation of every high school transcript
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/transcript')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors"
            >
              📄 Transcript
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

        {/* Student selector */}
        {kids.length > 0 && (
          <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-6">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-widest">
                Active Student
              </label>
              <select
                value={selectedKid || ''}
                onChange={(e) => setSelectedKid(e.target.value)}
                className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-indigo-600 transition-all cursor-pointer min-w-[200px]"
              >
                {kids.map((kid) => (
                  <option key={kid.id} value={kid.id}>
                    {kid.displayname || kid.firstname}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500">
              Courses are per-student. Switch students to manage each child's course catalog separately.
            </div>
          </div>
        )}

        {kids.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-4">👧</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No students found</h2>
            <p className="text-gray-600 mb-6">Add a child to your account before creating courses.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 min-h-[500px]">
            {selectedKid && user && (
              <CourseManager kidId={selectedKid} userId={user.id} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CoursesPage() {
  return (
    <AuthGuard>
      <CoursesContent />
    </AuthGuard>
  )
}