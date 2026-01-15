import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import AssessmentDetailClient from './AssessmentDetailClient'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Standard = {
  id: string
  standard_id: string
  standard: {
    id: string
    framework: string
    code: string
    description: string
    subject: string
    grade_level: string
    domain: string
  }
}

type Assessment = {
  id: string
  title: string
  description: string
  subject: string
  type: string
  grade_level: number
  question_count: number
  created_at: string
  status: string
}

type StudentProgress = {
  id: string
  name: string
  avatar: string
  status: 'completed' | 'in_progress' | 'not_started'
  score: number | null
  maxScore: number
  completedAt: string | null
  timeSpent: number
  questionsCorrect: number
  totalQuestions: number
  standardsMastery: Record<string, any>
}

async function getAssessment(id: string): Promise<Assessment | null> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const organizationId = 'd52497c0-42a9-49b7-ba3b-849bffa27fc4'

  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (error || !assessment) return null

  return assessment
}

async function getStandards(assessmentId: string): Promise<Standard[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/assessments/${assessmentId}/standards`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      console.error('Failed to fetch standards:', response.status)
      return []
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching standards:', error)
    return []
  }
}

async function getStudentProgress(assessmentId: string): Promise<StudentProgress[]> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const organizationId = 'd52497c0-42a9-49b7-ba3b-849bffa27fc4'

  // Get the assessment to find the lesson_id
  const { data: assessment } = await supabase
    .from('assessments')
    .select('lesson_id, questions')
    .eq('id', assessmentId)
    .single()

  if (!assessment) return []

  // Get all kids in the organization
  const { data: kids } = await supabase
    .from('kids')
    .select('id, firstname, lastname, displayname, photo_url')
    .eq('organization_id', organizationId)
    .order('firstname', { ascending: true })

  if (!kids || kids.length === 0) return []

  // Get assessment results for each kid
  const { data: results } = await supabase
    .from('assessment_results')
    .select('*')
    .eq('assessment_id', assessmentId)

  // Get standards for mastery tracking
  const { data: assessmentStandards } = await supabase
    .from('assessment_standards')
    .select(`
      user_standard_id,
      user_standards (
        id,
        standard_id,
        standards (
          code,
          description
        )
      )
    `)
    .eq('assessment_id', assessmentId)

  // Build student progress array
  const studentProgress: StudentProgress[] = kids.map(kid => {
    // Find this kid's result
    const result = results?.find(r => r.kid_id === kid.id)

    // Determine status
    let status: 'completed' | 'in_progress' | 'not_started' = 'not_started'
    if (result) {
      status = result.completed_at ? 'completed' : 'in_progress'
    }

    // Calculate questions correct
    let questionsCorrect = 0
    let totalQuestions = 0
    
    if (result?.answers && Array.isArray(result.answers)) {
      totalQuestions = result.answers.length
      questionsCorrect = result.answers.filter((a: any) => a.isCorrect === true).length
    } else if (assessment?.questions) {
      // Parse questions if stored as JSON
      const questions = typeof assessment.questions === 'string' 
        ? JSON.parse(assessment.questions) 
        : assessment.questions
      totalQuestions = Array.isArray(questions) ? questions.length : 0
    }

    // Calculate time spent (you may need to add a time_spent field to assessment_results)
    const timeSpent = 0 // TODO: Add time tracking to assessment_results table

    // Build standards mastery object
    const standardsMastery: Record<string, any> = {}
    if (assessmentStandards && result?.answers) {
      assessmentStandards.forEach((std: any) => {
        const standardId = std.user_standards?.standard_id || std.user_standard_id
        
        // Calculate mastery based on questions aligned to this standard
        // This is simplified - you may want more sophisticated logic
        const standardQuestions = result.answers.filter((a: any) => {
          // You'd need to track which questions map to which standards
          return true // Placeholder
        })
        
        const correct = standardQuestions.filter((a: any) => a.isCorrect === true).length
        const total = standardQuestions.length || 1
        const score = Math.round((correct / total) * 100)
        
        standardsMastery[standardId] = {
          mastered: score >= 80,
          score: score,
          questionsAttempted: total,
          questionsCorrect: correct
        }
      })
    }

    return {
      id: kid.id,
      name: kid.displayname || `${kid.firstname} ${kid.lastname}`,
      avatar: kid.photo_url ? '🧑' : '👤', // Use emoji if no photo
      status,
      score: result?.auto_score || null,
      maxScore: 100,
      completedAt: result?.completed_at 
        ? getRelativeTime(new Date(result.completed_at))
        : null,
      timeSpent,
      questionsCorrect,
      totalQuestions,
      standardsMastery
    }
  })

  return studentProgress
}

// Helper function to get relative time
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return '1 day ago'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

async function getAssignmentHistory(assessmentId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Get all times this assessment was assigned
  // For now, we'll create a simple version based on assessment_results
  const { data: results } = await supabase
    .from('assessment_results')
    .select('kid_id, created_at, completed_at, auto_score, kids(firstname, lastname, displayname)')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: false })

  if (!results || results.length === 0) return []

  // Group by assignment date (simplified - you may want a separate assignments table)
  const assignmentDate = results.length > 0 ? new Date(results[0].created_at) : new Date()
  
  const completed = results.filter(r => r.completed_at).length
  const inProgress = results.filter(r => !r.completed_at).length
  const notStarted = 0 // We don't track "assigned but not started" yet
  
  const scores = results.filter(r => r.auto_score !== null).map(r => r.auto_score!)
  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0

  return [{
    id: '1',
    assignedDate: assignmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    dueDate: 'No due date', // TODO: Add due_date field
    studentsAssigned: results.map((r: any) => 
      r.kids?.displayname || `${r.kids?.firstname} ${r.kids?.lastname}` || 'Unknown'
    ),
    completed,
    inProgress,
    notStarted,
    averageScore
  }]
}

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const assessment = await getAssessment(id)

  if (!assessment) {
    notFound()
  }

  const standards = await getStandards(id)
  const studentProgress = await getStudentProgress(id)
  const assignmentHistory = await getAssignmentHistory(id)

  return (
    <AssessmentDetailClient 
      assessment={assessment} 
      standards={standards}
      studentProgress={studentProgress}
      assignmentHistory={assignmentHistory}
    />
  )
}