'use client'

import { useState } from 'react'

interface DayData {
  date: string
  isSchoolDay: boolean
  totalHours: number
  status?: 'full_day' | 'half_day' | 'no_school'
  notes?: string
}

interface PDFExportProps {
  days: DayData[]
  totalDays: number
  totalHours: number
  requiredDays: number
  organizationName?: string
  studentNames?: string[]
  schoolYear?: string
  state?: string
}

export default function PDFExport({
  days,
  totalDays,
  totalHours,
  requiredDays,
  organizationName = 'My Homeschool',
  studentNames = [],
  schoolYear,
  state
}: PDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [includeDetails, setIncludeDetails] = useState(true)
  const [includeMonthly, setIncludeMonthly] = useState(true)
  const [includeNotes, setIncludeNotes] = useState(true)

  async function generatePDF() {
    setIsGenerating(true)
    
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      
      const doc = new jsPDF()
      let yPos = 20

      // Header
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Attendance Report', 105, yPos, { align: 'center' })
      
      yPos += 10
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(organizationName, 105, yPos, { align: 'center' })
      
      if (schoolYear) {
        yPos += 6
        doc.setFontSize(10)
        doc.text(`School Year: ${schoolYear}`, 105, yPos, { align: 'center' })
      }

      yPos += 15

      // Student Names
      if (studentNames.length > 0) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Student(s):', 20, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(studentNames.join(', '), 50, yPos)
        yPos += 8
      }

      // Date Range
      if (days.length > 0) {
        const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date))
        const startDate = new Date(sortedDays[0].date).toLocaleDateString('en-US')
        const endDate = new Date(sortedDays[sortedDays.length - 1].date).toLocaleDateString('en-US')
        
        doc.text('Date Range:', 20, yPos)
        doc.text(`${startDate} - ${endDate}`, 50, yPos)
        yPos += 8
      }

      // State
      if (state) {
        doc.text('State:', 20, yPos)
        doc.text(state, 50, yPos)
        yPos += 8
      }

      doc.text('Generated:', 20, yPos)
      doc.text(new Date().toLocaleDateString('en-US'), 50, yPos)
      yPos += 15

      // Summary Section
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary', 20, yPos)
      yPos += 8

      const summaryData = [
        ['Total School Days', `${totalDays} days`],
        ['Required Days', `${requiredDays} days`],
        ['Completion', `${Math.round((totalDays / requiredDays) * 100)}%`],
        ['Total Hours', `${totalHours.toFixed(1)} hours`],
        ['Average Hours/Day', `${totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0'} hours`]
      ]

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 20, right: 20 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 },
          1: { cellWidth: 'auto' }
        }
      })

      yPos = (doc as any).lastAutoTable.finalY + 15

      // Monthly Breakdown
      if (includeMonthly) {
        // Check if new page needed
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Monthly Breakdown', 20, yPos)
        yPos += 8

        // Group by month
        const monthlyData: { [key: string]: DayData[] } = {}
        days.forEach(day => {
          const date = new Date(day.date)
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (!monthlyData[key]) monthlyData[key] = []
          monthlyData[key].push(day)
        })

        const monthlyRows = Object.keys(monthlyData)
          .sort((a, b) => a.localeCompare(b))
          .map(key => {
            const [year, month] = key.split('-')
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
            const monthDays = monthlyData[key].filter(d => d.isSchoolDay)
            const monthHours = monthDays.reduce((sum, d) => sum + d.totalHours, 0)
            
            return [
              monthName,
              `${monthDays.length} days`,
              `${monthHours.toFixed(1)} hours`,
              monthDays.length > 0 ? `${(monthHours / monthDays.length).toFixed(1)} hours` : '0 hours'
            ]
          })

        autoTable(doc, {
          startY: yPos,
          head: [['Month', 'School Days', 'Total Hours', 'Avg Hours/Day']],
          body: monthlyRows,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: 20, right: 20 }
        })

        yPos = (doc as any).lastAutoTable.finalY + 15
      }

      // Detailed Day List
      if (includeDetails) {
        doc.addPage()
        yPos = 20

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Detailed Attendance Log', 20, yPos)
        yPos += 8

        const schoolDays = days.filter(d => d.isSchoolDay).sort((a, b) => a.date.localeCompare(b.date))
        
        const detailRows = schoolDays.map(day => {
          const date = new Date(day.date).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })
          
          const statusText = day.status === 'full_day' ? 'Full Day' : 
                            day.status === 'half_day' ? 'Half Day' : 
                            'School Day'
          
          const row = [
            date,
            statusText,
            `${day.totalHours.toFixed(1)} hrs`
          ]

          if (includeNotes && day.notes) {
            row.push(day.notes)
          }

          return row
        })

        const headers = ['Date', 'Type', 'Hours']
        if (includeNotes) {
          headers.push('Notes')
        }

        autoTable(doc, {
          startY: yPos,
          head: [headers],
          body: detailRows,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: 20, right: 20 },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 30 },
            2: { cellWidth: 25 },
            3: { cellWidth: includeNotes ? 'auto' : undefined }
          }
        })
      }

      // Footer on last page
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128)
        doc.text(
          `Page ${i} of ${pageCount}`,
          105,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        )
      }

      // Save the PDF
      const fileName = `Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports & Export</h3>
      <p className="text-sm text-gray-600 mb-4">
        Generate professional attendance reports for state compliance
      </p>

      <button
        onClick={() => setShowOptions(!showOptions)}
        className="mb-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        {showOptions ? '▼' : '▶'} Export Options
      </button>

      {showOptions && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDetails}
              onChange={(e) => setIncludeDetails(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Include detailed day-by-day log</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMonthly}
              onChange={(e) => setIncludeMonthly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Include monthly breakdown</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              disabled={!includeDetails}
              className="w-4 h-4 text-blue-600 rounded disabled:opacity-50"
            />
            <span className="text-sm text-gray-700">Include notes (if available)</span>
          </label>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={generatePDF}
          disabled={isGenerating || days.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin">⏳</span>
              Generating...
            </>
          ) : (
            <>
              📄 Export to PDF
            </>
          )}
        </button>

        {days.length === 0 && (
          <p className="text-sm text-gray-500 flex items-center">
            No attendance data to export
          </p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          The PDF report includes a summary, monthly breakdown, and detailed attendance log. 
          Perfect for submitting to your local school district or state education department.
        </p>
      </div>
    </div>
  )
}