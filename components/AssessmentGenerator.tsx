'use client'

import { useState } from 'react'
import { formatLessonDescription } from '@/lib/formatLessonDescription' // ✅ NEW: Import formatter

interface AssessmentGeneratorProps {
  lesson: {
    title: string
    subject: string
    description?: string
  }
  childName: string
  onClose: () => void
}

export default function AssessmentGenerator({ lesson, childName, onClose }: AssessmentGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [assessment, setAssessment] = useState<string>('')
  const [error, setError] = useState<string>('')
  
  const [assessmentType, setAssessmentType] = useState<'quiz' | 'worksheet' | 'project'>('quiz')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [questionCount, setQuestionCount] = useState(5)

  const generateAssessment = async () => {
    setGenerating(true)
    setError('')
    setAssessment('')

    try {
      const response = await fetch('/api/generate-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson: {
            title: lesson.title,
            subject: lesson.subject,
            description: formatLessonDescription(lesson.description || '') // ✅ Handle undefined
          },
          assessmentType,
          difficulty,
          questionCount
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to generate assessment')
        setGenerating(false)
        return
      }

      setAssessment(data.assessment)
    } catch (err) {
      console.error('Assessment generation error:', err)
      setError('Failed to generate assessment. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const downloadAssessment = () => {
    const blob = new Blob([assessment], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${childName}_${lesson.subject}_${lesson.title}_Assessment.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(assessment)
    alert('Assessment copied to clipboard!')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            ✨ Generate Assessment
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Lesson Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
            <p className="text-sm text-gray-600">{lesson.subject}</p>
            {lesson.description && (
              <p className="text-sm text-gray-600 mt-2">
                {formatLessonDescription(lesson.description).substring(0, 200)}...
              </p>
            )}
          </div>

          {/* Configuration */}
          {!assessment && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Type
                </label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value as any)}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  disabled={generating}
                >
                  <option value="quiz">Quiz (Multiple Choice & Short Answer)</option>
                  <option value="worksheet">Worksheet (Practice Problems)</option>
                  <option value="project">Project Ideas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  disabled={generating}
                >
                  <option value="easy">Easy - Basic understanding</option>
                  <option value="medium">Medium - Grade-level appropriate</option>
                  <option value="hard">Hard - Challenge questions</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions: {questionCount}
                </label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="w-full"
                  disabled={generating}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>3 questions</span>
                  <span>15 questions</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <button
                onClick={generateAssessment}
                disabled={generating}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium text-lg"
              >
                {generating ? '✨ Generating Assessment...' : '✨ Generate Assessment'}
              </button>
            </div>
          )}

          {/* Generated Assessment */}
          {assessment && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans">
                  {assessment}
                </pre>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  📋 Copy to Clipboard
                </button>
                <button
                  onClick={downloadAssessment}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
                >
                  💾 Download as File
                </button>
              </div>

              <button
                onClick={() => {
                  setAssessment('')
                  setError('')
                }}
                className="w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-50 text-gray-900"
              >
                Generate Another Assessment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}