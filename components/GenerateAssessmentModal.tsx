'use client';

import { useState } from 'react';
import AssessmentTaking from './AssessmentTaking';

interface Lesson {
  id: string;
  kid_id: string;
  title: string;
  subject: string;
  description?: string;
  lesson_date: string | null;
  duration_minutes: number | null;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface Kid {
  id: string;
  displayname: string;
  grade?: string;
  photo_url?: string;
}

interface GenerateAssessmentModalProps {
  lesson: Lesson;
  kids: Kid[];
  onClose: () => void;
}

type AssessmentType = 'quiz' | 'worksheet' | 'project';
type Difficulty = 'easy' | 'medium' | 'hard';

const ASSESSMENT_TYPES: { value: AssessmentType; label: string; emoji: string; desc: string }[] = [
  { value: 'quiz',      label: 'Quiz',      emoji: '📝', desc: 'Multiple choice & true/false questions' },
  { value: 'worksheet', label: 'Worksheet', emoji: '📋', desc: 'Short answer practice problems' },
  { value: 'project',   label: 'Project',   emoji: '🎨', desc: 'Hands-on project options to choose from' },
];

const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
  { value: 'easy',   label: 'Easy',   color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'hard',   label: 'Hard',   color: 'bg-red-100 text-red-800 border-red-300' },
];

export default function GenerateAssessmentModal({ lesson, kids, onClose }: GenerateAssessmentModalProps) {
  const [selectedKidId, setSelectedKidId] = useState<string>(lesson.kid_id || kids[0]?.id || '');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('quiz');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once generated, hold the result and show AssessmentTaking
  const [generatedAssessment, setGeneratedAssessment] = useState<any>(null);
  const [generatedAssessmentId, setGeneratedAssessmentId] = useState<string>('');
  const [generatedKidName, setGeneratedKidName] = useState<string>('');

  const selectedKid = kids.find(k => k.id === selectedKidId);

  const handleGenerate = async () => {
    if (!selectedKidId) { setError('Please select a child.'); return; }
    setError(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          kidId: selectedKidId,
          assessmentType,
          difficulty,
          questionCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate assessment.');
        return;
      }

      setGeneratedAssessment(data.assessment);
      setGeneratedAssessmentId(data.assessmentId || '');
      setGeneratedKidName(data.kidName || selectedKid?.displayname || '');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Show the assessment-taking UI once generated
  if (generatedAssessment) {
    return (
      <AssessmentTaking
        assessmentData={generatedAssessment}
        assessmentId={generatedAssessmentId}
        childName={generatedKidName}
        lessonTitle={lesson.title}
        onClose={onClose}
        onSubmit={() => {}}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-white font-bold text-xl">✨ Generate Assessment</h2>
              <p className="text-purple-200 text-sm mt-1 line-clamp-1">{lesson.title}</p>
            </div>
            <button onClick={onClose} className="text-white text-2xl leading-none font-light hover:text-purple-200">×</button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Child selector — only show if multiple kids */}
          {kids.length > 1 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">For which child?</label>
              <div className="flex flex-wrap gap-2">
                {kids.map(kid => (
                  <button
                    key={kid.id}
                    onClick={() => setSelectedKidId(kid.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedKidId === kid.id
                        ? 'border-purple-500 bg-purple-50 text-purple-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {kid.photo_url && (
                      <img src={kid.photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    )}
                    {kid.displayname}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assessment type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Assessment type</label>
            <div className="space-y-2">
              {ASSESSMENT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setAssessmentType(type.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    assessmentType === type.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <div>
                    <div className={`font-semibold text-sm ${assessmentType === type.value ? 'text-purple-800' : 'text-gray-800'}`}>
                      {type.label}
                    </div>
                    <div className="text-xs text-gray-500">{type.desc}</div>
                  </div>
                  {assessmentType === type.value && (
                    <span className="ml-auto text-purple-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                    difficulty === d.value ? d.color + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Number of {assessmentType === 'project' ? 'project options' : 'questions'}: <span className="text-purple-600">{questionCount}</span>
            </label>
            <div className="flex gap-2">
              {(assessmentType === 'project' ? [1, 2, 3] : [3, 5, 8, 10]).map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                    questionCount === n
                      ? 'border-purple-500 bg-purple-50 text-purple-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedKidId}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-base hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>✨ Generate {assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}