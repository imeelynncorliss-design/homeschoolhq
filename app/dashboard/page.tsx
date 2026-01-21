'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import LessonGenerator from '@/components/LessonGenerator'
import CurriculumImporter from '@/components/CurriculumImporter'
import ChildPhotoUpload from '@/components/ChildPhotoUpload'
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
import PersonalizedAssessmentCreator from '@/components/PersonalizedAssessmentCreator'
import { DEFAULT_HOLIDAYS_2025_2026 } from '@/app/utils/holidayUtils'
import AssessmentTaking from '@/components/AssessmentTaking'
import AutoScheduleModal from '@/components/AutoScheduleModal' 
import HelpWidget from '../../components/HelpWidget'
import PastAssessmentsViewer from '@/components/PastAssessmentsViewer'
import PlanningModeDashboard from '@/components/PlanningModeDashboard'
import AttendanceReminder from '@/components/AttendanceReminder'
import ParentProfileManager from '@/components/ParentProfileManager'
import AuthGuard from '@/components/AuthGuard'

const DURATION_UNITS = ['minutes', 'days', 'weeks'] as const;
type DurationUnit = typeof DURATION_UNITS[number];

// Color mapping for children - cycles through these colors
const CHILD_COLORS = [
  { border: 'border-blue-400', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  { border: 'border-purple-400', bg: 'bg-purple-50', dot: 'bg-purple-500' },
  { border: 'border-green-400', bg: 'bg-green-50', dot: 'bg-green-500' },
  { border: 'border-pink-400', bg: 'bg-pink-50', dot: 'bg-pink-500' },
  { border: 'border-orange-400', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  { border: 'border-teal-400', bg: 'bg-teal-50', dot: 'bg-teal-500' },
];

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

function DashboardContent() {
  const searchParams = useSearchParams();
  const [showGenerator, setShowGenerator] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<any[]>([])
  const [userTier, setUserTier] = useState<'FREE' | 'PREMIUM' | 'FAMILY'>('FREE')
  const [allLessons, setAllLessons] = useState<any[]>([])
  const [lessonsByKid, setLessonsByKid] = useState<{ [kidId: string]: any[] }>({})
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [showAssessmentGenerator, setShowAssessmentGenerator] = useState(false)
  const [showAutoSchedule, setShowAutoSchedule] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'calendar' | 'list'>('calendar')
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
  const [showCascadeModal, setShowCascadeModal] = useState(false)
  const [showPersonalizedAssessment, setShowPersonalizedAssessment] = useState(false);
  const [showAssessmentTaking, setShowAssessmentTaking] = useState(false);
  const [generatedAssessment, setGeneratedAssessment] = useState<any>(null);
  const [assessmentForLesson, setAssessmentForLesson] = useState<any>(null);
  const [showPastAssessments, setShowPastAssessments] = useState(false)
  const [pastAssessmentsKidId, setPastAssessmentsKidId] = useState<string | null>(null)
  const [pastAssessmentsKidName, setPastAssessmentsKidName] = useState('')
  const [lessonAssessmentScore, setLessonAssessmentScore] = useState<number | null>(null)
  const [vacationPeriods, setVacationPeriods] = useState<any[]>([])
  const [schoolYearSettings, setSchoolYearSettings] = useState<any>(null)
  const [cascadeData, setCascadeData] = useState<{
    lessonId: string
    originalDate: string
    newDate: string
    affectedCount: number
    kidId: string
  } | null>(null)
  const [cascadeDays, setCascadeDays] = useState<number>(1)
  const [parentName, setParentName] = useState('')
  
  const [showHelp, setShowHelp] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)
  
  const router = useRouter()
  // This helper function provides the colors for the kid cards on line 731
  const getChildColor = (index: number) => {
    const colors = [
      { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', accent: 'bg-blue-500' },
      { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', accent: 'bg-purple-500' },
      { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100', accent: 'bg-pink-500' },
      { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', accent: 'bg-orange-500' },
      { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', accent: 'bg-teal-500' },
    ];
    return colors[index % colors.length];
  };

  // 1. DATA LOADING FUNCTIONS
  const loadKids = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('kids')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      if (error) {
        console.error('Error loading kids:', error.message)
        return // Stop the function here if there's an error
      }
    if (data) {
      setKids(data)
      if (data.length > 0 && !selectedKid) setSelectedKid(data[0].id)
    }
  }

  const loadAllLessons = async () => {
    // Ensure we check if user exists first
    if (!user) return;
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('user_id', user.id) // Ensure security here too!
        .order('lesson_date', { ascending: false })
    
      if (error) {
        console.error('Error loading lessons:', error.message)
        return
      }
    if (data) {
      setAllLessons(data)
      const grouped: { [kidId: string]: any[] } = {}
      data.forEach(lesson => {
        if (!grouped[lesson.kid_id]) grouped[lesson.kid_id] = []
        grouped[lesson.kid_id].push(lesson)
      })
      setLessonsByKid(grouped)
    }
  };

// Simplified - AuthGuard already verified auth, just get the user
const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  // If AuthGuard let us through but there's no real user, we must be in dev mode
  if (!user) {
    const devUser = { 
      id: 'd52497c0-42a9-49b7-ba3b-849bffa27fc4',
      email: 'dev@homeschoolhq.com' 
    }
    setUser(devUser)
  } else {
    setUser(user)
  }
  setLoading(false)
}

  const checkUserTier = async () => {
    if (!user) return
    setUserTier(getTierForTesting())
  } 

  // 3. EFFECTS
  useEffect(() => { getUser() }, [])
  useEffect(() => { if (kids.length > 0) loadAllLessons() }, [kids])
  useEffect(() => { if (user) checkUserTier() }, [user])

  useEffect(() => {
    if (user) {
      loadKids()
    }
    if (!user ) return; // Don't fetch settings for mock user
    
    let mounted = true
    const loadSettings = async () => {
      try {
        const { data: settings, error: settingsError } = await supabase
          .from('school_year_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (settingsError) {
          console.error('Settings error:', settingsError.message)
          return
        }
        
        if (settings && mounted) {
          setSchoolYearSettings(settings)
          const orgId = settings.organization_id || user.id
          const { data: vacations } = await supabase
            .from('vacation_periods')
            .select('*')
            .eq('organization_id', orgId)
          
          if (vacations && mounted) setVacationPeriods(vacations)
        }
      } catch (err) {
        console.error('Error loading vacation settings:', err)
      }
    }
    loadSettings()
    return () => { mounted = false }
  }, [user])

  useEffect(() => {
    const loadLessonAssessmentScore = async () => {
      if (!selectedLesson) {
        setLessonAssessmentScore(null);
        return;
      }

      const { data: assessments } = await supabase
        .from('assessments')
        .select(`
          id,
          assessment_results (
            auto_score,
            submitted_at
          )
        `)
        .eq('lesson_id', selectedLesson.id)
        .limit(1);

      if (assessments && assessments.length > 0 && assessments[0].assessment_results.length > 0) {
        const latestResult = assessments[0].assessment_results[0];
        setLessonAssessmentScore(latestResult.auto_score);
      } else {
        setLessonAssessmentScore(null);
      }
    };

    loadLessonAssessmentScore();
  }, [selectedLesson]);
  
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
      user_id: user.id,
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
    const durationInMinutes = convertDurationToMinutes(editLessonDurationValue, editLessonDurationUnit)
    
    const updates = {
      title: editLessonTitle,
      subject: editLessonSubject,
      description: editLessonDescription,
      lesson_date: editLessonDate || null,
      duration_minutes: durationInMinutes
    }
    
    if (editLessonDate && vacationPeriods.length > 0) {
      const vacation = vacationPeriods.find(v => 
        editLessonDate >= v.start_date && editLessonDate <= v.end_date
      )
      
      if (vacation) {
        if (!confirm(`⚠️ ${editLessonDate} falls during ${vacation.name}.\n\nSave lesson anyway?`)) {
          return
        }
      }
    }
    
    if (editLessonDate) {
      const holiday = DEFAULT_HOLIDAYS_2025_2026.find((h: any) => {
        const holidayDate = h.date || h.start
        return holidayDate === editLessonDate
      })
      
      if (holiday) {
        if (!confirm(`⚠️ ${editLessonDate} is ${holiday.name}.\n\nSave lesson anyway?`)) {
          return
        }
      }
    }
    
    const currentLesson = allLessons.find(l => l.id === id)
    if (currentLesson && 
        currentLesson.lesson_date && 
        editLessonDate && 
        currentLesson.lesson_date !== editLessonDate) {
      
      const subsequentLessons = allLessons.filter(lesson => 
        lesson.kid_id === currentLesson.kid_id &&
        lesson.id !== id &&
        lesson.lesson_date &&
        lesson.lesson_date > currentLesson.lesson_date
      )
      
      if (subsequentLessons.length > 0) {
        const oldDate = new Date(currentLesson.lesson_date)
        const newDateObj = new Date(editLessonDate)
        const suggestedShift = Math.round((newDateObj.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24))
        
        setCascadeData({
          lessonId: id,
          originalDate: currentLesson.lesson_date,
          newDate: editLessonDate,
          affectedCount: subsequentLessons.length,
          kidId: currentLesson.kid_id
        })
        setCascadeDays(suggestedShift)
        setShowCascadeModal(true)
        return
      }
    }
    
    await performLessonUpdate(id, updates)
  }

  const performLessonUpdate = async (id: string, updates: any) => {
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
    
    if (selectedLesson?.id === id) {
      setSelectedLesson({ ...selectedLesson, ...updates })
    }
    
    const { error } = await supabase.from('lessons').update(updates).eq('id', id)
    
    if (error) {
      console.error('Error saving lesson:', error)
      alert('Failed to save lesson changes')
      loadAllLessons()
    } else {
      setEditingLessonId(null)
    }
  }

  const handleViewPastAssessments = (kidId: string, kidName: string) => {
    setPastAssessmentsKidId(kidId);
    setPastAssessmentsKidName(kidName);
    setShowPastAssessments(true);
  };
  
  const handleGeneratePersonalizedAssessment = (lesson: any) => {
    setAssessmentForLesson(lesson);
    setShowPersonalizedAssessment(true);
  };
  
  const handleAssessmentCreated = (assessmentData: any) => {
    setGeneratedAssessment(assessmentData);
    setShowPersonalizedAssessment(false);
    setShowAssessmentTaking(true);
  };
  
  const handleAssessmentSubmitted = (results: any) => {
    console.log('Assessment submitted:', results);
    loadAllLessons();
  };
  
  const handleClosePersonalizedAssessment = () => {
    setShowPersonalizedAssessment(false);
    setShowAssessmentTaking(false);
    setGeneratedAssessment(null);
    setAssessmentForLesson(null);
  };
  
  const handleStatusChange = async (lessonId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => {
    const updates: any = { status: newStatus }
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
    if (newStatus === 'not_started') updates.completed_at = null
    
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
      loadAllLessons()
    }
  }

  const handleCascadeUpdate = async (updateAll: boolean) => {
    if (!cascadeData) return
    
    const { lessonId, originalDate, kidId } = cascadeData
    const daysDiff = cascadeDays
    
    const durationInMinutes = convertDurationToMinutes(editLessonDurationValue, editLessonDurationUnit)
    const updates = {
      title: editLessonTitle,
      subject: editLessonSubject,
      description: editLessonDescription,
      lesson_date: editLessonDate || null,
      duration_minutes: durationInMinutes
    }
    
    await performLessonUpdate(lessonId, updates)
    
    if (updateAll && daysDiff !== 0) {
      const subsequentLessons = allLessons.filter(lesson => 
        lesson.kid_id === kidId &&
        lesson.id !== lessonId &&
        lesson.lesson_date &&
        lesson.lesson_date > originalDate
      )
      
      const updatePromises = subsequentLessons.map(lesson => {
        const lessonDate = new Date(lesson.lesson_date!)
        lessonDate.setDate(lessonDate.getDate() + daysDiff)
        const newLessonDate = lessonDate.toISOString().split('T')[0]
        
        return supabase
          .from('lessons')
          .update({ lesson_date: newLessonDate })
          .eq('id', lesson.id)
      })
      
      const results = await Promise.all(updatePromises)
      const updatedCount = results.filter(result => !result.error).length
      
      await loadAllLessons()
      
      setShowCascadeModal(false)
      setCascadeData(null)
      setCascadeDays(1)
      
      setTimeout(() => {
        alert(`✅ Updated ${updatedCount} subsequent lesson${updatedCount !== 1 ? 's' : ''}. All dates shifted by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) !== 1 ? 's' : ''} ${daysDiff > 0 ? 'later' : 'earlier'}.`)
      }, 100)
    } else {
      setShowCascadeModal(false)
      setCascadeData(null)
      setCascadeDays(1)
      
      setTimeout(() => {
        alert('✅ Lesson date updated. Other lessons unchanged.')
      }, 100)
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
      await supabase.from('lessons').delete().eq('id', id).eq('user_id', user.id)
      await loadAllLessons()
    }
  }

  const copyLessonToChild = async () => {
    if (!copyTargetChildId || !selectedLesson) return
    const targetChild = kids.find(k => k.id === copyTargetChildId)
    if (!targetChild) return
    const { error } = await supabase.from('lessons').insert([{
      user_id: user.id,
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
      await loadAllLessons()
    } else {
      console.error('Copy error:', error)
      alert('Failed to copy lesson. Please try again.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section with Quick Tips Toggle */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HomeschoolHQ Dashboard</h1>
              <div className="mt-1">
                <ParentProfileManager 
                  userId={user.id} 
                  onNameUpdate={(name) => setParentName(name)} 
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  showHelp 
                    ? 'bg-blue-50 border-2 border-blue-200 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {showHelp ? '✕ Hide Tips' : '💡 How To'}
              </button>
              <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">⚙️ Admin</button>
              <button onClick={() => router.push('/social')} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium">🤝 Social Hub</button>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Logout</button>
            </div>
          </div>

          {/* Help Panel - Collapsible */}
          {showHelp && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    Getting Started
                  </h3>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    <strong>Step 1:</strong> Add your children in the left sidebar<br/>
                    <strong>Step 2:</strong> Import curriculum or create lessons<br/>
                    <strong>Step 3:</strong> Use calendar views to track progress
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    Power Features
                  </h3>
                  <p className="text-sm text-purple-800 leading-relaxed">
                    <strong>Auto-Schedule:</strong> Bulk assign dates to lessons<br/>
                    <strong>AI Generate:</strong> Create supplemental lessons instantly<br/>
                    <strong>Import:</strong> Upload curriculum from PDFs
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    View Modes
                  </h3>
                  <p className="text-sm text-green-800 leading-relaxed">
                    <strong>Today:</strong> Focus on today's lessons<br/>
                    <strong>This Week:</strong> See your weekly schedule<br/>
                    <strong>Calendar:</strong> Month view with all children<br/>
                    <strong>Lessons:</strong> Detailed list by child
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                  <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">❓</span>
                    Frequently Asked
                  </h3>
                  <div className="space-y-2">
                    {[
                      { q: "How do I get started?", a: "Click the '+ Add a Child' button in the left sidebar to create your first profile." },
                      { q: "What's the best way to organize?", a: "Start with one subject and use 'Auto-Schedule' to map out your week or month." },
                      { q: "Can I track multiple children?", a: "Yes, you can add all your children and switch between them using the sidebar." },
                      { q: "How do AI features work?", a: "The Lesson Generator automatically creates supplemental lessons based on your topic." }
                    ].map((faq, i) => (
                      <div key={i} className="border-b border-orange-200 pb-2 last:border-0">
                        <button 
                          onClick={() => setExpandedFaq(expandedFaq === faq.q ? null : faq.q)}
                          className="flex justify-between items-center w-full text-left text-xs font-medium text-orange-900 hover:text-orange-700 transition-colors"
                        >
                          <span>{faq.q}</span>
                          <span className="text-orange-400 font-bold">{expandedFaq === faq.q ? '−' : '+'}</span>
                        </button>
                        {expandedFaq === faq.q && (
                          <p className="mt-1 text-xs text-orange-800 bg-orange-50 p-2 rounded leading-relaxed">
                            {faq.a}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Reminder */}
        <AttendanceReminder 
          onTakeAttendance={() => {
            router.push('/admin')
            setTimeout(() => {
              const event = new Event('openAttendance')
              window.dispatchEvent(event)
            }, 500)
          }}
          kids={kids}
          organizationId={user.id}
        />

        <div className="flex gap-8 mb-8">
          {/* Children Sidebar */}
          <div className={`${sidebarCollapsed ? 'w-16' : 'w-[350px]'} flex-shrink-0 transition-all duration-300`}>
            {sidebarCollapsed ? (
              <div className="bg-white rounded-lg shadow p-2 sticky top-4">
                <button onClick={() => setSidebarCollapsed(false)} className="w-full p-3 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center transition-colors mb-2" title="Show children sidebar">
                  <span className="text-3xl font-black text-black">→</span>
                </button>
                <div className="mt-4 space-y-2">
                  {kids.map((kid, index) => {
                    const colors = getChildColor(index);
                    return (
                      <button 
                        key={kid.id}
                        onClick={() => {
                          setSelectedKid(kid.id); 
                          setViewMode('list');
                        }}
                        className={`w-full p-2 rounded transition-colors border-2 ${selectedKid === kid.id ? `${colors.border} ${colors.bg} ring-2 ring-offset-1` : 'border-transparent hover:bg-gray-100'}`} 
                        title={kid.displayname}
                      >
                        {kid.photo_url ? (
                          <img src={kid.photo_url} alt={kid.displayname} className="w-10 h-10 rounded-full object-cover mx-auto" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center mx-auto text-sm font-bold`}>
                            {kid.displayname.charAt(0)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-8 kids-section">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Your Children</h2>
                    <button onClick={() => setSidebarCollapsed(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors" title="Collapse sidebar">
                      <span className="text-3xl font-black text-black">←</span>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">👉 Click a child's name to view their lessons</p>
                  {kids.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">No children added yet.</p>
                      <p className="text-sm text-gray-500 italic">Start by adding your first child below!</p>
                    </div>
                  ) : (
                    <div className="space-y-4 mb-6">
                      {kids.map((kid, index) => {
                        const colors = getChildColor(index);
                        return (
                          <div
                            key={kid.id}
                            className={`rounded-lg border-3 transition-all ${
                              selectedKid === kid.id 
                                ? `${colors.border} ${colors.bg} border-3 shadow-md` 
                                : 'border-gray-200 border-2 hover:border-gray-300'
                            }`}
                          >
                            <div 
                              className="p-4 cursor-pointer"
                              onClick={() => {
                                setSelectedKid(kid.id);
                                setViewMode('list');
                              }}
                            >
                              <div className="flex items-center gap-3 mb-3">
                                {kid.photo_url ? (
                                  <img src={kid.photo_url} alt={kid.displayname} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow" />
                                ) : (
                                  <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center text-lg font-bold ring-2 ring-white shadow`}>
                                    {kid.displayname.charAt(0)}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h3 className="font-bold text-gray-900">{kid.displayname}</h3>
                                  {kid.grade && <p className="text-sm text-gray-600">Grade {kid.grade} • Age {kid.age}</p>}
                                </div>
                                <div className={`w-3 h-3 rounded-full ${colors.accent}`}></div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                {kid.current_hook && (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                    🎣 {kid.current_hook}
                                  </span>
                                )}
                                {kid.todays_vibe && (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                    😊 {kid.todays_vibe}
                                  </span>
                                )}
                              </div>
                              
                              {kid.current_focus && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Current Focus</p>
                                  <p className="text-sm text-gray-900">{kid.current_focus}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="px-4 pb-3 flex gap-2">
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setEditingKid(kid); 
                                  setShowProfileForm(true); 
                                }} 
                                className="text-xs px-3 py-1 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 font-medium"
                              >
                                ✏️ Update
                              </button>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  deleteKid(kid.id, kid.displayname); 
                                }} 
                                className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 rounded border border-red-200 font-medium"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button onClick={() => { setEditingKid(null); setShowProfileForm(true) }} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">+ Add a Child</button>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {kids.length > 0 ? (
              <>
                <div className="bg-white rounded-lg shadow p-8 mb-8">
                  <div className="space-y-6">
                    <div className="flex justify-center items-center">
                      <h2 className="text-2xl font-bold text-gray-900">Family Schedule</h2>
                    </div>
                    
                    <div className="flex justify-center">
                      <div className="flex flex-wrap gap-3 justify-center">
                        <button 
                          onClick={() => setShowAutoSchedule(true)} 
                          className="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-all"
                        >
                          📅 Auto-Schedule
                        </button>
                        
                        {hasFeature('curriculum_import') ? (
                          <button 
                            onClick={() => setShowImporter(true)} 
                            className="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-all"
                          >
                            📥 Import
                          </button>
                        ) : (
                          <button 
                            onClick={() => { alert('Curriculum Import requires PREMIUM! Upgrade to unlock.'); router.push('/pricing') }} 
                            className="px-4 py-2.5 text-sm bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed relative"
                          >
                            📥 Import 🔒
                          </button>
                        )}
                        <button 
                          onClick={() => setShowLessonForm(!showLessonForm)} 
                          className="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-all"
                        >
                          + Add Lesson
                        </button>
                        {hasFeature('ai_generation') ? (
                          <button 
                            onClick={() => setShowGenerator(true)} 
                            className="px-4 py-2.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-sm transition-all"
                          >
                            ✨ Generate Lessons
                          </button>
                        ) : (
                          <button 
                            onClick={() => { alert('AI Lesson Generation requires PREMIUM! Upgrade to unlock.'); router.push('/pricing') }} 
                            className="px-4 py-2.5 text-sm bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed relative"
                          >
                            ✨ Generate Lessons 🔒
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button onClick={() => setViewMode('today')} className={`px-5 py-2 text-sm rounded transition-all ${viewMode === 'today' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>📚 Today</button>
                        <button onClick={() => setViewMode('week')} className={`px-5 py-2 text-sm rounded transition-all ${viewMode === 'week' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>📅 This Week</button>
                        <button onClick={() => setViewMode('calendar')} className={`px-5 py-2 text-sm rounded transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>🗓️ Calendar</button>
                        <button onClick={() => setViewMode('list')} className={`px-5 py-2 text-sm rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>📋 Lessons</button>
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
                  <LessonCalendar kids={kids} lessonsByKid={lessonsByKid} onLessonClick={(lesson, child) => {setSelectedLesson(lesson); setSelectedLessonChild(child) }} onStatusChange={handleStatusChange}/>
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
                    onGenerateAssessment={handleGeneratePersonalizedAssessment}
                    onViewPastAssessments={handleViewPastAssessments}
                  />
                )}

                {showGenerator && <LessonGenerator kids={kids} userId={user.id} onClose={() => setShowGenerator(false)} />}
                {showImporter && selectedKid && <CurriculumImporter childId={selectedKid} childName={kids.find(k => k.id === selectedKid)?.displayname || ''} onClose={() => setShowImporter(false)} onImportComplete={() => { setShowImporter(false); loadAllLessons() }} />}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">👋</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to HomeschoolHQ!</h2>
                <p className="text-gray-600 mb-6">Let's get started by adding your first child.</p>
                <button 
                  onClick={() => { setEditingKid(null); setShowProfileForm(true) }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg"
                >
                  + Add Your First Child
                </button>
              </div>
            )}
          </div>
        </div>


      </div>
      
      {/* Modals */}
      {showProfileForm && (
  <KidProfileForm 
    kid={editingKid || undefined} 
    onSave={async (data) => {
      try {
        if (data.id) {
          // UPDATE EXISTING KID
          const updateData: any = {
            user_id: user.id,
            organization_id: user.id,  // ← ADDED
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
            const { error: uploadError } = await supabase.storage
              .from('child-photos')
              .upload(fileName, data.photoFile)
            
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('child-photos')
                .getPublicUrl(fileName)
              updateData.photo_url = publicUrl
            } else {
              console.error('Photo upload error:', uploadError)
            }
          }
          
          const { error: updateError } = await supabase
            .from('kids')
            .update(updateData)
            .eq('id', data.id)
          
          if (updateError) {
            console.error('Error updating kid:', updateError)
            alert('Error updating child: ' + updateError.message)
            return
          }
          
          if (data.subject_proficiencies?.length > 0) {
            await supabase.from('subject_proficiency').delete().eq('kid_id', data.id)
            const proficienciesToInsert = data.subject_proficiencies.map((sp: any) => ({
              kid_id: data.id,
              subject: sp.subject,
              proficiency: sp.proficiency,
              notes: sp.notes || ''
            }))
            const { error: profError } = await supabase
              .from('subject_proficiency')
              .insert(proficienciesToInsert)
            
            if (profError) {
              console.error('Error saving subject proficiencies:', profError)
            }
          }
        } else {
          // CREATE NEW KID
          const { data: newKid, error } = await supabase.from('kids').insert([{
            user_id: user.id,
            organization_id: user.id,  // ← ADDED
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
          
          if (error) {
            console.error('Error creating kid:', error)
            alert('Error creating child: ' + error.message)
            return
          }
          
          if (!newKid || newKid.length === 0) {
            alert('Error: Child was not created. Please try again.')
            return
          }
          
          const newKidId = newKid[0].id
          console.log('✅ New kid created with ID:', newKidId)
          
          if (data.photoFile) {
            const fileExt = data.photoFile.name.split('.').pop()
            const fileName = `${newKidId}/${Date.now()}.${fileExt}`
            const { error: uploadError } = await supabase.storage
              .from('child-photos')
              .upload(fileName, data.photoFile)
            
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('child-photos')
                .getPublicUrl(fileName)
              await supabase.from('kids').update({ photo_url: publicUrl }).eq('id', newKidId)
            } else {
              console.error('Photo upload error:', uploadError)
            }
          }
          
          if (data.subject_proficiencies?.length > 0) {
            const proficienciesToInsert = data.subject_proficiencies.map((sp: any) => ({
              kid_id: newKidId,
              subject: sp.subject,
              proficiency: sp.proficiency,
              notes: sp.notes || ''
            }))
            const { error: profError } = await supabase
              .from('subject_proficiency')
              .insert(proficienciesToInsert)
            
            if (profError) {
              console.error('Error saving subject proficiencies:', profError)
            }
          }
        }
        
        // Reload kids list
        console.log('🔄 Reloading kids list...')
        await loadKids()
        
        setShowProfileForm(false)
        setEditingKid(null)
        
        if (data.id) {
          setSelectedKid(data.id)
        }
      } catch (err) {
        console.error('❌ Unexpected error saving kid profile:', err)
        alert('An unexpected error occurred. Please try again.')
      }
    }}
    onCancel={() => { 
      setShowProfileForm(false); 
      setEditingKid(null) 
    }} 
  />
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
            setViewMode('calendar')
          }}
        />
      )}

      {showPersonalizedAssessment && assessmentForLesson && (
        <PersonalizedAssessmentCreator
          lessonId={assessmentForLesson.id}
          lessonTitle={assessmentForLesson.title}
          kidId={assessmentForLesson.kid_id}
          kidName={kids.find(k => k.id === assessmentForLesson.kid_id)?.displayname || 'Student'}
          onClose={handleClosePersonalizedAssessment}
          onAssessmentCreated={handleAssessmentCreated}
        />
      )}

      {showAssessmentTaking && generatedAssessment && assessmentForLesson && (
        <AssessmentTaking
          assessmentData={generatedAssessment.assessment}
          assessmentId={generatedAssessment.assessmentId}
          childName={kids.find(k => k.id === assessmentForLesson.kid_id)?.displayname || 'Student'}
          lessonTitle={generatedAssessment.lessonTitle}
          onClose={handleClosePersonalizedAssessment}
          onSubmit={handleAssessmentSubmitted}
        />
      )}

      {showPastAssessments && pastAssessmentsKidId && (
        <PastAssessmentsViewer
          kidId={pastAssessmentsKidId}
          kidName={pastAssessmentsKidName}
          onClose={() => {
            setShowPastAssessments(false);
            setPastAssessmentsKidId(null);
            setPastAssessmentsKidName('');
          }}
        />
      )}

      <DevTierToggle /> 
      <HelpWidget />
    </div>
  )
}

// 3. THE EXPORT (The "Bouncer" layer at the very end)
export default function DashboardPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  )
}