'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
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
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900 mb-2">Loading...</div>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Transcript Manager</h1>
          <p className="text-gray-600">Professional high school transcript management</p>
        </div>

        {/* Student Selector */}
        {kids.length > 1 && (
          <div className="mb-6">
            <select
              value={selectedKid || ''}
              onChange={(e) => setSelectedKid(e.target.value)}
              className="px-4 py-2 border rounded text-gray-900"
            >
              {kids.map(kid => (
                <option key={kid.id} value={kid.id}>
                  {kid.displayname || kid.firstname}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-t border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span>{tab.label}</span>
                  <span className="text-xs">{tab.description}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
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