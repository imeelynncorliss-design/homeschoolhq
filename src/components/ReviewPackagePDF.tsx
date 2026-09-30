import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RpKid {
  id: string
  displayname: string
  firstname: string
  grade?: string
}

export interface RpKidCompliance {
  kid: RpKid
  totalHours: number
  totalDays: number
  healthScore: number
  requiredHours: number
  requiredDays: number
  hoursRemaining: number
  daysRemaining: number
  onTrack: boolean
}

export interface RpAttendanceRecord {
  attendance_date: string   // 'YYYY-MM-DD'
  hours: number
  status: string            // 'present' | 'no_school' | etc.
}

export interface RpSubjectHours {
  subject: string
  hours: number
}

export interface RpPortfolioItem {
  id: string
  file_name: string
  file_type: string | null
  attendance_date: string
  subject: string | null
  lesson_title: string | null
  kid_name: string
  signedUrl: string | null
}

export interface ReviewPackagePDFProps {
  complianceData: RpKidCompliance[]
  settings: {
    state_code?: string
    school_year_start_date: string
    school_year_end_date: string
  }
  familyHealthScore: number
  organizationName: string
  parentName: string
  attendanceRecords: RpAttendanceRecord[]
  subjectHours: RpSubjectHours[]
  selectedPortfolioItems: RpPortfolioItem[]
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { padding: 44, fontFamily: 'Helvetica', fontSize: 10, backgroundColor: '#fff', color: '#1e293b' },
  pageCover: { padding: 0, fontFamily: 'Helvetica', backgroundColor: '#3d3a52', color: '#fff' },

  // Cover
  coverBand: { backgroundColor: '#6366f1', padding: '40px 44px 32px' },
  coverTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  coverSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  coverBody: { padding: '36px 44px', flex: 1 },
  coverMetaRow: { flexDirection: 'row', marginBottom: 12 },
  coverMetaLabel: { fontSize: 9, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.5, width: 110 },
  coverMetaValue: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  coverListItem: { fontSize: 11, color: '#fff', fontWeight: 'bold', marginBottom: 5 },
  coverDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)', marginVertical: 20 },
  coverNote: { fontSize: 9, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 },

  // Section header
  sectionBanner: { backgroundColor: '#6366f1', padding: '8px 12px', marginBottom: 14, borderRadius: 4 },
  sectionBannerText: { fontSize: 11, fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b', marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1.5, borderBottomColor: '#6366f1' },

  // Executive summary
  execCard: { backgroundColor: '#f8fafc', borderRadius: 6, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  execCardGreen: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  execCardYellow: { backgroundColor: '#fefce8', borderColor: '#fef08a' },
  execCardRed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  execScore: { fontSize: 34, fontWeight: 'bold', color: '#dc2626' },
  execScoreGreen: { color: '#16a34a' },
  execScoreYellow: { color: '#ca8a04' },
  execScoreLabel: { fontSize: 10, color: '#64748b', marginTop: 2 },

  // Metrics grid
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metricBox: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  metricLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  metricSub: { fontSize: 8, color: '#94a3b8', marginTop: 2 },

  // Status badge
  badge: { paddingVertical: 3, paddingHorizontal: 7, borderRadius: 4, alignSelf: 'flex-start' },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeYellow: { backgroundColor: '#fef9c3' },
  badgeTextGreen: { fontSize: 8, fontWeight: 'bold', color: '#15803d' },
  badgeTextRed: { fontSize: 8, fontWeight: 'bold', color: '#dc2626' },
  badgeTextYellow: { fontSize: 8, fontWeight: 'bold', color: '#a16207' },

  // Student row in exec summary
  studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  studentRowHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1.5, borderBottomColor: '#e2e8f0', marginBottom: 2 },
  colName: { flex: 2, fontSize: 9, color: '#1e293b' },
  colGrade: { flex: 1, fontSize: 9, color: '#64748b' },
  colDays: { flex: 1, fontSize: 9, color: '#1e293b' },
  colHours: { flex: 1, fontSize: 9, color: '#1e293b' },
  colStatus: { flex: 1.5, fontSize: 9 },
  headerText: { fontSize: 8, fontWeight: 'bold', color: '#64748b', letterSpacing: 0.3 },

  // Subject chips
  subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  subjectChip: { backgroundColor: '#ede9fe', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 },
  subjectChipText: { fontSize: 8, color: '#6d28d9', fontWeight: 'bold' },

  // Attendance table
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1.5, borderBottomColor: '#cbd5e1' },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableRowAlt: { backgroundColor: '#fafafa' },
  tColDate: { flex: 2, fontSize: 9 },
  tColDay: { flex: 1, fontSize: 9 },
  tColHours: { flex: 1, fontSize: 9, textAlign: 'center' },
  tColStatus: { flex: 1.5, fontSize: 9, textAlign: 'right' },
  tHeaderText: { fontSize: 8, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Month header
  monthHeader: { backgroundColor: '#ede9fe', padding: '5px 8px', marginBottom: 2, marginTop: 8 },
  monthHeaderText: { fontSize: 9, fontWeight: 'bold', color: '#4c1d95' },

  // Portfolio items
  portfolioItem: { flexDirection: 'row', gap: 10, padding: 10, marginBottom: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  portfolioThumb: { width: 60, height: 60, borderRadius: 4, backgroundColor: '#e2e8f0' },
  portfolioMeta: { flex: 1 },
  portfolioFilename: { fontSize: 10, fontWeight: 'bold', color: '#1e293b', marginBottom: 3 },
  portfolioDetail: { fontSize: 8, color: '#64748b', marginBottom: 2 },

  // Footer
  footer: { position: 'absolute', bottom: 24, left: 44, right: 44, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  footerText: { fontSize: 8, color: '#94a3b8' },

  // Disclaimer
  disclaimer: { marginTop: 16, padding: 10, backgroundColor: '#fef3c7', borderRadius: 5, borderWidth: 1, borderColor: '#fbbf24' },
  disclaimerText: { fontSize: 8, color: '#92400e', lineHeight: 1.5 },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtShort(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function dayOfWeek(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

function monthYear(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function healthColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 60) return 'yellow'
  return 'red'
}

function healthLabel(score: number) {
  if (score >= 80) return '✓ Excellent — Meeting All Requirements'
  if (score >= 60) return '⚠ On Track — Monitoring Recommended'
  return '✕ Needs Attention — Behind Required Pace'
}

function isImage(fileType: string | null, fileName: string) {
  if (fileType?.startsWith('image/')) return true
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function CoverPage({ props }: { props: ReviewPackagePDFProps }) {
  const { settings, organizationName, parentName, complianceData, selectedPortfolioItems } = props
  const generatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Page size="A4" style={s.pageCover}>
      <View style={s.coverBand}>
        <Text style={s.coverTitle}>Homeschool Review Package</Text>
        <Text style={s.coverSubtitle}>Prepared for Certified Portfolio Review</Text>
      </View>
      <View style={s.coverBody}>
        <View style={s.coverMetaRow}>
          <Text style={s.coverMetaLabel}>Family</Text>
          <Text style={s.coverMetaValue}>{organizationName}</Text>
        </View>
        <View style={s.coverMetaRow}>
          <Text style={s.coverMetaLabel}>Prepared By</Text>
          <Text style={s.coverMetaValue}>{parentName}</Text>
        </View>
        <View style={s.coverMetaRow}>
          <Text style={s.coverMetaLabel}>State</Text>
          <Text style={s.coverMetaValue}>{settings.state_code || 'Not specified'}</Text>
        </View>
        <View style={s.coverMetaRow}>
          <Text style={s.coverMetaLabel}>School Year</Text>
          <Text style={s.coverMetaValue}>{fmt(settings.school_year_start_date)} – {fmt(settings.school_year_end_date)}</Text>
        </View>
        <View style={s.coverMetaRow}>
          <Text style={s.coverMetaLabel}>Students</Text>
          <Text style={s.coverMetaValue}>{complianceData.map(d => d.kid.displayname).join(', ')}</Text>
        </View>
        <View style={s.coverDivider} />
        <View style={s.coverMetaRow}>
          <Text style={s.coverMetaLabel}>Contents</Text>
          <View>
            <Text style={s.coverListItem}>1. Executive Summary</Text>
            <Text style={s.coverListItem}>2. Attendance Log</Text>
            <Text style={s.coverListItem}>3. Compliance Details</Text>
            {selectedPortfolioItems.length > 0 && (
              <Text style={s.coverListItem}>4. Portfolio Work Samples ({selectedPortfolioItems.length} items)</Text>
            )}
          </View>
        </View>
        <View style={s.coverDivider} />
        <Text style={s.coverMetaLabel}>Generated</Text>
        <Text style={[s.coverMetaValue, { marginTop: 4 }]}>{generatedDate}</Text>
        <View style={{ marginTop: 24 }}>
          <Text style={s.coverNote}>
            This document was prepared using HomeschoolReady (app.homeschoolready.app).
            All records are based on data entered by the parent/guardian.
            Please verify state-specific requirements with your state department of education before submission.
          </Text>
        </View>
      </View>
    </Page>
  )
}

// ─── Executive Summary Page ───────────────────────────────────────────────────

function ExecutiveSummaryPage({ props }: { props: ReviewPackagePDFProps }) {
  const { complianceData, familyHealthScore, settings, subjectHours, selectedPortfolioItems, attendanceRecords } = props
  const color = healthColor(familyHealthScore)
  const totalSchoolDays = attendanceRecords.filter(r => r.status !== 'no_school').length
  const totalHoursAll = attendanceRecords.reduce((sum, r) => sum + (r.hours || 0), 0)

  const cardStyle = color === 'green' ? [s.execCard, s.execCardGreen] : color === 'yellow' ? [s.execCard, s.execCardYellow] : [s.execCard, s.execCardRed]
  const scoreStyle = color === 'green' ? [s.execScore, s.execScoreGreen] : color === 'yellow' ? [s.execScore, s.execScoreYellow] : s.execScore

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionBanner}>
        <Text style={s.sectionBannerText}>Executive Summary</Text>
      </View>

      {/* Overall health */}
      <View style={cardStyle}>
        <Text style={scoreStyle}>{familyHealthScore}%</Text>
        <Text style={s.execScoreLabel}>{healthLabel(familyHealthScore)}</Text>
      </View>

      {/* Aggregate metrics */}
      <View style={s.metricsRow}>
        <View style={s.metricBox}>
          <Text style={s.metricLabel}>Total School Days</Text>
          <Text style={s.metricValue}>{totalSchoolDays}</Text>
          <Text style={s.metricSub}>Logged this school year</Text>
        </View>
        <View style={s.metricBox}>
          <Text style={s.metricLabel}>Total Instructional Hours</Text>
          <Text style={s.metricValue}>{Math.round(totalHoursAll * 10) / 10}</Text>
          <Text style={s.metricSub}>Across all students</Text>
        </View>
        <View style={s.metricBox}>
          <Text style={s.metricLabel}>Subjects Covered</Text>
          <Text style={s.metricValue}>{subjectHours.length}</Text>
          <Text style={s.metricSub}>Distinct subject areas</Text>
        </View>
        <View style={s.metricBox}>
          <Text style={s.metricLabel}>Work Samples</Text>
          <Text style={s.metricValue}>{selectedPortfolioItems.length}</Text>
          <Text style={s.metricSub}>Included in this package</Text>
        </View>
      </View>

      {/* Per-student table */}
      <Text style={s.sectionTitle}>Student Progress Overview</Text>
      <View style={s.studentRowHeader}>
        <Text style={[s.colName, s.headerText]}>Student</Text>
        <Text style={[s.colGrade, s.headerText]}>Grade</Text>
        <Text style={[s.colDays, s.headerText]}>Days</Text>
        <Text style={[s.colHours, s.headerText]}>Hours</Text>
        <Text style={[s.colStatus, s.headerText]}>Status</Text>
      </View>
      {complianceData.map(d => {
        const sc = healthColor(d.healthScore)
        return (
          <View key={d.kid.id} style={s.studentRow}>
            <Text style={[s.colName, { fontWeight: 'bold' }]}>{d.kid.displayname}</Text>
            <Text style={s.colGrade}>{d.kid.grade ? `Grade ${d.kid.grade}` : '—'}</Text>
            <Text style={s.colDays}>
              {d.totalDays}{d.requiredDays > 0 ? ` / ${d.requiredDays}` : ''}
            </Text>
            <Text style={s.colHours}>
              {d.totalHours}{d.requiredHours > 0 ? ` / ${d.requiredHours}` : ''}
            </Text>
            <Text style={[s.colStatus, {
              color: sc === 'green' ? '#15803d' : sc === 'yellow' ? '#a16207' : '#dc2626',
              fontWeight: 'bold',
            }]}>
              {d.onTrack ? '✓ On Track' : '⚠ Behind'}
            </Text>
          </View>
        )
      })}

      {/* Subjects covered */}
      {subjectHours.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={s.sectionTitle}>Subject Areas Covered</Text>
          <View style={s.subjectRow}>
            {subjectHours.map(sh => (
              <View key={sh.subject} style={s.subjectChip}>
                <Text style={s.subjectChipText}>{sh.subject} ({Math.round(sh.hours * 10) / 10}h)</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* School year dates */}
      <View style={{ marginTop: 16 }}>
        <Text style={s.sectionTitle}>School Year Period</Text>
        <Text style={{ fontSize: 10, color: '#475569' }}>
          {fmt(settings.school_year_start_date)} through {fmt(settings.school_year_end_date)}
          {settings.state_code ? `  ·  State: ${settings.state_code}` : ''}
        </Text>
      </View>

      <View style={s.footer} fixed>
        <Text style={s.footerText}>HomeschoolReady Review Package  ·  app.homeschoolready.app</Text>
      </View>
    </Page>
  )
}

// ─── Attendance Log Page(s) ───────────────────────────────────────────────────

function AttendancePages({ props }: { props: ReviewPackagePDFProps }) {
  const { attendanceRecords } = props

  const schoolDays = attendanceRecords
    .filter(r => r.status !== 'no_school')
    .sort((a, b) => a.attendance_date.localeCompare(b.attendance_date))

  // Group by month
  const byMonth: Record<string, typeof schoolDays> = {}
  for (const r of schoolDays) {
    const key = monthYear(r.attendance_date)
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(r)
  }

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionBanner}>
        <Text style={s.sectionBannerText}>Attendance Log  ·  {schoolDays.length} School Days</Text>
      </View>

      <View style={s.tableHeader}>
        <Text style={[s.tColDate, s.tHeaderText]}>Date</Text>
        <Text style={[s.tColDay, s.tHeaderText]}>Day</Text>
        <Text style={[s.tColHours, s.tHeaderText]}>Hours</Text>
        <Text style={[s.tColStatus, s.tHeaderText]}>Status</Text>
      </View>

      {Object.entries(byMonth).map(([month, records]) => (
        <View key={month}>
          <View style={s.monthHeader}>
            <Text style={s.monthHeaderText}>{month}  ({records.length} days)</Text>
          </View>
          {records.map((r, i) => (
            <View key={`${r.attendance_date}-${i}`} style={i % 2 === 1 ? [s.tableRow, s.tableRowAlt] : s.tableRow}>
              <Text style={s.tColDate}>{fmtShort(r.attendance_date)}</Text>
              <Text style={s.tColDay}>{dayOfWeek(r.attendance_date)}</Text>
              <Text style={s.tColHours}>{r.hours > 0 ? `${r.hours}h` : '—'}</Text>
              <Text style={[s.tColStatus, { color: '#16a34a' }]}>Present</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={s.footer} fixed>
        <Text style={s.footerText}>HomeschoolReady Review Package  ·  Attendance Log</Text>
      </View>
    </Page>
  )
}

// ─── Compliance Details Page ──────────────────────────────────────────────────

function ComplianceDetailsPage({ props }: { props: ReviewPackagePDFProps }) {
  const { complianceData, settings, familyHealthScore } = props

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionBanner}>
        <Text style={s.sectionBannerText}>Compliance Details</Text>
      </View>

      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 10, color: '#475569' }}>
          State: {settings.state_code || 'Custom'}  ·
          {' '}School Year: {fmt(settings.school_year_start_date)} – {fmt(settings.school_year_end_date)}  ·
          {' '}Overall Health: {familyHealthScore}%
        </Text>
      </View>

      {complianceData.map(d => {
        const daysProgress = d.requiredDays > 0 ? Math.min(100, (d.totalDays / d.requiredDays) * 100) : null
        const hoursProgress = d.requiredHours > 0 ? Math.min(100, (d.totalHours / d.requiredHours) * 100) : null
        const sc = healthColor(d.healthScore)

        return (
          <View key={d.kid.id} style={{ marginBottom: 16, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }} wrap={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1e293b' }}>{d.kid.displayname}</Text>
                {d.kid.grade && <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Grade {d.kid.grade}</Text>}
              </View>
              <View style={[s.badge, sc === 'green' ? s.badgeGreen : sc === 'yellow' ? s.badgeYellow : s.badgeRed]}>
                <Text style={[{ fontSize: 10, fontWeight: 'bold' }, sc === 'green' ? s.badgeTextGreen : sc === 'yellow' ? s.badgeTextYellow : s.badgeTextRed]}>
                  {d.healthScore}% {d.onTrack ? '✓ On Track' : '⚠ Behind Pace'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              {d.requiredDays > 0 && (
                <View style={{ flex: 1 }}>
                  <Text style={s.metricLabel}>School Days</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b' }}>{d.totalDays}</Text>
                  <Text style={{ fontSize: 8, color: '#64748b' }}>of {d.requiredDays} required</Text>
                  {daysProgress !== null && (
                    <View style={{ marginTop: 5 }}>
                      <View style={{ height: 6, backgroundColor: '#e2e8f0', borderRadius: 3 }}>
                        <View style={{ height: 6, backgroundColor: daysProgress >= 80 ? '#16a34a' : daysProgress >= 60 ? '#ca8a04' : '#dc2626', borderRadius: 3, width: `${daysProgress}%` }} />
                      </View>
                      <Text style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>{Math.round(daysProgress)}% complete</Text>
                    </View>
                  )}
                  {d.daysRemaining > 0 && <Text style={{ fontSize: 8, color: '#ea580c', marginTop: 3 }}>{d.daysRemaining} days remaining</Text>}
                </View>
              )}
              {d.requiredHours > 0 && (
                <View style={{ flex: 1 }}>
                  <Text style={s.metricLabel}>Instructional Hours</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b' }}>{d.totalHours}</Text>
                  <Text style={{ fontSize: 8, color: '#64748b' }}>of {d.requiredHours} required</Text>
                  {hoursProgress !== null && (
                    <View style={{ marginTop: 5 }}>
                      <View style={{ height: 6, backgroundColor: '#e2e8f0', borderRadius: 3 }}>
                        <View style={{ height: 6, backgroundColor: hoursProgress >= 80 ? '#16a34a' : hoursProgress >= 60 ? '#ca8a04' : '#dc2626', borderRadius: 3, width: `${hoursProgress}%` }} />
                      </View>
                      <Text style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>{Math.round(hoursProgress)}% complete</Text>
                    </View>
                  )}
                  {d.hoursRemaining > 0 && <Text style={{ fontSize: 8, color: '#ea580c', marginTop: 3 }}>{d.hoursRemaining} hours remaining</Text>}
                </View>
              )}
            </View>
          </View>
        )
      })}

      <View style={s.disclaimer}>
        <Text style={s.disclaimerText}>
          LEGAL DISCLAIMER: This report is generated by HomeschoolReady based on data entered by the user.
          This software does not constitute legal advice. Parents/guardians are responsible for verifying
          compliance with their state's homeschooling requirements. HomeschoolReady is not liable for
          compliance issues resulting from use of this software.
        </Text>
      </View>

      <View style={s.footer} fixed>
        <Text style={s.footerText}>HomeschoolReady Review Package  ·  Compliance Details</Text>
      </View>
    </Page>
  )
}

// ─── Portfolio Pages ──────────────────────────────────────────────────────────

function PortfolioPages({ props }: { props: ReviewPackagePDFProps }) {
  const { selectedPortfolioItems } = props
  if (selectedPortfolioItems.length === 0) return null

  // Group by kid
  const byKid: Record<string, RpPortfolioItem[]> = {}
  for (const item of selectedPortfolioItems) {
    if (!byKid[item.kid_name]) byKid[item.kid_name] = []
    byKid[item.kid_name].push(item)
  }

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionBanner}>
        <Text style={s.sectionBannerText}>Portfolio Work Samples  ·  {selectedPortfolioItems.length} Items</Text>
      </View>

      {Object.entries(byKid).map(([kidName, items]) => (
        <View key={kidName}>
          <Text style={[s.sectionTitle, { marginTop: 8 }]}>{kidName}</Text>
          {items.map(item => {
            const img = item.signedUrl && isImage(item.file_type, item.file_name)
            return (
              <View key={item.id} style={s.portfolioItem} wrap={false}>
                {img && item.signedUrl ? (
                  <Image src={item.signedUrl} style={s.portfolioThumb} />
                ) : (
                  <View style={[s.portfolioThumb, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 20 }}>📄</Text>
                  </View>
                )}
                <View style={s.portfolioMeta}>
                  <Text style={s.portfolioFilename}>{item.file_name}</Text>
                  <Text style={s.portfolioDetail}>📅 {fmtShort(item.attendance_date)}</Text>
                  {item.subject && <Text style={s.portfolioDetail}>📚 {item.subject}</Text>}
                  {item.lesson_title && <Text style={s.portfolioDetail}>📖 {item.lesson_title}</Text>}
                  <Text style={[s.portfolioDetail, { marginTop: 3, color: '#94a3b8' }]}>
                    {item.file_type || 'Document'}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      ))}

      <View style={s.footer} fixed>
        <Text style={s.footerText}>HomeschoolReady Review Package  ·  Portfolio Work Samples</Text>
      </View>
    </Page>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────

export const ReviewPackagePDF: React.FC<ReviewPackagePDFProps> = (props) => {
  return (
    <Document>
      <CoverPage props={props} />
      <ExecutiveSummaryPage props={props} />
      <AttendancePages props={props} />
      <ComplianceDetailsPage props={props} />
      {props.selectedPortfolioItems.length > 0 && <PortfolioPages props={props} />}
    </Document>
  )
}
