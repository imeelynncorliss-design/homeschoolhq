'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'
import { printHeader, printHeaderCSS } from '@/lib/printHeader'

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
  onLessonSaved?: () => void;
  initialDate?: string;
  initialKidId?: string;
  initialSubject?: string;
  homeschoolStyle?: 'flexible' | 'structured' | null;
};

export default function LessonGenerator({ kids, userId, onClose, onLessonSaved, initialDate, initialKidId, initialSubject, homeschoolStyle }: LessonGeneratorProps) {
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
    topic: '',
  });
  const [durationDays, setDurationDays] = useState(1);

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
        body: JSON.stringify({ ...formData, subject: resolved, homeschoolStyle }),
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

  const printVariation = (variation: LessonVariation) => {
    const activitiesHtml = variation.activities?.length
      ? `<h3>Lesson Steps</h3><ol>${variation.activities.map(a => `
          <li><strong>${a.name}</strong> <span class="dur">(${a.duration})</span>
          ${a.description ? `<p>${a.description}</p>` : ''}</li>`).join('')}</ol>`
      : ''
    const objectivesHtml = variation.learningObjectives?.length
      ? `<h3>Learning Objectives</h3><ul>${variation.learningObjectives.map(o => `<li>${o}</li>`).join('')}</ul>`
      : ''
    const materialsHtml = variation.materials?.length
      ? `<h3>Materials</h3><ul>${variation.materials.map(m => `<li>${m}</li>`).join('')}</ul>`
      : ''
    const assessmentHtml = variation.assessmentIdeas?.length
      ? `<h3>Assessment Ideas</h3><ul>${variation.assessmentIdeas.map(a => `<li>${a}</li>`).join('')}</ul>`
      : ''
    const origin = window.location.origin
    const html = `<!DOCTYPE html><html><head><title>${variation.title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; color: #1f2937; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 22px; font-weight: 900; color: #2d1b69; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
  h3 { font-size: 14px; font-weight: 700; color: #1a1a2e; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  ol, ul { margin: 0 0 12px; padding-left: 20px; }
  li { margin-bottom: 6px; }
  .dur { font-size: 11px; color: #7c6faa; font-weight: 600; }
  p { margin: 2px 0 6px; font-size: 13px; color: #4b5563; }
  @media print { body { margin: 20px; } }
  ${printHeaderCSS()}
</style></head><body>
${printHeader(origin, true)}
<h1>${variation.title}</h1>
<div class="meta">${formData.subject} · ${formData.childName} · ${formData.duration} min · ${new Date(formData.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
${variation.overview ? `<p style="font-size:14px;color:#374151;margin-bottom:16px;">${variation.overview}</p>` : ''}
${objectivesHtml}${activitiesHtml}${materialsHtml}${assessmentHtml}
</body></html>`
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  const saveLesson = async (variation: LessonVariation) => {
    if (!formData.childId) { alert('Please select a child first'); return; }
    try {
      const { data: kid, error: kidError } = await supabase
        .from('kids').select('organization_id, displayname').eq('id', formData.childId).single();
      if (kidError) console.error('Error fetching kid:', kidError);
      if (!kid?.organization_id) { alert('Could not find organization. Please refresh.'); return; }

      const baseDate = new Date(formData.startDate + 'T12:00:00');
      const days = Math.max(1, durationDays);

      const lessonPayloads = Array.from({ length: days }, (_, i) => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const title = days > 1 ? `${variation.title} — Day ${i + 1} of ${days}` : variation.title;
        const payload: any = {
          kid_id: formData.childId,
          user_id: userId,
          subject: formData.subject,
          title,
          description: JSON.stringify(variation),
          lesson_source: 'scout',
          lesson_date: dateStr,
          duration_minutes: Number(formData.duration) || 30,
          status: 'not_started',
          organization_id: kid.organization_id,
          assigned_to_user_id: assignedTo || null,
        };
        if (formData.courseId) payload.course_id = formData.courseId;
        return payload;
      });

      const { error } = await supabase.from('lessons').insert(lessonPayloads);

      if (error) {
        alert(`❌ Failed to save lesson: ${error.message}`);
      } else {
        const formattedDate = baseDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const courseNote = formData.courseId
          ? `\n📚 Added to: ${availableCourses.find(c => c.id === formData.courseId)?.course_name || 'course'}`
          : '';
        const dayNote = days > 1 ? `\n📅 Spread over ${days} days (${formData.duration} min each)` : '';
        setSelectedVariation(variation);
        onLessonSaved?.();
        alert(`✅ Lesson scheduled!\n\n"${variation.title}" for ${kid.displayname} starting ${formattedDate}.${dayNote}${courseNote}`);
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
    <div className="fixed inset-0 flex items-center justify-center z-[500]" style={{ background: 'rgba(0,0,0,0.55)', padding: '16px 16px 88px' }}>
      <div className="bg-white w-full overflow-hidden flex flex-col" style={{
        maxWidth: step === 3 ? 900 : 560,
        maxHeight: 'calc(100vh - 104px)',
        borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        fontFamily: "'Nunito', sans-serif",
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <h2 style={{ fontSize: 16, fontWeight: 900, color: '#fff', margin: 0 }}>Generate a Lesson with Scout</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', width: 28, height: 28, cursor: 'pointer', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div className="overflow-y-auto" style={{ padding: '14px 18px', flex: 1 }}>

        {/* ── Step 1: Who & What ── */}
        {step === 1 && (
          <div className="space-y-3">

            {/* HS note */}
            <div style={{ background: '#f5f3ff', border: '1.5px solid #ede9fe', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🏠</span>
              <p style={{ margin: 0, fontSize: 12, color: '#5b21b6', lineHeight: 1.5, fontWeight: 600 }}>
                Scout&apos;s lesson plans are designed for homeschool families. Lessons are tailored to your child&apos;s learning style and can be linked to a course for transcript tracking.
              </p>
            </div>

            {/* Child */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Select Student</label>
              <select
                value={formData.childId}
                onChange={(e) => handleChildSelect(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-1.5 text-gray-900 focus:border-purple-500 focus:outline-none"
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
              <label className="block text-sm font-medium text-gray-900 mb-1">Subject</label>
              <select
                value={subjectSelect}
                onChange={(e) => setSubjectSelect(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-1.5 text-gray-900 focus:border-purple-500 focus:outline-none"
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
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-1.5 text-gray-900 focus:border-purple-500 focus:outline-none"
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
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Add to Course <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                {loadingCourses ? (
                  <div className="border rounded-lg px-3 py-2 text-sm text-gray-500">Loading courses…</div>
                ) : availableCourses.length === 0 ? (
                  <div style={{ border: '1.5px dashed #e5e7eb', borderRadius: 10, padding: '10px 12px', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                      No active <strong>{resolveSubject()}</strong> courses for {formData.childName}.
                    </p>
                    <a href="/courses" style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap' as const, textDecoration: 'none', background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: 8, padding: '4px 10px' }}>
                      + Create course
                    </a>
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

            {/* Goal / Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Goal or Topic <span className="text-gray-400 font-normal">(what should this lesson be about?)</span>
              </label>
              <textarea
                rows={3}
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g. Intro to fractions, Chapter 5 vocabulary, American Revolution causes, the story of Noah over 3 days…"
                className="w-full border rounded-lg px-3 py-2 text-gray-900 resize-none"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Session Length</label>
              <div className="flex gap-2 flex-wrap">
                {[15, 30, 45, 60].map(min => (
                  <button
                    key={min}
                    onClick={() => setFormData({ ...formData, duration: min })}
                    className={`px-4 py-2 rounded-lg text-sm font-bold ${formData.duration === min ? 'text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    style={formData.duration === min ? { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' } : {}}
                  >
                    {min} min
                  </button>
                ))}
              </div>
            </div>

            {/* Days */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Spread over <span className="text-gray-400 font-normal">(creates one lesson per consecutive day)</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map(d => (
                  <button
                    key={d}
                    onClick={() => setDurationDays(d)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold ${durationDays === d ? 'text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    style={durationDays === d ? { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' } : {}}
                  >
                    {d === 1 ? '1 day' : `${d} days`}
                  </button>
                ))}
              </div>
              {durationDays > 1 && (
                <p style={{ fontSize: 12, color: '#7c3aed', marginTop: 6, fontWeight: 600 }}>
                  ✓ Saves {durationDays} lessons ({formData.duration} min each) on {durationDays} consecutive days starting on the date below
                </p>
              )}
            </div>

            {/* Assign To (collaborators only) */}
            {collaborators.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
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
              <label className="block text-sm font-medium text-gray-900 mb-1">Schedule For</label>
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
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{
                background: (!formData.childId || !subjectSelect || (subjectSelect === '__custom__' && !subjectCustom.trim()))
                  ? '#e5e7eb'
                  : 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a855f7 100%)',
                color: (!formData.childId || !subjectSelect || (subjectSelect === '__custom__' && !subjectCustom.trim()))
                  ? '#9ca3af'
                  : '#fff',
                boxShadow: (!formData.childId || !subjectSelect || (subjectSelect === '__custom__' && !subjectCustom.trim()))
                  ? 'none'
                  : '0 4px 14px rgba(124,58,237,0.35)',
                cursor: (!formData.childId || !subjectSelect || (subjectSelect === '__custom__' && !subjectCustom.trim()))
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              ✨ Generate Lesson Plans
            </button>
          </div>
        )}

        {/* ── Step 2: Loading ── */}
        {step === 2 && loading && (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
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
                <div key={index} className="border-2 rounded-xl overflow-hidden hover:border-purple-400 transition-colors bg-white shadow-sm">
                  <div className="p-4 border-b" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
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
                                <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: '#ede9fe', color: '#7c3aed' }}>{activity.duration}</span>
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
                  <div className="p-4 bg-gray-50 border-t flex gap-2">
                    <button
                      onClick={() => saveLesson(variation)}
                      disabled={loading}
                      className="flex-1 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
                    >
                      {loading ? 'Saving…' : 'Schedule This Lesson'}
                    </button>
                    <button
                      onClick={() => printVariation(variation)}
                      title="Print this lesson plan"
                      className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 text-lg transition-colors"
                    >
                      🖨️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-4 text-center" style={{ background: '#f5f3ff', border: '1px solid #ede9fe' }}>
              <p className="text-sm text-gray-600 mb-3">Don't like these options?</p>
              <div className="flex gap-3">
                <button onClick={generateLessons} disabled={loading} className="flex-1 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
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
              <button onClick={saveAdaptedLesson} disabled={!adaptTargetChildId} className="flex-1 text-white py-3 rounded-xl font-bold disabled:bg-gray-300 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                Save for {adaptTargetChildId ? kids.find(c => c.id === adaptTargetChildId)?.displayname : 'Student'}
              </button>
              <button onClick={() => { setShowAdaptModal(false); setAdaptTargetChildId(''); }} className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900">Cancel</button>
            </div>
            <button onClick={onClose} className="w-full text-sm text-gray-600 hover:text-gray-900">Close</button>
          </div>
        )}

        </div>{/* end scrollable content */}
      </div>{/* end modal card */}
    </div>
  );
}
