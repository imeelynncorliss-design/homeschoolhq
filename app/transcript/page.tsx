'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CourseManager from '@/components/CourseManager'
import GradeBook from '@/components/GradeBook'
import TranscriptSettings from '@/components/TranscriptSettings'
import TranscriptGenerator from '@/components/TranscriptGenerator'

export default function TranscriptPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('courses')
  const [kids, setKids] = useState<any[]>([])
  const [selectedKid, setSelectedKid] = useState<string | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
    } else {
      setUser(user)
      loadKids(user.id)
    }
    setLoading(false)
  }

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

  const tabs = [
    { id: 'courses', label: '📚 Courses', description: 'Manage courses' },
    { id: 'gradebook', label: '📊 Grade Book', description: 'Assign grades' },
    { id: 'settings', label: '⚙️ Settings', description: 'School info' },
    { id: 'generate', label: '📄 Generate', description: 'Create transcript' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-10 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-start">
          <div>
            <Link 
              href="/admin" 
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 font-bold text-sm transition-all hover:-translate-x-1"
            >
              ← Back to Admin
            </Link>
            <h1 className="text-4xl font-black tracking-tight mb-2">Transcript Manager</h1>
            <p className="text-purple-100 opacity-90">Professional high school transcript management</p>
          </div>
          
          {/* Dashboard Shortcut */}
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-sm"
          >
            Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 -mt-8">
        {/* Student Selector */}
        {kids.length > 0 && (
          <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                Active Student
              </label>
              <select
                value={selectedKid || ''}
                onChange={(e) => setSelectedKid(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-900 bg-white shadow-sm focus:ring-2 focus:ring-purple-500 outline-none font-bold"
              >
                {kids.map(kid => (
                  <option key={kid.id} value={kid.id}>
                    {kid.displayname || kid.firstname}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="h-10 w-[1px] bg-gray-100 hidden md:block"></div>
            
            <div className="hidden md:block">
              <p className="text-xs text-gray-400 font-medium italic">
                All changes are automatically saved to the student record.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 md:flex-none px-6 py-4 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-md transform -translate-y-1'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-bold text-sm">{tab.label}</span>
                  <span className="text-[10px] uppercase font-black tracking-tighter opacity-50">{tab.description}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'courses' && selectedKid && (
            <CourseManager kidId={selectedKid} userId={user.id} />
          )}
          
          {activeTab === 'gradebook' && selectedKid && (
            <GradeBook kidId={selectedKid} userId={user.id} />
          )}
          
          {activeTab === 'settings' && selectedKid && (
            <TranscriptSettings kidId={selectedKid} userId={user.id} />
          )}
          
          {activeTab === 'generate' && selectedKid && (
            <TranscriptGenerator 
              kidId={selectedKid} 
              userId={user.id}
              kidData={kids.find(k => k.id === selectedKid)}
            />
          )}
        </div>
      </div>
    </div>
  )
}