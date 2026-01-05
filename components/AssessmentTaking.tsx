// components/AssessmentTaking.tsx

'use client';

import { useState } from 'react';

interface Question {
  id: number;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

interface AssessmentData {
  title: string;
  instructions: string;
  questions: Question[];
}

interface AssessmentTakingProps {
  assessmentData: AssessmentData;
  assessmentId: string;
  childName: string;
  lessonTitle: string;
  personalizedFor?: {
    learningStyle?: string;
    pace?: string;
  };
  onClose: () => void;
  onSubmit: (results: any) => void;
  isViewOnly?: boolean;
  existingResults?: {
    answers: any;
    auto_score: number | null;
    needs_manual_grading: boolean;
  };
}

export default function AssessmentTaking({
  assessmentData,
  assessmentId,
  childName,
  lessonTitle,
  personalizedFor,
  onClose,
  onSubmit,
  isViewOnly = false,
  existingResults
}: AssessmentTakingProps) {
  // If viewing existing results, load them immediately
  const initialAnswers = isViewOnly && existingResults 
    ? existingResults.answers.reduce((acc: any, answer: any) => {
        acc[answer.questionId] = answer.userAnswer;
        return acc;
      }, {})
    : {};
  
  const [answers, setAnswers] = useState<{ [key: number]: string }>(initialAnswers);
  const [isSubmitted, setIsSubmitted] = useState(isViewOnly);
  const [showResults, setShowResults] = useState(isViewOnly);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    
    // Calculate score
    const results = assessmentData.questions.map(q => {
      const userAnswer = answers[q.id] || '';
      const isCorrect = q.type === 'short_answer' 
        ? null // Parent will grade these
        : normalizeAnswer(userAnswer) === normalizeAnswer(q.correct_answer);
      
      return {
        questionId: q.id,
        question: q.question,
        userAnswer,
        correctAnswer: q.correct_answer,
        isCorrect,
        type: q.type
      };
    });

    // Calculate auto-gradable score
    const autoGradableQuestions = results.filter(r => r.isCorrect !== null);
    const correctCount = autoGradableQuestions.filter(r => r.isCorrect).length;
    const autoScore = autoGradableQuestions.length > 0 
      ? Math.round((correctCount / autoGradableQuestions.length) * 100)
      : null;

    const submissionData = {
      assessmentId,
      answers: results,
      autoScore,
      submittedAt: new Date().toISOString(),
      needsManualGrading: results.some(r => r.isCorrect === null)
    };

    // Save to database
    try {
      const response = await fetch('/api/submit-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        setShowResults(true);
        onSubmit(submissionData);
      }
    } catch (error) {
      console.error('Failed to save assessment results:', error);
      alert('Failed to save results. Please try again.');
    }
  };

  const normalizeAnswer = (answer: string): string => {
    return answer.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const allAnswered = assessmentData.questions.every(q => answers[q.id]);
  const progress = (Object.keys(answers).length / assessmentData.questions.length) * 100;

  // Results View
  if (showResults) {
    const results = assessmentData.questions.map(q => ({
      question: q,
      userAnswer: answers[q.id] || '',
      isCorrect: q.type === 'short_answer' 
        ? null 
        : normalizeAnswer(answers[q.id] || '') === normalizeAnswer(q.correct_answer)
    }));

    const autoGradableQuestions = results.filter(r => r.isCorrect !== null);
    const correctCount = autoGradableQuestions.filter(r => r.isCorrect).length;
    const score = autoGradableQuestions.length > 0 
      ? Math.round((correctCount / autoGradableQuestions.length) * 100)
      : null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-t-lg">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">🎉 Assessment Complete!</h2>
                <p className="text-green-100">{childName} • {lessonTitle}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="p-6 space-y-6">
            {/* Score Card */}
            {score !== null && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 text-center">
                <div className="text-6xl font-bold text-blue-600 mb-2">{score}%</div>
                <div className="text-lg text-gray-700">
                  {correctCount} out of {autoGradableQuestions.length} correct
                </div>
                {results.some(r => r.isCorrect === null) && (
                  <p className="text-sm text-gray-600 mt-2">
                    Some questions need parent review
                  </p>
                )}
              </div>
            )}

            {/* Question Review */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">Review Your Answers</h3>
              {results.map((result, index) => (
                <div
                  key={result.question.id}
                  className={`border rounded-lg p-4 ${
                    result.isCorrect === true
                      ? 'border-green-300 bg-green-50'
                      : result.isCorrect === false
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {result.isCorrect === true ? '✅' : result.isCorrect === false ? '❌' : '📝'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-2 text-gray-900">
                        Question {index + 1}: {result.question.question}
                      </p>
                      <p className="text-sm mb-1 text-gray-900">
                        <strong>Your answer:</strong> {result.userAnswer || '(No answer)'}
                      </p>
                      {result.isCorrect === false && (
                        <p className="text-sm text-green-700">
                          <strong>Correct answer:</strong> {result.question.correct_answer}
                        </p>
                      )}
                      {result.question.explanation && result.isCorrect === false && (
                        <p className="text-sm text-gray-700 mt-2 italic">
                          💡 {result.question.explanation}
                        </p>
                      )}
                      {result.isCorrect === null && (
                        <p className="text-sm text-gray-600 italic">
                          Parent will review this answer
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assessment Taking View
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{assessmentData.title}</h2>
              <p className="text-blue-100">{childName} • {lessonTitle}</p>
              {personalizedFor && (
                <p className="text-sm text-blue-100 mt-2">
                  ✨ Personalized for your {personalizedFor.learningStyle?.toLowerCase()} learning style
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{Object.keys(answers).length} of {assessmentData.questions.length}</span>
            </div>
            <div className="w-full bg-blue-300 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-gray-700">{assessmentData.instructions}</p>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {assessmentData.questions.map((question, index) => (
              <div key={question.id} className="border border-gray-300 rounded-lg p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <p className="text-lg font-semibold text-gray-800 flex-1">
                    {question.question}
                  </p>
                </div>

                {/* Multiple Choice */}
                {question.type === 'multiple_choice' && question.options && (
                  <div className="space-y-2 ml-11">
                    {question.options.map((option, optIndex) => (
                      <label
                        key={optIndex}
                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          answers[question.id] === option
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="mr-3"
                        />
                        <span className="text-gray-900">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* True/False */}
                {question.type === 'true_false' && (
                  <div className="space-y-2 ml-11">
                    {['True', 'False'].map((option) => (
                      <label
                        key={option}
                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          answers[question.id] === option
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="mr-3"
                        />
                        <span className="text-gray-900">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Short Answer */}
                {question.type === 'short_answer' && (
                  <div className="ml-11">
                    <textarea
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder="Type your answer here..."
                      rows={4}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-white pt-4 border-t">
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitted}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {!allAnswered
                ? `Answer ${assessmentData.questions.length - Object.keys(answers).length} more question(s) to submit`
                : isSubmitted
                ? 'Submitting...'
                : '✓ Submit Assessment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}