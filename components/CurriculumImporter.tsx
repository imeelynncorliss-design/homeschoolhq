'use client';

import { useState } from 'react';

interface Lesson {
  title: string;
  subject: string;
  duration: string;
  lesson_date: string;
  description: string;
}

interface Props {
  childId: string;
  childName: string;
  onClose: () => void;
  onImportComplete: () => void;
}

const DURATION_OPTIONS = [
  '15 min',
  '30 min',
  '45 min',
  '1 hour',
  '1.5 hours',
  '2 hours',
  '2.5 hours',
  '3 hours'
];

export default function CurriculumImporter({ childId, childName, onClose, onImportComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedLessons, setExtractedLessons] = useState<Lesson[]>([]);
  const [selectedLessons, setSelectedLessons] = useState<Set<number>>(new Set());
  const [lessonDurations, setLessonDurations] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [error, setError] = useState<string>('');
  const [importResults, setImportResults] = useState<{ imported: number; skipped: number }>({ imported: 0, skipped: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      alert('Please select a PDF file');
    }
  };

  const extractLessons = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', childId);

    try {
      const response = await fetch('/api/import-curriculum', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to extract lessons');
        setLoading(false);
        return;
      }
      
      if (data.lessons) {
        // Sort lessons by extracting number from title
        const sortedLessons = data.lessons.sort((a: Lesson, b: Lesson) => {
          const numA = parseInt(a.title.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.title.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });
        
        setExtractedLessons(sortedLessons);
        setSelectedLessons(new Set(sortedLessons.map((_: any, i: number) => i)));
        setStep('preview');
      }
    } catch (error) {
      console.error('Extract error:', error);
      setError('Failed to extract lessons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLesson = (index: number) => {
    const newSelected = new Set(selectedLessons);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLessons(newSelected);
  };

  const handleDurationChange = (index: number, duration: string) => {
    setLessonDurations(prev => ({
      ...prev,
      [index]: duration
    }));
  };

  const importLessons = async () => {
    setLoading(true);
    
    const lessonsToImport = extractedLessons.filter((_, i) => selectedLessons.has(i));
    
    try {
      // Fetch existing lessons for this child using Supabase
      const { supabase } = await import('@/lib/supabase');
      const { data: existingLessons } = await supabase
        .from('lessons')
        .select('title, subject')
        .eq('kid_id', childId);
      
      // Check which lessons already exist (match on title + subject)
      const newLessons = lessonsToImport.filter(lesson => {
        return !existingLessons?.some((existing: any) => 
          existing.title === lesson.title && existing.subject === lesson.subject
        );
      });
      
      const duplicateCount = lessonsToImport.length - newLessons.length;
      
      // Import only new lessons with their durations
      for (let i = 0; i < extractedLessons.length; i++) {
        const lesson = extractedLessons[i];
        if (selectedLessons.has(i) && newLessons.includes(lesson)) {
          await fetch('/api/lessons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              child_id: childId,
              title: lesson.title,
              subject: lesson.subject,
              description: lesson.description,
              date: lesson.lesson_date || null,
              duration: lessonDurations[i] || null,
            }),
          });
        }
      }
      
      // Store results for success message
      setImportResults({ imported: newLessons.length, skipped: duplicateCount });
      setStep('success');
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import lessons');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            📥 Import Curriculum for {childName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-gray-600">
  Upload your curriculum's <strong>table of contents</strong> (PDF, max 15MB) and we'll extract the lesson plans automatically.
</p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Choose PDF File
                </label>
                {file && (
                  <p className="mt-4 text-gray-700">
                    Selected: <span className="font-semibold">{file.name}</span>
                  </p>
                )}
              </div>

              {file && (
                <button
                  onClick={extractLessons}
                  disabled={loading}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? 'Extracting Lessons...' : 'Extract Lessons'}
                </button>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-600">
                  Found {extractedLessons.length} lessons. Select which ones to import:
                </p>
                <button
                  onClick={() => {
                    if (selectedLessons.size === extractedLessons.length) {
                      setSelectedLessons(new Set());
                    } else {
                      setSelectedLessons(new Set(extractedLessons.map((_, i) => i)));
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {selectedLessons.size === extractedLessons.length ? '❌ Deselect All' : '✅ Select All'}
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {extractedLessons.map((lesson, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      selectedLessons.has(index) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedLessons.has(index)}
                        onChange={() => toggleLesson(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                            <p className="text-sm text-gray-600">{lesson.description}</p>
                            <div className="flex gap-3 mt-2 text-xs text-gray-500">
                              <span className="bg-gray-100 px-2 py-1 rounded">{lesson.subject}</span>
                              {lesson.duration && (
                                <span className="bg-gray-100 px-2 py-1 rounded">{lesson.duration}</span>
                              )}
                              {lesson.lesson_date && (
                                <span className="bg-gray-100 px-2 py-1 rounded">{lesson.lesson_date}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-600">Duration (optional)</label>
                            <select
                              value={lessonDurations[index] || ''}
                              onChange={(e) => handleDurationChange(index, e.target.value)}
                              className="text-sm border rounded px-2 py-1 text-gray-900"
                              disabled={!selectedLessons.has(index)}
                            >
                              <option value="">Not set</option>
                              {DURATION_OPTIONS.map(duration => (
                                <option key={duration} value={duration}>{duration}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900"
                >
                  ← Back
                </button>
                <button
                  onClick={importLessons}
                  disabled={loading || selectedLessons.size === 0}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? 'Importing...' : `Import ${selectedLessons.size} Lessons`}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Import Complete!
              </h3>
              <p className="text-gray-600">
                {importResults.imported} new lesson{importResults.imported !== 1 ? 's' : ''} added to {childName}'s calendar
              </p>
              {importResults.skipped > 0 && (
                <p className="text-gray-500 text-sm mt-2">
                  {importResults.skipped} duplicate{importResults.skipped !== 1 ? 's' : ''} skipped
                </p>
              )}
              <button
                onClick={() => {
                  onImportComplete();
                  onClose();
                }}
                className="mt-6 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}