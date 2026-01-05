// components/PersonalizedAssessmentCreator.tsx
// Renamed to avoid conflicts with existing AssessmentGenerator

'use client';

import { useState } from 'react';

interface PersonalizedAssessmentCreatorProps {
  lessonId: string;
  lessonTitle: string;
  kidId: string;
  kidName: string;
  onClose: () => void;
  onAssessmentCreated: (assessmentData: any) => void;
}

export default function PersonalizedAssessmentCreator({
  lessonId,
  lessonTitle,
  kidId,
  kidName,
  onClose,
  onAssessmentCreated
}: AssessmentGeneratorProps) {
  const [assessmentType, setAssessmentType] = useState<'quiz' | 'worksheet' | 'project'>('quiz');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          kidId,
          assessmentType,
          difficulty,
          questionCount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate assessment');
      }

      // Pass the assessment data to parent component
      onAssessmentCreated({
        ...data,
        assessmentType,
        difficulty,
        questionCount
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">✨ Generate Personalized Assessment</h2>
              <p className="text-blue-100">
                For {kidName} • {lessonTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Personalization Notice */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-900">
              <strong>🎯 Premium Feature:</strong> This assessment will be personalized based on {kidName}'s learning style and pace from their profile.
            </p>
          </div>

          {/* Assessment Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Assessment Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setAssessmentType('quiz')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  assessmentType === 'quiz'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">📝</div>
                <div className="font-semibold text-gray-900">Quiz</div>
                <div className="text-xs text-gray-600 mt-1">
                  Multiple choice, T/F, short answer
                </div>
              </button>

              <button
                onClick={() => setAssessmentType('worksheet')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  assessmentType === 'worksheet'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">📄</div>
                <div className="font-semibold text-gray-900">Worksheet</div>
                <div className="text-xs text-gray-600 mt-1">
                  Practice problems with hints
                </div>
              </button>

              <button
                onClick={() => setAssessmentType('project')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  assessmentType === 'project'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">🎨</div>
                <div className="font-semibold text-gray-900">Project</div>
                <div className="text-xs text-gray-600 mt-1">
                  Hands-on learning activities
                </div>
              </button>
            </div>
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setDifficulty('easy')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  difficulty === 'easy'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-green-700">Easy</div>
                <div className="text-xs text-gray-600 mt-1">Beginner level</div>
              </button>

              <button
                onClick={() => setDifficulty('medium')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  difficulty === 'medium'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-yellow-700">Medium</div>
                <div className="text-xs text-gray-600 mt-1">Grade-level</div>
              </button>

              <button
                onClick={() => setDifficulty('hard')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  difficulty === 'hard'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-red-700">Hard</div>
                <div className="text-xs text-gray-600 mt-1">Challenging</div>
              </button>
            </div>
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Number of Questions: {questionCount}
            </label>
            <input
              type="range"
              min="3"
              max="15"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>3 (Quick check)</span>
              <span>15 (Comprehensive)</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-gray-900"
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>✨ Generate Assessment</>
              )}
            </button>
          </div>

          {/* Generation Time Note */}
          {isGenerating && (
            <div className="text-center text-sm text-gray-500">
              Creating a personalized assessment... This usually takes 5-10 seconds
            </div>
          )}
        </div>
      </div>
    </div>
  );
}