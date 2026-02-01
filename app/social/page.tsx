'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import CoopManager from '@/components/CoopManager'
import SocialCalendar from '@/components/SocialCalendar'
import CommunityConnect from '@/components/CommunityConnect'
import FamilyCollaboration from '@/components/FamilyCollaboration'
import { getTierForTesting } from '@/lib/tierTesting'
import DevTierToggle from '@/components/DevTierToggle'
import AuthGuard from '@/components/AuthGuard'

function SocialHub() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('social-calendar')
  const [userTier, setUserTier] = useState<'FREE' | 'PREMIUM' | 'FAMILY'>('FREE')
  
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // 1. Check for localhost bypass
      if (window.location.hostname === 'localhost') {
        setUser({ id: '00000000-0000-0000-0000-000000000001', email: 'dev@example.com' })
        // 2. Set the tier so you aren't locked out of the UI locally
        setUserTier(getTierForTesting())
      } else {
        // 3. Only redirect on production
        router.push('/')
      }
    } else {
      setUser(user)
      // Fetch actual tier logic would go here, using testing tier for now
      setUserTier(getTierForTesting())
    }
    setLoading(false)
  }

  useEffect(() => {
    checkUser()
  }, [])

  const tabs = [
    { 
      id: 'social-calendar', 
      label: 'Social Calendar',
      icon: '🎉',
      description: 'Shared events, field trips & activities'
    },
    { 
      id: 'coop', 
      label: 'Co-op Manager',
      icon: '👥',
      description: 'Classes, teachers & schedules'
    },
    { 
      id: 'community', 
      label: 'Community',
      icon: '🌍',
      description: 'Connect with local families'
    },
    { 
      id: 'collaboration', 
      label: 'Family Sharing',
      icon: '👨‍👩‍👧‍👦',
      description: 'Multi-parent access & co-teaching'
    }
  ]

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const hasFamilyTier = userTier === 'FAMILY'

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Social Hub</h1>
              <p className="text-gray-600 mt-1">Connect, collaborate, and coordinate with other homeschool families</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-[#4a5568] hover:bg-[#2d3748] text-white rounded-lg font-medium text-sm transition-all"
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Subscription Badge */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              userTier === 'FAMILY' ? 'bg-purple-100 text-purple-800' :
              userTier === 'PREMIUM' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {userTier} Plan
            </span>
            {!hasFamilyTier && (
              <button 
                onClick={() => router.push('/pricing')}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold uppercase tracking-tight"
              >
                Upgrade to FAMILY Plan to unlock social features →
              </button>
            )}
          </div>
        </div>

        {!hasFamilyTier ? (
          /* Upgrade Prompt */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center animate-in fade-in zoom-in duration-500">
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Social Hub is Locked</h2>
            <p className="text-gray-500 mb-8 max-w-2xl mx-auto font-medium">
              The Social Hub is a premium feature for families who want to coordinate with others. 
              Upgrade to the Family Plan to start collaborating.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {tabs.map(tab => (
                <div key={tab.id} className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-left">
                  <div className="text-2xl mb-2">{tab.icon}</div>
                  <h3 className="font-bold text-gray-900 text-sm">{tab.label}</h3>
                  <p className="text-[11px] text-gray-500 mt-1">{tab.description}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push('/pricing')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all"
            >
              Upgrade to Family Plan
            </button>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
              <nav className="flex divide-x divide-gray-100">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-4 px-4 transition-all ${
                      activeTab === tab.id
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl">{tab.icon}</span>
                      <span className="text-xs font-bold uppercase tracking-widest">{tab.label.split(' ')[1]}</span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
              {activeTab === 'social-calendar' && <SocialCalendar userId={user?.id} />}
              {activeTab === 'coop' && <CoopManager userId={user?.id} />}
              {activeTab === 'community' && <CommunityConnect userId={user?.id} />}
              {activeTab === 'collaboration' && <FamilyCollaboration userId={user?.id} />}
            </div>
          </>
        )}

        <div className="mt-8 flex justify-center opacity-50 hover:opacity-100 transition-opacity">
          <DevTierToggle /> 
        </div>
      </div>
    </div>
  )
}

// WRAPPER
export default function SocialPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Social Hub...</div>}>
        <SocialHub />
      </Suspense>
    </AuthGuard>
  )
}