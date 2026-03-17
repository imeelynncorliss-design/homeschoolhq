'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'

type Child = {
  id: string;
  displayname: string;
  grade?: string;
  learning_style?: string;
};

type Course = {
  id: string;
  course_name: string;
  subject: string;
  status: string;
  grade_level: string;
};

type LessonVariation = {
  title: string;
  approach: string;
  description?: string;
  activities: Array<{ name: string; duration: string; description: string }>;
  materials: string[];
  learningObjectives?: string[];
  assessmentIdeas?: string[];
  overview?: string;
  extensions?: string[];
};

type LessonGeneratorProps = {
  kids: Child[];
  userId: string;
  onClose: () => void;
  initialDate?: string;
  initialKidId?: string;
  initialSubject?: string;
};

export default function LessonGenerator({ kids, userId, onClose, initialDate, initialKidId, initialSubject }: LessonGeneratorProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<LessonVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<LessonVariation | null>(null);
  // Collaborator state
  const [collaborators, setCollaborators] = useState<{id: string, user_id: string, name: string, email: string}[]>([]);
  const [assignedTo, setAssignedTo] = useState('');

  // Course state
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Subject dropdown state
  const [subjectSelect, setSubjectSelect] = useState(() => {
    if (!initialSubject) return ''
    return ([...CANONICAL_SUBJECTS] as string[]).includes(initialSubject) ? initialSubject : '__custom__'
  });
  const [subjectCustom, setSubjectCustom] = useState(() =>
    initialSubject && !([...CANONICAL_SUBJECTS] as string[]).includes(initialSubject) ? initialSubject : ''
  );
  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);

  // Adapt modal
  const [showAdaptModal, setShowAdaptModal] = useState(false);
  const [adaptTargetChildId, setAdaptTargetChildId] = useState('');

  // Form data
  const initialKid = initialKidId ? kids.find(k => k.id === initialKidId) : undefined
  const [formData, setFormData] = useState({
    childId: initialKidId || '',
    childName: initialKid?.displayname || '',
    gradeLevel: initialKid?.grade || '',
    subject: initialSubject || '',
    courseId: '',
    duration: 30,
    startDate: initialDate || new Date().toISOString().split('T')[0],
  });

  // ── Fetch org ID and existing custom subjects ──────────────────────────────
  useEffect(() => {
    const fetchOrgAndSubjects = async () => {
      if (!userId) return;
      try {
        const { data: kid } = await supabase
          .from('kids')
          .select('organization_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        let orgId = kid?.organization_id || null;
        if (!orgId) {
          const { data: collab } = await supabase
            .from('family_collaborators')
            .select('organization_id')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();
          orgId = collab?.organization_id || null;
        }

        if (orgId) {
          const { data: collabData } = await supabase
            .from('family_collaborators')
            .select('id, user_id, name, email')
            .eq('organization_id', orgId);
          if (collabData) setCollaborators(collabData);

          const { data: lessonSubjects } = await supabase
            .from('lessons')
            .select('subject')
            .eq('organization_id', orgId);

          if (lessonSubjects) {
            const unique = [...new Set(lessonSubjects.map((d: any) => d.subject).filter(Boolean))] as string[];
            setExistingSubjects(unique.filter((s: string) => !([...CANONICAL_SUBJECTS] as string[]).includes(s)));
          }
        }
      } catch (err) {
        console.error('Error fetching org/subjects:', err);
      }
    };
    fetchOrgAndSubjects();
  }, [userId]);

  // Fetch matching courses whenever child + subject both have values
  useEffect(() => {
    const resolvedSubject = resolveSubject();
    if (formData.childId && resolvedSubject && resolvedSubject !== '__custom__') {
      fetchCoursesForChildAndSubject(formData.childId, resolvedSubject);
    } else {
      setAvailableCourses([]);
      setFormData(prev => ({ ...prev, courseId: '' }));
    }
  }, [formData.childId, subjectSelect, subjectCustom]);

  const resolveSubject = () =>
    subjectSelect === '__custom__' ? subjectCustom.trim() : subjectSelect;

  // ── Course fetching ────────────────────────────────────────────────────────
  const fetchCoursesForChildAndSubject = async (kidId: string, subject: string) => {
    setLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_name, subject, status, grade_level')
        .eq('kid_id', kidId)
        .eq('subject', subject)
        .in('status', ['planned', 'in_progress'])
        .order('course_name');

      if (!error) {
        setAvailableCourses(data || []);
        setFormData(prev => ({ ...prev, courseId: '' }));
      }
    } catch (err) {
      console.error('Unexpected error fetching courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChildSelect = (childId: string) => {
    const child = kids.find(c => c.id === childId);
    if (child) {
      setFormData({
        ...formData,
        childId,
        childName: child.displayname,
        gradeLevel: child.grade || '',
        courseId: '',
      });
    }
  };

  const generateLessons = async () => {
    const resolved = resolveSubject();
    if (!resolved) { alert('Please select or enter a subject'); return; }
    setFormData(prev => ({ ...prev, subject: resolved }));

    setLoading(true);
    setStep(2);
    try {
      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, subject: resolved }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Server error ${response.status}`);
      }
      const data = await response.json();
      setVariations(data.variations || []);
      setStep(3);
    } catch (error: any) {
      alert(`Failed to generate lessons: ${error.message}`);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const saveLesson = async (variation: LessonVariation) => {
    if (!formData.childId) { alert('Please select a child first'); return; }
    try {
      const { data: kid, error: kidError } = await supabase
        .from('kids').select('organization_id, displayname').eq('id', formData.childId).single();
      if (kidError) console.error('Error fetching kid:', kidError);
      if (!kid?.organization_id) { alert('Could not find organization. Please refresh.'); return; }

      const lessonPayload: any = {
        kid_id: formData.childId,
        user_id: userId,
        subject: formData.subject,
        title: variation.title,
        description: JSON.stringify(variation),
        lesson_source: 'scout',
        lesson_date: formData.startDate,
        duration_minutes: Number(formData.duration) || 30,
        status: 'not_started',
        organization_id: kid.organization_id,
        assigned_to_user_id: assignedTo || null,
      };

      if (formData.courseId) lessonPayload.course_id = formData.courseId;

      const { error } = await supabase.from('lessons').insert([lessonPayload]).select().single();

      if (error) {
        alert(`❌ Failed to save lesson: ${error.message}`);
      } else {
        const formattedDate = new Date(formData.startDate + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        const courseNote = formData.courseId
          ? `\n📚 Added to: ${availableCourses.find(c => c.id === formData.courseId)?.course_name || 'course'}`
          : '';
        setSelectedVariation(variation);
        alert(`✅ Lesson scheduled!\n\n"${variation.title}" scheduled for ${kid.displayname} on ${formattedDate}.${courseNote}`);
      }
    } catch (error: any) {
      alert(`❌ Failed to save lesson: ${error.message}`);
    }
  };

  const saveAdaptedLesson = async () => {
    if (!adaptTargetChildId || !selectedVariation) return;
    const targetChild = kids.find(c => c.id === adaptTargetChildId);
    if (!targetChild) return;
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { alert('You must be logged in to save lessons'); return; }

      const { error } = await supabase.from('lessons').insert([{
        kid_id: adaptTargetChildId,
        user_id: data.user.id,
        subject: formData.subject,
        title: selectedVariation.title,
        description: JSON.stringify(selectedVariation),
        lesson_source: 'scout',
        lesson_date: formData.startDate,
        duration_minutes: formData.duration,
        status: 'not_started',
      }]).select();

      if (error) { alert(`Failed to adapt lesson: ${error.message}`); }
      else {
        alert(`Lesson adapted for ${targetChild.displayname}!`);
        setShowAdaptModal(false);
        setAdaptTargetChildId('');
        onClose();
      }
    } catch (err) { alert('Failed to adapt lesson. Please try again.'); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <h2 className="text-2xl font-bold text-gray-900">Generate a Lesson</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">✕</button>
        </div>

        {/* ── Step 1: Who & What ── */}
        {step === 1 && (
          <div className="space-y-4">

            {/* Child */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Select Student</label>
              <select
                value={formData.childId}
                onChange={(e) => handleChildSelect(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-gray-900"
              >
                <option value="">Choose a student…</option>
                {kids.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.displayname}{child.grade ? ` (${child.grade})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Subject</label>
              <select
                value={subjectSelect}
                onChange={(e) => setSubjectSelect(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a subject…</option>
                <optgroup label="Standard Subjects">
                  {CANONICAL_SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
                {existingSubjects.length > 0 && (
                  <optgroup label="Your Custom Subjects">
                    {existingSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                )}
                <option value="__custom__">✏️ Add a new custom subject…</option>
              </select>

              {subjectSelect === '__custom__' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={subjectCustom}
                    onChange={(e) => setSubjectCustom(e.target.value)}
                    placeholder="e.g., Latin, Robotics, Home Economics"
                    className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Use title case (e.g., "Latin" not "latin") so lessons group correctly.
                  </p>
                </div>
              )}
            </div>

            {/* Course selector — only shown when child + subject are both selected */}
            {formData.childId && resolveSubject() && resolveSubject() !== '__custom__' && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Add to Course <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                {loadingCourses ? (
                  <div className="border rounded-lg px-3 py-2 text-sm text-gray-500">Loading courses…</div>
                ) : availableCourses.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-lg px-3 py-3 bg-gray-50">
                    <p className="text-sm text-gray-500">
                      No active {resolveSubject()} courses for {formData.childName}.{' '}
                      <a href="/transcript" className="text-blue-600 hover:underline">Create a course</a>{' '}
                      to link lessons to transcripts.
                    </p>
                  </div>
                ) : (
                  <>
                    <select
                      value={formData.courseId}
                      onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-gray-900"
                    >
                      <option value="">No course — save as standalone lesson</option>
                      {availableCourses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.course_name} ({course.grade_level} · {course.status.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                    {formData.courseId && (
                      <p className="text-xs text-green-700 mt-1">
                        ✓ This lesson will count toward the {availableCourses.find(c => c.id === formData.courseId)?.course_name} transcript
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Duration</label>
              <div className="flex gap-2">
                {[15, 30, 45, 60].map(min => (
                  <button
                    key={min}
                    onClick={() => setFormData({ ...formData, duration: min })}
                    className={`px-4 py-2 rounded-lg ${formData.duration === min ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                  >
                    {min} min
                  </button>
                ))}
              </div>
            </div>

            {/* Assign To (collaborators only) */}
            {collaborators.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Assign To <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                >
                  <option value="">Me (primary teacher)</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.user_id}>{c.name || c.email}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Schedule For</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-gray-900"
              />
            </div>

            <button
              onClick={generateLessons}
              disabled={
                !formData.childId ||
                !subjectSelect ||
                (subjectSelect === '__custom__' && !subjectCustom.trim())
              }
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed font-semibold"
            >
              ✨ Generate Lesson Plans
            </button>
          </div>
        )}

        {/* ── Step 2: Loading ── */}
        {step === 2 && loading && (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 44, height: 44, objectFit: 'contain' }} />
              </div>
            </div>
            <div className="mt-8 text-center space-y-3">
              <h3 className="text-2xl font-bold text-gray-900">✨ Scout is planning your lesson</h3>
              <p className="text-gray-600 max-w-md">
                Generating 3 lesson plan variations tailored to{' '}
                <span className="font-semibold text-blue-600">{formData.childName || 'your student'}</span>…
              </p>
              <div className="mt-6 space-y-2 text-sm text-gray-500">
                {['Reviewing student profile', 'Designing lesson structure', 'Writing objectives & assessment'].map(label => (
                  <div key={label} className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-6 italic">This usually takes 15–20 seconds…</p>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview & Choose ── */}
        {step === 3 && variations.length > 0 && (
          <div className="space-y-4">

            {formData.courseId && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-green-600 text-sm font-medium">📚</span>
                <p className="text-sm text-green-800">
                  The selected lesson will be added to <strong>{availableCourses.find(c => c.id === formData.courseId)?.course_name}</strong>
                </p>
              </div>
            )}

            <p className="text-gray-600 mb-4">Choose the lesson plan that works best for {formData.childName}:</p>

            <div className="grid md:grid-cols-3 gap-4">
              {variations.map((variation, index) => (
                <div key={index} className="border-2 rounded-lg overflow-hidden hover:border-blue-500 transition-colors bg-white shadow-sm">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{variation.title}</h3>
                    <p className="text-sm text-gray-600">{variation.description || variation.approach}</p>
                  </div>
                  <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                    {variation.activities?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900 mb-2">📋 Lesson Steps ({variation.activities.length}):</h4>
                        <div className="space-y-2">
                          {variation.activities.map((activity, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-medium text-sm text-gray-900">{activity.name}</p>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">{activity.duration}</span>
                              </div>
                              <p className="text-xs text-gray-600">{activity.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {variation.learningObjectives && variation.learningObjectives.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900 mb-2">🎓 Learning Objectives:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {variation.learningObjectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">•</span><span>{obj}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 border-t">
                    <button
                      onClick={() => saveLesson(variation)}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-semibold transition-colors"
                    >
                      {loading ? 'Saving…' : 'Schedule This Lesson'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-3">Don't like these options?</p>
              <div className="flex gap-3">
                <button onClick={generateLessons} disabled={loading} className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-purple-400 font-medium">
                  {loading ? '🔄 Regenerating…' : '🔄 Try Different Options'}
                </button>
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900">← Change Settings</button>
              </div>
            </div>

            <button onClick={onClose} className="w-full border-2 border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">Cancel & Close</button>
          </div>
        )}

        {/* ── Adapt Modal ── */}
        {showAdaptModal && selectedVariation && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">📚</div>
              <h3 className="text-xl font-bold text-gray-900">Adapt Lesson for Another Student</h3>
              <p className="text-sm text-gray-600 mt-2">"{selectedVariation.title}" will be copied to the selected student</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Select Student</label>
              <select value={adaptTargetChildId} onChange={(e) => setAdaptTargetChildId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900">
                <option value="">Choose a student…</option>
                {kids.filter(child => child.id !== formData.childId).map(child => (
                  <option key={child.id} value={child.id}>{child.displayname}{child.grade ? ` (${child.grade})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={saveAdaptedLesson} disabled={!adaptTargetChildId} className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                Save for {adaptTargetChildId ? kids.find(c => c.id === adaptTargetChildId)?.displayname : 'Student'}
              </button>
              <button onClick={() => { setShowAdaptModal(false); setAdaptTargetChildId(''); }} className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900">Cancel</button>
            </div>
            <button onClick={onClose} className="w-full text-sm text-gray-600 hover:text-gray-900">Close</button>
          </div>
        )}

      </div>
    </div>
  );
}
