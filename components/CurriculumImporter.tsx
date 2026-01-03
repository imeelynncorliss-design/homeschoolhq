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

// ✅ NEW: Duration units for days/weeks/minutes
const DURATION_UNITS = ['minutes', 'days', 'weeks'] as const;
type DurationUnit = typeof DURATION_UNITS[number];

export default function CurriculumImporter({ childId, childName, onClose, onImportComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedLessons, setExtractedLessons] = useState<Lesson[]>([]);
  const [selectedLessons, setSelectedLessons] = useState<Set<number>>(new Set());
  const [lessonDurations, setLessonDurations] = useState<{ [key: number]: { value: number; unit: DurationUnit } }>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [error, setError] = useState<string>('');
  const [importResults, setImportResults] = useState<{ imported: number; skipped: number }>({ imported: 0, skipped: 0 });
  
  // ✅ NEW: Subject selection
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);
  
  // ✅ NEW: Bulk duration settings
  const [bulkDurationValue, setBulkDurationValue] = useState<number>(1);
  const [bulkDurationUnit, setBulkDurationUnit] = useState<DurationUnit>('weeks');
  const [applyBulkDuration, setApplyBulkDuration] = useState<boolean>(false);

  // ✅ NEW: Load existing subjects when component mounts
  useState(() => {
    const loadSubjects = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('lessons')
        .select('subject')
        .eq('user_id', user.id);
      
      if (data) {
        const uniqueSubjects = [...new Set(data.map(d => d.subject))].filter(Boolean);
        setExistingSubjects(uniqueSubjects);
      }
    };
    loadSubjects();
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    // ✅ UPDATED: Accept PDF and images
    if (selectedFile) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setError('');
      } else {
        alert('Please select a PDF or image file (JPEG/PNG)');
      }
    }
  };

  const extractLessons = async () => {
    if (!file) return;

    // ✅ NEW: Validate subject selection
    const finalSubject = selectedSubject === 'custom' ? customSubject : selectedSubject;
    if (!finalSubject || finalSubject.trim() === '') {
      setError('Please select or enter a subject');
      return;
    }

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', childId);
    formData.append('subject', finalSubject); // ✅ NEW: Pass subject to API

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
        
        // ✅ NEW: Apply subject to all lessons
        const lessonsWithSubject = sortedLessons.map((lesson: Lesson) => ({
          ...lesson,
          subject: finalSubject
        }));
        
        setExtractedLessons(lessonsWithSubject);
        setSelectedLessons(new Set(lessonsWithSubject.map((_: any, i: number) => i)));
        
        // ✅ NEW: Apply bulk duration if checkbox is checked
        if (applyBulkDuration) {
          const bulkDurations: { [key: number]: { value: number; unit: DurationUnit } } = {};
          lessonsWithSubject.forEach((_: any, i: number) => {
            bulkDurations[i] = { value: bulkDurationValue, unit: bulkDurationUnit };
          });
          setLessonDurations(bulkDurations);
        }
        
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

  const handleDurationChange = (index: number, value: number, unit: DurationUnit) => {
    setLessonDurations(prev => ({
      ...prev,
      [index]: { value, unit }
    }));
  };

  const importLessons = async () => {
    setLoading(true);
    
    const lessonsToImport = extractedLessons.filter((_, i) => selectedLessons.has(i));
    
    try {
      // Fetch existing lessons for this child using Supabase
      const { supabase } = await import('@/lib/supabase');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to import lessons');
        setLoading(false);
        return;
      }
      
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
      
      // Prepare lessons for bulk insert
      const lessonsToInsert = [];
      for (let i = 0; i < extractedLessons.length; i++) {
        const lesson = extractedLessons[i];
        if (selectedLessons.has(i) && newLessons.includes(lesson)) {
          // ✅ UPDATED: Convert duration value/unit to minutes for storage
          let durationMinutes = null;
          if (lessonDurations[i]) {
            const { value, unit } = lessonDurations[i];
            if (unit === 'minutes') {
              durationMinutes = value;
            } else if (unit === 'days') {
              // Assuming 6 hours per school day
              durationMinutes = value * 6 * 60;
            } else if (unit === 'weeks') {
              // Assuming 5 days per week, 6 hours per day
              durationMinutes = value * 5 * 6 * 60;
            }
          }
          
          lessonsToInsert.push({
            kid_id: childId,
            user_id: user.id,
            subject: lesson.subject,
            title: lesson.title,
            description: lesson.description,
            lesson_date: null, // ✅ Always null - parent schedules later!
            duration_minutes: durationMinutes,
            status: 'not_started'
          });
        }
      }
      
      // Bulk insert all lessons at once
      if (lessonsToInsert.length > 0) {
        const { error } = await supabase
          .from('lessons')
          .insert(lessonsToInsert);
        
        if (error) {
          console.error('Import error:', error);
          alert(`Failed to import lessons: ${error.message}`);
          setLoading(false);
          return;
        }
      }
      
      // Store results for success message
      setImportResults({ imported: lessonsToInsert.length, skipped: duplicateCount });
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
                Upload your curriculum's <strong>table of contents</strong> (PDF or image, max 15MB) and we'll extract the lesson plans automatically.
              </p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              {/* ✅ NEW: Subject Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  What subject is this curriculum for?
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900"
                >
                  <option value="">-- Select Subject --</option>
                  {existingSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                  <option value="custom">➕ Create New Subject</option>
                </select>
                
                {selectedSubject === 'custom' && (
                  <input
                    type="text"
                    placeholder="Enter subject name (e.g., Math, Science, History)"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900"
                  />
                )}
              </div>

              {/* ✅ NEW: Bulk Duration Settings */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="apply-bulk"
                    checked={applyBulkDuration}
                    onChange={(e) => setApplyBulkDuration(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="apply-bulk" className="text-sm font-medium text-gray-700">
                    Set duration for all lessons
                  </label>
                </div>
                
                {applyBulkDuration && (
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      min="1"
                      value={bulkDurationValue}
                      onChange={(e) => setBulkDurationValue(parseInt(e.target.value) || 1)}
                      className="w-20 border border-gray-300 rounded px-3 py-2 text-gray-900"
                    />
                    <select
                      value={bulkDurationUnit}
                      onChange={(e) => setBulkDurationUnit(e.target.value as DurationUnit)}
                      className="border border-gray-300 rounded px-3 py-2 text-gray-900"
                    >
                      {DURATION_UNITS.map(unit => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-600">per lesson</span>
                  </div>
                )}
              </div>
              
              {/* ✅ UPDATED: File upload accepts images */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Choose File (PDF or Image)
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
                              {lessonDurations[index] && (
                                <span className="bg-gray-100 px-2 py-1 rounded">
                                  {lessonDurations[index].value} {lessonDurations[index].unit}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* ✅ UPDATED: Duration with value + unit */}
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-600">Duration (optional)</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                value={lessonDurations[index]?.value || ''}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 1;
                                  const unit = lessonDurations[index]?.unit || 'weeks';
                                  handleDurationChange(index, value, unit);
                                }}
                                placeholder="1"
                                className="w-16 text-sm border rounded px-2 py-1 text-gray-900"
                                disabled={!selectedLessons.has(index)}
                              />
                              <select
                                value={lessonDurations[index]?.unit || 'weeks'}
                                onChange={(e) => {
                                  const value = lessonDurations[index]?.value || 1;
                                  const unit = e.target.value as DurationUnit;
                                  handleDurationChange(index, value, unit);
                                }}
                                className="text-sm border rounded px-2 py-1 text-gray-900"
                                disabled={!selectedLessons.has(index)}
                              >
                                {DURATION_UNITS.map(unit => (
                                  <option key={unit} value={unit}>{unit}</option>
                                ))}
                              </select>
                            </div>
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
              <p className="text-gray-600 mb-2">
                {importResults.imported} new lesson{importResults.imported !== 1 ? 's' : ''} added to {childName}'s list
              </p>
              <p className="text-sm text-gray-500 mb-4">
                📅 Lessons are unscheduled - assign dates when you're ready to teach them
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