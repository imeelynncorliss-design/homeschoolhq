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

const DURATION_OPTIONS = [
  '15 min',
  '30 min',
  '45 min',
  '1 hour',
  '1.5 hours',
  '2 hours',
  '2.5 hours',
  '3 hours'
];

// Helper to convert duration string to minutes
const parseDurationToMinutes = (duration: string): number => {
  const map: { [key: string]: number } = {
    '15 min': 15,
    '30 min': 30,
    '45 min': 45,
    '1 hour': 60,
    '1.5 hours': 90,
    '2 hours': 120,
    '2.5 hours': 150,
    '3 hours': 180,
  }
  return map[duration] || 0
}

export default function Dashboard() {
  const [showGenerator, setShowGenerator] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showAddKidForm, setShowAddKidForm] = useState(false);
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<any[]>([])
  const [allLessons, setAllLessons] = useState<any[]>([])
  const [lessonsByKid, setLessonsByKid] = useState<{ [kidId: string]: any[] }>({})
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [showTour, setShowTour] = useState(false)
  const [tourKey, setTourKey] = useState(0)
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // View mode state - DEFAULT TO TODAY
  const [viewMode, setViewMode] = useState<'today' | 'calendar' | 'list'>('today')
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null)
  const [selectedLessonChild, setSelectedLessonChild] = useState<any | null>(null)
  
  // Kid form state
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [grade, setGrade] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editGrade, setEditGrade] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  
  // Lesson form state
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [lessonSubject, setLessonSubject] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [lessonDate, setLessonDate] = useState('')
  const [addingLesson, setAddingLesson] = useState(false)
  const [lessonDuration, setLessonDuration] = useState('')
  
  // Lesson editing state
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [editLessonTitle, setEditLessonTitle] = useState('')
  const [editLessonSubject, setEditLessonSubject] = useState('')
  const [editLessonDescription, setEditLessonDescription] = useState('')
  const [editLessonDate, setEditLessonDate] = useState('')
  const [editLessonDuration, setEditLessonDuration] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (kids.length > 0) {
      loadAllLessons()
    }
  }, [kids])

  useEffect(() => {
    // Check if user has seen tour before
    const hasSeenTour = localStorage.getItem('hasSeenTour')
    if (!hasSeenTour && kids.length === 0) {
      setShowTour(true)
    }
  }, [kids])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
    } else {
      setUser(user)
      loadKids()
    }
    setLoading(false)
  }

  const loadKids = async () => {
    const { data } = await supabase
      .from('kids')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) {
      setKids(data)
      if (data.length > 0 && !selectedKid) {
        setSelectedKid(data[0].id)
      }
    }
  }

  const loadAllLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .order('lesson_date', { ascending: false })
    
    if (data) {
      setAllLessons(data)
      
      // Group lessons by kid
      const grouped: { [kidId: string]: any[] } = {}
      data.forEach(lesson => {
        if (!grouped[lesson.kid_id]) {
          grouped[lesson.kid_id] = []
        }
        grouped[lesson.kid_id].push(lesson)
      })
      setLessonsByKid(grouped)
    }
  }

  const addKid = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
  
    const { data, error } = await supabase
      .from('kids')
      .insert([{ 
        name, 
        age: age ? parseInt(age) : null, 
        grade 
      }])
      .select()
  
    if (!error && data && data.length > 0) {
      const newKidId = data[0].id
      
      // Upload photo if one was selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${newKidId}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('child-photos')
          .upload(fileName, photoFile)
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('child-photos')
            .getPublicUrl(fileName)
          
          await supabase
            .from('kids')
            .update({ photo_url: publicUrl })
            .eq('id', newKidId)
        }
      }
      
      setName('')
      setAge('')
      setGrade('')
      setPhotoFile(null)
      setPhotoPreview(null)
      setShowAddKidForm(false)
      loadKids()
      setSelectedKid(newKidId)
    }
    setAdding(false)
  }

  const deleteKid = async (id: string, kidName: string) => {
    if (confirm(`Delete ${kidName}? This will also delete all their lessons.`)) {
      await supabase.from('kids').delete().eq('id', id)
      if (selectedKid === id) setSelectedKid(kids[0]?.id || null)
      loadKids()
    }
  }

  const startEdit = (kid: any) => {
    setEditingId(kid.id)
    setEditName(kid.name)
    setEditAge(kid.age?.toString() || '')
    setEditGrade(kid.grade || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (id: string) => {
    await supabase
      .from('kids')
      .update({ 
        name: editName, 
        age: editAge ? parseInt(editAge) : null, 
        grade: editGrade 
      })
      .eq('id', id)
    
    setEditingId(null)
    loadKids()
  }

  const addLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKid) return

    setAddingLesson(true)
  
    const durationInMinutes = lessonDuration ? parseDurationToMinutes(lessonDuration) : null
  
    const { error } = await supabase
      .from('lessons')
      .insert([{
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
    setLessonDuration('')
    setShowLessonForm(false)
    setAddingLesson(false)
    loadAllLessons()
  }

  const startEditLesson = (lesson: any) => {
    setEditingLessonId(lesson.id)
    setEditLessonTitle(lesson.title)
    setEditLessonSubject(lesson.subject)
    setEditLessonDescription(lesson.description || '')
    setEditLessonDate(lesson.lesson_date || '')
    setEditLessonDuration(lesson.duration || '')
  }

  const cancelEditLesson = () => {
    setEditingLessonId(null)
  }

  const saveEditLesson = async (id: string) => {
    const durationInMinutes = editLessonDuration ? parseDurationToMinutes(editLessonDuration) : null
    
    await supabase
      .from('lessons')
      .update({
        title: editLessonTitle,
        subject: editLessonSubject,
        description: editLessonDescription,
        lesson_date: editLessonDate || null,
        duration_minutes: durationInMinutes
      })
      .eq('id', id)
    
    setEditingLessonId(null)
    loadAllLessons()
  }

  // NEW: Handle status change for Today's Dashboard
  const handleStatusChange = async (lessonId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => {
    const updates: any = { status: newStatus }
    
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
    }
    if (newStatus === 'not_started') {
      updates.completed_at = null
    }

    const { error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', lessonId)

    if (!error) {
      loadAllLessons()
    } else {
      console.error('Error updating lesson status:', error)
      alert('Failed to update lesson status')
    }
  }

  const cycleLessonStatus = async (lessonId: string, currentStatus: string) => {
    let newStatus: string
    
    if (currentStatus === 'not_started') {
      newStatus = 'in_progress'
    } else if (currentStatus === 'in_progress') {
      newStatus = 'completed'
    } else {
      newStatus = 'not_started'
    }
    
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Maximum size is 5MB.')
        return
      }
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const completeTour = () => {
    localStorage.setItem('hasSeenTour', 'true')
    setShowTour(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">HomeschoolHQ Dashboard</h1>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowTour(false)
                  setTimeout(() => {
                    setTourKey(prev => prev + 1)
                    setShowTour(true)
                  }, 0)
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                👋 Take Tour
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
          <p className="text-gray-900">Welcome, {user?.email}!</p>
        </div>

        <div className="flex gap-6">
          {/* Kids Section - Collapsible Sidebar */}
          <div className={`${sidebarCollapsed ? 'w-16' : 'w-[350px]'} flex-shrink-0 transition-all duration-300`}>
            {sidebarCollapsed ? (
              <div className="bg-white rounded-lg shadow p-2 sticky top-4">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="w-full p-3 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center transition-colors mb-2"
                  title="Show children sidebar"
                >
                  <span className="text-2xl font-bold text-gray-800">→</span>
                </button>
                <div className="mt-4 space-y-2">
                  {kids.map((kid) => (
                    <button
                      key={kid.id}
                      onClick={() => {
                        setSelectedKid(kid.id)
                        setSidebarCollapsed(false)
                      }}
                      className={`w-full p-2 rounded transition-colors ${selectedKid === kid.id ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'}`}
                      title={kid.name}
                    >
                      {kid.photo_url ? (
                        <img 
                          src={kid.photo_url} 
                          alt={kid.name}
                          className="w-10 h-10 rounded-full object-cover mx-auto"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mx-auto text-sm font-bold">
                          {kid.name.charAt(0)}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 mb-6 kids-section">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Your Children</h2>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    title="Collapse sidebar"
                  >
                    <span className="text-xl font-bold text-gray-800">←</span>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-3">👉 Click a child's name to view their lessons</p>
                
                {kids.length === 0 ? (
                  <p className="text-gray-600 mb-4">No children added yet.</p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {kids.map((kid, index) => (
                      <div key={kid.id} className={`border rounded p-3 ${index === 0 ? 'kid-card' : ''}`}>
                        {editingId === kid.id ? (
                          <div className="space-y-2">
                            <ChildPhotoUpload
                              childId={kid.id}
                              currentPhotoUrl={kid.photo_url}
                              onUploadComplete={() => loadKids()}
                            />
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2 py-1 border rounded text-gray-900 text-sm"
                            />
                            <input
                              type="number"
                              value={editAge}
                              onChange={(e) => setEditAge(e.target.value)}
                              className="w-full px-2 py-1 border rounded text-gray-900 text-sm"
                            />
                            <input
                              type="text"
                              value={editGrade}
                              onChange={(e) => setEditGrade(e.target.value)}
                              className="w-full px-2 py-1 border rounded text-gray-900 text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(kid.id)}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div 
                                className="cursor-pointer flex-1 hover:bg-blue-50 transition-colors"
                                onClick={() => setSelectedKid(kid.id)}
                              >
                                {kid.photo_url && (
                                  <img 
                                    src={kid.photo_url} 
                                    alt={kid.name}
                                    className="w-12 h-12 rounded-full object-cover mb-2"
                                  />
                                )}
                                <h3 className={`font-semibold ${selectedKid === kid.id ? 'text-blue-600' : 'text-gray-900'} ${selectedKid === kid.id ? 'bg-blue-50 p-2 rounded' : ''}`}>
                                  {kid.name}
                                </h3>
                                <p className="text-gray-600 text-sm">
                                  {kid.age && `Age: ${kid.age}`}
                                  {kid.age && kid.grade && ' • '}
                                  {kid.grade && `Grade: ${kid.grade}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(kid)}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteKid(kid.id, kid.name)}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => setShowAddKidForm(!showAddKidForm)}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mb-3"
                >
                  {showAddKidForm ? '− Cancel' : '+ Add a Child'}
                </button>
                
                {showAddKidForm && (
                  <form onSubmit={addKid} className="space-y-3 p-4 border rounded bg-gray-50">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Child's Photo (optional)
                      </label>
                      {photoPreview ? (
                        <div className="flex items-center gap-3">
                          <img 
                            src={photoPreview} 
                            alt="Preview"
                            className="w-20 h-20 rounded-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoFile(null)
                              setPhotoPreview(null)
                            }}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="w-full px-3 py-2 border rounded text-gray-900 text-sm"
                        />
                      )}
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border rounded text-gray-900"
                      placeholder="Name *"
                      required
                    />
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-3 py-2 border rounded text-gray-900"
                      placeholder="Age"
                    />
                    <input
                      type="text"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3 py-2 border rounded text-gray-900"
                      placeholder="Grade"
                    />
                    <button
                      type="submit"
                      disabled={adding}
                      className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                    >
                      {adding ? 'Adding...' : 'Add Child'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Lessons Section */}
          <div className="flex-1 min-w-0">
            {kids.length > 0 ? (
              <>
                {/* View Toggle - UPDATED WITH 3 TABS */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Family Schedule
                    </h2>
                    
                    {/* View Toggle - 3 TABS */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('today')}
                        className={`px-6 py-3 rounded transition-all ${
                          viewMode === 'today'
                            ? 'bg-white shadow text-gray-900 font-semibold'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        📚 Today
                      </button>
                      <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-6 py-3 rounded transition-all ${
                          viewMode === 'calendar'
                            ? 'bg-white shadow text-gray-900 font-semibold'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        📅 Calendar
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-6 py-3 rounded transition-all ${
                          viewMode === 'list'
                            ? 'bg-white shadow text-gray-900 font-semibold'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        📋 List
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowImporter(true)}
                        className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-teal-700"
                      >
                        📥 Import
                      </button>
                      <button
                        onClick={() => setShowLessonForm(!showLessonForm)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        + Add Lesson
                      </button>
                      <button
                        onClick={() => setShowGenerator(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700"
                      >
                        📚 Generator
                      </button>
                    </div>
                  </div>
                </div>

                {/* Add Lesson Form */}
                {showLessonForm && (
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-gray-900">Add New Lesson</h3>
                      <button
                        type="button"
                        onClick={() => setShowLessonForm(false)}
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                      >
                        ×
                      </button>
                    </div>
                    <form onSubmit={addLesson} className="space-y-3">
                      <select
                        value={selectedKid || ''}
                        onChange={(e) => setSelectedKid(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-gray-900"
                        required
                      >
                        <option value="">Select Child *</option>
                        {kids.map(kid => (
                          <option key={kid.id} value={kid.id}>{kid.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={lessonSubject}
                        onChange={(e) => setLessonSubject(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-gray-900"
                        placeholder="Subject (e.g., Math, Science) *"
                        required
                      />
                      <input
                        type="text"
                        value={lessonTitle}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-gray-900"
                        placeholder="Title *"
                        required
                      />
                      <textarea
                        value={lessonDescription}
                        onChange={(e) => setLessonDescription(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-gray-900"
                        placeholder="Description"
                        rows={3}
                      />
                      <input
                        type="date"
                        value={lessonDate}
                        onChange={(e) => setLessonDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-gray-900"
                      />
                      <select
                        value={lessonDuration}
                        onChange={(e) => setLessonDuration(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-gray-900"
                      >
                        <option value="">Duration (optional)</option>
                        {DURATION_OPTIONS.map(duration => (
                          <option key={duration} value={duration}>{duration}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={addingLesson}
                        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                      >
                        {addingLesson ? 'Adding...' : 'Add Lesson'}
                      </button>
                    </form>
                  </div>
                )}

                {/* TODAY / CALENDAR / LIST VIEW */}
                {viewMode === 'today' ? (
                  <TodaysDashboard
                    kids={kids}
                    lessonsByKid={lessonsByKid}
                    onStatusChange={handleStatusChange}
                    onLessonClick={(lesson, child) => {
                      setSelectedLesson(lesson)
                      setSelectedLessonChild(child)
                    }}
                  />
                ) : viewMode === 'calendar' ? (
                  <LessonCalendar 
                    kids={kids}
                    lessonsByKid={lessonsByKid}
                    onLessonClick={(lesson, child) => {
                      setSelectedLesson(lesson)
                      setSelectedLessonChild(child)
                    }}
                  />
                ) : (
                  <AllChildrenList
                    kids={kids}
                    lessonsByKid={lessonsByKid}
                    onEditLesson={(lesson) => {
                      setSelectedLesson(lesson)
                      setSelectedLessonChild(kids.find(k => k.id === lesson.kid_id))
                      startEditLesson(lesson)
                    }}
                    onDeleteLesson={deleteLesson}
                    onCycleStatus={cycleLessonStatus}
                  />
                )}

                {/* Lesson Detail Modal */}
                {selectedLesson && selectedLessonChild && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
                    setSelectedLesson(null)
                    setSelectedLessonChild(null)
                    setEditingLessonId(null)
                  }}>
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {selectedLessonChild.photo_url && (
                            <img 
                              src={selectedLessonChild.photo_url} 
                              alt={selectedLessonChild.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <p className="text-sm text-gray-600">{selectedLessonChild.name}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{selectedLesson.title}</h3>
                            <p className="text-gray-600">{selectedLesson.subject}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedLesson(null)
                            setSelectedLessonChild(null)
                            setEditingLessonId(null)
                          }}
                          className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                          ×
                        </button>
                      </div>
                      
                      {editingLessonId === selectedLesson.id ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                            <input
                              type="text"
                              value={editLessonSubject}
                              onChange={(e) => setEditLessonSubject(e.target.value)}
                              className="w-full px-3 py-2 border rounded text-gray-900"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                            <input
                              type="text"
                              value={editLessonTitle}
                              onChange={(e) => setEditLessonTitle(e.target.value)}
                              className="w-full px-3 py-2 border rounded text-gray-900"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                              value={editLessonDescription}
                              onChange={(e) => setEditLessonDescription(e.target.value)}
                              className="w-full px-3 py-2 border rounded text-gray-900"
                              rows={3}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                              <input
                                type="date"
                                value={editLessonDate}
                                onChange={(e) => setEditLessonDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                              <select
                                value={editLessonDuration}
                                onChange={(e) => setEditLessonDuration(e.target.value)}
                                className="w-full px-3 py-2 border rounded text-gray-900"
                              >
                                <option value="">Select duration</option>
                                {DURATION_OPTIONS.map(duration => (
                                  <option key={duration} value={duration}>{duration}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 pt-4 border-t">
                            <button
                              onClick={() => {
                                saveEditLesson(selectedLesson.id)
                                setEditingLessonId(null)
                                setSelectedLesson(null)
                                setSelectedLessonChild(null)
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => {
                                setEditingLessonId(null)
                                cancelEditLesson()
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  cycleLessonStatus(selectedLesson.id, selectedLesson.status)
                                  const newStatus = 
                                    selectedLesson.status === 'not_started' ? 'in_progress' :
                                    selectedLesson.status === 'in_progress' ? 'completed' : 'not_started'
                                  setSelectedLesson({ ...selectedLesson, status: newStatus })
                                }}
                                className={`px-4 py-2 rounded font-medium ${
                                  selectedLesson.status === 'not_started' ? 'bg-blue-100 text-blue-800' :
                                  selectedLesson.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}
                              >
                                {selectedLesson.status === 'not_started' ? '○ Not Started' :
                                 selectedLesson.status === 'in_progress' ? '◐ In Progress' :
                                 '✓ Completed'}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Date</label>
                              <p className="mt-1 text-gray-900">
                                {selectedLesson.lesson_date ? new Date(selectedLesson.lesson_date).toLocaleDateString() : 'No date set'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Duration</label>
                              <p className="mt-1 text-gray-900">
                                {selectedLesson.duration_minutes ? `${selectedLesson.duration_minutes} min` : 'No duration set'}
                              </p>
                            </div>
                          </div>

                          {selectedLesson.description && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Description</label>
                              <p className="mt-1 text-gray-900">{selectedLesson.description}</p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-4 border-t">
                            <button
                              onClick={() => startEditLesson(selectedLesson)}
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Edit Lesson
                            </button>
                            <button
                              onClick={() => {
                                deleteLesson(selectedLesson.id)
                                setSelectedLesson(null)
                                setSelectedLessonChild(null)
                              }}
                              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLesson(null)
                                setSelectedLessonChild(null)
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 ml-auto"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showGenerator && (
                  <LessonGenerator 
                    children={kids} 
                    onClose={() => setShowGenerator(false)} 
                  />
                )}
                
                {showImporter && selectedKid && (
                  <CurriculumImporter
                    childId={selectedKid}
                    childName={kids.find(k => k.id === selectedKid)?.name || ''}
                    onClose={() => setShowImporter(false)}
                    onImportComplete={() => {
                      setShowImporter(false)
                      loadAllLessons()
                    }}
                  />
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">Add a child to start tracking lessons!</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <OnboardingTour key={tourKey} run={showTour} onComplete={completeTour} />
    </div>
  )
}