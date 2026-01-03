'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Course {
  id: string
  course_name: string
  subject: string
  grade_level: string
  course_type: string
  credits: number
  letter_grade: string
  final_percentage: number
}

interface GradeBookProps {
  kidId: string
  userId: string
}

const LETTER_GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']

export default function GradeBook({ kidId, userId }: GradeBookProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [unweightedGPA, setUnweightedGPA] = useState(0)
  const [weightedGPA, setWeightedGPA] = useState(0)
  const [totalCredits, setTotalCredits] = useState(0)

  useEffect(() => {
    loadCourses()
  }, [kidId])

  useEffect(() => {
    if (courses.length > 0) {
      calculateGPA()
    }
  }, [courses])

  const loadCourses = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('kid_id', kidId)
      .order('grade_level', { ascending: true })
    
    if (data) setCourses(data)
    setLoading(false)
  }

  const updateGrade = async (courseId: string, letterGrade: string, percentage: number) => {
    await supabase
      .from('courses')
      .update({
        letter_grade: letterGrade,
        final_percentage: percentage
      })
      .eq('id', courseId)
    
    loadCourses()
  }

  const calculateGPA = () => {
    const gradeValues: {[key: string]: number} = {
      'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0
    }

    let unweightedPoints = 0
    let weightedPoints = 0
    let credits = 0

    courses.forEach(course => {
      if (course.letter_grade && course.status === 'completed') {
        const baseGPA = gradeValues[course.letter_grade] || 0
        const courseCredits = course.credits || 0

        unweightedPoints += baseGPA * courseCredits

        let weightedGPA = baseGPA
        if (['Honors', 'AP', 'Dual Enrollment', 'IB'].includes(course.course_type)) {
          weightedGPA += 1.0
        }
        weightedPoints += weightedGPA * courseCredits

        credits += courseCredits
      }
    })

    setUnweightedGPA(credits > 0 ? unweightedPoints / credits : 0)
    setWeightedGPA(credits > 0 ? weightedPoints / credits : 0)
    setTotalCredits(credits)
  }

  if (loading) {
    return <div className="text-center py-8">Loading grade book...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Grade Book</h2>
        <p className="text-gray-600">Assign grades and track academic performance</p>
      </div>

      {/* GPA Summary */}
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

      {/* Course Grades */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Course</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subject</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Grade Level</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Credits</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Letter Grade</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Percentage</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {courses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-600">
                  No courses to grade yet. Create courses in Course Manager first.
                </td>
              </tr>
            ) : (
              courses.map(course => (
                <tr key={course.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{course.course_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{course.subject}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{course.grade_level}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      course.course_type !== 'Regular' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {course.course_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{course.credits}</td>
                  <td className="px-4 py-3">
                    <select
                      value={course.letter_grade || ''}
                      onChange={(e) => updateGrade(course.id, e.target.value, course.final_percentage || 0)}
                      className="px-2 py-1 border rounded text-sm text-gray-900"
                    >
                      <option value="">Select Grade</option>
                      {LETTER_GRADES.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={course.final_percentage || ''}
                      onChange={(e) => updateGrade(course.id, course.letter_grade || '', parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 border rounded text-sm text-gray-900"
                      placeholder="0-100"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-gray-900 mb-2">💡 How Grading Works</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Assign letter grades to completed courses</li>
          <li>• GPA is calculated automatically from letter grades</li>
          <li>• Weighted GPA adds +1.0 for Honors, AP, Dual Enrollment, and IB courses</li>
          <li>• Only courses marked as "completed" count toward GPA</li>
          <li>• Credits are summed for total earned credits</li>
        </ul>
      </div>
    </div>
  )
}