'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CourseManager from '@/components/CourseManager'
import GradeBook from '@/components/GradeBook'
import TranscriptSettings from '@/components/TranscriptSettings'
import TranscriptGenerator from '@/components/TranscriptGenerator'
import AuthGuard from '@/components/AuthGuard'

function TranscriptContent() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('courses')
  const [kids, setKids] = useState<any[]>([])
  const [selectedKid, setSelectedKid] = useState<string | null>(null)

  // --- 1. THE MISSING HELPER FUNCTION ---
  // This fixes the "getChildColor is not defined" error
  const getChildColor = (index: number) => {
    const colors = [
      { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', accent: 'bg-blue-500' },
      { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', accent: 'bg-purple-500' },
      { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100', accent: 'bg-pink-500' },
      { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', accent: 'bg-orange-500' },
    ];
    return colors[index % colors.length];
  };

  // --- 2. DATA LOADING ---
  const loadKids = async (userId: string) => {
    const query = supabase
      .from('kids')
      .select('*')
      .order('created_at', { ascending: false })

    if (userId !== '00000000-0000-0000-0000-000000000001') {
      query.eq('user_id', userId)
    }

    const { data } = await query
    
    if (data && data.length > 0) {
      setKids(data)
      setSelectedKid(data[0].id)
    }
  }

  // --- 3. AUTH BYPASS FOR LOCALHOST ---
  // This prevents the redirect loop on your computer
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      if (window.location.hostname === 'localhost') {
        const mockUser = { id: '00000000-0000-0000-0000-000000000001', email: 'dev@example.com' };
        setUser(mockUser);
        await loadKids(mockUser.id);
        setLoading(false);
        return;
      }
      router.push('/')
    } else {
      setUser(user)
      await loadKids(user.id)
      setLoading(false)
    }
  }

  useEffect(() => {
    checkUser()
  }, [])

  const tabs = [
    { id: 'courses', label: '📚 Courses', description: 'Manage' },
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
            <Link href="/admin" className="text-white/80 hover:text-white mb-6 font-bold text-sm block">
              ← Back to Admin
            </Link>
            <h1 className="text-4xl font-black mb-2">Transcript Manager</h1>
          </div>
          <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-white/10 rounded-xl text-xs font-bold">
            Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 -mt-8">
        {kids.length > 0 && (
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
                {kids.map((kid, index) => (
                  <option key={kid.id} value={kid.id}>{kid.displayname || kid.firstname}</option>
                ))}
              </select>
            </div>
          </div>
        )}

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
          {activeTab === 'courses' && selectedKid && user && <CourseManager kidId={selectedKid} userId={user.id} />}
          {activeTab === 'gradebook' && selectedKid && user && <GradeBook kidId={selectedKid} userId={user.id} />}
          {activeTab === 'settings' && selectedKid && user && <TranscriptSettings kidId={selectedKid} userId={user.id} />}
          {activeTab === 'generate' && selectedKid && user && (
            <TranscriptGenerator kidId={selectedKid} userId={user.id} kidData={kids.find(k => k.id === selectedKid)} />
          )}
        </div>
      </div>
    </div>
  )
}

// 4. MAIN EXPORT WRAPPED IN AUTHGUARD
export default function TranscriptPage() {
  return (
    <AuthGuard>
      <TranscriptContent />
    </AuthGuard>
  )
}