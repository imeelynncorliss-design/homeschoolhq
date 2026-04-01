'use client';

import { useState, useEffect } from 'react';
import { usePlanningAutoComplete } from '@/lib/usePlanningAutoComplete';
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects';
import { getScoutFrequencyTip } from '@/lib/scoutFrequency';

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
  // Which weekdays to schedule on (0=Sun … 6=Sat); default Mon–Fri
  const [scheduleDays, setScheduleDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));

  // Planning mode
  const { triggerAutoComplete } = usePlanningAutoComplete();
  const [activePlanningPeriod, setActivePlanningPeriod] = useState<{
    id: string;
    period_name: string;
    start_date: string;
    end_date: string;
  } | null>(null);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [showScoutTip, setShowScoutTip] = useState(false);

  // Manual entry mode (no TOC to upload)
  const [uploadMode, setUploadMode] = useState<'file' | 'manual'>('file');
  const [manualText, setManualText] = useState('');

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

      // Load state code for Scout tip context
      const { data: schoolSettings } = await supabase
        .from('school_year_settings')
        .select('state_code')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (schoolSettings?.state_code) setStateCode(schoolSettings.state_code);
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

  const parseManualLessons = () => {
    const finalSubject = selectedSubject === '__custom__' ? customSubject.trim() : selectedSubject;
    if (!finalSubject) { setError('Please select or enter a subject first'); return; }
    if (!manualText.trim()) { setError('Please enter at least one lesson name'); return; }

    const lines = manualText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const lessons: Lesson[] = lines.map(line => ({
      title: line,
      subject: finalSubject,
      duration: '',
      lesson_date: '',
      description: '',
    }));

    setExtractedLessons(lessons);
    setSelectedLessons(new Set(lessons.map((_, i) => i)));

    if (applyBulkDuration) {
      const bulkDurations: { [key: number]: { value: number; unit: DurationUnit } } = {};
      lessons.forEach((_, i) => { bulkDurations[i] = { value: bulkDurationValue, unit: bulkDurationUnit }; });
      setLessonDurations(bulkDurations);
    }

    setError('');
    setStep('preview');
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

      // Helper: advance date to the next allowed weekday (inclusive of current)
      const snapToAllowedDay = (d: Date): Date => {
        const result = new Date(d);
        const activeDays = scheduleDays.size > 0 ? scheduleDays : new Set([1, 2, 3, 4, 5]);
        let safety = 0;
        while (!activeDays.has(result.getDay()) && safety++ < 14) {
          result.setDate(result.getDate() + 1);
        }
        return result;
      };

      // Helper: advance to the NEXT allowed weekday after a given date
      const nextAllowedDay = (d: Date): Date => {
        const result = new Date(d);
        result.setDate(result.getDate() + 1);
        return snapToAllowedDay(result);
      };

      const lessonsToInsert = [];
      let currentDate = useStartDate && startDate
        ? snapToAllowedDay(new Date(startDate + 'T12:00:00'))
        : null;

      for (let i = 0; i < extractedLessons.length; i++) {
        const lesson = extractedLessons[i];
        if (selectedLessons.has(i) && newLessons.includes(lesson)) {
          let durationMinutes = null;

          if (lessonDurations[i]) {
            const { value, unit } = lessonDurations[i];
            if (unit === 'minutes') durationMinutes = value;
            else if (unit === 'days')  durationMinutes = value * 6 * 60;
            else if (unit === 'weeks') durationMinutes = value * 5 * 6 * 60;
          }

          let lessonDate = null;
          if (currentDate) {
            lessonDate = currentDate.toISOString().split('T')[0];
            currentDate = nextAllowedDay(currentDate);
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
            import_source: uploadMode === 'manual' ? 'manual' : file?.type.includes('pdf') ? 'pdf' : 'image',
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col my-4" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

        {/* ── Fixed header with X ── */}
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            📥 Import Curriculum for {childName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Have a table of contents? Upload it and we'll extract your lessons automatically. No TOC? Type or paste your lesson names directly.
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
                  onChange={(e) => { setSelectedSubject(e.target.value); setShowScoutTip(false) }}
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

              {/* ── Scout Frequency Nudge ── */}
              {(() => {
                const effectiveSubject = selectedSubject === '__custom__' ? customSubject : selectedSubject
                if (!effectiveSubject) return null
                const tip = getScoutFrequencyTip(effectiveSubject, stateCode)
                return (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowScoutTip(prev => !prev)}
                      className="flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-800 transition-colors"
                    >
                      <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                      Not sure about frequency? Ask Scout
                      <span style={{ fontSize: 11 }}>{showScoutTip ? '▲' : '▼'}</span>
                    </button>

                    {showScoutTip && (
                      <div style={{
                        marginTop: 10, background: '#ede9fe', borderRadius: 14,
                        padding: '14px 16px', border: '1.5px solid #ddd6fe',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#5b21b6', marginBottom: 4 }}>
                              Scout recommends <strong>{tip.label}</strong> for {effectiveSubject}
                            </div>
                            <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.55, marginBottom: tip.stateNote ? 8 : 0 }}>
                              {tip.reason}
                            </div>
                            {tip.stateNote && (
                              <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginTop: 4 }}>
                                📋 {tip.stateNote}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setBulkDurationValue(tip.perWeek)
                                setBulkDurationUnit('days')
                                setApplyBulkDuration(true)
                                setShowScoutTip(false)
                              }}
                              style={{
                                marginTop: 10, padding: '7px 14px', borderRadius: 20,
                                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                color: '#fff', border: 'none', fontSize: 12, fontWeight: 800,
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              Use Scout's suggestion ({tip.perWeek}× a week) →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

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
                  <div className="space-y-3">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900"
                    />

                    {/* Day picker */}
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">Which days will you teach this subject?</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[
                          { label: 'Mon', day: 1 },
                          { label: 'Tue', day: 2 },
                          { label: 'Wed', day: 3 },
                          { label: 'Thu', day: 4 },
                          { label: 'Fri', day: 5 },
                          { label: 'Sat', day: 6 },
                        ].map(({ label, day }) => {
                          const active = scheduleDays.has(day)
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => setScheduleDays(prev => {
                                const next = new Set(prev)
                                next.has(day) ? next.delete(day) : next.add(day)
                                return next
                              })}
                              style={{
                                flex: 1, padding: '7px 2px', borderRadius: 8,
                                border: `2px solid ${active ? '#7c3aed' : '#e5e7eb'}`,
                                background: active ? '#f5f3ff' : '#fafafa',
                                color: active ? '#5b21b6' : '#6b7280',
                                fontSize: 11, fontWeight: 800, cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >{label}</button>
                          )
                        })}
                      </div>
                      {scheduleDays.size === 0 && (
                        <p className="text-xs text-red-500 mt-1">Select at least one day</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        📅 One lesson per selected day, starting {startDate || 'your chosen date'}.
                        {scheduleDays.size > 0 && ` (${scheduleDays.size}× a week)`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">
                    Lessons will be imported without dates — you can schedule them later from the calendar.
                  </p>
                )}
              </div>

              {/* ── Upload mode picker ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  style={{
                    padding: '14px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                    border: `2px solid ${uploadMode === 'file' ? '#7c3aed' : '#e5e7eb'}`,
                    background: uploadMode === 'file' ? '#f5f3ff' : '#fafafa',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: uploadMode === 'file' ? '#5b21b6' : '#374151' }}>
                    Upload TOC
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>
                    PDF or photo of your curriculum's table of contents
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('manual')}
                  style={{
                    padding: '14px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                    border: `2px solid ${uploadMode === 'manual' ? '#7c3aed' : '#e5e7eb'}`,
                    background: uploadMode === 'manual' ? '#f5f3ff' : '#fafafa',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>✏️</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: uploadMode === 'manual' ? '#5b21b6' : '#374151' }}>
                    Type or paste it in
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>
                    No TOC to upload? Enter lesson names directly
                  </div>
                </button>
              </div>

              {/* ── File upload path ── */}
              {uploadMode === 'file' && (
                <>
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
                      className="cursor-pointer inline-block text-white px-6 py-3 rounded-xl font-bold"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', fontFamily: "'Nunito', sans-serif" }}
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
                      disabled={loading || (useStartDate && scheduleDays.size === 0)}
                      className="w-full text-white py-3 rounded-xl font-bold disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', fontFamily: "'Nunito', sans-serif" }}
                    >
                      {loading ? 'Extracting Lessons...' : 'Extract Lessons'}
                    </button>
                  )}
                </>
              )}

              {/* ── Manual entry path ── */}
              {uploadMode === 'manual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Scout tip */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#ede9fe', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #ddd6fe' }}>
                    <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.55 }}>
                      <strong style={{ color: '#5b21b6', display: 'block', marginBottom: 2 }}>No TOC? No problem — Scout says:</strong>
                      Type or paste your lesson or chapter names below, one per line. You can copy them from your curriculum's website, a digital guide, or just type what you know you'll cover. Each line becomes one lesson.
                    </div>
                  </div>

                  <textarea
                    value={manualText}
                    onChange={e => setManualText(e.target.value)}
                    rows={7}
                    placeholder={`Chapter 1: Introduction to Fractions\nChapter 2: Adding and Subtracting Fractions\nChapter 3: Multiplying Fractions\nChapter 4: Dividing Fractions\n...`}
                    style={{
                      width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb',
                      borderRadius: 12, fontSize: 13, fontFamily: 'inherit', color: '#1a1a2e',
                      resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: -4 }}>
                    {manualText.split('\n').filter(l => l.trim()).length} lesson{manualText.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''} detected
                  </p>

                  <button
                    type="button"
                    onClick={parseManualLessons}
                    disabled={!manualText.trim() || (useStartDate && scheduleDays.size === 0)}
                    className="w-full text-white py-3 rounded-xl font-bold disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', fontFamily: "'Nunito', sans-serif" }}
                  >
                    Preview Lessons →
                  </button>
                </div>
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
                  className="flex-1 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', fontFamily: "'Nunito', sans-serif" }}
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
                className="mt-6 text-white px-6 py-3 rounded-xl font-bold"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', fontFamily: "'Nunito', sans-serif" }}
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* ── Sticky footer — Cancel always visible ── */}
        {step !== 'success' && (
          <div className="border-t px-6 py-3 flex-shrink-0 bg-white rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Cancel
            </button>
          </div>
        )}

      </div>
    </div>
  );
}