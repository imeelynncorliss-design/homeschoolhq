'use client';

import { useState, useEffect } from 'react';
import { usePlanningAutoComplete } from '@/lib/usePlanningAutoComplete';
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects';

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

  // Subject selection
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);

  // Bulk duration settings
  const [bulkDurationValue, setBulkDurationValue] = useState<number>(1);
  const [bulkDurationUnit, setBulkDurationUnit] = useState<DurationUnit>('weeks');
  const [applyBulkDuration, setApplyBulkDuration] = useState<boolean>(false);

  // Start date for scheduling
  const [useStartDate, setUseStartDate] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');

  // Planning mode
  const { triggerAutoComplete } = usePlanningAutoComplete();
  const [activePlanningPeriod, setActivePlanningPeriod] = useState<{
    id: string;
    period_name: string;
    start_date: string;
    end_date: string;
  } | null>(null);
  const [organizationId, setOrganizationId] = useState<string>('');

  // ── Load existing subjects from DB (real user org, not hardcoded) ──────────
  useEffect(() => {
    const loadSubjectsAndOrg = async () => {
      const { supabase } = await import('@/src/lib/supabase');

      // Get real authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get org ID from kids table
      const { data: kidData } = await supabase
        .from('kids')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      const orgId = kidData?.organization_id || user.id;
      setOrganizationId(orgId);

      // Load distinct subjects already in use by this org
      const { data } = await supabase
        .from('lessons')
        .select('subject')
        .eq('organization_id', orgId);

      if (data) {
        const uniqueExisting = [...new Set(data.map(d => d.subject).filter(Boolean))] as string[];
        // Only keep subjects that are NOT already in the canonical list
        // (canonical ones will appear via the canonical list in the dropdown)
        const nonCanonicalExisting = uniqueExisting.filter(s => !CANONICAL_SUBJECTS.includes(s))
        setExistingSubjects(nonCanonicalExisting);
      }

      // Check for active planning period
      const { data: period } = await supabase
        .from('planning_periods')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString().split('T')[0])
        .gte('end_date', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (period) setActivePlanningPeriod(period);
    };

    loadSubjectsAndOrg();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
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

    const finalSubject = selectedSubject === '__custom__' ? customSubject.trim() : selectedSubject;
    if (!finalSubject) {
      setError('Please select or enter a subject before uploading');
      return;
    }

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', childId);
    formData.append('subject', finalSubject);

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
        const sortedLessons = data.lessons.sort((a: Lesson, b: Lesson) => {
          const numA = parseInt(a.title.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.title.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });

        const lessonsWithSubject = sortedLessons.map((lesson: Lesson) => ({
          ...lesson,
          subject: finalSubject
        }));

        setExtractedLessons(lessonsWithSubject);
        setSelectedLessons(new Set(lessonsWithSubject.map((_: any, i: number) => i)));

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
    if (newSelected.has(index)) newSelected.delete(index);
    else newSelected.add(index);
    setSelectedLessons(newSelected);
  };

  const handleDurationChange = (index: number, value: number, unit: DurationUnit) => {
    setLessonDurations(prev => ({ ...prev, [index]: { value, unit } }));
  };

  const importLessons = async () => {
    setLoading(true);

    if (!organizationId) {
      alert('Organization not loaded. Please refresh and try again.');
      setLoading(false);
      return;
    }

    const lessonsToImport = extractedLessons.filter((_, i) => selectedLessons.has(i));

    try {
      const { supabase } = await import('@/src/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        alert('You must be logged in to import lessons.');
        setLoading(false);
        return;
      }

      const { data: existingLessons } = await supabase
        .from('lessons')
        .select('title, subject')
        .eq('kid_id', childId);

      const newLessons = lessonsToImport.filter(lesson =>
        !existingLessons?.some((existing: any) =>
          existing.title === lesson.title && existing.subject === lesson.subject
        )
      );

      const duplicateCount = lessonsToImport.length - newLessons.length;

      const lessonsToInsert = [];
      let currentDate = useStartDate && startDate ? new Date(startDate) : null;

      for (let i = 0; i < extractedLessons.length; i++) {
        const lesson = extractedLessons[i];
        if (selectedLessons.has(i) && newLessons.includes(lesson)) {
          let durationMinutes = null;
          let durationDays = 0;

          if (lessonDurations[i]) {
            const { value, unit } = lessonDurations[i];
            if (unit === 'minutes') {
              durationMinutes = value;
              durationDays = 0;
            } else if (unit === 'days') {
              durationMinutes = value * 6 * 60;
              durationDays = value;
            } else if (unit === 'weeks') {
              durationMinutes = value * 5 * 6 * 60;
              durationDays = value * 5;
            }
          }

          let lessonDate = null;
          if (currentDate) {
            lessonDate = currentDate.toISOString().split('T')[0];
            currentDate = new Date(currentDate);
            currentDate.setDate(currentDate.getDate() + (durationDays > 0 ? durationDays : 1));
          }

          lessonsToInsert.push({
            kid_id: childId,
            user_id: userId,
            organization_id: organizationId,
            subject: lesson.subject,
            title: lesson.title,
            description: lesson.description,
            lesson_date: lessonDate,
            duration_minutes: durationMinutes,
            status: 'not_started',
            planning_period_id: activePlanningPeriod?.id || null,
          });
        }
      }

      if (lessonsToInsert.length > 0) {
        const { error } = await supabase.from('lessons').insert(lessonsToInsert);

        if (error) {
          console.error('Database insert error:', error);
          alert(`Failed to import lessons: ${error.message}`);
          return;
        }

        if (activePlanningPeriod && organizationId) {
          await supabase.from('curriculum_imports').insert({
            organization_id: organizationId,
            planning_period_id: activePlanningPeriod.id,
            import_source: file?.type.includes('pdf') ? 'pdf' : 'image',
            lessons_created: lessonsToInsert.length,
            file_url: file?.name,
            metadata: {
              subject: lessonsToInsert[0]?.subject,
              total_lessons: lessonsToInsert.length,
              start_date: startDate || null,
            }
          });

          const result = await triggerAutoComplete(
            'curriculum_import',
            organizationId,
            activePlanningPeriod.id
          );

          if (result.completed_tasks.length > 0) {
            console.log('Auto-completed planning tasks:', result.completed_tasks);
          }
        }
      }

      setImportResults({ imported: lessonsToInsert.length, skipped: duplicateCount });
      setStep('success');

    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Failed to import lessons: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // Build the merged subject list: canonical first, then any custom subjects
  // already in this org's DB that aren't in the canonical list
  const subjectOptions = [
    ...CANONICAL_SUBJECTS,
    ...existingSubjects, // already filtered to non-canonical above
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 pt-4 pb-24">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            📥 Import Curriculum for {childName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
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

              {/* Planning Context Banner */}
              {activePlanningPeriod && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎨</span>
                    <div>
                      <p className="font-semibold text-blue-900">Planning Mode Active</p>
                      <p className="text-sm text-blue-700">
                        You're planning for {activePlanningPeriod.period_name}.
                        Importing curriculum will auto-complete your planning task!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Subject Selection ── */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  What subject is this curriculum for?
                </label>

                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">-- Select Subject --</option>

                  {/* Canonical subjects first */}
                  <optgroup label="Standard Subjects">
                    {CANONICAL_SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>

                  {/* Previously used custom subjects (non-canonical) */}
                  {existingSubjects.length > 0 && (
                    <optgroup label="Your Custom Subjects">
                      {existingSubjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  )}

                  <option value="__custom__">✏️ Add a new custom subject...</option>
                </select>

                {/* Custom subject input */}
                {selectedSubject === '__custom__' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="e.g., Latin, Robotics, Home Economics"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Use title case (e.g., "Latin" not "latin") so this subject groups
                      correctly in reports and shows up consistently in your dropdowns.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Bulk Duration Settings ── */}
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
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-600">per lesson</span>
                  </div>
                )}
              </div>

              {/* ── Start Date Selection ── */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="use-start-date"
                    checked={useStartDate}
                    onChange={(e) => setUseStartDate(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="use-start-date" className="text-sm font-medium text-gray-700">
                    Schedule lessons starting from a specific date
                  </label>
                </div>

                {useStartDate ? (
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900"
                    />
                    <p className="text-xs text-gray-600">
                      📅 Lessons will be scheduled sequentially based on their duration, starting from this date.
                      If no duration is set, each lesson will be 1 day apart.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">
                    Lessons will be imported without dates — you can schedule them later from the calendar.
                  </p>
                )}
              </div>

              {/* ── File Upload ── */}
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

              {useStartDate && startDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    📅 Lessons will be scheduled starting from <strong>{new Date(startDate + 'T00:00:00').toLocaleDateString()}</strong>,
                    spaced according to their duration.
                  </p>
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {extractedLessons.map((lesson, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${selectedLessons.has(index) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
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
                            <p className="text-sm text-gray-600">
                              {typeof lesson.description === 'string'
                                ? lesson.description
                                : JSON.stringify(lesson.description)}
                            </p>
                            <div className="flex gap-3 mt-2 text-xs text-gray-500">
                              <span className="bg-gray-100 px-2 py-1 rounded">{lesson.subject}</span>
                              {lessonDurations[index] && (
                                <span className="bg-gray-100 px-2 py-1 rounded">
                                  {lessonDurations[index].value} {lessonDurations[index].unit}
                                </span>
                              )}
                            </div>
                          </div>
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
                                  handleDurationChange(index, value, e.target.value as DurationUnit);
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
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h3>
              <p className="text-gray-600 mb-2">
                {importResults.imported} new lesson{importResults.imported !== 1 ? 's' : ''} added to {childName}'s list
              </p>
              {useStartDate && startDate ? (
                <p className="text-sm text-gray-500 mb-4">
                  📅 Lessons scheduled starting from {new Date(startDate + 'T00:00:00').toLocaleDateString()}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mb-4">
                  📅 Lessons are unscheduled — assign dates when you're ready to teach them
                </p>
              )}
              {importResults.skipped > 0 && (
                <p className="text-gray-500 text-sm mt-2">
                  {importResults.skipped} duplicate{importResults.skipped !== 1 ? 's' : ''} skipped
                </p>
              )}
              <button
                onClick={() => { onImportComplete(); onClose(); }}
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