'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CourseManager from '@/components/CourseManager'
import AuthGuard from '@/components/AuthGuard'
import { getOrganizationId } from '@/src/lib/getOrganizationId' 
import { useAppHeader } from '@/components/layout/AppHeader'

function CoursesContent() {
  const router = useRouter()
  useAppHeader({ title: '📚 Courses', backHref: '/dashboard' })
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<any[]>([])
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [isCoTeacher, setIsCoTeacher] = useState(false) // NEW

  const loadKids = async (userId: string) => {
    const { orgId, isCoTeacher } = await getOrganizationId(userId) // FIX
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
    if (!user) { router.push('/'); return }
    setUser(user)
    await loadKids(user.id)
    setLoading(false)
  }

  useEffect(() => { checkUser() }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl font-bold text-gray-900">Loading Courses...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

    <div className="max-w-6xl mx-auto px-4 py-6 md:px-8">
        {/* FIX: Role-aware empty state */}
        {kids.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-4">🤷‍♀️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No students found</h2>
            <p className="text-gray-600 mb-6">
              {isCoTeacher
                ? "No students have been added to this account yet. Check back once the account admin has set things up."
                : "Add a child to your account before creating courses."}
            </p>
            {!isCoTeacher && (
              <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                Go to Dashboard
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-8 bg-white p-4 md:p-6 rounded-2xl shadow-sm border flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-widest">Active Student</label>
                <select
                  value={selectedKid || ''}
                  onChange={(e) => setSelectedKid(e.target.value)}
                  className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-indigo-600 transition-all cursor-pointer min-w-[200px]"
                >
                  {kids.map((kid) => (
                    <option key={kid.id} value={kid.id}>{kid.displayname || kid.firstname}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-500">
                Courses are per-student. Switch students to manage each child's course catalog separately.
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 min-h-[500px]">
              {selectedKid && user && <CourseManager kidId={selectedKid} userId={user.id} />}
            </div>
          </>
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