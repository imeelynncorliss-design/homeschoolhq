'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SchoolYearConfig from '@/components/SchoolYearConfig'
import ProgressDashboard from '@/components/ProgressDashboard'
import EnhancedVacationManager from '@/components/admin/EnhancedVacationManager'
import BulkLessonScheduler from '@/components/BulkLessonScheduler'
import AttendanceTracker from '@/components/AttendanceTracker'
import { getTierForTesting } from '@/lib/tierTesting'
import DevTierToggle from '@/components/DevTierToggle'

// 1. GLOBAL CONSTANTS
const FEATURES = {
  FREE: ['school_year_config', 'assessments'],
  PREMIUM: ['school_year_config', 'progress_tracking', 'vacation_planner', 'bulk_scheduler', 'attendance_tracking', 'transcripts', 'planning_mode', 'assessments'],
  FAMILY: ['school_year_config', 'progress_tracking', 'vacation_planner', 'bulk_scheduler', 'attendance_tracking', 'transcripts', 'planning_mode', 'advanced_analytics', 'assessments']
}

const ADMIN_TABS = [
  { id: 'planning', label: 'Planning Mode', icon: '🎨', feature: 'planning_mode', description: 'Prepare for your school year with smart planning tasks.', premium: true, color: 'green', path: '/planning' },
  { id: 'assessments', label: 'Assessments', icon: '📊', feature: 'assessments', description: 'Manage assessments and align with educational standards.', premium: false, color: 'blue', path: '/admin/assessments' },
  { id: 'transcripts', label: 'Transcripts', icon: '📚', feature: 'transcripts', description: 'Create official transcripts with GPA calculations.', premium: true, color: 'purple', path: '/transcript' },
  { id: 'school-year', label: 'School Year', icon: '🏫', feature: 'school_year_config', description: 'Configure your school calendar and terms.', premium: false, color: 'blue' },
  { id: 'progress', label: 'Progress Tracking', icon: '📈', feature: 'progress_tracking', description: 'Track learning goals and milestones.', premium: true, color: 'blue' },
  { id: 'vacation', label: 'Vacation Planner', icon: '🌴', feature: 'vacation_planner', description: 'Plan breaks and see schedule impact.', premium: true, color: 'blue' },
  { id: 'bulk-schedule', label: 'Bulk Scheduler', icon: '⚡', feature: 'bulk_scheduler', description: 'Assign dates to imported lessons.', premium: true, color: 'blue' },
  { id: 'attendance', label: 'Attendance', icon: '📋', feature: 'attendance_tracking', description: 'Track school days and hours.', premium: true, color: 'blue' }
];

export default function AdminPage() {
  const router = useRouter()
  const toolRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [userTier, setUserTier] = useState<'FREE' | 'PREMIUM' | 'FAMILY'>('FREE')
  const [kids, setKids] = useState<any[]>([])
  
  // UX States
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAltPressed, setIsAltPressed] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([])
  const [shakingId, setShakingId] = useState<string | null>(null)

  useEffect(() => {
    checkUser()
    const saved = localStorage.getItem('recent_tools')
    if (saved) setRecentlyUsed(JSON.parse(saved))

    const handleScroll = () => setShowScrollTop(window.scrollY > 400)
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setIsAltPressed(true)
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return

      const keyNum = parseInt(e.key)
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= ADMIN_TABS.length) {
        e.preventDefault()
        e.stopImmediatePropagation()
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
    }
  }, [userTier])

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
    const { data } = await supabase.from('kids').select('*').order('created_at', { ascending: false })
    if (data) setKids(data)
  }

  const hasFeature = (feature: string) => FEATURES[userTier].includes(feature)

  const handleToolClick = (tab: any) => {
    if (tab.premium && !hasFeature(tab.feature)) {
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
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f8fafc; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f8fafc; }
      `}</style>

      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-200">
                <span className="text-white text-2xl font-bold">A</span>
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin</h1>
                <p className="text-gray-500 font-medium italic">Homeschool Control Center</p>
              </div>
            </div>

            {/* Navigation & Search Row */}
            <div className="flex flex-1 max-w-4xl items-center gap-4">
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-sm transition-all border ${
                  showHelp ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                {showHelp ? 'Hide Help' : 'Help & Shortcuts'}
              </button>

              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
                <input 
                  type="text"
                  placeholder="Find a tool... (1-8)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all outline-none text-sm font-medium"
                />
              </div>

              {/* NEW: Placed to the right of search in the grey box style */}
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-5 py-3 bg-[#4a5568] hover:bg-[#2d3748] text-white rounded-lg font-medium text-sm transition-all shadow-sm active:scale-95 whitespace-nowrap"
              >
                <span>←</span>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 animate-in fade-in zoom-in duration-300">
            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg">
              <h3 className="font-bold mb-1">🚀 Quick Nav</h3>
              <p className="text-blue-100 text-[11px]">Top row: New Pages. Bottom row: Workspaces.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center">
              <h3 className="font-bold text-gray-900 mb-2">⌨️ Keyboard</h3>
              <p className="text-[11px] text-gray-500 uppercase font-black tracking-widest">[1-8] Open • [ESC] Close • [ALT] Hints</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-1">💡 Pro Tip</h3>
              <p className="text-gray-500 text-[11px]">Windows: Hold ALT, MacOS: "⌥" - to see your shortcut map instantly!</p>
            </div>
          </div>
        )}

        {/* Row 1: External */}
        {externalTools.length > 0 && (
          <div className="mb-12 animate-in fade-in duration-500">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-5 ml-1">External Pages</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {externalTools.map((tab) => (
                <ToolCard key={tab.id} tab={tab} index={ADMIN_TABS.findIndex(t => t.id === tab.id) + 1} isLocked={tab.premium && !hasFeature(tab.feature)} isActive={false} isAltPressed={isAltPressed} recentlyUsed={recentlyUsed.includes(tab.id)} isShaking={shakingId === tab.id} onClick={() => handleToolClick(tab)} />
              ))}
            </div>
          </div>
        )}

        {/* Row 2: Internal */}
        {internalTools.length > 0 && (
          <div className="mb-12 animate-in fade-in duration-700">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-5 ml-1">On-Page Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {internalTools.map((tab) => (
                <ToolCard key={tab.id} tab={tab} index={ADMIN_TABS.findIndex(t => t.id === tab.id) + 1} isLocked={tab.premium && !hasFeature(tab.feature)} isActive={activeTab === tab.id} isAltPressed={isAltPressed} recentlyUsed={recentlyUsed.includes(tab.id)} isShaking={shakingId === tab.id} onClick={() => handleToolClick(tab)} />
              ))}
            </div>
          </div>
        )}

        {/* Workspace Display Area */}
        {activeTab && (
          <div ref={toolRef} className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-700">
            <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-8 py-6 flex justify-between items-center sticky top-0 z-30">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-gray-100">
                  {ADMIN_TABS.find(t => t.id === activeTab)?.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 leading-tight">{ADMIN_TABS.find(t => t.id === activeTab)?.label}</h2>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Workspace</span>
                </div>
              </div>
              <button onClick={() => setActiveTab(null)} className="group flex items-center gap-3 px-6 py-3 bg-gray-900 hover:bg-red-600 text-white rounded-2xl transition-all shadow-xl active:scale-95">
                <span className="font-bold text-sm">Close Tool</span>
                <span className="text-xl leading-none group-hover:rotate-90 transition-transform">✕</span>
              </button>
            </div>
            <div className="p-10 min-h-[600px]">
              {activeTab === 'school-year' && <SchoolYearConfig userId={user.id} />}
              {activeTab === 'progress' && <ProgressDashboard userId={user.id} />}
              {activeTab === 'vacation' && <EnhancedVacationManager organizationId="d52497c0-42a9-49b7-ba3b-849bffa27fc4" />}
              {activeTab === 'bulk-schedule' && <BulkLessonScheduler userId={user.id} />}
              {activeTab === 'attendance' && <AttendanceTracker kids={kids} />}
              <div className="mt-20 pt-10 border-t border-gray-50 opacity-40 flex justify-between">
                <DevTierToggle />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300 italic">Command Center v2.0</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ToolCard({ tab, isLocked, isActive, index, isAltPressed, recentlyUsed, isShaking, onClick }: any) {
  const colorSchemes: any = {
    green: 'from-green-50 to-green-100/50 border-green-200 ring-green-400',
    blue: 'from-blue-50 to-blue-100/50 border-blue-200 ring-blue-400',
    purple: 'from-purple-50 to-purple-100/50 border-purple-200 ring-purple-400'
  }
  const scheme = colorSchemes[tab.color] || colorSchemes.blue

  return (
    <button
      onClick={onClick}
      className={`group relative bg-gradient-to-br border-2 rounded-2xl p-6 text-left transition-all duration-300 flex flex-col h-full ${scheme} ${
        isActive ? 'ring-4 shadow-2xl scale-[1.02] translate-y-1 bg-white' : 'hover:shadow-xl hover:-translate-y-1.5'
      } ${isLocked ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'} ${isShaking ? 'animate-shake' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="text-4xl transition-transform duration-500 group-hover:scale-110">{tab.icon}</div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-[10px] font-black px-2 py-1 rounded-lg transition-all duration-300 border ${isAltPressed ? 'bg-black text-white border-black scale-125' : 'bg-white/50 text-gray-300 border-gray-100'}`}>
            {index}
          </span>
          {recentlyUsed && !isActive && (
            <span className="text-[8px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md animate-pulse uppercase tracking-tighter">Recent</span>
          )}
        </div>
      </div>
      <h3 className="font-black text-gray-900 text-base mb-1 tracking-tight">{tab.label}</h3>
      <p className="text-[11px] font-medium text-gray-500 flex-grow leading-relaxed mb-4 line-clamp-2">{tab.description}</p>
      <div className={`text-[9px] self-start px-2.5 py-1 rounded-lg text-white font-black uppercase tracking-widest ${tab.premium ? 'bg-purple-600' : 'bg-blue-600'}`}>
        {tab.premium ? 'Premium' : 'Free'}
      </div>
    </button>
  )
}