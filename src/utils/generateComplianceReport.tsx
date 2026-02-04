import { pdf } from '@react-pdf/renderer'
import { ComplianceReportPDF } from '@/src/components/ComplianceReportPDF'

// Type definitions
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

interface GenerateReportOptions {
  complianceData: KidComplianceData[]
  settings: ComplianceSettings
  familyHealthScore: number
  organizationName?: string
  parentName?: string
}

/**
 * Generates and downloads a compliance report PDF
 * 
 * @param options - The data needed to generate the report
 * @returns Promise that resolves when download starts
 * 
 * @example
 * ```tsx
 * const handleExportReport = async () => {
 *   try {
 *     await generateComplianceReport({
 *       complianceData,
 *       settings,
 *       familyHealthScore,
 *       organizationName: 'Smith Family',
 *       parentName: 'John Smith'
 *     })
 *     alert('Report downloaded successfully!')
 *   } catch (error) {
 *     console.error('Failed to generate report:', error)
 *     alert('Failed to generate report. Please try again.')
 *   }
 * }
 * ```
 */
export async function generateComplianceReport(options: GenerateReportOptions): Promise<void> {
  const {
    complianceData,
    settings,
    familyHealthScore,
    organizationName = 'HomeschoolHQ Family',
    parentName = 'Parent'
  } = options

  try {
    // Generate the PDF document
    const blob = await pdf(
      <ComplianceReportPDF
        complianceData={complianceData}
        settings={settings}
        familyHealthScore={familyHealthScore}
        organizationName={organizationName}
        parentName={parentName}
      />
    ).toBlob()

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0]
    const stateCode = settings.state_code || 'Custom'
    link.download = `Compliance_Report_${stateCode}_${dateStr}.pdf`
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate compliance report')
  }
}

/**
 * Generates and returns the PDF as a blob (for uploading to storage, etc.)
 * 
 * @param options - The data needed to generate the report
 * @returns Promise that resolves with the PDF blob
 */
export async function generateComplianceReportBlob(options: GenerateReportOptions): Promise<Blob> {
  const {
    complianceData,
    settings,
    familyHealthScore,
    organizationName = 'HomeschoolHQ Family',
    parentName = 'Parent'
  } = options

  try {
    const blob = await pdf(
      <ComplianceReportPDF
        complianceData={complianceData}
        settings={settings}
        familyHealthScore={familyHealthScore}
        organizationName={organizationName}
        parentName={parentName}
      />
    ).toBlob()

    return blob
  } catch (error) {
    console.error('Error generating PDF blob:', error)
    throw new Error('Failed to generate compliance report blob')
  }
}