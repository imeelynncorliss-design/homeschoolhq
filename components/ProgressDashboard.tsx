'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import moment from 'moment'
import { calculateTotalSchoolDays, isValidHomeschoolDay } from '@/utils/schoolYearUtils'
import { DEFAULT_HOLIDAYS_2025_2026, Holiday } from '@/app/utils/holidayUtils'
import { generateComplianceReport } from '@/src/utils/generateComplianceReport'
import { useAttendanceStats } from '@/src/hooks/useAttendanceStats'

interface ProgressDashboardProps {
  userId: string
  organizationId: string   // ← now a required prop; do NOT derive from kids table
}

type Tab = 'overview' | 'insights' | 'goals' | 'compliance' | 'reports'

type LessonRow = {
  id: string
  kid_id: string
  status: string
  duration_minutes: number | null
  subject?: string
}

type Kid = {
  id: string
  displayname: string
}

export default function ProgressDashboard({ userId, organizationId }: ProgressDashboardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [settings, setSettings] = useState<any>(null)
  const [vacationHolidays, setVacationHolidays] = useState<Holiday[]>([])
  const [allLessons, setAllLessons] = useState<LessonRow[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [requiredDays, setRequiredDays] = useState(180)
  const [selectedState, setSelectedState] = useState('')
  const [kids, setKids] = useState<Kid[]>([])
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null)
  const [fieldTripHours, setFieldTripHours] = useState(0)
  const [booksRead, setBooksRead] = useState(0)

  // ── Shared attendance stats (same logic as AttendanceTracker) ──
  const attendanceStats = useAttendanceStats({
    organizationId,
    userId,
    startDate: settings?.school_year_start || undefined,
    endDate: settings?.school_year_end || undefined,
    requiredDays,
  })

  useEffect(() => {
    if (organizationId) loadSettings()
  }, [organizationId])

  useEffect(() => {
    if (!organizationId) return
    const fetchKidStats = async () => {
      let tripQuery = supabase.from('field_trips').select('hours').eq('organization_id', organizationId)
      let bookQuery = supabase.from('reading_log').select('id').eq('organization_id', organizationId)
      if (selectedKidId) {
        tripQuery = tripQuery.eq('kid_id', selectedKidId)
        bookQuery = bookQuery.eq('kid_id', selectedKidId)
      }
      const [{ data: tripData }, { data: bookData }] = await Promise.all([tripQuery, bookQuery])
      const hours = (tripData || []).reduce((sum: number, t: any) => sum + (t.hours ?? 0), 0)
      setFieldTripHours(Math.round(hours * 10) / 10)
      setBooksRead((bookData || []).length)
    }
    fetchKidStats()
  }, [organizationId, selectedKidId])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // School year settings
      const { data: settingsData } = await supabase
        .from('school_year_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle()

      if (settingsData) {
        setSettings(settingsData)
        setSelectedState(settingsData.selected_state || '')
      }

      // Compliance goal override
      const { data: complianceData } = await supabase
        .from('user_compliance_settings')
        .select('annual_days_goal')
        .eq('organization_id', organizationId)
        .maybeSingle()

      if (complianceData?.annual_days_goal) {
        setRequiredDays(complianceData.annual_days_goal)
      } else if (settingsData?.annual_goal_value) {
        setRequiredDays(settingsData.annual_goal_value)
      }

      // Vacations
      const { data: vacations } = await supabase
        .from('vacation_periods')
        .select('*')
        .eq('user_id', userId)

      const vh: Holiday[] = (vacations || []).map((v: any) => ({
        name: v.name,
        start: v.start_date,
        end: v.end_date,
        enabled: true,
      }))
      setVacationHolidays(vh)

      // Lessons (for subject breakdown only — day counting comes from hook)
      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname')
        .eq('organization_id', organizationId)

      const kidList = (kidsData || []) as Kid[]
      setKids(kidList)
      const kidIds = kidList.map(k => k.id)
      if (kidIds.length > 0) {
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id, kid_id, status, duration_minutes, subject')
          .in('kid_id', kidIds)
        setAllLessons((lessons as LessonRow[]) || [])

      }
    } catch (err) {
      console.error('ProgressDashboard loadSettings error:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateExpectedProgress = () => {
    if (!settings?.school_year_start || !settings?.school_year_end) return 0
    const start = moment(settings.school_year_start)
    const end = moment(settings.school_year_end)
    const today = moment()
    if (today.isBefore(start)) return 0
    if (today.isAfter(end)) return 100
    const homeschoolDays = settings?.homeschool_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const allHolidays = [...DEFAULT_HOLIDAYS_2025_2026, ...vacationHolidays]
    const totalSchoolDays = calculateTotalSchoolDays(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'), homeschoolDays, allHolidays)
    let elapsedSchoolDays = 0
    let currentDate = moment(start)
    while (currentDate.isSameOrBefore(today) && currentDate.isSameOrBefore(end)) {
      if (isValidHomeschoolDay(currentDate.format('YYYY-MM-DD'), homeschoolDays, allHolidays)) elapsedSchoolDays++
      currentDate.add(1, 'day')
    }
    return totalSchoolDays > 0 ? Math.round((elapsedSchoolDays / totalSchoolDays) * 100) : 0
  }

  const calculateEstimatedCompletion = () => {
    if (!settings?.school_year_start || attendanceStats.totalDays === 0) return null
    const weeksElapsed = Math.max(1, moment().diff(moment(settings.school_year_start), 'weeks'))
    const daysPerWeek = attendanceStats.totalDays / weeksElapsed
    const daysRemaining = Math.max(0, requiredDays - attendanceStats.totalDays)
    const weeksRemaining = daysPerWeek > 0 ? daysRemaining / daysPerWeek : 0
    return moment().add(weeksRemaining, 'weeks')
  }

  const getSubjectBreakdown = () => {
    const subjects: Record<string, { total: number; completed: number }> = {}
    filteredLessons.forEach((l: LessonRow) => {
      const subj = l.subject || 'Other'
      if (!subjects[subj]) subjects[subj] = { total: 0, completed: 0 }
      subjects[subj].total++
      if (l.status === 'completed') subjects[subj].completed++
    })
    return Object.entries(subjects)
      .map(([subject, data]) => ({ subject, ...data }))
      .sort((a, b) => b.total - a.total)
  }

  const handleExportReport = async () => {
    if (!organizationId) return
    setIsExporting(true)
    try {
      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname, firstname, lastname, photo_url, grade, age')
        .eq('organization_id', organizationId)

      if (!kidsData || kidsData.length === 0) { alert('No students found.'); return }

      const kidIds = kidsData.map((k: any) => k.id)
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, kid_id, status, duration_minutes')
        .in('kid_id', kidIds)

      const complianceData = kidsData.map((kid: any) => {
        const kidLessons = (lessons ?? []).filter((l: any) => l.kid_id === kid.id)
        const completedMinutes = kidLessons
          .filter((l: any) => l.status === 'completed')
          .reduce((sum: number, l: any) => sum + (l.duration_minutes ?? 0), 0)
        const totalHours = Math.round((completedMinutes / 60) * 10) / 10
        // Use shared hook totals for consistency
        const totalDays = attendanceStats.totalDays
        const daysScore = requiredDays > 0 ? Math.min(100, Math.round((totalDays / requiredDays) * 100)) : 100
        const hoursScore = attendanceStats.totalHours > 0
          ? Math.min(100, Math.round((totalHours / attendanceStats.totalHours) * 100))
          : 100
        const healthScore = Math.round(daysScore * 0.6 + hoursScore * 0.4)
        return {
          kid,
          totalHours,
          totalDays,
          healthScore,
          requiredHours: attendanceStats.totalHours,
          requiredDays,
          hoursRemaining: 0,
          daysRemaining: Math.max(0, requiredDays - totalDays),
          onTrack: healthScore >= 60,
        }
      })

      const familyHealthScore = Math.round(
        complianceData.reduce((sum: number, d: { healthScore: number }) => sum + d.healthScore, 0) / complianceData.length
      )

      await generateComplianceReport({
        complianceData,
        settings: {
          state_code: selectedState || undefined,
          school_year_start_date: settings?.school_year_start,
          school_year_end_date: settings?.school_year_end,
          required_annual_days: requiredDays,
        },
        familyHealthScore,
      })
    } catch (err) {
      console.error('Export failed:', err)
      alert('Failed to generate report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (loading || attendanceStats.loading) {
    return <div className="text-center py-8">Loading progress data...</div>
  }

  const filteredLessons = selectedKidId
    ? allLessons.filter(l => l.kid_id === selectedKidId)
    : allLessons

  const completed = attendanceStats.totalDays
  const goal = requiredDays
  const percentComplete = goal > 0 ? Math.round((completed / goal) * 100) : 0
  const expectedProgress = calculateExpectedProgress()
  const estimatedCompletion = calculateEstimatedCompletion()
  const daysRemaining = Math.max(0, goal - completed)
  const completedLessons = filteredLessons.filter(l => l.status === 'completed').length
  const totalLessons = filteredLessons.length
  const completedHours = attendanceStats.totalHours

  const progressStatus =
    percentComplete >= expectedProgress + 10 ? 'ahead' :
    percentComplete < expectedProgress - 10 ? 'behind' : 'on-track'

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'overview',   icon: '📋', label: 'Overview'   },
    { id: 'insights',   icon: '📊', label: 'Insights'   },
    { id: 'goals',      icon: '🎯', label: 'Goals'      },
    { id: 'compliance', icon: '✅', label: 'Compliance' },
    { id: 'reports',    icon: '📄', label: 'Reports'    },
  ]

  const KID_COLORS = ['#7c3aed', '#0d9488', '#ec4899', '#f59e0b', '#3b82f6']

  const statCard = (icon: string, value: string | number, label: string, valueColor = '#7c3aed') => (
    <div key={label} style={{ background: '#f5f3ff', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: valueColor, fontFamily: "'Nunito', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )

  const infoBox = (content: React.ReactNode, accent = '#ede9fe', border = 'rgba(124,58,237,0.2)') => (
    <div style={{ background: accent, border: `1.5px solid ${border}`, borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#374151', fontWeight: 600, lineHeight: 1.6 }}>
      {content}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', margin: '0 0 4px', fontFamily: "'Nunito', sans-serif" }}>Progress Tracking</h2>
        <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, margin: 0 }}>Monitor your annual learning goals and stay on track</p>
      </div>

      {/* Kid filter pills — Insights only */}
      {kids.length > 1 && activeTab === 'insights' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setSelectedKidId(null)} style={{ padding: '7px 16px', borderRadius: 999, fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', border: selectedKidId === null ? '2px solid #7c3aed' : '2px solid #e5e7eb', background: selectedKidId === null ? '#ede9fe' : '#fff', color: selectedKidId === null ? '#7c3aed' : '#6b7280' }}>
            All kids
          </button>
          {kids.map((kid, idx) => {
            const color = KID_COLORS[idx % KID_COLORS.length]
            const isActive = kid.id === selectedKidId
            return (
              <button key={kid.id} onClick={() => setSelectedKidId(isActive ? null : kid.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px 7px 10px', borderRadius: 999, fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', border: `2px solid ${isActive ? color : '#e5e7eb'}`, background: isActive ? `${color}18` : '#fff', color: isActive ? color : '#6b7280' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: isActive ? color : '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                  {kid.displayname.charAt(0).toUpperCase()}
                </div>
                {kid.displayname}
              </button>
            )
          })}
        </div>
      )}

      {/* Inferred days notice */}
      {attendanceStats.lessonInferredDays > 0 && infoBox(
        <><span>⚠️ </span><strong>{attendanceStats.lessonInferredDays} school days</strong> have lessons logged but no attendance record. These count toward your total but aren't officially confirmed.{' '}<a href="/attendance" style={{ color: '#7c3aed', fontWeight: 700 }}>Go to Attendance Tracker →</a></>,
        '#fffbeb', '#fde68a'
      )}

      {/* Top progress bar */}
      <div style={{ background: '#f5f3ff', border: '1.5px solid rgba(124,58,237,0.15)', borderRadius: 14, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
          <span>Progress to {goal} days</span>
          <span style={{ color: '#7c3aed' }}>{completed} days completed</span>
        </div>
        <div style={{ background: 'rgba(124,58,237,0.1)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, transition: 'all 0.5s', width: `${Math.min(percentComplete, 100)}%`, background: progressStatus === 'ahead' ? '#10b981' : progressStatus === 'behind' ? '#ef4444' : 'linear-gradient(90deg, #7c3aed, #a855f7)' }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 4, border: '1.5px solid rgba(124,58,237,0.1)', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', background: activeTab === tab.id ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'transparent', color: activeTab === tab.id ? '#fff' : '#6b7280' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hero */}
          <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 16, padding: '24px 20px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "'Nunito', sans-serif" }}>{completed} / {goal} Days</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Annual Compliance Progress</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 40, fontWeight: 900, fontFamily: "'Nunito', sans-serif", lineHeight: 1 }}>{percentComplete}%</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Complete</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 99, height: 10, marginBottom: 10 }}>
              <div style={{ background: '#fff', borderRadius: 99, height: '100%', width: `${Math.min(percentComplete, 100)}%`, transition: 'all 0.5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.85 }}>
              <span>Started: {settings?.school_year_start ? moment(settings.school_year_start).format('MMM D, YYYY') : 'Not set'}</span>
              <span>Ends: {settings?.school_year_end ? moment(settings.school_year_end).format('MMM D, YYYY') : 'Not set'}</span>
            </div>
          </div>

          {/* Status card */}
          <div style={{ background: progressStatus === 'ahead' ? '#ecfdf5' : progressStatus === 'behind' ? '#fef2f2' : '#f5f3ff', border: `2px solid ${progressStatus === 'ahead' ? '#a7f3d0' : progressStatus === 'behind' ? '#fca5a5' : 'rgba(124,58,237,0.25)'}`, borderRadius: 14, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 40 }}>{progressStatus === 'ahead' ? '🚀' : progressStatus === 'behind' ? '⚠️' : '✅'}</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, color: progressStatus === 'ahead' ? '#059669' : progressStatus === 'behind' ? '#dc2626' : '#7c3aed', fontFamily: "'Nunito', sans-serif", marginBottom: 4 }}>
                  {progressStatus === 'ahead' ? 'Ahead of Schedule!' : progressStatus === 'behind' ? 'Behind Schedule' : 'Right on Track!'}
                </div>
                <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>
                  {progressStatus === 'ahead' ? `You're ${percentComplete - expectedProgress}% ahead of where you should be. Great work!` : progressStatus === 'behind' ? `You're ${expectedProgress - percentComplete}% behind. Consider adjusting your schedule.` : `You're progressing exactly as planned for this time of year.`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <span style={{ background: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: 6, color: '#374151' }}>Expected: {expectedProgress}%</span>
              <span style={{ background: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: 6, color: '#374151' }}>Actual: {percentComplete}%</span>
            </div>
            <div style={{ position: 'relative', height: 24, background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, height: '100%', width: 2, background: '#1a1a2e', zIndex: 10, left: `${expectedProgress}%` }} />
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', transition: 'all 0.5s', borderRadius: 8, width: `${Math.min(percentComplete, 100)}%`, background: progressStatus === 'ahead' ? '#10b981' : progressStatus === 'behind' ? '#ef4444' : 'linear-gradient(90deg, #7c3aed, #a855f7)' }} />
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {statCard('📅', attendanceStats.confirmedDays, 'Confirmed Days', '#1a1a2e')}
            {statCard('📚', attendanceStats.lessonInferredDays, 'Lesson-Only Days', '#d97706')}
            {statCard('✅', completedLessons, 'Lessons Completed', '#059669')}
            {statCard('⏰', `${completedHours.toFixed(1)}h`, 'Hours Logged', '#7c3aed')}
          </div>

          {progressStatus === 'behind' && infoBox(
            <><p style={{ fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>💡 Recommendations to Get Back on Track:</p><ul style={{ paddingLeft: 20, margin: 0, lineHeight: 2 }}><li>Add an extra study session each week</li><li>Extend daily lessons by 15–30 minutes</li><li>Review and adjust vacation plans if possible</li><li>Focus on completing scheduled lessons before adding new ones</li></ul></>,
            '#fffbeb', '#fde68a'
          )}

          {!settings?.school_year_start && infoBox(
            <><p style={{ fontWeight: 800, color: '#1a1a2e', margin: '0 0 4px' }}>ℹ️ Configure Your School Year</p><p style={{ margin: 0 }}>Set up your school year dates in{' '}<button onClick={() => router.push('/school-year')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>School Year &amp; Compliance</button>{' '}to see accurate progress tracking.</p></>
          )}
        </div>
      )}

      {/* ── Insights ── */}
      {activeTab === 'insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#f5f3ff', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 14, padding: '20px' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a2e', marginBottom: 16, fontFamily: "'Nunito', sans-serif" }}>📊 Subject Breakdown</div>
            {getSubjectBreakdown().length === 0 ? (
              <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, margin: 0 }}>No lesson data yet. Start adding lessons to see subject insights.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {getSubjectBreakdown().map(({ subject, total, completed: subDone }) => {
                  const pct = total > 0 ? Math.round((subDone / total) * 100) : 0
                  return (
                    <div key={subject}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#1a1a2e' }}>{subject}</span>
                        <span style={{ color: '#6b7280', fontWeight: 600 }}>{subDone}/{total} · {pct}%</span>
                      </div>
                      <div style={{ background: 'rgba(124,58,237,0.1)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)', height: '100%', borderRadius: 99, width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingTop: 12, borderTop: '1px solid rgba(124,58,237,0.1)', marginTop: 4 }}>
                  <span style={{ fontWeight: 800, color: '#1a1a2e' }}>Total</span>
                  <span style={{ fontWeight: 700, color: '#7c3aed' }}>{completedLessons} of {totalLessons} lessons completed</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {statCard('📈', `${totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%`, 'Completion Rate')}
            {statCard('⏱️', `${attendanceStats.totalDays > 0 ? (attendanceStats.totalHours / attendanceStats.totalDays).toFixed(1) : '0'}h`, 'Avg. Hours / Day', '#2563eb')}
            {statCard('📅', daysRemaining, 'Days Remaining', '#f59e0b')}
            {statCard('📚', booksRead, 'Books Read')}
            {statCard('🚌', `${fieldTripHours}h`, 'Field Trip Hours', '#059669')}
          </div>
        </div>
      )}

      {/* ── Goals ── */}
      {activeTab === 'goals' && (
        <div style={{ background: '#f5f3ff', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 14, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif" }}>Attendance Goals</div>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 2 }}>Set targets and track your progress</div>
            </div>
            <button onClick={() => router.push('/school-year')} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.7)', border: '2px solid rgba(124,58,237,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#7c3aed', cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}>
              Edit Goals
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>
              <span>School Days Goal</span>
              <span style={{ color: '#7c3aed' }}>{completed} / {goal} days</span>
            </div>
            <div style={{ background: 'rgba(124,58,237,0.1)', borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)', height: '100%', borderRadius: 99, width: `${Math.min(percentComplete, 100)}%`, transition: 'all 0.5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
              <span>{percentComplete}% complete</span>
              <span>{daysRemaining} days to go</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>
              <span>Hours Logged</span>
              <span style={{ color: '#7c3aed' }}>{attendanceStats.totalHours.toFixed(1)} hours</span>
            </div>
            <div style={{ background: 'rgba(124,58,237,0.1)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(90deg, #a855f7, #ec4899)', height: '100%', borderRadius: 99, width: `${Math.min((attendanceStats.totalHours / (goal * 4)) * 100, 100)}%`, transition: 'all 0.5s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginTop: 4 }}>Based on 4 hrs/day target</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>Estimated Completion:</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif" }}>
              {estimatedCompletion ? estimatedCompletion.format('MMM D, YYYY') : '—'}
            </span>
          </div>
        </div>
      )}

      {/* ── Compliance ── */}
      {activeTab === 'compliance' && (
        <div style={{ background: '#f5f3ff', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 14, padding: '20px' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a2e', marginBottom: 16, fontFamily: "'Nunito', sans-serif" }}>✅ Compliance Status</div>
          {!selectedState ? infoBox(
            <><span style={{ fontWeight: 800, color: '#1a1a2e' }}>No state selected.</span>{' '}
            <button onClick={() => router.push('/school-year')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Set your state in School Year settings</button>{' '}to see compliance requirements.</>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: percentComplete >= 80 ? '#ecfdf5' : percentComplete >= 40 ? '#fffbeb' : '#fef2f2', border: `2px solid ${percentComplete >= 80 ? '#a7f3d0' : percentComplete >= 40 ? '#fde68a' : '#fca5a5'}`, borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 36 }}>{percentComplete >= 80 ? '✅' : percentComplete >= 40 ? '⚠️' : '🚨'}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e' }}>{selectedState} Compliance</div>
                  <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>{completed} of {goal} required days logged · {percentComplete}% complete</div>
                  {attendanceStats.lessonInferredDays > 0 && <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginTop: 4 }}>⚠️ {attendanceStats.lessonInferredDays} days are lesson-inferred and not yet manually confirmed.</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 4 }}>Days Logged</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif" }}>{completed}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>of {goal} required</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 4 }}>Days Remaining</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b', fontFamily: "'Nunito', sans-serif" }}>{daysRemaining}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{settings?.school_year_end ? `by ${moment(settings.school_year_end).format('MMM D, YYYY')}` : 'no end date set'}</div>
                </div>
              </div>
              {infoBox(<>💡 HomeschoolReady is not a legal advisor. Always verify requirements at{' '}<a href="https://hslda.org" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', fontWeight: 700 }}>HSLDA.org</a>{' '}or your state's Department of Education.</>)}
            </div>
          )}
        </div>
      )}

      {/* ── Reports ── */}
      {activeTab === 'reports' && (
        <div style={{ background: '#f5f3ff', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 14, padding: '20px' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a2e', marginBottom: 4, fontFamily: "'Nunito', sans-serif" }}>📄 Compliance Report</div>
          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>
            Generate a PDF compliance report showing attendance, lesson completion, and health scores for each student.
          </div>
          <div style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'School Year', value: settings?.school_year_start ? `${moment(settings.school_year_start).format('MMM D, YYYY')} – ${moment(settings.school_year_end).format('MMM D, YYYY')}` : 'Not configured' },
              { label: 'State', value: selectedState || 'Not set' },
              { label: 'Days Logged', value: `${completed} / ${goal}` },
              { label: 'Lessons Completed', value: String(completedLessons) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontWeight: 800, color: '#1a1a2e' }}>{row.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleExportReport}
            disabled={isExporting || !settings?.school_year_start}
            style={{ width: '100%', padding: '13px 20px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: isExporting || !settings?.school_year_start ? 'not-allowed' : 'pointer', opacity: isExporting || !settings?.school_year_start ? 0.6 : 1, fontFamily: "'Nunito', sans-serif" }}
          >
            {isExporting ? '⏳ Generating...' : '⬇️ Download PDF Report'}
          </button>
          {!settings?.school_year_start && (
            <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textAlign: 'center', marginTop: 8 }}>Configure school year dates before generating a report.</p>
          )}
        </div>
      )}
    </div>
  )
}