import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// TypeScript interfaces matching your data structure
interface Kid {
  id: string
  displayname: string
  firstname: string
  lastname: string
  photo_url?: string
  grade?: string
  age?: number
}

interface KidComplianceData {
  kid: Kid
  totalHours: number
  totalDays: number
  healthScore: number
  requiredHours: number
  requiredDays: number
  hoursRemaining: number
  daysRemaining: number
  onTrack: boolean
}

interface ComplianceSettings {
  state_code?: string
  school_year_start_date: string
  school_year_end_date: string
  required_annual_hours?: number
  required_annual_days?: number
}

interface ComplianceReportPDFProps {
  complianceData: KidComplianceData[]
  settings: ComplianceSettings
  familyHealthScore: number
  organizationName?: string
  parentName?: string
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  familyHealthCard: {
    backgroundColor: '#fef2f2',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  familyHealthCardGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  familyHealthCardYellow: {
    backgroundColor: '#fefce8',
    borderColor: '#fef08a',
  },
  familyHealthScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  familyHealthScoreGreen: {
    color: '#16a34a',
  },
  familyHealthScoreYellow: {
    color: '#ca8a04',
  },
  healthStatus: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: 'bold',
  },
  healthStatusGreen: {
    color: '#15803d',
  },
  healthStatusYellow: {
    color: '#a16207',
  },
  studentsOnTrack: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
  },
  studentCard: {
    backgroundColor: '#f8fafc',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  studentGrade: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  studentHealthScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  studentHealthScoreGreen: {
    color: '#16a34a',
  },
  studentHealthScoreYellow: {
    color: '#ca8a04',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricBox: {
    flex: 1,
    marginRight: 10,
  },
  metricLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  metricProgress: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  progressFillGreen: {
    backgroundColor: '#16a34a',
  },
  progressFillYellow: {
    backgroundColor: '#ca8a04',
  },
  progressFillRed: {
    backgroundColor: '#dc2626',
  },
  statusBadge: {
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statusBadgeRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTextGreen: {
    color: '#15803d',
  },
  statusTextRed: {
    color: '#991b1b',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    fontSize: 9,
    color: '#64748b',
  },
  footerText: {
    marginBottom: 4,
  },
  disclaimer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  disclaimerText: {
    fontSize: 9,
    color: '#92400e',
    lineHeight: 1.4,
  },
  warningBox: {
    backgroundColor: '#fef2f2',
    padding: 10,
    marginTop: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  warningText: {
    fontSize: 10,
    color: '#991b1b',
    fontWeight: 'bold',
  },
})

// Helper function to determine health status
const getHealthStatus = (score: number) => {
  if (score >= 80) return { text: '✓ Excellent', color: 'green' }
  if (score >= 60) return { text: '⚠ On Track', color: 'yellow' }
  return { text: '✕ Needs Attention', color: 'red' }
}

// Helper function to calculate progress percentage
const getProgressPercentage = (completed: number, required: number): number => {
  if (required === 0) return 100
  return Math.min((completed / required) * 100, 100)
}

export const ComplianceReportPDF: React.FC<ComplianceReportPDFProps> = ({ 
  complianceData, 
  settings,
  familyHealthScore,
  organizationName = 'HomeschoolHQ Family',
  parentName = 'Parent'
}) => {
  const familyHealthStatus = getHealthStatus(familyHealthScore)
  const generatedDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Homeschool Compliance Report</Text>
          <Text style={styles.subtitle}>{organizationName} • {parentName}</Text>
          <Text style={styles.subtitle}>
            {settings.state_code ? `${settings.state_code} Requirements` : 'Custom Requirements'} • 
            {' '}{formatDate(settings.school_year_start_date)} - {formatDate(settings.school_year_end_date)}
          </Text>
          <Text style={styles.subtitle}>Generated: {generatedDate}</Text>
        </View>

       {/* Family Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Family Compliance Health</Text>
            <View style={
              familyHealthStatus.color === 'green' 
                ? [styles.familyHealthCard, styles.familyHealthCardGreen]
                : familyHealthStatus.color === 'yellow'
                ? [styles.familyHealthCard, styles.familyHealthCardYellow]
                : styles.familyHealthCard
            }>
              <Text style={
                familyHealthStatus.color === 'green'
                  ? [styles.familyHealthScore, styles.familyHealthScoreGreen]
                  : familyHealthStatus.color === 'yellow'
                  ? [styles.familyHealthScore, styles.familyHealthScoreYellow]
                  : styles.familyHealthScore
              }>
                {familyHealthScore}%
              </Text>
              <Text style={
                familyHealthStatus.color === 'green'
                  ? [styles.healthStatus, styles.healthStatusGreen]
                  : familyHealthStatus.color === 'yellow'
                  ? [styles.healthStatus, styles.healthStatusYellow]
                  : styles.healthStatus
              }>
                {familyHealthStatus.text}
              </Text>
              <Text style={styles.studentsOnTrack}>
                {complianceData.filter(d => d.onTrack).length} of {complianceData.length} students on track
              </Text>
              {familyHealthScore < 60 && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠ Action Required: One or more students are behind pace
                  </Text>
                </View>
              )}
            </View>
          </View>

        {/* Individual Student Reports */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Individual Student Progress</Text>
          {complianceData.map((data) => {
            const studentHealthStatus = getHealthStatus(data.healthScore)
            const daysProgress = getProgressPercentage(data.totalDays, data.requiredDays)
            const hoursProgress = getProgressPercentage(data.totalHours, data.requiredHours)

            return (
              <View key={data.kid.id} style={styles.studentCard} wrap={false}>
                {/* Student Header */}
                <View style={styles.studentHeader}>
                  <View>
                    <Text style={styles.studentName}>{data.kid.displayname}</Text>
                    {data.kid.grade && (
                      <Text style={styles.studentGrade}>Grade {data.kid.grade}</Text>
                    )}
                  </View>
                  <Text style={
                    studentHealthStatus.color === 'green'
                      ? [styles.studentHealthScore, styles.studentHealthScoreGreen]
                      : studentHealthStatus.color === 'yellow'
                      ? [styles.studentHealthScore, styles.studentHealthScoreYellow]
                      : styles.studentHealthScore
                  }>
                    {data.healthScore}%
                  </Text>
                </View>

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                  {/* School Days */}
                  {data.requiredDays > 0 && (
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>School Days</Text>
                      <Text style={styles.metricValue}>
                        {data.totalDays} / {data.requiredDays}
                      </Text>
                      <Text style={styles.metricProgress}>
                        {data.daysRemaining} days remaining
                      </Text>
                      <View style={
                      daysProgress >= 80
                        ? [styles.progressFill, styles.progressFillGreen, { width: `${daysProgress}%` }]
                        : daysProgress >= 60
                        ? [styles.progressFill, styles.progressFillYellow, { width: `${daysProgress}%` }]
                        : [styles.progressFill, styles.progressFillRed, { width: `${daysProgress}%` }]
                    } />
                    </View>
                  )}

                  {/* Instructional Hours */}
                  {data.requiredHours > 0 && (
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>Instructional Hours</Text>
                      <Text style={styles.metricValue}>
                        {data.totalHours} / {data.requiredHours}
                      </Text>
                      <Text style={styles.metricProgress}>
                        {data.hoursRemaining} hours remaining
                      </Text>
                      <View style={styles.progressBar}>
                      <View style={
                        hoursProgress >= 80
                          ? [styles.progressFill, styles.progressFillGreen, { width: `${hoursProgress}%` }]
                          : hoursProgress >= 60
                          ? [styles.progressFill, styles.progressFillYellow, { width: `${hoursProgress}%` }]
                          : [styles.progressFill, styles.progressFillRed, { width: `${hoursProgress}%` }]
                      } />
                      </View>
                    </View>
                  )}
                </View>

                {/* Status Badge */}
                <View style={data.onTrack ? [styles.statusBadge, styles.statusBadgeGreen] : [styles.statusBadge, styles.statusBadgeRed]}>
                  <Text style={data.onTrack ? [styles.statusText, styles.statusTextGreen] : [styles.statusText, styles.statusTextRed]}>
                    {data.onTrack ? '✓ ON TRACK' : '⚠ BEHIND PACE'}
                  </Text>
                </View>
             </View>
            )
          })}
        </View>

        {/* Legal Disclaimer */}
        <View style={styles.disclaimer} wrap={false}>
          <Text style={styles.disclaimerText}>
            LEGAL DISCLAIMER: This report is generated by HomeschoolHQ based on data entered by the user. 
            While we strive for accuracy, this software does not constitute legal advice. Parents/guardians 
            are responsible for verifying that they meet their state's homeschooling requirements. Please 
            consult your state's department of education or a legal professional for official guidance. 
            HomeschoolHQ is not liable for compliance issues resulting from use of this software.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated by HomeschoolHQ • www.homeschoolhq.app
          </Text>
          <Text style={styles.footerText}>
            For questions or support, contact support@homeschoolhq.app
          </Text>
        </View>
      </Page>
    </Document>
  )
}