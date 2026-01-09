'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SchoolYearConfig from '@/components/SchoolYearConfig'
import ProgressDashboard from '@/components/ProgressDashboard'
import VacationPlanner from '@/components/VacationPlanner'
import BulkLessonScheduler from '@/components/BulkLessonScheduler'
import AttendanceTracker from '@/components/AttendanceTracker'
import { getTierForTesting } from '@/lib/tierTesting'
import DevTierToggle from '@/components/DevTierToggle'

// Feature flags based on subscription tier
const FEATURES = {
  FREE: ['school_year_config'],
  PREMIUM: ['school_year_config', 'progress_tracking', 'vacation_planner', 'bulk_scheduler', 'attendance_tracking', 'transcripts'],
  FAMILY: ['school_year_config', 'progress_tracking', 'vacation_planner', 'bulk_scheduler', 'attendance_tracking', 'transcripts', 'advanced_analytics']
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('school-year')
  const [userTier, setUserTier] = useState<'FREE' | 'PREMIUM' | 'FAMILY'>('FREE')
  const [kids, setKids] = useState<any[]>([])
  
  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
    } else {
      setUser(user)
      loadKids()
      setUserTier(getTierForTesting())
    }
    setLoading(false)
  }

  const loadKids = async () => {
    const { data } = await supabase
      .from('kids')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setKids(data)
  }

  const hasFeature = (feature: string) => {
    return FEATURES[userTier].includes(feature)
  }

  const tabs = [
    { 
      id: 'school-year', 
      label: '📅 School Year', 
      icon: '🏫',
      feature: 'school_year_config',
      description: 'Configure your school calendar'
    },
    { 
      id: 'progress', 
      label: '📊 Progress Tracking', 
      icon: '📈',
      feature: 'progress_tracking',
      description: 'Track learning goals and milestones',
      premium: true
    },
    { 
      id: 'vacation', 
      label: '🏖️ Vacation Planner', 
      icon: '🌴',
      feature: 'vacation_planner',
      description: 'Plan breaks and see schedule impact',
      premium: true
    },
    { 
      id: 'bulk-schedule', 
      label: '📚 Bulk Scheduler', 
      icon: '⚡',
      feature: 'bulk_scheduler',
      description: 'Assign dates to imported lessons',
      premium: true
    },
    { 
      id: 'attendance', 
      label: '✅ Attendance', 
      icon: '📋',
      feature: 'attendance_tracking',
      description: 'Track school days and hours',
      premium: true
    }
  ]

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Page</h1>
              <p className="text-gray-600 mt-1">Manage your homeschool configuration and tracking</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          {/* Subscription Tier Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              userTier === 'FREE' ? 'bg-gray-100 text-gray-800' :
              userTier === 'PREMIUM' ? 'bg-blue-100 text-blue-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {userTier} Plan
            </span>
            {userTier === 'FREE' && (
              <a 
                href="/pricing" 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Upgrade to unlock all features →
              </a>
            )}
          </div>
        </div>

        {/* Additional Tools Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Assessments & Standards Card - NEW! */}
  <button
    onClick={() => router.push('/teacher/assessments')}
    className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6 transition-all text-left hover:shadow-lg hover:border-blue-300 cursor-pointer"
  >
    <div className="flex justify-between items-start mb-3">
      <div className="text-4xl">📊</div>
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">Assessments & Standards</h3>
    <p className="text-sm text-gray-600 mb-3">
      Manage assessments and align them with educational standards. Track learning objectives and student progress.
    </p>
    <div className="flex items-center gap-2">
      <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded-full font-semibold">
        FREE
      </span>
      <span className="text-xs text-gray-500">All Grades</span>
    </div>
  </button>

  {/* Transcripts Card */}
  <button
    onClick={() => router.push('/transcript')}
    disabled={!hasFeature('transcripts')}
    className={`bg-gradient-to-br from-purple-50 to-purple-100 border-2 rounded-lg p-6 transition-all text-left ${
      hasFeature('transcripts')
        ? 'border-purple-200 hover:shadow-lg hover:border-purple-300 cursor-pointer'
        : 'border-gray-200 opacity-60 cursor-not-allowed'
    }`}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="text-4xl">📚</div>
      {!hasFeature('transcripts') && (
        <span className="text-xl">🔒</span>
      )}
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">High School Transcripts</h3>
    <p className="text-sm text-gray-600 mb-3">
      Create official transcripts for college applications with GPA calculations and course tracking
    </p>
    <div className="flex items-center gap-2">
      <span className="text-xs px-2 py-1 bg-purple-600 text-white rounded-full font-semibold">
        PREMIUM
      </span>
      <span className="text-xs text-gray-500">Grades 9-12</span>
    </div>
  </button>


            {/* Placeholder for future tools */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-3xl mb-2">➕</div>
                <p className="text-sm">More tools coming soon!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const isLocked = tab.premium && !hasFeature(tab.feature)
                return (
                  <button
                    key={tab.id}
                    onClick={() => !isLocked && setActiveTab(tab.id)}
                    className={`relative flex-1 py-4 px-6 text-center border-b-2 font-medium transition-colors ${
                      activeTab === tab.id && !isLocked
                        ? 'border-blue-500 text-blue-600'
                        : isLocked
                        ? 'border-transparent text-gray-400 cursor-not-allowed'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    disabled={isLocked}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{tab.icon}</span>
                        <span>{tab.label}</span>
                        {isLocked && (
                          <span className="text-sm">🔒</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{tab.description}</span>
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'school-year' && (
            <SchoolYearConfig userId={user.id} />
          )}
          
          {activeTab === 'progress' && hasFeature('progress_tracking') && (
            <ProgressDashboard userId={user.id} />
          )}
          
          {activeTab === 'vacation' && hasFeature('vacation_planner') && (
            <VacationPlanner userId={user.id} />
          )}
          
          {activeTab === 'bulk-schedule' && hasFeature('bulk_scheduler') && (
            <BulkLessonScheduler userId={user.id} />
          )}

          {activeTab === 'attendance' && hasFeature('attendance_tracking') && (
            <AttendanceTracker kids={kids} />
          )}

          {/* Premium Upsell for locked features */}
          {!hasFeature(tabs.find(t => t.id === activeTab)?.feature || '') && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium Feature</h3>
              <p className="text-gray-600 mb-6">
                Upgrade to Premium to unlock {tabs.find(t => t.id === activeTab)?.description.toLowerCase()}
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                View Pricing Plans
              </button>
            </div>
          )}
          
          <DevTierToggle /> 
        </div>
      </div>
    </div>
  )
}