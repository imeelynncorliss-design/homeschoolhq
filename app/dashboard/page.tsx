'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import LessonGenerator from '@/components/LessonGenerator'
import CurriculumImporter from '@/components/CurriculumImporter'
import ChildPhotoUpload from '@/components/ChildPhotoUpload'
import OnboardingTour from '@/components/OnboardingTour'
import LessonCalendar from '@/components/LessonCalendar'
import AllChildrenList from '@/components/AllChildrenList'
import TodaysDashboard from '@/components/TodaysDashboard'
import ThisWeekDashboard from '@/components/ThisWeekDashboard'
import KidCard from '@/components/KidCard'
import KidProfileForm from '@/components/KidProfileForm'
import { getTierForTesting } from '@/lib/tierTesting'
import DevTierToggle from '@/components/DevTierToggle'
import { formatLessonDescription } from '@/lib/formatLessonDescription'
import { ReactNode } from 'react'
import AssessmentGenerator from '@/components/AssessmentGenerator'
import AutoScheduleModal from '@/components/AutoScheduleModal' 
import HelpWidget from '../../components/HelpWidget';


const DURATION_UNITS = ['minutes', 'days', 'weeks'] as const;
type DurationUnit = typeof DURATION_UNITS[number];

const convertMinutesToDuration = (minutes: number | null): { value: number; unit: DurationUnit } => {
  if (!minutes) return { value: 30, unit: 'minutes' };
  if (minutes >= 1800 && minutes % 1800 === 0) {
    return { value: minutes / 1800, unit: 'weeks' };
  }
  if (minutes >= 360 && minutes % 360 === 0) {
    return { value: minutes / 360, unit: 'days' };
  }
  if (minutes >= 360) {
    return { value: Math.round(minutes / 360), unit: 'days' };
  }
  return { value: minutes, unit: 'minutes' };
};

const convertDurationToMinutes = (value: number, unit: DurationUnit): number => {
  if (unit === 'minutes') return value;
  else if (unit === 'days') return value * 6 * 60;
  else return value * 5 * 6 * 60;
};

export default function Dashboard() {
  const [showGenerator, setShowGenerator] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<any[]>([])
  const [userTier, setUserTier] = useState<'FREE' | 'PREMIUM' | 'FAMILY'>('FREE')
  const [allLessons, setAllLessons] = useState<any[]>([])
  const [lessonsByKid, setLessonsByKid] = useState<{ [kidId: string]: any[] }>({})
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [showTour, setShowTour] = useState(false)
  const [tourKey, setTourKey] = useState(0)
  const [showAssessmentGenerator, setShowAssessmentGenerator] = useState(false)
  const [showAutoSchedule, setShowAutoSchedule] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'calendar' | 'list'>('today')
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null)
  const [selectedLessonChild, setSelectedLessonChild] = useState<any | null>(null)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyTargetChildId, setCopyTargetChildId] = useState('')
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [editingKid, setEditingKid] = useState<any | null>(null)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [lessonSubject, setLessonSubject] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [lessonDate, setLessonDate] = useState('')
  const [addingLesson, setAddingLesson] = useState(false)
  const [lessonDurationValue, setLessonDurationValue] = useState<number>(30)
  const [lessonDurationUnit, setLessonDurationUnit] = useState<DurationUnit>('minutes')
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [editLessonTitle, setEditLessonTitle] = useState('')
  const [editLessonSubject, setEditLessonSubject] = useState('')
  const [editLessonDescription, setEditLessonDescription] = useState('')
  const [editLessonDate, setEditLessonDate] = useState('')
  const [editLessonEndDate, setEditLessonEndDate] = useState('')
  const [editLessonDurationValue, setEditLessonDurationValue] = useState<number>(30)
  const [editLessonDurationUnit, setEditLessonDurationUnit] = useState<DurationUnit>('minutes')
  
  
  const router = useRouter()

  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (kids.length > 0) loadAllLessons() }, [kids])
  useEffect(() => { if (user) checkUserTier() }, [user])
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour')
    if (!hasSeenTour && kids.length === 0) setShowTour(true)
  }, [kids])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/')
    else { setUser(user); loadKids() }
    setLoading(false)
  }

  const loadKids = async () => {
    const { data } = await supabase.from('kids').select('*').order('created_at', { ascending: false })
    if (data) {
      setKids(data)
      if (data.length > 0 && !selectedKid) setSelectedKid(data[0].id)
    }
  }

  const checkUserTier = async () => {
    if (!user) return
    setUserTier(getTierForTesting())
  } 
  
  const loadAllLessons = async () => {
    const { data } = await supabase.from('lessons').select('*').order('lesson_date', { ascending: false })
    if (data) {
      setAllLessons(data)
      const grouped: { [kidId: string]: any[] } = {}
      data.forEach(lesson => {
        if (!grouped[lesson.kid_id]) grouped[lesson.kid_id] = []
        grouped[lesson.kid_id].push(lesson)
      })
      setLessonsByKid(grouped)
    }
  }
  
  const hasFeature = (feature: string) => {
    const features = {
      FREE: ['manual_lessons', 'basic_calendar'],
      PREMIUM: ['manual_lessons', 'basic_calendar', 'ai_generation', 'curriculum_import', 'unlimited_kids', 'advanced_dashboards'],
      FAMILY: ['manual_lessons', 'basic_calendar', 'ai_generation', 'curriculum_import', 'unlimited_kids', 'advanced_dashboards', 'social_hub']
    }
    return features[userTier].includes(feature)
  }
  
  const canAddChild = () => userTier !== 'FREE' || kids.length < 1
  
  const deleteKid = async (id: string, kidDisplayName: string) => {
    if (confirm(`Delete ${kidDisplayName}? This will also delete all their lessons.`)) {
      await supabase.from('kids').delete().eq('id', id)
      if (selectedKid === id) setSelectedKid(kids[0]?.id || null)
      loadKids()
    }
  }

  const addLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKid) return
    setAddingLesson(true)
    const durationInMinutes = convertDurationToMinutes(lessonDurationValue, lessonDurationUnit);
    const { error } = await supabase.from('lessons').insert([{
      kid_id: selectedKid,
      subject: lessonSubject,
      title: lessonTitle,
      description: lessonDescription,
      lesson_date: lessonDate || null,
      duration_minutes: durationInMinutes,
      status: 'not_started'
    }])
    if (error) {
      console.error('Insert error:', error)
      alert('Error adding lesson: ' + error.message)
    }
    setLessonSubject('')
    setLessonTitle('')
    setLessonDescription('')
    setLessonDate('')
    setLessonDurationValue(30)
    setLessonDurationUnit('minutes')
    setShowLessonForm(false)
    setAddingLesson(false)
    loadAllLessons()
  }

  const startEditLesson = (lesson: any) => {
    setEditingLessonId(lesson.id)
    setEditLessonTitle(lesson.title)
    setEditLessonSubject(lesson.subject)
    // ✅ FIXED: Format JSON descriptions for editing
    setEditLessonDescription(formatLessonDescription(lesson.description) || '')
    setEditLessonDate(lesson.lesson_date || '')
    const duration = convertMinutesToDuration(lesson.duration_minutes);
    setEditLessonDurationValue(duration.value);
    setEditLessonDurationUnit(duration.unit);
    if (lesson.lesson_date && lesson.duration_minutes) {
      const start = new Date(lesson.lesson_date)
      const durationDays = Math.ceil(lesson.duration_minutes / 360)
      const end = new Date(start)
      end.setDate(start.getDate() + durationDays)
      setEditLessonEndDate(end.toISOString().split('T')[0])
    } else {
      setEditLessonEndDate('')
    }
  }

  const cancelEditLesson = () => setEditingLessonId(null)

  const saveEditLesson = async (id: string) => {
    const durationInMinutes = convertDurationToMinutes(editLessonDurationValue, editLessonDurationUnit);
    
    const updates = {
      title: editLessonTitle,
      subject: editLessonSubject,
      description: editLessonDescription,
      lesson_date: editLessonDate || null,
      duration_minutes: durationInMinutes
    }
    
    // ✅ Optimistic update - update local state immediately
    setAllLessons(prev => prev.map(lesson => 
      lesson.id === id ? { ...lesson, ...updates } : lesson
    ))
    setLessonsByKid(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(kidId => {
        updated[kidId] = updated[kidId].map(lesson =>
          lesson.id === id ? { ...lesson, ...updates } : lesson
        )
      })
      return updated
    })
    
    // Update selected lesson if it's still open
    if (selectedLesson?.id === id) {
      setSelectedLesson({ ...selectedLesson, ...updates })
    }
    
    const { error } = await supabase.from('lessons').update(updates).eq('id', id)
    
    if (error) {
      console.error('Error saving lesson:', error)
      alert('Failed to save lesson changes')
      // Reload to revert optimistic update
      loadAllLessons()
    }
    
    setEditingLessonId(null)
  }

  const handleStatusChange = async (lessonId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => {
    const updates: any = { status: newStatus }
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
    if (newStatus === 'not_started') updates.completed_at = null
    
    // ✅ Optimistic update - update local state immediately
    setAllLessons(prev => prev.map(lesson => 
      lesson.id === lessonId ? { ...lesson, ...updates } : lesson
    ))
    setLessonsByKid(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(kidId => {
        updated[kidId] = updated[kidId].map(lesson =>
          lesson.id === lessonId ? { ...lesson, ...updates } : lesson
        )
      })
      return updated
    })
    
    const { error } = await supabase.from('lessons').update(updates).eq('id', lessonId)
    if (error) {
      console.error('Error updating lesson status:', error)
      alert('Failed to update lesson status')
      // Reload to revert optimistic update
      loadAllLessons()
    }
  }

  const cycleLessonStatus = async (lessonId: string, currentStatus: string) => {
    let newStatus: string
    if (currentStatus === 'not_started') newStatus = 'in_progress'
    else if (currentStatus === 'in_progress') newStatus = 'completed'
    else newStatus = 'not_started'
    await handleStatusChange(lessonId, newStatus as any)
  }

  const deleteLesson = async (id: string) => {
    const lesson = allLessons.find(l => l.id === id)
    let confirmMessage = 'Are you sure you want to delete this lesson?'
    if (lesson?.duration_minutes) {
      const hours = (lesson.duration_minutes / 60).toFixed(1)
      confirmMessage = `This lesson has ${lesson.duration_minutes} minutes (${hours} hours) of tracked time.\n\nDeleting this lesson will remove these hours from your total.\n\nAre you sure you want to delete it?`
    }
    if (confirm(confirmMessage)) {
      await supabase.from('lessons').delete().eq('id', id)
      loadAllLessons()
    }
  }

  const copyLessonToChild = async () => {
    if (!copyTargetChildId || !selectedLesson) return
    const targetChild = kids.find(k => k.id === copyTargetChildId)
    if (!targetChild) return
    const { error } = await supabase.from('lessons').insert([{
      kid_id: copyTargetChildId,
      subject: selectedLesson.subject,
      title: selectedLesson.title,
      description: selectedLesson.description,
      lesson_date: selectedLesson.lesson_date,
      duration_minutes: selectedLesson.duration_minutes,
      status: 'not_started'
    }])
    if (!error) {
      alert(`Lesson copied to ${targetChild.displayname}!`)
      setShowCopyModal(false)
      setCopyTargetChildId('')
      loadAllLessons()
    } else {
      console.error('Copy error:', error)
      alert('Failed to copy lesson. Please try again.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const completeTour = () => {
    localStorage.setItem('hasSeenTour', 'true')
    setShowTour(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">HomeschoolHQ Dashboard</h1>
            <div className="flex gap-2">
              <button onClick={() => { setShowTour(false); setTimeout(() => { setTourKey(prev => prev + 1); setShowTour(true) }, 0) }} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">👋 Take Tour</button>
              <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">⚙️ Admin Page</button>
              <button onClick={() => router.push('/social')} className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700">🤝 Social Hub</button>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Logout</button>
            </div>
          </div>
          <p className="text-gray-900">Welcome, {user?.email}!</p>
        </div>

        <div className="flex gap-6">
          <div className={`${sidebarCollapsed ? 'w-16' : 'w-[350px]'} flex-shrink-0 transition-all duration-300`}>
            {sidebarCollapsed ? (
              <div className="bg-white rounded-lg shadow p-2 sticky top-4">
                <button onClick={() => setSidebarCollapsed(false)} className="w-full p-3 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center transition-colors mb-2" title="Show children sidebar">
                 <span className="text-3xl font-black text-black">→</span>
                </button>
                <div className="mt-4 space-y-2">
                  {kids.map((kid) => (
                    <button key={kid.id} onClick={() => setSelectedKid(kid.id)} className={`w-full p-2 rounded transition-colors ${selectedKid === kid.id ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'}`} title={kid.displayname}>
                      {kid.photo_url ? <img src={kid.photo_url} alt={kid.displayname} className="w-10 h-10 rounded-full object-cover mx-auto" /> : <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mx-auto text-sm font-bold">{kid.displayname.charAt(0)}</div>}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 mb-6 kids-section">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Your Children</h2>
                  <button onClick={() => setSidebarCollapsed(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors" title="Collapse sidebar">
                    <span className="text-3xl font-black text-black">←</span>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-3">👉 Click a child's name to view their lessons</p>
                {kids.length === 0 ? (
                  <p className="text-gray-600 mb-4">No children added yet.</p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {kids.map((kid) => (
                      <KidCard key={kid.id} kid={kid} isSelected={selectedKid === kid.id} onSelect={() => setSelectedKid(kid.id)} onEdit={() => { setEditingKid(kid); setShowProfileForm(true) }} onDelete={() => deleteKid(kid.id, kid.displayname)} />
                    ))}
                  </div>
                )}
                <button onClick={() => { setEditingKid(null); setShowProfileForm(true) }} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">+ Add a Child</button>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {kids.length > 0 ? (
              <>
               <div className="bg-white rounded-lg shadow p-4 mb-6">
  <div className="space-y-4">
    {/* Row 1: Header (centered) */}
    <div className="flex justify-center items-center">
      <h2 className="text-2xl font-bold text-gray-900">Family Schedule</h2>
    </div>
    
    {/* Row 2: Action Buttons (centered, wrapping) */}
    <div className="flex justify-center">
      <div className="flex flex-wrap gap-2 justify-center">
        <button 
          onClick={() => setShowAutoSchedule(true)} 
          className="px-3 py-2 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 font-medium shadow-sm"
        >
          📅 Auto-Schedule
        </button>
        
        {hasFeature('curriculum_import') ? (
          <button onClick={() => setShowImporter(true)} className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-3 py-2 text-sm rounded-lg hover:from-green-700 hover:to-teal-700">📥 Import</button>
        ) : (
          <button onClick={() => { alert('Curriculum Import requires PREMIUM! Upgrade to unlock.'); router.push('/pricing') }} className="px-3 py-2 text-sm bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed relative">📥 Import 🔒</button>
        )}
        <button onClick={() => setShowLessonForm(!showLessonForm)} className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">+ Add Lesson</button>
        {hasFeature('ai_generation') ? (
          <button onClick={() => setShowGenerator(true)} className="px-3 py-2 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700">✨ Generate Lessons</button>
        ) : (
          <button onClick={() => { alert('AI Lesson Generation requires PREMIUM! Upgrade to unlock.'); router.push('/pricing') }} className="px-3 py-2 text-sm bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed relative">✨ Generate Lessons 🔒</button>
        )}
      </div>
    </div>
    
    {/* Row 3: View Mode Tabs (centered) */}
    <div className="flex justify-center">
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button onClick={() => setViewMode('today')} className={`px-5 py-2 text-sm rounded transition-all ${viewMode === 'today' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>📚 Today</button>
        <button onClick={() => setViewMode('week')} className={`px-5 py-2 text-sm rounded transition-all ${viewMode === 'week' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>📅 This Week</button>
        <button onClick={() => setViewMode('calendar')} className={`px-5 py-2 text-sm rounded transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>🗓️ Calendar</button>
        <button onClick={() => setViewMode('list')} className={`px-5 py-2 text-sm rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>📋 List</button>
      </div>
    </div>
  </div>
</div>

                {showLessonForm && (
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-gray-900">Add New Lesson</h3>
                      <button type="button" onClick={() => setShowLessonForm(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
                    </div>
                    <form onSubmit={addLesson} className="space-y-3">
                      <select value={selectedKid || ''} onChange={(e) => setSelectedKid(e.target.value)} className="w-full px-3 py-2 border rounded text-gray-900" required>
                        <option value="">Select Child *</option>
                        {kids.map(kid => (<option key={kid.id} value={kid.id}>{kid.displayname}</option>))}
                      </select>
                      <input type="text" value={lessonSubject} onChange={(e) => setLessonSubject(e.target.value)} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="Subject (e.g., Math, Science) *" required />
                      <input type="text" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="Title *" required />
                      <textarea value={lessonDescription} onChange={(e) => setLessonDescription(e.target.value)} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="Description" rows={3} />
                      <input type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} className="w-full px-3 py-2 border rounded text-gray-900" />
                      <div className="flex gap-2">
                        <input type="number" min="1" value={lessonDurationValue} onChange={(e) => setLessonDurationValue(parseInt(e.target.value) || 1)} placeholder="Duration" className="flex-1 px-3 py-2 border rounded text-gray-900" />
                        <select value={lessonDurationUnit} onChange={(e) => setLessonDurationUnit(e.target.value as DurationUnit)} className="px-3 py-2 border rounded text-gray-900">
                          {DURATION_UNITS.map(unit => (<option key={unit} value={unit}>{unit}</option>))}
                        </select>
                      </div>
                      <button type="submit" disabled={addingLesson} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">{addingLesson ? 'Adding...' : 'Add Lesson'}</button>
                    </form>
                  </div>
                )}

                {viewMode === 'today' ? (
                  <TodaysDashboard kids={kids} lessonsByKid={lessonsByKid} onStatusChange={handleStatusChange} onLessonClick={(lesson, child) => { setSelectedLesson(lesson); setSelectedLessonChild(child) }} />
                ) : viewMode === 'week' ? (
                  <ThisWeekDashboard kids={kids} lessonsByKid={lessonsByKid} onStatusChange={handleStatusChange} onLessonClick={(lesson, child) => { setSelectedLesson(lesson); setSelectedLessonChild(child) }} />
                ) : viewMode === 'calendar' ? (
                  <LessonCalendar kids={kids} lessonsByKid={lessonsByKid} onLessonClick={(lesson, child) => { setSelectedLesson(lesson); setSelectedLessonChild(child) }} />
                ) : (
                  <AllChildrenList 
                    kids={kids} 
                    lessonsByKid={lessonsByKid} 
                    autoExpandKid={selectedKid} 
                    onEditLesson={(lesson) => { 
                      setSelectedLesson(lesson); 
                      setSelectedLessonChild(kids.find(k => k.id === lesson.kid_id) || null); 
                      startEditLesson(lesson) 
                    }} 
                    onDeleteLesson={deleteLesson} 
                    onCycleStatus={cycleLessonStatus}
                    onGenerateAssessment={(lesson) => {
                      setSelectedLesson(lesson);
                      setSelectedLessonChild(kids.find(k => k.id === lesson.kid_id) || null);
                      setShowAssessmentGenerator(true);
                    }}
                  />
                )}

                {selectedLesson && selectedLessonChild && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setSelectedLesson(null); setSelectedLessonChild(null); setEditingLessonId(null) }}>
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {selectedLessonChild.photo_url && <img src={selectedLessonChild.photo_url} alt={selectedLessonChild.displayname} className="w-12 h-12 rounded-full object-cover" />}
                          <div>
                            <p className="text-sm text-gray-600">{selectedLessonChild.displayname}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{selectedLesson.title}</h3>
                            <p className="text-gray-600">{selectedLesson.subject}</p>
                          </div>
                        </div>
                        <button onClick={() => { setSelectedLesson(null); setSelectedLessonChild(null); setEditingLessonId(null) }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                      </div>
                      
                      {editingLessonId === selectedLesson.id ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                            <input type="text" value={editLessonSubject} onChange={(e) => setEditLessonSubject(e.target.value)} className="w-full px-3 py-2 border rounded text-gray-900" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                            <input type="text" value={editLessonTitle} onChange={(e) => setEditLessonTitle(e.target.value)} className="w-full px-3 py-2 border rounded text-gray-900" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea value={editLessonDescription} onChange={(e) => setEditLessonDescription(e.target.value)} className="w-full px-3 py-2 border rounded text-gray-900" rows={3} />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                              <input type="date" value={editLessonDate} onChange={(e) => { setEditLessonDate(e.target.value); if (e.target.value && editLessonDurationValue) { const start = new Date(e.target.value); const durationMinutes = convertDurationToMinutes(editLessonDurationValue, editLessonDurationUnit); const durationDays = Math.ceil(durationMinutes / 360); const end = new Date(start); end.setDate(start.getDate() + durationDays); setEditLessonEndDate(end.toISOString().split('T')[0]) } }} className="w-full px-3 py-2 border rounded text-gray-900" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">End Date <span className="text-xs text-gray-500 ml-1">(auto-calculated)</span></label>
                              <input type="date" value={editLessonEndDate} onChange={(e) => setEditLessonEndDate(e.target.value)} className="w-full px-3 py-2 border rounded text-gray-900 bg-blue-50" placeholder="Auto-calculated from start + duration" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                              <div className="flex gap-2">
                                <input type="number" min="1" value={editLessonDurationValue} onChange={(e) => { const newValue = parseInt(e.target.value) || 1; setEditLessonDurationValue(newValue); if (editLessonDate) { const start = new Date(editLessonDate); const durationMinutes = convertDurationToMinutes(newValue, editLessonDurationUnit); const durationDays = Math.ceil(durationMinutes / 360); const end = new Date(start); end.setDate(start.getDate() + durationDays); setEditLessonEndDate(end.toISOString().split('T')[0]) } }} className="w-20 px-3 py-2 border rounded text-gray-900" />
                                <select value={editLessonDurationUnit} onChange={(e) => { const newUnit = e.target.value as DurationUnit; setEditLessonDurationUnit(newUnit); if (editLessonDate) { const start = new Date(editLessonDate); const durationMinutes = convertDurationToMinutes(editLessonDurationValue, newUnit); const durationDays = Math.ceil(durationMinutes / 360); const end = new Date(start); end.setDate(start.getDate() + durationDays); setEditLessonEndDate(end.toISOString().split('T')[0]) } }} className="flex-1 px-3 py-2 border rounded text-gray-900">
                                  {DURATION_UNITS.map(unit => (<option key={unit} value={unit}>{unit}</option>))}
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-4 border-t">
                            <button
                              onClick={async () => { 
                                await saveEditLesson(selectedLesson.id)
                                setEditingLessonId(null)
                                // ✅ Don't close modal - just exit edit mode
                              }} 
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Save Changes
                            </button>
                            <button onClick={() => { setEditingLessonId(null); cancelEditLesson() }} className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <div className="flex gap-2">
                              <button onClick={() => { cycleLessonStatus(selectedLesson.id, selectedLesson.status); const newStatus = selectedLesson.status === 'not_started' ? 'in_progress' : selectedLesson.status === 'in_progress' ? 'completed' : 'not_started'; setSelectedLesson({ ...selectedLesson, status: newStatus }) }} className={`px-4 py-2 rounded font-medium ${selectedLesson.status === 'not_started' ? 'bg-blue-100 text-blue-800' : selectedLesson.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                {selectedLesson.status === 'not_started' ? '○ Not Started' : selectedLesson.status === 'in_progress' ? '◐ In Progress' : '✓ Completed'}
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Start Date</label>
                              <p className="mt-1 text-gray-900">{selectedLesson.lesson_date ? new Date(selectedLesson.lesson_date).toLocaleDateString() : 'No date set'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">End Date</label>
                              <p className="mt-1 text-gray-900">
                                {selectedLesson.lesson_date && selectedLesson.duration_minutes ? (() => {
                                  const start = new Date(selectedLesson.lesson_date);
                                  const durationDays = Math.ceil(selectedLesson.duration_minutes / 360);
                                  const end = new Date(start);
                                  end.setDate(start.getDate() + durationDays);
                                  return end.toLocaleDateString();
                                })() : 'No end date'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Duration</label>
                              <p className="mt-1 text-gray-900">
                                {selectedLesson.duration_minutes ? (() => {
                                  const { value, unit } = convertMinutesToDuration(selectedLesson.duration_minutes);
                                  return `${value} ${unit}`;
                                })() : 'No duration set'}
                              </p>
                            </div>
                          </div>
                          {selectedLesson.description && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Description</label>
                              <p className="mt-1 text-gray-900 whitespace-pre-line">{formatLessonDescription(selectedLesson.description)}</p>
                            </div>
                          )}
                          <div className="flex gap-2 pt-4 border-t">
                            <button onClick={() => startEditLesson(selectedLesson)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                            <button onClick={() => setShowAssessmentGenerator(true)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded hover:from-purple-700 hover:to-indigo-700">✨ Generate Assessment</button>
                            <button onClick={() => setShowCopyModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Copy to Another Child</button>
                            <button onClick={() => { deleteLesson(selectedLesson.id); setSelectedLesson(null); setSelectedLessonChild(null) }} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showCopyModal && selectedLesson && selectedLessonChild && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowCopyModal(false)}>
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                      <div className="text-center mb-4">
                        <div className="text-4xl mb-2">📚</div>
                        <h3 className="text-xl font-bold text-gray-900">Copy Lesson to Another Child</h3>
                        <p className="text-sm text-gray-600 mt-2">"{selectedLesson.title}" will be copied from {selectedLessonChild.displayname}</p>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-900 mb-2">Select Child</label>
                        <select value={copyTargetChildId} onChange={(e) => setCopyTargetChildId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900">
                          <option value="">Choose a child...</option>
                          {kids.filter(kid => kid.id !== selectedLessonChild.id).map(kid => (
                            <option key={kid.id} value={kid.id}>{kid.displayname}{kid.grade ? ` (${kid.grade})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={copyLessonToChild} disabled={!copyTargetChildId} className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium">
                          Copy to {copyTargetChildId ? kids.find(k => k.id === copyTargetChildId)?.displayname : 'Child'}
                        </button>
                        <button onClick={() => { setShowCopyModal(false); setCopyTargetChildId('') }} className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-medium">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {showGenerator && <LessonGenerator kids={kids} userId={user.id} onClose={() => setShowGenerator(false)} />}
                {showImporter && selectedKid && <CurriculumImporter childId={selectedKid} childName={kids.find(k => k.id === selectedKid)?.displayname || ''} onClose={() => setShowImporter(false)} onImportComplete={() => { setShowImporter(false); loadAllLessons() }} />}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6"><p className="text-gray-600">Add a child to start tracking lessons!</p></div>
            )}
          </div>
        </div>
      </div>
      
      {showProfileForm && (
        <KidProfileForm kid={editingKid || undefined} onSave={async (data) => {
          if (data.id) {
            const updateData: any = {
              firstname: data.firstname,
              lastname: data.lastname,
              displayname: data.displayname || data.firstname,
              age: data.age,
              grade: data.grade,
              learning_style: data.learning_style,
              pace_of_learning: data.pace_of_learning,
              environmental_needs: data.environmental_needs,
              current_hook: data.current_hook,
              todays_vibe: data.todays_vibe,
              current_focus: data.current_focus
            }
            if (data.photoFile) {
              const fileExt = data.photoFile.name.split('.').pop()
              const fileName = `${data.id}/${Date.now()}.${fileExt}`
              const { error: uploadError } = await supabase.storage.from('child-photos').upload(fileName, data.photoFile)
              if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('child-photos').getPublicUrl(fileName)
                updateData.photo_url = publicUrl
              }
            }
            await supabase.from('kids').update(updateData).eq('id', data.id)
            if (data.subject_proficiencies?.length > 0) {
              await supabase.from('subject_proficiency').delete().eq('kid_id', data.id)
              const proficienciesToInsert = data.subject_proficiencies.map((sp: any) => ({
                kid_id: data.id,
                subject: sp.subject,
                proficiency: sp.proficiency,
                notes: sp.notes || ''
              }))
              await supabase.from('subject_proficiency').insert(proficienciesToInsert)
            }
          } else {
            const { data: newKid, error } = await supabase.from('kids').insert([{
              firstname: data.firstname,
              lastname: data.lastname,
              displayname: data.displayname || data.firstname,
              age: data.age,
              grade: data.grade,
              learning_style: data.learning_style,
              pace_of_learning: data.pace_of_learning,
              environmental_needs: data.environmental_needs,
              current_hook: data.current_hook,
              todays_vibe: data.todays_vibe,
              current_focus: data.current_focus
            }]).select()
            if (!error && newKid?.length > 0) {
              const newKidId = newKid[0].id
              if (data.photoFile) {
                const fileExt = data.photoFile.name.split('.').pop()
                const fileName = `${newKidId}/${Date.now()}.${fileExt}`
                const { error: uploadError } = await supabase.storage.from('child-photos').upload(fileName, data.photoFile)
                if (!uploadError) {
                  const { data: { publicUrl } } = supabase.storage.from('child-photos').getPublicUrl(fileName)
                  await supabase.from('kids').update({ photo_url: publicUrl }).eq('id', newKidId)
                }
              }
              if (data.subject_proficiencies?.length > 0) {
                const proficienciesToInsert = data.subject_proficiencies.map((sp: any) => ({
                  kid_id: newKidId,
                  subject: sp.subject,
                  proficiency: sp.proficiency,
                  notes: sp.notes || ''
                }))
                await supabase.from('subject_proficiency').insert(proficienciesToInsert)
              }
            }
          }
          loadKids()
        }} onCancel={() => { setShowProfileForm(false); setEditingKid(null) }} />
      )}

      {showAssessmentGenerator && selectedLesson && (
        <AssessmentGenerator lesson={{ title: selectedLesson.title, subject: selectedLesson.subject, description: selectedLesson.description }} childName={selectedLessonChild?.displayname || ''} onClose={() => setShowAssessmentGenerator(false)} />
      )}

{showAutoSchedule && selectedKid && (
  <AutoScheduleModal
    isOpen={showAutoSchedule}
    onClose={() => setShowAutoSchedule(false)}
    kidId={selectedKid}
    kidName={kids.find(k => k.id === selectedKid)?.displayname}
    onScheduleComplete={() => {
      loadAllLessons()
      setShowAutoSchedule(false)
      setViewMode('calendar') // ✅ Auto-switch to calendar view!
    }}
  />
)}

      <OnboardingTour key={tourKey} run={showTour} onComplete={completeTour} /> 
      <DevTierToggle /> 
      <HelpWidget />
    </div>
  )
}