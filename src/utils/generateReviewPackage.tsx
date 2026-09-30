import { pdf } from '@react-pdf/renderer'
import { ReviewPackagePDF } from '@/src/components/ReviewPackagePDF'
import type { ReviewPackagePDFProps } from '@/src/components/ReviewPackagePDF'

export type { ReviewPackagePDFProps }

export async function generateReviewPackage(options: ReviewPackagePDFProps): Promise<void> {
  const blob = await pdf(<ReviewPackagePDF {...options} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const dateStr = new Date().toISOString().split('T')[0]
  const stateCode = options.settings.state_code || 'Custom'
  link.download = `Review_Package_${stateCode}_${dateStr}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
