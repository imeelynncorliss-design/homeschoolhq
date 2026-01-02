'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CoopManager from '@/components/CoopManager'
import SocialCalendar from '@/components/SocialCalendar'
import CommunityConnect from '@/components/CommunityConnect'
import FamilyCollaboration from '@/components/FamilyCollaboration'
import { getTierForTesting } from '@/lib/tierTesting'
import DevTierToggle from '@/components/DevTierToggle'

export default function SocialHub() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('social-calendar')
  const [userTier, setUserTier] = useState<'FREE' | 'PREMIUM' | 'FAMILY'>('FREE')
  
  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
    } else {
      setUser(user)
      // TODO: Fetch actual subscription tier
      // For now, defaulting to FREE for development
      setUserTier(getTierForTesting())
    }
    setLoading(false)
  }

  const tabs = [
    { 
      id: 'social-calendar', 
      label: '📅 Social Calendar',
      icon: '🎉',
      description: 'Shared events, field trips & activities'
    },
    { 
      id: 'coop', 
      label: '👥 Co-op Manager',
      icon: '🏫',
      description: 'Classes, teachers & schedules'
    },
    { 
      id: 'community', 
      label: '🌍 Community',
      icon: '🤝',
      description: 'Connect with local families'
    },
    { 
      id: 'collaboration', 
      label: '👨‍👩‍👧‍👦 Family Sharing',
      icon: '🔗',
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
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Social Hub</h1>
              <p className="text-gray-600 mt-1">Connect, collaborate, and coordinate with other homeschool families</p>
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

          {/* Subscription Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              userTier === 'FAMILY' ? 'bg-purple-100 text-purple-800' :
              userTier === 'PREMIUM' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {userTier} Plan
            </span>
            {!hasFamilyTier && (
              <a 
                href="/pricing" 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Upgrade to FAMILY Plan to unlock social features →
              </a>
            )}
          </div>
        </div>

        {!hasFamilyTier ? (
          /* Upgrade Prompt */
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Social Features Require FAMILY Plan</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Connect with other homeschool families, coordinate co-op classes, share calendars, 
              and collaborate on activities. Perfect for co-ops, park day groups, and multi-parent households.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8">
              <div className="bg-blue-50 rounded-lg p-6 text-left">
                <div className="text-3xl mb-2">🎉</div>
                <h3 className="font-semibold text-gray-900 mb-2">Social Calendar</h3>
                <p className="text-sm text-gray-600">Plan field trips, park days, and group activities with RSVP tracking</p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-6 text-left">
                <div className="text-3xl mb-2">🏫</div>
                <h3 className="font-semibold text-gray-900 mb-2">Co-op Management</h3>
                <p className="text-sm text-gray-600">Organize classes, assign teachers, track attendance, share supplies</p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-6 text-left">
                <div className="text-3xl mb-2">🤝</div>
                <h3 className="font-semibold text-gray-900 mb-2">Community Connect</h3>
                <p className="text-sm text-gray-600">Find local homeschoolers, join interest groups, share resources</p>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-6 text-left">
                <div className="text-3xl mb-2">👨‍👩‍👧‍👦</div>
                <h3 className="font-semibold text-gray-900 mb-2">Family Collaboration</h3>
                <p className="text-sm text-gray-600">Multi-parent access, shared planning, co-teaching schedules</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold mb-2">FAMILY Plan</h3>
              <div className="text-4xl font-bold mb-2">$19.99/month</div>
              <p className="text-purple-100 mb-4">or $179/year (save $60!)</p>
              <button
                onClick={() => router.push('/pricing')}
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              >
                Upgrade to FAMILY Plan
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-4 px-6 text-center border-b-2 font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{tab.icon}</span>
                          <span>{tab.label}</span>
                        </div>
                        <span className="text-xs text-gray-500">{tab.description}</span>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow p-6">
              {activeTab === 'social-calendar' && (
                <SocialCalendar userId={user.id} />
              )}
              
              {activeTab === 'coop' && (
                <CoopManager userId={user.id} />
              )}
              
              {activeTab === 'community' && (
                <CommunityConnect userId={user.id} />
              )}
              
              {activeTab === 'collaboration' && (
                <FamilyCollaboration userId={user.id} />
              )}
            </div>
          </>
        )}
        <DevTierToggle /> 
      </div>
    </div>
  )
}