'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Download, CheckSquare, Square, FileText, Calendar, ShieldCheck, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/src/lib/supabase'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'
import { useComplianceSettings } from '@/src/hooks/useComplianceSettings'
import { useStateComplianceTemplates } from '@/src/hooks/useStateComplianceTemplates'
import { colors } from '@/src/lib/designTokens'
import AuthGuard from '@/components/AuthGuard'
import { Suspense } from 'react'
import type {
  RpKidCompliance,
  RpAttendanceRecord,
  RpSubjectHours,
  RpPortfolioItem,
} from '@/src/components/ReviewPackagePDF'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kid {
  id: string
  displayname: string
  firstname: string
  lastname: string
  grade?: string
}

// ─── Main content ─────────────────────────────────────────────────────────────

function ReviewPackageContent() {
  useAppHeader({ title: '📦 Review Package', backHref: '/reports' })
  const router = useRouter()

  const { settings, loading: settingsLoading } = useComplianceSettings()
  const { getTemplate } = useStateComplianceTemplates()

  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [parentName, setParentName] = useState('Parent')
  const [orgName, setOrgName] = useState('HomeschoolReady Family')
  const [kids, setKids] = useState<Kid[]>([])

  const [complianceData, setComplianceData] = useState<RpKidCompliance[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<RpAttendanceRecord[]>([])
  const [subjectHours, setSubjectHours] = useState<RpSubjectHours[]>([])
  const [portfolioItems, setPortfolioItems] = useState<RpPortfolioItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const portfolioLoadedRef = useRef(false)
  const dataLoadedRef = useRef(false)

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }

      setOrganizationId(orgId)

      // Org name + parent name
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle()
      if (org?.name) setOrgName(org.name)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name')
        .eq('id', user.id)
        .maybeSingle()
      if (profile) {
        const name = profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        if (name) setParentName(name)
      }

      // Kids
      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname, firstname, lastname, grade')
        .eq('organization_id', orgId)
        .neq('archived', true)
        .order('created_at', { ascending: true })
      const kidList: Kid[] = kidsData || []
      setKids(kidList)

      setLoading(false)
    }
    init()
  }, [router])

  // ── Load records once org + settings ready ────────────────────────────────

  const loadRecords = useCallback(async () => {
    if (!organizationId || !kids.length || settingsLoading || dataLoadedRef.current) return
    dataLoadedRef.current = true

    const template = settings?.state_code ? getTemplate(settings.state_code) : null
    const requiredDays = template?.required_days || settings?.required_annual_days || 0
    const requiredHours = template?.required_hours || settings?.required_annual_hours || 0

    // Resolve school year
    const { data: sySettings } = await supabase
      .from('school_year_settings')
      .select('school_year_start, school_year_end')
      .eq('organization_id', organizationId)
      .maybeSingle()

    const now = new Date()
    const yr = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
    const startDate: string = sySettings?.school_year_start || settings?.school_year_start_date || `${yr}-08-01`
    const endDate: string = sySettings?.school_year_end || settings?.school_year_end_date || `${yr + 1}-06-30`

    // ── Attendance ──────────────────────────────────────────────────────────
    const { data: attData } = await supabase
      .from('daily_attendance')
      .select('attendance_date, hours, status, kid_id')
      .eq('organization_id', organizationId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: true })

    // Deduplicate by date — take the entry with the most hours per day
    const dateMap: Record<string, RpAttendanceRecord> = {}
    for (const r of (attData || [])) {
      const existing = dateMap[r.attendance_date]
      if (!existing || (r.hours || 0) > existing.hours) {
        dateMap[r.attendance_date] = {
          attendance_date: r.attendance_date,
          hours: r.hours || 0,
          status: r.status || 'present',
        }
      }
    }
    const attRecords = Object.values(dateMap).sort((a, b) =>
      a.attendance_date.localeCompare(b.attendance_date)
    )
    setAttendanceRecords(attRecords)

    // ── Subject hours ───────────────────────────────────────────────────────
    const { data: subjectLogData } = await supabase
      .from('daily_subject_logs')
      .select('subject, hours')
      .eq('organization_id', organizationId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)

    const subjectMap: Record<string, number> = {}
    for (const row of subjectLogData || []) {
      if (!row.subject) continue
      subjectMap[row.subject] = (subjectMap[row.subject] || 0) + (row.hours || 0)
    }
    const subjectList: RpSubjectHours[] = Object.entries(subjectMap)
      .map(([subject, hours]) => ({ subject, hours }))
      .sort((a, b) => b.hours - a.hours)
    setSubjectHours(subjectList)

    // ── Compliance per kid ──────────────────────────────────────────────────
    const compData: RpKidCompliance[] = []

    for (const kid of kids) {
      const { data: lessons } = await supabase
        .from('lessons')
        .select('lesson_date, duration_minutes')
        .eq('kid_id', kid.id)
        .gte('lesson_date', startDate)
        .lte('lesson_date', endDate)

      const { data: dailyLogs } = await supabase
        .from('daily_subject_logs')
        .select('log_date, hours')
        .eq('organization_id', organizationId)
        .eq('kid_id', kid.id)
        .gte('log_date', startDate)
        .lte('log_date', endDate)

      const allDates = new Set<string>()
      lessons?.forEach((l: any) => allDates.add(l.lesson_date.substring(0, 10)))
      attData?.forEach((a: any) => allDates.add(a.attendance_date))
      dailyLogs?.forEach((log: any) => allDates.add(log.log_date))

      let totalDays = 0
      let totalHours = 0

      for (const date of allDates) {
        const dayLessons = lessons?.filter((l: any) => l.lesson_date.substring(0, 10) === date) || []
        const lessonHours = dayLessons.reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0) / 60
        const dayAtt = attData?.find((a: any) =>
          a.attendance_date === date && (a.kid_id === kid.id || a.kid_id === null)
        )
        const dayLog = dailyLogs?.find((log: any) => log.log_date === date)

        let isSchoolDay = false
        let dayHrs = 0

        if (dayAtt) {
          isSchoolDay = dayAtt.status !== 'no_school'
          dayHrs = dayAtt.hours
        } else if (lessonHours > 0) {
          isSchoolDay = true
          dayHrs = lessonHours
        } else if (dayLog) {
          isSchoolDay = true
          dayHrs = dayLog.hours || 0
        }

        if (isSchoolDay) {
          totalDays++
          totalHours += dayHrs
        }
      }

      const roundedHours = Math.round(totalHours * 10) / 10
      const hoursRemaining = Math.max(0, Math.round((requiredHours - roundedHours) * 10) / 10)
      const daysRemaining = Math.max(0, requiredDays - totalDays)
      const daysProgress = requiredDays > 0 ? Math.min(100, (totalDays / requiredDays) * 100) : null
      const hoursProgress = requiredHours > 0 ? Math.min(100, (roundedHours / requiredHours) * 100) : null
      const progressValues = [daysProgress, hoursProgress].filter(v => v !== null) as number[]
      const healthScore = progressValues.length > 0
        ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
        : 0

      compData.push({
        kid: { id: kid.id, displayname: kid.displayname, firstname: kid.firstname, grade: kid.grade },
        totalHours: roundedHours,
        totalDays,
        healthScore,
        requiredHours,
        requiredDays,
        hoursRemaining,
        daysRemaining,
        onTrack: healthScore >= 75,
      })
    }
    setComplianceData(compData)

    // ── Portfolio uploads ───────────────────────────────────────────────────
    const { data: uploads } = await supabase
      .from('portfolio_uploads')
      .select('id, file_name, file_path, file_type, attendance_date, lesson_id, kid_id')
      .eq('organization_id', organizationId)
      .order('attendance_date', { ascending: false })

    if (!uploads || uploads.length === 0) {
      setPortfolioItems([])
      return
    }

    const kidMap: Record<string, string> = {}
    for (const k of kids) kidMap[k.id] = k.displayname

    const lessonIds = [...new Set(uploads.map((u: any) => u.lesson_id).filter(Boolean))] as string[]
    let lessonMap: Record<string, { subject: string; title: string }> = {}
    if (lessonIds.length > 0) {
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title, subject')
        .in('id', lessonIds)
      if (lessons) {
        lessonMap = Object.fromEntries(lessons.map((l: any) => [l.id, { title: l.title, subject: l.subject }]))
      }
    }

    const enriched: RpPortfolioItem[] = await Promise.all(
      uploads.map(async (u: any) => {
        const { data: signed } = await supabase.storage
          .from('portfolio-uploads')
          .createSignedUrl(u.file_path, 3600)
        const lesson = u.lesson_id ? lessonMap[u.lesson_id] : null
        return {
          id: u.id,
          file_name: u.file_name,
          file_type: u.file_type,
          attendance_date: u.attendance_date,
          subject: lesson?.subject ?? null,
          lesson_title: lesson?.title ?? null,
          kid_name: kidMap[u.kid_id] ?? 'Unknown',
          signedUrl: signed?.signedUrl ?? null,
        }
      })
    )

    setPortfolioItems(enriched)
    // Auto-select all only on first load — don't override user's selections on re-renders
    if (!portfolioLoadedRef.current) {
      setSelectedIds(new Set(enriched.map(i => i.id)))
      portfolioLoadedRef.current = true
    }
  }, [organizationId, kids, settings, settingsLoading, getTemplate])

  useEffect(() => {
    if (!loading && !settingsLoading) loadRecords()
  }, [loading, settingsLoading, loadRecords])

  // ── Selection helpers ─────────────────────────────────────────────────────

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(portfolioItems.map(i => i.id)))
  const deselectAll = () => setSelectedIds(new Set())

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!settings) { setError('Compliance settings not configured. Go to Compliance to set up your state.'); return }
    setGenerating(true)
    setError(null)
    try {
      const { generateReviewPackage } = await import('@/src/utils/generateReviewPackage')
      const familyHealthScore = complianceData.length > 0
        ? Math.round(complianceData.reduce((s, d) => s + d.healthScore, 0) / complianceData.length)
        : 0

      await generateReviewPackage({
        complianceData,
        settings: {
          state_code: settings.state_code,
          school_year_start_date: settings.school_year_start_date,
          school_year_end_date: settings.school_year_end_date,
        },
        familyHealthScore,
        organizationName: orgName,
        parentName,
        attendanceRecords,
        subjectHours,
        selectedPortfolioItems: portfolioItems.filter(i => selectedIds.has(i.id)),
      })
    } catch (e) {
      console.error(e)
      setError('Failed to generate the package. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const isLoading = loading || settingsLoading
  const schoolDays = attendanceRecords.filter(r => r.status !== 'no_school').length
  const familyHealthScore = complianceData.length > 0
    ? Math.round(complianceData.reduce((s, d) => s + d.healthScore, 0) / complianceData.length)
    : 0

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBackground }}>
        <div style={{ color: colors.purple, fontWeight: 700, fontSize: 16 }}>Loading…</div>
      </div>
    )
  }

  const healthColor = familyHealthScore >= 80 ? '#16a34a' : familyHealthScore >= 60 ? '#ca8a04' : '#dc2626'
  const healthBg = familyHealthScore >= 80 ? '#f0fdf4' : familyHealthScore >= 60 ? '#fefce8' : '#fef2f2'
  const healthBorder = familyHealthScore >= 80 ? '#bbf7d0' : familyHealthScore >= 60 ? '#fef08a' : '#fecaca'

  return (
    <div className="hr-page" style={{ paddingBottom: 100, fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 0' }}>

        {/* Intro */}
        <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(255,255,255,0.08)', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 700, lineHeight: 1.6 }}>
            Build a ready-to-submit review package for your portfolio evaluator or district reviewer.
            Attendance &amp; compliance are included automatically — choose which portfolio work samples to add.
          </div>
        </div>

        {/* ── AUTO-INCLUDED SECTION ── */}
        <div className="hr-section-label" style={{ marginBottom: 10 }}>Auto-Included</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>

          {/* Attendance */}
          <div className="hr-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #dbeafe, #ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={20} color="#6366f1" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>Attendance Log</div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                {schoolDays} school days logged this year
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 10px', borderRadius: 20 }}>
              ✓ Included
            </div>
          </div>

          {/* Compliance */}
          <div className="hr-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #dbeafe, #ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={20} color="#6366f1" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>Compliance Report</div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                {settings?.state_code || 'Custom'} requirements · {complianceData.length} student{complianceData.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{
              fontSize: 12, fontWeight: 800, color: healthColor,
              background: healthBg, border: `1.5px solid ${healthBorder}`,
              padding: '3px 10px', borderRadius: 20,
            }}>
              {familyHealthScore}%
            </div>
          </div>

          {/* Executive summary note */}
          <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1.5px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 700, lineHeight: 1.5 }}>
              📋 An <strong style={{ color: '#fff' }}>Executive Summary</strong> is automatically generated as the first section — giving your reviewer a high-level overview before they dive into the detail logs.
            </div>
          </div>
        </div>

        {/* ── PORTFOLIO SELECTOR ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="hr-section-label">Portfolio Work Samples</div>
          {portfolioItems.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={selectAll}
                style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {portfolioItems.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 14, border: '1.5px dashed rgba(255,255,255,0.15)', marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗂️</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 6 }}>No portfolio items yet</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600, lineHeight: 1.6 }}>
              Upload work samples from the Check-In tab inside any lesson.
              Your package will still include attendance &amp; compliance.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 2 }}>
              {selectedIds.size} of {portfolioItems.length} items selected
            </div>

            {portfolioItems.map(item => {
              const checked = selectedIds.has(item.id)
              const isImg = item.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file_name)

              return (
                <div
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 14, cursor: 'pointer',
                    background: checked ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)',
                    border: `2px solid ${checked ? '#7c3aed' : 'rgba(124,58,237,0.15)'}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Checkbox */}
                  <div style={{ flexShrink: 0 }}>
                    {checked
                      ? <CheckSquare size={20} color="#7c3aed" />
                      : <Square size={20} color="#9ca3af" />
                    }
                  </div>

                  {/* Thumbnail or icon */}
                  {item.signedUrl && isImg ? (
                    <div style={{
                      width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                      backgroundImage: `url(${item.signedUrl})`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      border: '1.5px solid rgba(124,58,237,0.15)',
                    }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isImg ? <ImageIcon size={22} color="#7c3aed" /> : <FileText size={22} color="#7c3aed" />}
                    </div>
                  )}

                  {/* Meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.file_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>📅 {new Date(item.attendance_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {item.subject && <span>· 📚 {item.subject}</span>}
                      <span style={{ color: '#a78bfa' }}>· {item.kid_name}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ERROR ── */}
        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── GENERATE BUTTON ── */}
        <div style={{ position: 'sticky', bottom: 20, zIndex: 10 }}>
          <button
            onClick={handleGenerate}
            disabled={generating || complianceData.length === 0}
            style={{
              width: '100%', padding: '16px 20px',
              borderRadius: 16, border: 'none',
              background: (generating || complianceData.length === 0)
                ? '#c4b5fd'
                : 'linear-gradient(135deg, #6366f1, #7c3aed)',
              color: '#fff', fontSize: 15, fontWeight: 900,
              cursor: (generating || complianceData.length === 0) ? 'not-allowed' : 'pointer',
              fontFamily: "'Nunito', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
            }}
          >
            <Download size={20} />
            {generating
              ? 'Building Package…'
              : `Download Review Package${selectedIds.size > 0 ? ` · ${selectedIds.size} work sample${selectedIds.size !== 1 ? 's' : ''}` : ''}`
            }
          </button>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            PDF includes cover page, executive summary, attendance log, compliance details
            {selectedIds.size > 0 ? `, and ${selectedIds.size} portfolio item${selectedIds.size !== 1 ? 's' : ''}` : ''}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ReviewPackagePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: colors.pageBackground }} />}>
        <ReviewPackageContent />
      </Suspense>
    </AuthGuard>
  )
}
