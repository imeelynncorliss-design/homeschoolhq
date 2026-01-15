'use client';

import { useState } from 'react';
import { updateManualGrade } from '@/app/actions/assessments';

interface Question {
  id: number;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'project_selection';
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

interface AssessmentData {
  title: string;
  instructions: string;
  questions: Question[];
  projects?: any[];
}

interface AssessmentTakingProps {
  assessmentData: AssessmentData;
  assessmentId: string;
  childName: string;
  lessonTitle: string;
  onClose: () => void;
  onSubmit: (results: any) => void;
  isViewOnly?: boolean;
  existingResults?: {
    id: string;
    answers: any;
    auto_score: number | null;
    needs_manual_grading: boolean;
    parent_comments?: string;
  };
}

const isProjectAssessment = (assessmentData: AssessmentData) => {
  return assessmentData.projects && Array.isArray(assessmentData.projects);
};

export default function AssessmentTaking({
  assessmentData,
  assessmentId,
  childName,
  lessonTitle,
  onClose,
  onSubmit,
  isViewOnly = false,
  existingResults
}: AssessmentTakingProps) {
  
  const [answers, setAnswers] = useState<{ [key: number]: string }>(() => {
    if (isViewOnly && existingResults?.answers) {
      return existingResults.answers.reduce((acc: any, answer: any) => {
        acc[answer.questionId] = answer.userAnswer;
        return acc;
      }, {});
    }
    return {};
  });
  
  const [isSubmitted, setIsSubmitted] = useState(isViewOnly);
  const [showResults, setShowResults] = useState(isViewOnly);
  const [isUpdating, setIsUpdating] = useState(false);
  const [customGrade, setCustomGrade] = useState('');
  const [parentComment, setParentComment] = useState(existingResults?.parent_comments || '');

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleManualGrading = async (score: number) => {
    if (!existingResults?.id) return;
    setIsUpdating(true);
    try {
      await updateManualGrade(existingResults.id, score, parentComment);
      if (onSubmit) onSubmit(null); 
      onClose(); 
    } catch (error) {
      alert("Failed to update grade.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCustomGradeSubmit = () => {
    const grade = parseInt(customGrade);
    if (!isNaN(grade) && grade >= 0 && grade <= 100) {
      handleManualGrading(grade);
    } else {
      alert('Please enter a valid grade between 0 and 100');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    
    const results = assessmentData.questions.map(q => {
      const studentAns = (answers[q.id] || "").trim().toLowerCase();
      const correctAns = (q.correct_answer || "").trim().toLowerCase();
      
      const isCorrectMatch = studentAns.includes(correctAns) || correctAns.includes(studentAns);

      return {
        questionId: q.id,
        userAnswer: answers[q.id] || '',
        isCorrect: (q.type === 'short_answer' || q.type === 'project_selection') ? null : isCorrectMatch
      };
    });

    const autoGradableQuestions = assessmentData.questions.filter(q => q.type !== 'short_answer' && q.type !== 'project_selection');
    const correctCount = results.filter(r => r.isCorrect === true).length;
    
    const calculatedScore = autoGradableQuestions.length > 0 
      ? Math.round((correctCount / autoGradableQuestions.length) * 100) 
      : null;

    const hasShortAnswer = assessmentData.questions.some(q => q.type === 'short_answer' || q.type === 'project_selection');

    try {
      const response = await fetch('/api/submit-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assessmentId, 
          answers: results,
          autoScore: calculatedScore,
          needsManualGrading: hasShortAnswer
        })
      });

      if (response.ok) {
        setShowResults(true);
        if (onSubmit) onSubmit(results);
      }
    } catch (error) {
      console.error("Submission failed:", error);
      setIsSubmitted(false);
    }
  };

  const Header = ({ title, subTitle }: { title: string; subTitle: string }) => (
    <div className="bg-gradient-to-r from-[#9333ea] to-[#4f46e5] text-white p-6 shadow-lg">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-white/90 hover:text-white font-semibold transition-colors group"
          >
            <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span> 
            Back to Admin
          </button>
          <div className="h-8 w-[1px] bg-white/20" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="text-white/80 text-sm font-medium">{subTitle}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-3xl font-light hover:rotate-90 transition-transform">&times;</button>
      </div>
    </div>
  );

  if (showResults) {
    const hasShortAnswer = assessmentData.questions.some(q => q.type === 'short_answer' || q.type === 'project_selection');
    const isPendingReview = isViewOnly && existingResults?.needs_manual_grading;
    const isAllShortAnswer = assessmentData.questions.every(q => q.type === 'short_answer' || q.type === 'project_selection');
    const showPendingState = isPendingReview || (!isViewOnly && isAllShortAnswer);

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 text-slate-900">
          <Header title="Assessment Review" subTitle={`${childName} • ${lessonTitle}`} />
          
          <div className="p-8 overflow-y-auto space-y-8 bg-slate-50/30">
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm">
              {showPendingState ? (
                <>
                  <div className="text-4xl font-black text-amber-500 uppercase tracking-tight">Pending Review</div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-3">
                    Waiting for Parent to Grade
                  </p>
                </>
              ) : (
                <>
                  <div className="text-7xl font-black text-[#9333ea]">{existingResults?.auto_score ?? 0}%</div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-3">Final Score</p>
                </>
              )}
            </div>

            {/* Parent Comments Display (for completed assessments) */}
            {!isPendingReview && existingResults?.parent_comments && (
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl">
                <h4 className="font-bold text-blue-900 mb-2 text-sm uppercase tracking-wide">📝 Parent Notes</h4>
                <p className="text-blue-900 text-sm whitespace-pre-wrap">{existingResults.parent_comments}</p>
              </div>
            )}

            {showPendingState && isViewOnly && (
              <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl shadow-sm">
                <h3 className="font-bold text-amber-900 mb-2 uppercase tracking-wide text-sm text-center">
                  Grade This {isProjectAssessment(assessmentData) ? 'Project' : 'Assessment'}
                </h3>
                
                {isProjectAssessment(assessmentData) ? (
                  // PROJECT-SPECIFIC GRADING
                  <>
                    <p className="text-amber-800 text-xs mb-4 text-center">
                      {isUpdating ? 'Updating grade...' : 'Observe the completed project and select a grade based on effort, creativity, and understanding demonstrated.'}
                    </p>
                    {!isUpdating ? (
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-amber-200 mb-4">
                          <p className="text-sm font-semibold text-slate-700 mb-2">
                            Selected Project: {(() => {
                              const projectId = answers[1];
                              const project = assessmentData.projects?.find((p: any) => p.id.toString() === projectId);
                              return project?.title || 'Unknown';
                            })()}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => handleManualGrading(100)} 
                            className="bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md"
                          >
                            ✅ Excellent
                            <span className="block text-xs opacity-80">100%</span>
                          </button>
                          <button 
                            onClick={() => handleManualGrading(85)} 
                            className="bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition-all shadow-md"
                          >
                            👍 Good
                            <span className="block text-xs opacity-80">85%</span>
                          </button>
                          <button 
                            onClick={() => handleManualGrading(70)} 
                            className="bg-yellow-500 text-white py-4 rounded-xl font-bold hover:bg-yellow-600 transition-all shadow-md"
                          >
                            ⚠️ Needs Work
                            <span className="block text-xs opacity-80">70%</span>
                          </button>
                          <button 
                            onClick={() => handleManualGrading(50)} 
                            className="bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md"
                          >
                            📝 Incomplete
                            <span className="block text-xs opacity-80">50%</span>
                          </button>
                        </div>
                        
                        {/* Parent Comments Field */}
                        <div className="bg-white p-4 rounded-xl border border-amber-200">
                          <label className="block text-sm font-semibold text-amber-900 mb-2">
                            Add Notes (Optional):
                          </label>
                          <textarea
                            value={parentComment}
                            onChange={(e) => setParentComment(e.target.value)}
                            placeholder="Note areas of excellence or improvement..."
                            className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg text-amber-900 focus:border-amber-500 focus:outline-none resize-none"
                            rows={3}
                          />
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl border border-amber-200">
                          <label className="block text-sm font-semibold text-amber-900 mb-2">Or enter custom grade:</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={customGrade}
                              onChange={(e) => setCustomGrade(e.target.value)}
                              placeholder="0-100"
                              className="flex-1 px-4 py-3 border-2 border-amber-300 rounded-lg text-center font-bold text-amber-900 focus:border-amber-500 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCustomGradeSubmit();
                                }
                              }}
                            />
                            <button
                              onClick={handleCustomGradeSubmit}
                              className="px-6 py-3 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-all"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center py-2">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </>
                ) : (
                  // REGULAR GRADING (for quizzes/worksheets)
                  <>
                    <p className="text-amber-800 text-xs mb-4 text-center">
                      {isUpdating ? 'Updating grade...' : "Review the student's answers below, then select the final grade."}
                    </p>
                    {!isUpdating ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-2">
                          <button 
                            onClick={() => handleManualGrading(100)} 
                            className="bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md text-sm"
                          >
                            100%
                          </button>
                          <button 
                            onClick={() => handleManualGrading(75)} 
                            className="bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-all shadow-md text-sm"
                          >
                            75%
                          </button>
                          <button 
                            onClick={() => handleManualGrading(50)} 
                            className="bg-yellow-500 text-white py-3 rounded-xl font-bold hover:bg-yellow-600 transition-all shadow-md text-sm"
                          >
                            50%
                          </button>
                          <button 
                            onClick={() => handleManualGrading(25)} 
                            className="bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md text-sm"
                          >
                            25%
                          </button>
                        </div>
                        
                        {/* Parent Comments Field */}
                        <div className="bg-white p-4 rounded-xl border border-amber-200">
                          <label className="block text-sm font-semibold text-amber-900 mb-2">
                            Add Notes (Optional):
                          </label>
                          <textarea
                            value={parentComment}
                            onChange={(e) => setParentComment(e.target.value)}
                            placeholder="Note areas of excellence or improvement..."
                            className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg text-amber-900 focus:border-amber-500 focus:outline-none resize-none"
                            rows={3}
                          />
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl border border-amber-200">
                          <label className="block text-sm font-semibold text-amber-900 mb-2">Custom Grade:</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={customGrade}
                              onChange={(e) => setCustomGrade(e.target.value)}
                              placeholder="0-100"
                              className="flex-1 px-4 py-3 border-2 border-amber-300 rounded-lg text-center font-bold text-amber-900 focus:border-amber-500 focus:outline-none text-lg"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCustomGradeSubmit();
                                }
                              }}
                            />
                            <button
                              onClick={handleCustomGradeSubmit}
                              className="px-6 py-3 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-all"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleManualGrading(existingResults?.auto_score || 0)} 
                          className="w-full bg-slate-600 text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-all shadow-md text-sm"
                        >
                          Keep as {existingResults?.auto_score || 0}%
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center py-2">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {showPendingState && !isViewOnly && (
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm text-center">
                <h3 className="font-bold text-blue-900 mb-2 uppercase tracking-wide text-sm">✅ Submitted Successfully</h3>
                <p className="text-blue-800 text-sm">
                  This assessment has been submitted and is waiting for parent review. Check the "Needs Review" tab in the Assessments & Reviews section to grade it.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-bold text-lg">
                {isProjectAssessment(assessmentData) ? 'Project Selection' : 'Question Review'}
              </h3>
              
              {isProjectAssessment(assessmentData) ? (
                <div className="p-6 border-2 rounded-2xl bg-white border-slate-200">
                  {(() => {
                    const projectId = answers[1];
                    const project = assessmentData.projects?.find((p: any) => p.id.toString() === projectId);
                    return project ? (
                      <div>
                        <h4 className="text-xl font-bold text-slate-900 mb-4">
                          Selected Project: {project.title}
                        </h4>
                        <div className="space-y-3 text-sm text-slate-700">
                          <p><strong>🎯 Objective:</strong> {project.objective}</p>
                          <div>
                            <strong>📦 Materials:</strong>
                            <ul className="list-disc list-inside ml-4 mt-1">
                              {project.materials?.map((m: string, i: number) => (
                                <li key={i}>{m}</li>
                              ))}
                            </ul>
                          </div>
                          <p><strong>⏱️ Time:</strong> {project.estimated_time}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-600">No project selected</p>
                    );
                  })()}
                </div>
              ) : (
                assessmentData.questions.map((q, i) => {
                  const studentAnswer = answers[q.id] || "No answer provided";
                  const studentAnsLower = studentAnswer.trim().toLowerCase();
                  const correctAnsLower = (q.correct_answer || "").trim().toLowerCase();
                  const isCorrect = q.type === 'short_answer' ? null : (studentAnsLower.includes(correctAnsLower) || correctAnsLower.includes(studentAnsLower));

                  return (
                    <div key={i} className={`p-6 border-2 rounded-2xl shadow-sm ${isCorrect === false ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <p className="font-bold text-lg text-slate-900">{i + 1}. {q.question}</p>
                        {isCorrect === true && <span className="text-emerald-600 font-bold">✅ Correct</span>}
                        {isCorrect === false && <span className="text-rose-600 font-bold">❌ Incorrect</span>}
                        {isCorrect === null && <span className="text-amber-600 font-bold italic">📝 Short Answer</span>}
                      </div>
                      <div className="p-4 bg-white/50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Student's Response</span>
                        <p className={`font-semibold mt-1 ${isCorrect === false ? 'text-rose-700' : 'text-slate-800'}`}>{studentAnswer}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors">Done & Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 text-slate-900">
        <Header title={assessmentData.title} subTitle={`${childName} • ${lessonTitle}`} />
        <div className="p-8 overflow-y-auto space-y-8 bg-slate-50/30">
          {assessmentData.questions.map((q, idx) => {
            if (q.type === 'project_selection' && assessmentData.projects) {
              return (
                <div key={q.id} className="space-y-6">
                  <h3 className="text-2xl font-bold text-center mb-6">
                    Choose ONE project to complete:
                  </h3>
                  
                  <div className="grid gap-6">
                    {assessmentData.projects.map((project: any) => (
                      <button
                        key={project.id}
                        onClick={() => handleAnswerChange(q.id, project.id.toString())}
                        className={`p-6 text-left rounded-2xl border-2 transition-all ${
                          answers[q.id] === project.id.toString()
                            ? 'border-[#9333ea] bg-purple-50 shadow-xl scale-[1.02]'
                            : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                            answers[q.id] === project.id.toString()
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {answers[q.id] === project.id.toString() ? '✓' : project.id}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-slate-900 mb-2">
                              {project.title}
                            </h4>
                            
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="font-semibold text-purple-700 mb-1">🎯 Objective:</p>
                                <p className="text-slate-700">{project.objective}</p>
                              </div>
                              
                              <div>
                                <p className="font-semibold text-purple-700 mb-1">📦 Materials Needed:</p>
                                <ul className="list-disc list-inside text-slate-700 space-y-1">
                                  {project.materials?.map((material: string, i: number) => (
                                    <li key={i}>{material}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="flex items-center gap-4 text-slate-600">
                                <span className="font-semibold">⏱️ Time: {project.estimated_time}</span>
                              </div>
                              
                              {project.steps && project.steps.length > 0 && (
                                <details className="mt-2">
                                  <summary className="font-semibold text-purple-700 cursor-pointer hover:text-purple-800">
                                    📋 View Steps
                                  </summary>
                                  <ol className="list-decimal list-inside text-slate-700 mt-2 space-y-1 ml-4">
                                    {project.steps.map((step: string, i: number) => (
                                      <li key={i}>{step}</li>
                                    ))}
                                  </ol>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            
            return (
              <div key={q.id} className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-2xl font-bold mb-6 text-slate-900">{idx + 1}. {q.question}</p>
                {q.type === 'short_answer' ? (
                  <textarea
                    className="w-full p-5 rounded-xl border-2 border-slate-100 focus:border-[#9333ea] focus:ring-4 focus:ring-purple-50 outline-none transition-all text-slate-800 text-lg"
                    rows={4}
                    placeholder="Type your answer here..."
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  />
                ) : (
                  <div className="grid gap-4">
                    {(q.options || ['True', 'False']).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleAnswerChange(q.id, opt)}
                        className={`p-5 text-left rounded-xl border-2 font-bold text-lg transition-all ${
                          answers[q.id] === opt
                            ? 'border-[#9333ea] bg-purple-50 text-[#9333ea] shadow-md'
                            : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={handleSubmit}
            disabled={isSubmitted || assessmentData.questions.length !== Object.keys(answers).length}
            className="w-full py-6 bg-gradient-to-r from-[#9333ea] to-[#4f46e5] text-white rounded-2xl font-black text-2xl shadow-xl disabled:opacity-30 disabled:grayscale transition-all hover:scale-[1.01] active:scale-[0.98]"
          >
            {isSubmitted ? 'SUBMITTING...' : 'SUBMIT ASSESSMENT'}
          </button>
        </div>
      </div>
    </div>
  );
}