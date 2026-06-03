'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import moment from 'moment'
import { calculateTotalSchoolDays, isValidHomeschoolDay } from '@/utils/schoolYearUtils'
import { DEFAULT_HOLIDAYS_2025_2026, Holiday } from '@/app/utils/holidayUtils'
import { useAttendanceStats } from '@/src/hooks/useAttendanceStats'

interface ProgressDashboardProps {
  userId: string
  organizationId: string   // ← now a required prop; do NOT derive from kids table
}

type Tab = 'overview' | 'insights' | 'goals'

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
  const [requiredDays, setRequiredDays] = useState(180)
  const [kids, setKids] = useState<Kid[]>([])
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null)
  const [fieldTripHours, setFieldTripHours] = useState(0)
  const [booksRead, setBooksRead] = useState(0)

  // ── Shared attendance stats (same logic as AttendanceTracker) ──
  const attendanceStats = useAttendanceStats({
    organizationId,
    userId,
    kidId: selectedKidId || 'all',
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
      }

      // Compliance goal override
      const { data: complianceData } = await supabase
        .from('user_compliance_settings')
        .select('required_annual_days')
        .eq('organization_id', organizationId)
        .is('kid_id', null)
        .maybeSingle()

      if (complianceData?.required_annual_days) {
        setRequiredDays(complianceData.required_annual_days)
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
        .neq('archived', true)

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
  const expectedDays = Math.min(goal, Math.round((expectedProgress / 100) * goal))
  const paceGapDays = completed - expectedDays
  const needsAttendanceConfirmation = attendanceStats.lessonInferredDays > 0
  const activityMixItems = [
    { label: 'Lessons marked done', value: completedLessons, detail: `${totalLessons} planned lessons`, color: '#7c3aed', icon: '✅' },
    { label: 'Books read', value: booksRead, detail: 'Reading log entries', color: '#2563eb', icon: '📚' },
    { label: 'Field trip/activity hours', value: fieldTripHours, detail: 'Logged outside lessons', color: '#059669', icon: '🚌' },
  ]
  const maxActivityMixValue = Math.max(...activityMixItems.map(item => Number(item.value) || 0), 1)

  const progressStatus =
    paceGapDays >= 10 ? 'ahead' :
    paceGapDays <= -10 ? 'needs-attention' : 'on-track'

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'overview',   icon: '📋', label: 'Year Pace'   },
    { id: 'insights',   icon: '📊', label: 'Activity Mix'   },
    // Year Goals is intentionally hidden for MVP because it duplicated Year Pace.
    // Keep the tab content below so we can bring it back if parents need a goals/setup view later.
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
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', margin: '0 0 4px', fontFamily: "'Nunito', sans-serif" }}>School Year Progress</h2>
        <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, margin: 0 }}>Track your school-year pace, attendance, hours, and lesson completion.</p>
      </div>

      {/* Kid filter pills — Overview + Insights */}
      {kids.length > 1 && (activeTab === 'overview' || activeTab === 'insights') && (
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
        <><span>⚠️ </span><strong>{attendanceStats.lessonInferredDays} lesson-only day{attendanceStats.lessonInferredDays !== 1 ? 's' : ''}</strong> need attendance confirmation. They are included as learning days here, but attendance-confirmed days are the cleaner compliance record.{' '}<a href="/attendance" style={{ color: '#7c3aed', fontWeight: 700 }}>Confirm in Attendance →</a></>,
        '#fffbeb', '#fde68a'
      )}

      {/* Top progress bar */}
      <div style={{ background: '#f5f3ff', border: '1.5px solid rgba(124,58,237,0.15)', borderRadius: 14, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
          <span>Progress to {goal} required days</span>
          <span style={{ color: '#7c3aed' }}>{completed} learning days logged</span>
        </div>
        <div style={{ background: 'rgba(124,58,237,0.1)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, transition: 'all 0.5s', width: `${Math.min(percentComplete, 100)}%`, background: progressStatus === 'ahead' ? '#10b981' : progressStatus === 'needs-attention' ? '#f59e0b' : 'linear-gradient(90deg, #7c3aed, #a855f7)' }} />
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
                <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "'Nunito', sans-serif" }}>{completed} / {goal} Learning Days Logged</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{attendanceStats.confirmedDays} confirmed attendance days · {attendanceStats.lessonInferredDays} lesson-only</div>
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
          <div style={{ background: progressStatus === 'ahead' ? '#ecfdf5' : progressStatus === 'needs-attention' ? '#fffbeb' : '#f5f3ff', border: `2px solid ${progressStatus === 'ahead' ? '#a7f3d0' : progressStatus === 'needs-attention' ? '#fde68a' : 'rgba(124,58,237,0.25)'}`, borderRadius: 14, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 40 }}>{progressStatus === 'ahead' ? '🚀' : progressStatus === 'needs-attention' ? '⚠️' : '✅'}</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, color: progressStatus === 'ahead' ? '#059669' : progressStatus === 'needs-attention' ? '#d97706' : '#7c3aed', fontFamily: "'Nunito', sans-serif", marginBottom: 4 }}>
                  {progressStatus === 'ahead' ? 'Ahead of pace' : progressStatus === 'needs-attention' ? 'Review your school-year pace' : 'On pace'}
                </div>
                <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>
                  {progressStatus === 'ahead'
                    ? `You have ${Math.abs(paceGapDays)} more learning days logged than expected by today.`
                    : progressStatus === 'needs-attention'
                      ? `By today, the expected pace is about ${expectedDays} days. You have ${completed} learning days logged.`
                      : `Your logged learning days are close to the expected pace for this point in the school year.`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <span style={{ background: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: 6, color: '#374151' }}>Expected by today: {expectedDays} days</span>
              <span style={{ background: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: 6, color: '#374151' }}>Logged: {completed} days</span>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 8 }}>
              Based on your school-year dates and selected homeschool days.
            </div>
            <div style={{ position: 'relative', height: 24, background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, height: '100%', width: 2, background: '#1a1a2e', zIndex: 10, left: `${expectedProgress}%` }} />
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', transition: 'all 0.5s', borderRadius: 8, width: `${Math.min(percentComplete, 100)}%`, background: progressStatus === 'ahead' ? '#10b981' : progressStatus === 'needs-attention' ? '#f59e0b' : 'linear-gradient(90deg, #7c3aed, #a855f7)' }} />
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#6b7280', fontWeight: 700, marginTop: 8 }}>
              <span><span style={{ display: 'inline-block', width: 16, height: 6, borderRadius: 99, background: progressStatus === 'ahead' ? '#10b981' : progressStatus === 'needs-attention' ? '#f59e0b' : '#7c3aed', marginRight: 5, verticalAlign: 'middle' }} />Logged days</span>
              <span><span style={{ display: 'inline-block', width: 2, height: 12, background: '#1a1a2e', marginRight: 6, verticalAlign: 'middle' }} />Expected pace</span>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {statCard('📅', attendanceStats.confirmedDays, 'Confirmed Days', '#1a1a2e')}
            {statCard('📚', attendanceStats.lessonInferredDays, 'Lesson-Only Days', '#d97706')}
            {statCard('✅', completedLessons, 'Lessons Completed', '#059669')}
            {statCard('⏰', `${completedHours.toFixed(1)}h`, 'Hours Logged', '#7c3aed')}
          </div>

          {(progressStatus === 'needs-attention' || needsAttendanceConfirmation) && infoBox(
            <><p style={{ fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>💡 Suggested next steps:</p><ul style={{ paddingLeft: 20, margin: 0, lineHeight: 2 }}>{needsAttendanceConfirmation && <li>Confirm attendance for {attendanceStats.lessonInferredDays} lesson-only day{attendanceStats.lessonInferredDays !== 1 ? 's' : ''}.</li>}<li>{daysRemaining} learning day{daysRemaining !== 1 ? 's' : ''} remaining to reach {goal}.</li>{progressStatus === 'needs-attention' && <li>Review your calendar and decide whether to add school days, adjust the school-year plan, or update attendance records.</li>}<li>Use Attendance for official day records; use Progress Evidence for learning notes and work samples.</li></ul></>,
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
            <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a2e', marginBottom: 4, fontFamily: "'Nunito', sans-serif" }}>📚 Subject Progress</div>
            <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, margin: '0 0 16px' }}>Bars show the percent of planned lessons completed in each subject.</p>
            {getSubjectBreakdown().length === 0 ? (
              <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, margin: 0 }}>No lesson data yet. Start adding lessons to see subject progress.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {getSubjectBreakdown().map(({ subject, total, completed: subDone }) => {
                  const pct = total > 0 ? Math.round((subDone / total) * 100) : 0
                  return (
                    <div key={subject}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#1a1a2e' }}>{subject}</span>
                        <span style={{ color: '#6b7280', fontWeight: 600, textAlign: 'right' }}>{subDone} of {total} lessons done · {pct}%</span>
                      </div>
                      <div style={{ background: 'rgba(124,58,237,0.1)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)', height: '100%', borderRadius: 99, width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, paddingTop: 12, borderTop: '1px solid rgba(124,58,237,0.1)', marginTop: 4 }}>
                  <span style={{ fontWeight: 800, color: '#1a1a2e' }}>Total</span>
                  <span style={{ fontWeight: 700, color: '#7c3aed', textAlign: 'right' }}>{completedLessons} of {totalLessons} lessons marked done</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ background: '#fff', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 14, padding: '20px' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a2e', marginBottom: 4, fontFamily: "'Nunito', sans-serif" }}>📊 Activity Mix</div>
            <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, margin: '0 0 16px' }}>A snapshot of the different learning evidence logged so far.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activityMixItems.map(item => {
                const numericValue = Number(item.value) || 0
                const width = Math.max(4, Math.round((numericValue / maxActivityMixValue) * 100))
                return (
                  <div key={item.label} style={{ background: '#f9fafb', border: '1px solid #eef2ff', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>{item.icon} {item.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: item.color, fontFamily: "'Nunito', sans-serif" }}>{item.value}{item.label.includes('hours') ? 'h' : ''}</span>
                    </div>
                    <div style={{ background: `${item.color}18`, borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 5 }}>
                      <div style={{ background: item.color, height: '100%', borderRadius: 99, width: `${width}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{item.detail}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {statCard('📈', `${totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%`, 'Lessons Marked Done')}
            {statCard('⏱️', `${attendanceStats.totalDays > 0 ? (attendanceStats.totalHours / attendanceStats.totalDays).toFixed(1) : '0'}h`, 'Avg. Hours / Day', '#2563eb')}
            {statCard('📅', daysRemaining, 'Days Remaining', '#f59e0b')}
            {statCard('📚', booksRead, 'Books Read')}
            {statCard('🚌', `${fieldTripHours}h`, 'Field Trip Hours', '#059669')}
          </div>
        </div>
      )}

      {/* ── Year Goals ── */}
      {activeTab === 'goals' && (
        <div style={{ background: '#f5f3ff', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 14, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif" }}>Year Goals</div>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 2 }}>Review your school-year targets for days, hours, and pacing.</div>
            </div>
            <button onClick={() => router.push('/school-year')} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.7)', border: '2px solid rgba(124,58,237,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#7c3aed', cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}>
              Edit Year Setup
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>
              <span>Required Days Goal</span>
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
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginTop: 4 }}>Planning estimate based on 4 hrs/day.</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>Estimated Completion:</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif" }}>
              {estimatedCompletion ? estimatedCompletion.format('MMM D, YYYY') : '—'}
            </span>
          </div>
        </div>
      )}

    </div>
  )
}