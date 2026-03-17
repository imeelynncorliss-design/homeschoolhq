'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/src/lib/supabase/client';
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kid {
  id: string;
  displayname: string;
  grade: string | null;
  learning_style: string | null;
  subjects: string[] | null;
}

interface KidDraft {
  kidId: string;
  displayname: string;
  grade: string;
  learningStyle: string;
  subjects: string[];
}

export interface SetupWizardProps {
  organizationId: string;
  onComplete: () => void;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEARNING_STYLES = [
  { value: 'visual',         label: 'Visual Learner',      emoji: '👁️', description: 'Learns best through images, diagrams, charts, and color-coding.' },
  { value: 'auditory',       label: 'Auditory Learner',    emoji: '🎵', description: 'Absorbs information through listening, discussion, and read-alouds.' },
  { value: 'kinesthetic',    label: 'Hands-On Learner',    emoji: '🤲', description: 'Needs to touch, move, and do. Learns through experiments and building.' },
  { value: 'reading_writing',label: 'Reading & Writing',   emoji: '📝', description: 'Prefers text-based input and output. Loves lists, notes, and written work.' },
  { value: 'logical',        label: 'Logical Thinker',     emoji: '🧩', description: 'Drawn to patterns and reasoning. Excels at math, coding, and problem-solving.' },
  { value: 'social',         label: 'Social Learner',      emoji: '🤝', description: 'Learns best in groups. Thrives with co-op classes and collaborative projects.' },
  { value: 'mixed',          label: 'Mixed / Not Sure Yet',emoji: '🌈', description: "Uses a blend of styles depending on the subject — totally okay!" },
];

const GRADE = [
  'Pre-K', 'Kindergarten',
  '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade',
  '6th Grade', '7th Grade', '8th Grade',
  '9th Grade', '10th Grade', '11th Grade', '12th Grade',
  'College Prep',
];

// ─── Design tokens ────────────────────────────────────────────────────────────

const t = {
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  purpleMid: '#6D28D9',
  teal: '#0D9488',
  tealLight: '#CCFBF1',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  gray800: '#1F2937',
  white: '#FFFFFF',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SetupWizard({ organizationId, onComplete, onClose }: SetupWizardProps) {
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const [kids, setKids] = useState<Kid[]>([]);
  const [drafts, setDrafts] = useState<KidDraft[]>([]);
  const [activeKidIndex, setActiveKidIndex] = useState(0);
  const [showQuizFor, setShowQuizFor] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    loadData();
  }, []);

  async function loadData() {
    try {
      const supabase = createClient();
      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname, grade, learning_style, subjects')
        .eq('organization_id', organizationId)
        .order('displayname');

      const loaded = kidsData ?? [];
      setKids(loaded);
      setDrafts(loaded.map((k: Kid) => ({
        kidId: k.id,
        displayname: k.displayname,
        grade: k.grade ?? '',
        learningStyle: k.learning_style ?? '',
        subjects: k.subjects ?? [],
      })));
    } catch (err) {
      setError('Failed to load children. Please try again.');
    } finally {
      setLoadingData(false);
    }
  }

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  function getDraft(kidId: string): KidDraft {
    return drafts.find(d => d.kidId === kidId) ?? {
      kidId, displayname: '', grade: '' , learningStyle: '', subjects: [],
    };
  }

  function updateDraft(kidId: string, patch: Partial<KidDraft>) {
    setDrafts(prev => prev.map(d => d.kidId === kidId ? { ...d, ...patch } : d));
  }

  function toggleSubject(kidId: string, subject: string) {
    const draft = getDraft(kidId);
    const subjects = draft.subjects.includes(subject)
      ? draft.subjects.filter(s => s !== subject)
      : [...draft.subjects, subject];
    updateDraft(kidId, { subjects });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      await Promise.all(
        drafts.map(draft =>
          supabase.from('kids').update({
            grade: draft.grade || null,
            learning_style: draft.learningStyle || null,
            subjects: draft.subjects.length > 0 ? draft.subjects : null,
            updated_at: new Date().toISOString(),
          }).eq('id', draft.kidId).eq('organization_id', organizationId)
        )
      );
      setVisible(false);
      setTimeout(onComplete, 300);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const activeKid = kids[activeKidIndex];
  const activeDraft = activeKid ? getDraft(activeKid.id) : null;
  const allDraftsHaveSubjects = drafts.every(d => d.subjects.length > 0);

  // ── Styles ────────────────────────────────────────────────────────────────

  const s = {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(0,0,0,0.45)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'flex-end',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    },
    drawer: {
      width: '500px',
      maxWidth: '100vw',
      height: '100%',
      background: t.white,
      boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      display: 'flex',
      flexDirection: 'column' as const,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
    },
    header: {
      background: `linear-gradient(135deg, ${t.purple} 0%, ${t.purpleMid} 100%)`,
      padding: '24px 24px 20px',
      flexShrink: 0,
    },
    headerTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '4px',
    },
    headerTitle: { color: t.white, fontSize: '20px', fontWeight: 800, margin: 0 },
    headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: '13px', margin: '4px 0 16px' },
    closeBtn: {
      background: 'rgba(255,255,255,0.15)',
      border: 'none',
      color: t.white,
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    // Kid tabs inside header
    kidTabRow: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap' as const,
    },
    kidTab: (active: boolean) => ({
      padding: '7px 16px',
      borderRadius: '20px',
      border: active ? '2px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.3)',
      background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
      color: active ? t.white : 'rgba(255,255,255,0.7)',
      fontWeight: 700,
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }),
    kidTabDot: (hasSubjects: boolean) => ({
      display: 'inline-block',
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: hasSubjects ? '#34d399' : 'rgba(255,255,255,0.4)',
      marginLeft: '6px',
      verticalAlign: 'middle',
    }),
    body: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '20px 24px',
    },
    sectionTitle: {
      fontSize: '13px',
      fontWeight: 700,
      color: t.gray600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      margin: '0 0 10px',
    },
    sectionDivider: {
      borderTop: `1px solid ${t.gray200}`,
      margin: '20px 0',
    },
    subjectGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '8px',
      marginBottom: '8px',
    },
    subjectChip: (selected: boolean) => ({
      padding: '9px 12px',
      borderRadius: '10px',
      border: selected ? `2px solid ${t.purple}` : `2px solid ${t.gray200}`,
      background: selected ? t.purpleLight : t.white,
      cursor: 'pointer',
      textAlign: 'center' as const,
      fontWeight: 600,
      fontSize: '13px',
      color: selected ? t.purple : t.gray600,
      transition: 'all 0.15s ease',
      lineHeight: 1.3,
    }),
    formGroup: { marginBottom: '16px' },
    label: {
      fontSize: '12px',
      fontWeight: 600,
      color: t.gray600,
      marginBottom: '6px',
      display: 'block',
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '10px',
      border: `1.5px solid ${t.gray200}`,
      fontSize: '14px',
      color: t.gray800,
      background: t.white,
      boxSizing: 'border-box' as const,
      outline: 'none',
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '10px',
      border: `1.5px solid ${t.gray200}`,
      fontSize: '14px',
      color: t.gray800,
      background: t.white,
      boxSizing: 'border-box' as const,
      outline: 'none',
      cursor: 'pointer',
    },
    styleCard: (selected: boolean) => ({
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '11px 14px',
      borderRadius: '12px',
      border: selected ? `2px solid ${t.purple}` : `2px solid ${t.gray200}`,
      background: selected ? t.purpleLight : t.white,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      marginBottom: '7px',
    }),
    quizLink: {
      color: t.purple,
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      padding: 0,
      textDecoration: 'underline',
      textUnderlineOffset: '2px',
    },
    footer: {
      padding: '16px 24px',
      borderTop: `1px solid ${t.gray100}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: t.white,
      flexShrink: 0,
    },
    cancelBtn: {
      background: 'none',
      border: `1.5px solid ${t.gray200}`,
      borderRadius: '10px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 600,
      color: t.gray600,
      cursor: 'pointer',
    },
    saveBtn: (disabled: boolean) => ({
      background: disabled
        ? t.gray200
        : `linear-gradient(135deg, ${t.purple}, ${t.purpleMid})`,
      color: disabled ? t.gray400 : t.white,
      border: 'none',
      borderRadius: '10px',
      padding: '10px 28px',
      fontSize: '14px',
      fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : '0 4px 12px rgba(124,58,237,0.3)',
    }),
    errorBox: {
      background: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: '10px',
      padding: '10px 14px',
      color: '#DC2626',
      fontSize: '13px',
      marginBottom: '12px',
    },
    emptyHint: {
      textAlign: 'center' as const,
      color: t.gray400,
      fontSize: '13px',
      padding: '40px 20px',
      fontStyle: 'italic',
    },
    skipNote: {
      fontSize: '12px',
      color: t.gray400,
      fontStyle: 'italic',
      marginTop: '6px',
    },
    progressNote: {
      fontSize: '12px',
      color: t.gray600,
      background: t.gray50,
      borderRadius: '8px',
      padding: '8px 12px',
      marginTop: '4px',
    },
  };

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={s.drawer}>

        {/* ── Header ── */}
        <div style={s.header}>
          <div style={s.headerTop}>
            <div style={{ flex: 1 }}>
              <p style={s.headerTitle}>🎯 Set Up Your School</p>
              <p style={s.headerSub}>
                Choose subjects & complete each child's profile
              </p>
            </div>
            <button style={s.closeBtn} onClick={handleClose}>×</button>
          </div>

          {/* Kid tabs */}
          {kids.length > 1 && (
            <div style={s.kidTabRow}>
              {kids.map((kid, i) => {
                const draft = getDraft(kid.id);
                return (
                  <button
                    key={kid.id}
                    style={s.kidTab(i === activeKidIndex)}
                    onClick={() => { setActiveKidIndex(i); setShowQuizFor(null); }}
                  >
                    {kid.displayname}
                    <span style={s.kidTabDot(draft.subjects.length > 0)} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={s.body}>
          {error && <div style={s.errorBox}>{error}</div>}

          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '40px', color: t.gray400 }}>
              Loading…
            </div>
          ) : kids.length === 0 ? (
            <div style={s.emptyHint}>
              No children found. Add a child from your dashboard first.
            </div>
          ) : !activeKid || !activeDraft ? null : (
            <>
              {/* ── Subjects ── */}
              <p style={s.sectionTitle}>
                Subjects for {kids.length === 1 ? activeKid.displayname : 'this child'}
              </p>

              <div style={s.subjectGrid}>
                {CANONICAL_SUBJECTS.map(subject => (
                  <div
                    key={subject}
                    style={s.subjectChip(activeDraft.subjects.includes(subject))}
                    onClick={() => toggleSubject(activeKid.id, subject)}
                  >
                    {subject}
                  </div>
                ))}
              </div>

              {activeDraft.subjects.length === 0 && (
                <p style={s.skipNote}>Select at least one subject — you can always change this later.</p>
              )}

              {activeDraft.subjects.length > 0 && (
                <p style={s.progressNote}>
                  ✓ {activeDraft.subjects.length} subject{activeDraft.subjects.length !== 1 ? 's' : ''} selected
                </p>
              )}

              <div style={s.sectionDivider} />

              {/* ── Profile ── */}
              <p style={s.sectionTitle}>Profile details</p>


              <div style={s.formGroup}>
                <label style={s.label}>Grade Level</label>
                <select
                  style={s.select}
                  value={activeDraft.grade}
                  onChange={e => updateDraft(activeKid.id, { grade: e.target.value })}
                >
                  <option value="">Select grade level…</option>
                  {GRADE.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Learning Style</label>

                {activeDraft.learningStyle && showQuizFor !== activeKid.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>
                      {LEARNING_STYLES.find(ls => ls.value === activeDraft.learningStyle)?.emoji}
                    </span>
                    <span style={{ fontWeight: 600, color: t.gray800, fontSize: '14px' }}>
                      {LEARNING_STYLES.find(ls => ls.value === activeDraft.learningStyle)?.label}
                    </span>
                    <button style={s.quizLink} onClick={() => setShowQuizFor(activeKid.id)}>
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    {showQuizFor !== activeKid.id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ color: t.gray400, fontSize: '13px' }}>Not sure?</span>
                        <button style={s.quizLink} onClick={() => setShowQuizFor(activeKid.id)}>
                          Take the quick quiz ↓
                        </button>
                      </div>
                    )}

                    {showQuizFor === activeKid.id && (
                      <>
                        {LEARNING_STYLES.map(ls => (
                          <div
                            key={ls.value}
                            style={s.styleCard(activeDraft.learningStyle === ls.value)}
                            onClick={() => {
                              updateDraft(activeKid.id, { learningStyle: ls.value });
                              setShowQuizFor(null);
                            }}
                          >
                            <span style={{ fontSize: '20px', flexShrink: 0 }}>{ls.emoji}</span>
                            <div>
                              <div style={{
                                fontWeight: 700,
                                fontSize: '13px',
                                color: activeDraft.learningStyle === ls.value ? t.purple : t.gray800,
                                marginBottom: '2px',
                              }}>
                                {ls.label}
                              </div>
                              <div style={{ fontSize: '12px', color: t.gray600, lineHeight: 1.4 }}>
                                {ls.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {showQuizFor !== activeKid.id && !activeDraft.learningStyle && (
                      <p style={s.skipNote}>Optional — you can update this from the child's profile later.</p>
                    )}
                  </>
                )}
              </div>

              {/* Multi-kid hint */}
              {kids.length > 1 && (
                <div style={s.progressNote}>
                  💡 Use the tabs at the top to set up each child.
                  {!allDraftsHaveSubjects && ' Green dot = subjects selected.'}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={handleClose}>Cancel</button>
          <button
            style={s.saveBtn(saving)}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : '🎉 Save & Finish'}
          </button>
        </div>

      </div>
    </div>
  );
}