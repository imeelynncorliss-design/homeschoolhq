'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import { getOrganizationId } from '@/src/lib/getOrganizationId'

const GRADIENT = 'linear-gradient(135deg, #c4b5fd 0%, #e879f9 18%, #f0abfc 36%, #fbcfe8 54%, #bae6fd 76%, #6ee7b7 100%)'

// ─── Data ──────────────────────────────────────────────────────────────────────

const STYLES: Record<string, { label: string; desc: string; detail: string }> = {
  charlotte_mason: {
    label:  'Charlotte Mason',
    desc:   'Living books, nature study, and narration.',
    detail: 'Short, focused lessons that connect learning to the real world through beauty and wonder.',
  },
  traditional: {
    label:  'Traditional',
    desc:   'Textbooks, workbooks, and scheduled lessons.',
    detail: 'Closest to a classroom experience — structured, predictable, and thorough.',
  },
  eclectic: {
    label:  'Eclectic',
    desc:   'Mix and match methods based on what works.',
    detail: 'You pick the best tool for each subject and each child — no single method owns you.',
  },
  classical: {
    label:  'Classical',
    desc:   'Grammar, logic, rhetoric — teaching how to think.',
    detail: 'Three stages of learning that build reasoning, virtue, and eloquence.',
  },
  montessori: {
    label:  'Montessori',
    desc:   "Child-led, hands-on learning at each child's own pace.",
    detail: 'Prepared environments let children follow their natural developmental stages — hands-on, self-paced, and deeply respectful.',
  },
  waldorf: {
    label:  'Waldorf',
    desc:   'Arts-integrated learning aligned with seasonal rhythms.',
    detail: "Nurtures the whole child — head, heart, and hands — through imagination, art, and rhythmic routines.",
  },
  unit_studies: {
    label:  'Unit Studies',
    desc:   'Deep dives into one topic that connect all subjects.',
    detail: 'Build weeks or months around a single theme — Ancient Egypt, the ocean, the Civil War — weaving every subject in naturally.',
  },
  unschooling: {
    label:  'Unschooling',
    desc:   "Learning flows from your child's interests.",
    detail: 'Trust the learner, follow the curiosity. Life is the curriculum.',
  },
}

const QUESTIONS = [
  {
    q: 'How do you like to plan your school week?',
    options: [
      { text: 'Map it all out — structured schedule, predictable days',             style: 'traditional'    },
      { text: 'A gentle rhythm with room to slow down for something wonderful',     style: 'charlotte_mason' },
      { text: 'Loosely — we adjust based on what the week throws at us',            style: 'eclectic'       },
      { text: 'We follow wherever curiosity leads that day',                         style: 'unschooling'    },
      { text: 'Deeply planned around a few core skills we master before moving on', style: 'classical'      },
    ],
  },
  {
    q: 'What learning materials excite you most?',
    options: [
      { text: 'Textbooks and workbooks with clear scope and sequence',              style: 'traditional'    },
      { text: 'Living books, nature journals, and hands-on projects',               style: 'charlotte_mason' },
      { text: 'Whatever fits the topic — books, videos, experiments, field trips',  style: 'eclectic'       },
      { text: 'Real life experiences: cooking, gardening, travel, making things',   style: 'unschooling'    },
      { text: 'Classic literature, logic puzzles, and primary sources',             style: 'classical'      },
    ],
  },
  {
    q: "How do you measure your child's progress?",
    options: [
      { text: 'Tests, quizzes, and grades',                                         style: 'traditional'    },
      { text: 'Narration, portfolios, and observation over time',                   style: 'charlotte_mason' },
      { text: 'Depends on the subject — I mix it up',                               style: 'eclectic'       },
      { text: 'Conversations and how they apply things in daily life',              style: 'unschooling'    },
      { text: 'Oral exams, written essays, and Socratic discussion',                style: 'classical'      },
    ],
  },
  {
    q: "What's your biggest homeschool goal?",
    options: [
      { text: 'Give my child a rigorous, structured, thorough education',           style: 'traditional'    },
      { text: 'Cultivate a deep love of learning through beauty and wonder',        style: 'charlotte_mason' },
      { text: 'Find and use whatever works best for each unique child',             style: 'eclectic'       },
      { text: 'Trust my child to learn at their own pace, in their own way',        style: 'unschooling'    },
      { text: "Teach my child how to think — not just what to think",               style: 'classical'      },
    ],
  },
]

function scoreQuiz(answers: string[]): string {
  const counts: Record<string, number> = {}
  for (const a of answers) counts[a] = (counts[a] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'eclectic'
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function TeachingStyleContent() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [orgId,        setOrgId]        = useState<string | null>(null)
  const [current,      setCurrent]      = useState('')

  // 'idle' | 'quiz' | 'result' | 'manual'
  const [mode,         setMode]         = useState<'idle' | 'quiz' | 'result' | 'manual'>('idle')
  const [qIndex,       setQIndex]       = useState(0)
  const [answers,      setAnswers]      = useState<string[]>([])
  const [recommended,  setRecommended]  = useState('')
  const [saved,        setSaved]        = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { orgId: id } = await getOrganizationId(user.id)
      if (id) {
        setOrgId(id)
        const { data } = await supabase
          .from('organizations')
          .select('teaching_style')
          .eq('id', id)
          .maybeSingle()
        if (data?.teaching_style) setCurrent(data.teaching_style)
      }

      setLoading(false)
    }
    init()
  }, [])

  const saveStyle = async (value: string) => {
    if (!orgId) return
    setSaving(true)
    await supabase.from('organizations').update({ teaching_style: value }).eq('id', orgId)
    setCurrent(value)
    setSaved(true)
    setSaving(false)
    setTimeout(() => router.push('/profile'), 900)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRADIENT }}>
        <div style={{ color: '#7c3aed', fontWeight: 800, fontSize: 18, fontFamily: "'Nunito', sans-serif" }}>Loading...</div>
      </div>
    )
  }

  const currentStyle = current ? STYLES[current] : null

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", minHeight: '100vh', background: GRADIENT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        .style-opt:hover { background: rgba(124,58,237,0.04) !important; }
      `}</style>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#1a1a2e' }}>Teaching Style</h1>
        </div>

        {/* ── IDLE: show current or entry point ── */}
        {mode === 'idle' && (
          <div style={card}>
            {currentStyle ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e' }}>{currentStyle.label}</span>
                  <span style={{
                    background: '#dcfce7', borderRadius: 20,
                    padding: '3px 12px', fontSize: 11, fontWeight: 800, color: '#15803d',
                    border: '1px solid #bbf7d0',
                  }}>Active</span>
                </div>
                <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 16px', lineHeight: 1.6 }}>{currentStyle.detail}</p>
                <div style={{
                  background: '#f5f3ff', borderRadius: 10,
                  padding: '10px 14px', fontSize: 12, color: '#7c3aed',
                  fontWeight: 600, marginBottom: 16, lineHeight: 1.5,
                }}>
                  • Copilot uses this style when generating lessons and activities for your family.
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setMode('quiz'); setQIndex(0); setAnswers([]) }} style={outlineBtn}>
                    Retake quiz
                  </button>
                  <button onClick={() => setMode('manual')} style={outlineBtn}>
                    Choose manually
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 16px', lineHeight: 1.6 }}>
                  Not sure which style fits your family? Answer 4 quick questions and we'll recommend one.
                </p>
                <button
                  onClick={() => { setMode('quiz'); setQIndex(0); setAnswers([]) }}
                  style={primaryBtn}>
                  Find my teaching style →
                </button>
                <button onClick={() => setMode('manual')} style={{ ...linkBtn, display: 'block', marginTop: 12 }}>
                  Skip — I already know my style
                </button>
              </>
            )}
          </div>
        )}

        {/* ── QUIZ ── */}
        {mode === 'quiz' && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed' }}>
                Question {qIndex + 1} of {QUESTIONS.length}
              </span>
              <button onClick={() => { setMode('idle'); setAnswers([]) }} style={linkBtn}>Cancel</button>
            </div>
            {/* Progress bar */}
            <div style={{ height: 4, background: '#ede9fe', borderRadius: 4, marginBottom: 18 }}>
              <div style={{
                height: 4, borderRadius: 4,
                background: 'linear-gradient(90deg, #7c3aed, #ec4899)',
                width: `${(qIndex / QUESTIONS.length) * 100}%`,
                transition: 'width 0.3s',
              }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: '0 0 16px', lineHeight: 1.4 }}>
              {QUESTIONS[qIndex].q}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUESTIONS[qIndex].options.map((opt, i) => (
                <button key={i} className="style-opt"
                  onClick={() => {
                    const next = [...answers, opt.style]
                    if (qIndex + 1 < QUESTIONS.length) {
                      setAnswers(next)
                      setQIndex(qIndex + 1)
                    } else {
                      setRecommended(scoreQuiz(next))
                      setAnswers(next)
                      setMode('result')
                    }
                  }}
                  style={{
                    textAlign: 'left', padding: '12px 16px', borderRadius: 12,
                    border: '1.5px solid rgba(124,58,237,0.2)', background: '#fff',
                    fontSize: 13, fontWeight: 600, color: '#1a1a2e', cursor: 'pointer',
                    fontFamily: "'Nunito', sans-serif", lineHeight: 1.5,
                    transition: 'all 0.1s',
                  }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {mode === 'result' && (() => {
          const rec = STYLES[recommended]
          return (
            <div style={card}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.08))',
                borderRadius: 14, padding: '16px 18px', marginBottom: 18,
                border: '1px solid rgba(124,58,237,0.18)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', marginBottom: 4 }}>✦ YOUR STYLE MATCH</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', marginBottom: 6 }}>{rec.label}</div>
                <p style={{ fontSize: 13, color: '#4b5563', margin: 0, lineHeight: 1.6 }}>{rec.detail}</p>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button onClick={() => saveStyle(recommended)} disabled={saving} style={{ ...primaryBtn, flex: 1 }}>
                  {saving ? 'Saving…' : `Use ${rec.label}`}
                </button>
                <button onClick={() => setMode('manual')} style={{ ...outlineBtn, flex: 1 }}>
                  Pick a different one
                </button>
              </div>
            </div>
          )
        })()}

        {/* ── MANUAL ── */}
        {mode === 'manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(STYLES).map(([key, s]) => {
              const selected = current === key
              return (
                <button key={key}
                  onClick={() => saveStyle(key)}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 18px', borderRadius: 16, cursor: 'pointer',
                    border: selected ? '2px solid #7c3aed' : '1.5px solid rgba(124,58,237,0.2)',
                    background: selected ? '#f5f3ff' : 'rgba(255,255,255,0.88)',
                    fontFamily: "'Nunito', sans-serif", textAlign: 'left',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    transition: 'all 0.12s',
                  }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    border: selected ? '6px solid #7c3aed' : '2px solid #c4b5fd',
                    background: '#fff',
                  }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: selected ? '#7c3aed' : '#1a1a2e' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 2 }}>{s.desc}</div>
                  </div>
                </button>
              )
            })}
            <button onClick={() => setMode(current ? 'idle' : 'quiz')} style={{ ...linkBtn, marginTop: 4 }}>
              ← {current ? 'Back' : 'Take the quiz instead'}
            </button>
          </div>
        )}

        {/* Saved confirmation */}
        {saved && (
          <div style={{
            marginTop: 16, padding: '11px 14px', borderRadius: 10,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            fontSize: 13, fontWeight: 700, color: '#15803d',
          }}>
            Teaching style saved!
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.88)', borderRadius: 22,
  border: '1.5px solid rgba(124,58,237,0.15)',
  padding: '24px 22px',
  boxShadow: '0 2px 14px rgba(0,0,0,0.08)',
}

const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
  border: 'none', borderRadius: 12, color: '#fff',
  fontSize: 14, fontWeight: 800, padding: '12px 20px',
  cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
  boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
}

const outlineBtn: React.CSSProperties = {
  background: '#fff', border: '1.5px solid rgba(124,58,237,0.3)',
  borderRadius: 12, color: '#7c3aed',
  fontSize: 14, fontWeight: 800, padding: '12px 20px',
  cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
}

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#7c3aed',
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
  fontFamily: "'Nunito', sans-serif", padding: 0,
  textDecoration: 'underline', textDecorationColor: 'rgba(124,58,237,0.3)',
}

export default function TeachingStylePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: GRADIENT }} />}>
        <TeachingStyleContent />
      </Suspense>
    </AuthGuard>
  )
}
