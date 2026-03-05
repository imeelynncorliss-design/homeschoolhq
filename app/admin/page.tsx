'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import SchoolYearConfig from '@/components/SchoolYearConfig'
import ProgressDashboard from '@/components/ProgressDashboard'
import EnhancedVacationManager from '@/components/admin/EnhancedVacationManager'
import BulkLessonScheduler from '@/components/BulkLessonScheduler'
import AttendanceTracker from '@/components/AttendanceTracker'
import { TIER_FEATURES, getTierForTesting } from '@/lib/tierTesting'
import DevTierToggle from '@/components/DevTierToggle'
import AuthGuard from '@/components/AuthGuard'
import { useAppHeader } from '@/components/layout/AppHeader'

type UserTier = 'FREE' | 'ESSENTIAL' | 'PRO' | 'PREMIUM'

const TIER_ORDER: UserTier[] = ['FREE', 'ESSENTIAL', 'PRO', 'PREMIUM']

const ADMIN_TABS = [
  { id: 'planning',      label: 'Planning Mode',           icon: '🎨', feature: 'planning_mode',       requiredTier: 'PREMIUM',   color: 'green', path: '/planning',             description: 'Prepare for your school year with smart planning tasks.' },
  { id: 'assessments',   label: 'Assessments',             icon: '📊', feature: 'assessments',          requiredTier: 'FREE',      color: 'blue',  path: '/admin/assessments',    description: 'Manage assessments and align with educational standards.' },
  { id: 'transcripts',   label: 'Transcripts',             icon: '📚', feature: 'transcript_generator', requiredTier: 'PRO',       color: 'purple',path: '/transcript',           description: 'Create official transcripts with GPA calculations.' },
  { id: 'school-year',   label: 'School Year & Compliance',icon: '🏫', feature: 'school_year_config',   requiredTier: 'FREE',      color: 'blue',  path: null,                    description: 'Configure your calendar, state compliance, and goals.' },
  { id: 'progress',      label: 'Progress Tracking',       icon: '📈', feature: 'progress_tracking',    requiredTier: 'PREMIUM',   color: 'blue',  path: null,                    description: 'Track learning goals and milestones.' },
  { id: 'vacation',      label: 'Vacation Planner',        icon: '🌴', feature: 'vacation_planner',     requiredTier: 'PREMIUM',   color: 'blue',  path: null,                    description: 'Plan breaks and see schedule impact.' },
  { id: 'bulk-schedule', label: 'Bulk Scheduler',          icon: '⚡', feature: 'bulk_scheduler',       requiredTier: 'PREMIUM',   color: 'blue',  path: null,                    description: 'Assign dates to imported lessons.' },
  { id: 'attendance',    label: 'Attendance',              icon: '📋', feature: 'attendance_tracking',  requiredTier: 'ESSENTIAL', color: 'blue',  path: null,                    description: 'Track school days and hours.' },
]

function AdminContent() {
  const router = useRouter()
  useAppHeader({ title: '⚙️ Control Center', backHref: '/dashboard' })
  const toolRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [userTier, setUserTier] = useState<UserTier>('FREE')
  const [kids, setKids] = useState<any[]>([])
  const organizationId = kids[0]?.organization_id || null

  const [showScrollTop, setShowScrollTop] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAltPressed, setIsAltPressed] = useState(false)
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([])
  const [shakingId, setShakingId] = useState<string | null>(null)

  // Check if the user's tier includes a given feature (cumulative — PRO includes ESSENTIAL includes FREE)
  const hasFeature = (feature: string) => {
    return TIER_ORDER
      .slice(0, TIER_ORDER.indexOf(userTier) + 1)
      .some(t => (TIER_FEATURES[t as keyof typeof TIER_FEATURES] as readonly string[])?.includes(feature))
  }

  const loadKids = async () => {
    const { data } = await supabase.from('kids').select('*').order('created_at', { ascending: false })
    if (data) setKids(data)
  }

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      if (window.location.hostname === 'localhost') {
        setUser({ id: '00000000-0000-0000-0000-000000000001', email: 'dev@example.com', role: 'admin' })
        setUserTier(getTierForTesting())
      } else {
        router.push('/')
      }
    } else {
      setUser(user)
      loadKids()
      setUserTier(getTierForTesting())
    }

    // Auto-open tab from URL param
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam) {
      const match = ADMIN_TABS.find(t => t.id === tabParam)
      if (match && !match.path) {
        setActiveTab(tabParam)
        setTimeout(() => {
          toolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    checkUser()

    const saved = localStorage.getItem('recent_tools')
    if (saved) setRecentlyUsed(JSON.parse(saved))

    const handleTabSwitch = (e: any) => {
      const match = ADMIN_TABS.find(t => t.id === e.detail)
      if (match && !match.path) {
        setActiveTab(e.detail)
        setTimeout(() => { toolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 100)
      }
    }
    window.addEventListener('switchAdminTab', handleTabSwitch)

    const handleScroll = () => setShowScrollTop(window.scrollY > 400)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setIsAltPressed(true)
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      const keyNum = parseInt(e.key)
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= ADMIN_TABS.length) {
        e.preventDefault()
        const target = ADMIN_TABS[keyNum - 1]
        if (target) handleToolClick(target)
      }
      if (e.key === 'Escape') setActiveTab(null)
    }

    const handleKeyUp = (e: KeyboardEvent) => { if (!e.altKey) setIsAltPressed(false) }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('switchAdminTab', handleTabSwitch)
    }
  }, [userTier])

  const handleToolClick = (tab: any) => {
    if (!hasFeature(tab.feature)) {
      setShakingId(tab.id)
      setTimeout(() => setShakingId(null), 500)
      return
    }

    const newRecent = [tab.id, ...recentlyUsed.filter(id => id !== tab.id)].slice(0, 3)
    setRecentlyUsed(newRecent)
    localStorage.setItem('recent_tools', JSON.stringify(newRecent))

    if (tab.path) {
      router.push(tab.path)
    } else {
      setActiveTab(tab.id)
      setTimeout(() => { toolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 100)
    }
  }

  const filteredTabs = ADMIN_TABS.filter(t =>
    t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const externalTools = filteredTabs.filter(t => t.path)
  const internalTools = filteredTabs.filter(t => !t.path)

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32 relative">
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>

      <div className="max-w-7xl mx-auto">

        <div className="mb-12">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-5 ml-1">External Pages</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {externalTools.map((tab) => (
              <ToolCard
                key={tab.id}
                tab={tab}
                index={ADMIN_TABS.findIndex(t => t.id === tab.id) + 1}
                isLocked={!hasFeature(tab.feature)}
                isActive={false}
                isAltPressed={isAltPressed}
                recentlyUsed={recentlyUsed.includes(tab.id)}
                isShaking={shakingId === tab.id}
                onClick={() => handleToolClick(tab)}
              />
            ))}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-5 ml-1">On-Page Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {internalTools.map((tab) => (
              <ToolCard
                key={tab.id}
                tab={tab}
                index={ADMIN_TABS.findIndex(t => t.id === tab.id) + 1}
                isLocked={!hasFeature(tab.feature)}
                isActive={activeTab === tab.id}
                isAltPressed={isAltPressed}
                recentlyUsed={recentlyUsed.includes(tab.id)}
                isShaking={shakingId === tab.id}
                onClick={() => handleToolClick(tab)}
              />
            ))}
          </div>
        </div>

        {activeTab && (
          <div ref={toolRef} className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden mt-8">
            <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-8 py-6 flex justify-between items-center sticky top-0 z-30">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl">
                  {ADMIN_TABS.find(t => t.id === activeTab)?.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{ADMIN_TABS.find(t => t.id === activeTab)?.label}</h2>
                </div>
              </div>
              <button onClick={() => setActiveTab(null)} className="px-6 py-3 bg-gray-900 text-white rounded-2xl">Close</button>
            </div>
            <div className="p-10 min-h-[600px]">
              {activeTab === 'school-year' && <SchoolYearConfig userId={user.id} />}
              {activeTab === 'progress' && <ProgressDashboard userId={user.id} />}
              {activeTab === 'vacation' && organizationId && <EnhancedVacationManager organizationId={organizationId} />}
              {activeTab === 'bulk-schedule' && <BulkLessonScheduler userId={user.id} />}
              {activeTab === 'attendance' && organizationId && <AttendanceTracker kids={kids} organizationId={organizationId} userId={user.id} />}
            </div>
          </div>
        )}
      </div>

      <DevTierToggle />
    </div>
  )
}

function ToolCard({ tab, isLocked, isActive, index, isAltPressed, recentlyUsed, isShaking, onClick }: any) {
  const colorSchemes: any = {
    green:  'from-green-50 to-green-100 border-green-200',
    blue:   'from-blue-50 to-blue-100 border-blue-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
  }
  const scheme = colorSchemes[tab.color] || colorSchemes.blue

  const tierBadgeColor: any = {
    FREE:      'bg-blue-600',
    ESSENTIAL: 'bg-green-600',
    PRO:       'bg-indigo-600',
    PREMIUM:   'bg-purple-600',
  }

  return (
    <button
      onClick={onClick}
      className={`group relative bg-gradient-to-br border-2 rounded-2xl p-6 text-left transition-all ${scheme} ${
        isActive ? 'ring-4 shadow-xl' : 'hover:shadow-md'
      } ${isLocked ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'} ${isShaking ? 'animate-shake' : ''}`}
    >
      <div className="flex justify-between mb-4">
        <div className="text-4xl">{tab.icon}</div>
        <span className="text-[10px] font-black text-gray-900 px-2 py-1 rounded-lg bg-white/50">{index}</span>
      </div>
      <h3 className="font-black text-gray-900 mb-1">{tab.label}</h3>
      <p className="text-[11px] text-gray-500 mb-4 line-clamp-2">{tab.description}</p>
      <div className={`text-[9px] px-2.5 py-1 rounded-lg text-white font-black uppercase inline-block ${tierBadgeColor[tab.requiredTier] || 'bg-gray-600'}`}>
        {tab.requiredTier}
      </div>
    </button>
  )
}

export default function AdminPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading Admin...</div>}>
        <AdminContent />
      </Suspense>
    </AuthGuard>
  )
}