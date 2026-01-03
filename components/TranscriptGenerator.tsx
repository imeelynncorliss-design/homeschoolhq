'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Course {
  id: string
  course_name: string
  course_code: string
  subject: string
  grade_level: string
  course_type: string
  credits: number
  letter_grade: string
  final_percentage: number
  semester: string
  school_year: string
  status: string
}

interface Settings {
  school_name: string
  school_address: string
  school_city: string
  school_state: string
  school_zip: string
  administrator_name: string
  administrator_title: string
  class_rank: number | null
  class_size: number | null
  graduation_date: string
}

interface Honor {
  honor_name: string
  honor_type: string
  description: string
  date_received: string
}

interface TranscriptGeneratorProps {
  kidId: string
  userId: string
  kidData?: any
}

export default function TranscriptGenerator({ kidId, userId, kidData }: TranscriptGeneratorProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [honors, setHonors] = useState<Honor[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [unweightedGPA, setUnweightedGPA] = useState(0)
  const [weightedGPA, setWeightedGPA] = useState(0)
  const [totalCredits, setTotalCredits] = useState(0)

  useEffect(() => {
    loadData()
  }, [kidId])

  const loadData = async () => {
    setLoading(true)
    
    // Load courses
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*')
      .eq('kid_id', kidId)
      .eq('status', 'completed')
      .order('grade_level', { ascending: true })
    
    if (coursesData) setCourses(coursesData)
    
    // Load settings
    const { data: settingsData } = await supabase
      .from('transcript_settings')
      .select('*')
      .eq('kid_id', kidId)
      .single()
    
    if (settingsData) setSettings(settingsData)
    
    // Load honors
    const { data: honorsData } = await supabase
      .from('honors_awards')
      .select('*')
      .eq('kid_id', kidId)
      .order('date_received', { ascending: false })
    
    if (honorsData) setHonors(honorsData)
    
    setLoading(false)
  }

  useEffect(() => {
    if (courses.length > 0) {
      calculateGPA()
    }
  }, [courses])

  const calculateGPA = () => {
    const gradeValues: {[key: string]: number} = {
      'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0
    }

    let unweightedPoints = 0
    let weightedPoints = 0
    let credits = 0

    courses.forEach(course => {
      if (course.letter_grade) {
        const baseGPA = gradeValues[course.letter_grade] || 0
        const courseCredits = course.credits || 0

        unweightedPoints += baseGPA * courseCredits

        let weightedGPAValue = baseGPA
        if (['Honors', 'AP', 'Dual Enrollment', 'IB'].includes(course.course_type)) {
          weightedGPAValue += 1.0
        }
        weightedPoints += weightedGPAValue * courseCredits

        credits += courseCredits
      }
    })

    setUnweightedGPA(credits > 0 ? unweightedPoints / credits : 0)
    setWeightedGPA(credits > 0 ? weightedPoints / credits : 0)
    setTotalCredits(credits)
  }

  const groupCoursesByGrade = () => {
    const grouped: { [key: string]: Course[] } = {}
    courses.forEach(course => {
      const grade = course.grade_level || 'Other'
      if (!grouped[grade]) {
        grouped[grade] = []
      }
      grouped[grade].push(course)
    })
    return grouped
  }

  const generatePDF = () => {
    setGenerating(true)
    
    const transcriptWindow = window.open('', '_blank')
    
    if (!transcriptWindow) {
      alert('Please allow popups to generate transcript')
      setGenerating(false)
      return
    }

    const html = generateTranscriptHTML()
    transcriptWindow.document.write(html)
    transcriptWindow.document.close()
    
    setGenerating(false)
  }

  const generateTranscriptHTML = () => {
    const groupedCourses = groupCoursesByGrade()
    const gradeLevels = Object.keys(groupedCourses).sort().reverse()

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Official Transcript - ${kidData?.displayname || 'Student'}</title>
  <style>
    @media print {
      @page { margin: 0.5in; }
    }
    
    body {
      font-family: 'Times New Roman', serif;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
      background: white;
      color: black;
    }
    
    h1 {
      text-align: center;
      font-size: 18pt;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    h2 {
      text-align: center;
      font-size: 14pt;
      margin-top: 0;
      font-weight: normal;
    }
    
    .header-info {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
      font-size: 11pt;
    }
    
    .section {
      margin-bottom: 15px;
    }
    
    .section-title {
      font-weight: bold;
      font-size: 12pt;
      border-bottom: 2px solid black;
      padding-bottom: 3px;
      margin-bottom: 10px;
      margin-top: 20px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-bottom: 15px;
    }
    
    th {
      background: #f0f0f0;
      padding: 6px;
      text-align: left;
      border: 1px solid black;
      font-weight: bold;
    }
    
    td {
      padding: 6px;
      border: 1px solid black;
    }
    
    .center { text-align: center; }
    .right { text-align: right; }
    
    .summary-box {
      border: 2px solid black;
      padding: 10px;
      margin: 20px 0;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
    }
    
    .signature-section {
      margin-top: 40px;
      page-break-inside: avoid;
    }
    
    .signature-line {
      border-top: 1px solid black;
      margin-top: 40px;
      padding-top: 5px;
      width: 50%;
    }
    
    @media print {
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>Official High School Transcript</h1>
  <h2>${settings?.school_name || 'Homeschool'}</h2>
  
  <div class="header-info">
    <div>
      <strong>Student Name:</strong> ${kidData?.displayname || 'Student'}<br>
      ${kidData?.firstname && kidData?.lastname ? `<strong>Legal Name:</strong> ${kidData.firstname} ${kidData.lastname}<br>` : ''}
      ${settings?.school_address ? `<strong>School Address:</strong> ${settings.school_address}<br>` : ''}
      ${settings?.school_city && settings?.school_state ? `${settings.school_city}, ${settings.school_state} ${settings?.school_zip || ''}<br>` : ''}
    </div>
    <div style="text-align: right;">
      ${settings?.graduation_date ? `<strong>Graduation Date:</strong> ${new Date(settings.graduation_date).toLocaleDateString()}<br>` : ''}
      <strong>Date Issued:</strong> ${new Date().toLocaleDateString()}
    </div>
  </div>

  <!-- Academic Summary -->
  <div class="summary-box">
    <div class="summary-grid">
      <div class="summary-item">
        <span><strong>Cumulative GPA (Unweighted):</strong></span>
        <span><strong>${unweightedGPA.toFixed(3)}</strong></span>
      </div>
      <div class="summary-item">
        <span><strong>Cumulative GPA (Weighted):</strong></span>
        <span><strong>${weightedGPA.toFixed(3)}</strong></span>
      </div>
      <div class="summary-item">
        <span><strong>Total Credits Earned:</strong></span>
        <span><strong>${totalCredits.toFixed(2)}</strong></span>
      </div>
      ${settings?.class_rank && settings?.class_size ? `
      <div class="summary-item">
        <span><strong>Class Rank:</strong></span>
        <span><strong>${settings.class_rank} of ${settings.class_size}</strong></span>
      </div>
      ` : ''}
    </div>
  </div>

  <!-- Courses by Grade Level -->
  ${gradeLevels.map(gradeLevel => `
    <div class="section">
      <div class="section-title">${gradeLevel} GRADE</div>
      <table>
        <thead>
          <tr>
            <th>Course Title</th>
            <th class="center">Course Code</th>
            <th class="center">Type</th>
            <th class="center">Credits</th>
            <th class="center">Grade</th>
          </tr>
        </thead>
        <tbody>
          ${groupedCourses[gradeLevel].map(course => `
            <tr>
              <td>${course.course_name}</td>
              <td class="center">${course.course_code || '-'}</td>
              <td class="center">${course.course_type === 'Regular' ? '' : course.course_type}</td>
              <td class="center">${course.credits}</td>
              <td class="center"><strong>${course.letter_grade || '-'}</strong></td>
            </tr>
          `).join('')}
          <tr style="background: #f9f9f9;">
            <td colspan="3" class="right"><strong>Grade Level Total:</strong></td>
            <td class="center"><strong>${groupedCourses[gradeLevel].reduce((sum, c) => sum + (c.credits || 0), 0).toFixed(2)}</strong></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  `).join('')}

  ${honors.length > 0 ? `
  <div class="section">
    <div class="section-title">HONORS & AWARDS</div>
    <ul>
      ${honors.map(honor => `
        <li>
          <strong>${honor.honor_name}</strong>
          ${honor.honor_type ? ` - ${honor.honor_type}` : ''}
          ${honor.date_received ? ` (${new Date(honor.date_received).getFullYear()})` : ''}
          ${honor.description ? `<br><em style="font-size: 9pt;">${honor.description}</em>` : ''}
        </li>
      `).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">GRADING SCALE</div>
    <table style="width: 60%;">
      <thead>
        <tr>
          <th>Letter Grade</th>
          <th class="center">Percentage Range</th>
          <th class="center">GPA Value</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>A</td><td class="center">93-100</td><td class="center">4.0</td></tr>
        <tr><td>A-</td><td class="center">90-92</td><td class="center">3.7</td></tr>
        <tr><td>B+</td><td class="center">87-89</td><td class="center">3.3</td></tr>
        <tr><td>B</td><td class="center">83-86</td><td class="center">3.0</td></tr>
        <tr><td>B-</td><td class="center">80-82</td><td class="center">2.7</td></tr>
        <tr><td>C+</td><td class="center">77-79</td><td class="center">2.3</td></tr>
        <tr><td>C</td><td class="center">73-76</td><td class="center">2.0</td></tr>
        <tr><td>C-</td><td class="center">70-72</td><td class="center">1.7</td></tr>
        <tr><td>D+</td><td class="center">67-69</td><td class="center">1.3</td></tr>
        <tr><td>D</td><td class="center">63-66</td><td class="center">1.0</td></tr>
        <tr><td>D-</td><td class="center">60-62</td><td class="center">0.7</td></tr>
        <tr><td>F</td><td class="center">0-59</td><td class="center">0.0</td></tr>
      </tbody>
    </table>
    <p style="font-size: 9pt; margin-top: 10px;">
      <em>Note: Honors, AP, Dual Enrollment, and IB courses receive an additional 1.0 GPA point for weighted GPA calculations.</em>
    </p>
  </div>

  <div class="signature-section">
    <p><strong>I certify that this is an accurate and complete transcript of the academic record.</strong></p>
    <div class="signature-line">
      <div>${settings?.administrator_name || '__________________________'}</div>
      <div>${settings?.administrator_title || 'Administrator/Parent'}</div>
    </div>
    <div style="margin-top: 10px;">
      Date: ${new Date().toLocaleDateString()}
    </div>
  </div>

  <div style="margin-top: 40px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 20px; font-size: 12pt; cursor: pointer; background: #3b82f6; color: white; border: none; border-radius: 5px;">
      Print Transcript
    </button>
    <button onclick="window.close()" style="padding: 10px 20px; font-size: 12pt; cursor: pointer; margin-left: 10px; background: #6b7280; color: white; border: none; border-radius: 5px;">
      Close
    </button>
  </div>
</body>
</html>
    `
  }

  if (loading) {
    return <div className="text-center py-8">Loading transcript data...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Transcript</h2>
        <p className="text-gray-600">Preview and generate your official high school transcript</p>
      </div>

      {/* Warnings/Notices */}
      {courses.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">No Completed Courses</h3>
              <p className="text-gray-700">
                You need to create courses and mark them as "completed" with grades before generating a transcript.
                Go to the Courses tab to get started.
              </p>
            </div>
          </div>
        </div>
      )}

      {!settings && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Configure Settings First</h3>
              <p className="text-gray-700">
                For a professional transcript, add your school information in the Settings tab before generating.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Unweighted GPA</div>
          <div className="text-3xl font-bold text-blue-900">{unweightedGPA.toFixed(3)}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Weighted GPA</div>
          <div className="text-3xl font-bold text-purple-900">{weightedGPA.toFixed(3)}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total Credits</div>
          <div className="text-3xl font-bold text-green-900">{totalCredits.toFixed(2)}</div>
        </div>
      </div>

      {/* Course Summary */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h3 className="font-bold text-gray-900 mb-3">Courses on Transcript</h3>
        <div className="space-y-2">
          {Object.entries(groupCoursesByGrade()).map(([grade, gradeCourses]) => (
            <div key={grade} className="flex justify-between items-center">
              <span className="font-medium text-gray-700">{grade} Grade:</span>
              <span className="text-gray-600">
                {gradeCourses.length} courses, {gradeCourses.reduce((sum, c) => sum + (c.credits || 0), 0).toFixed(2)} credits
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={generatePDF}
          disabled={generating || courses.length === 0}
          className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {generating ? 'Generating...' : '📄 Generate Transcript PDF'}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-bold text-gray-900 mb-3">📋 How to Use Your Transcript</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Click "Generate Transcript PDF" to open a printable version in a new window</li>
          <li>Review the transcript for accuracy</li>
          <li>Click "Print Transcript" to save as PDF (choose "Save as PDF" in print dialog)</li>
          <li>Send the PDF to colleges, or print and sign for a physical copy</li>
        </ol>
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>💡 Pro Tip:</strong> Most colleges accept electronic transcripts via email or their application portals. 
          Some may require a physical signed copy - check with each school's admissions office.</p>
        </div>
      </div>
    </div>
  )
}