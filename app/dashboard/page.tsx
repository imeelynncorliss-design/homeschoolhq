'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import DevTierToggle from '@/components/DevTierToggle'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import LessonViewModal, { type LessonViewModalLesson } from '@/components/LessonViewModal'
import ActivityGenerator from '@/components/ActivityGenerator'
import LessonGenerator from '@/components/LessonGenerator'
import WeatherWidget from '@/components/WeatherWidget'
import StylePickerModal from '@/components/StylePickerModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kid {
  id: string
  displayname: string
  grade_level?: string
  learning_style?: string | null
}

interface KidPulse {
  kid: Kid
  totalToday: number
  completedToday: number
  pct: number
  subjectNames: string[]
  color: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KID_COLORS = ['#7c3aed', '#0d9488', '#ec4899', '#f59e0b', '#3b82f6']

const PINNED_FEATURE_MAP: Record<string, { emoji: string; label: string; href: string }> = {
  attendance:  { emoji: '✅', label: 'Attendance',   href: '/attendance' },
  reading_log: { emoji: '📚', label: 'Reading Log',  href: '/reading-log' },
  field_trips: { emoji: '🚌', label: 'Activities',   href: '/field-trips' },
  ai_lessons:  { emoji: '🤖', label: 'Lesson Planner', href: '/lessons' },
  compliance:  { emoji: '📋', label: 'Compliance',   href: '/compliance' },
  progress:    { emoji: '📊', label: 'Progress',     href: '/progress' },
  transcript:  { emoji: '🎓', label: 'Transcript',   href: '/transcript' },
  scout_chat:  { emoji: '💬', label: 'Scout Chat',   href: '/scout' },
}

const DAY_CARDINAL: Record<number, string> = {
  0: '/cardinal-sunday.png',
  1: '/cardinal-monday.png',
  2: '/cardinal-tuesday.png',
  3: '/cardinal-wednesday.png',
  4: '/cardinal-thursday.png',
  5: '/cardinal-friday.png',
  6: '/cardinal-saturday.png',
}

const DAY_GREETINGS: Record<number, { line1: string; line2: string }> = {
  0: { line1: 'Good morning',  line2: 'Sunday prep time! Next week awaits.' },
  1: { line1: 'Good morning',  line2: "New week, fresh start. Let's go!" },
  2: { line1: 'Good morning',  line2: "Two days in — you're on a roll." },
  3: { line1: 'Good morning',  line2: 'Halfway there. Keep it going!' },
  4: { line1: 'Good morning',  line2: 'Almost Friday — finish strong!' },
  5: { line1: 'Good morning',  line2: 'Friday! Your school is ready when you are.' },
  6: { line1: 'Good morning',  line2: "Weekend — rest up, you've earned it." },
}

const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const SUBJECT_PALETTE = [
  '#7c3aed', '#0d9488', '#ec4899', '#f59e0b', '#3b82f6',
  '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
]

const SUBJECT_EMOJI: Record<string, string> = {
  'mathematics': '🔢', 'math': '🔢',
  'english': '📖', 'language arts': '📖', 'reading': '📖',
  'science': '🔬',
  'social studies': '🌍', 'history': '🏛️', 'geography': '🗺️',
  'art': '🎨', 'music': '🎵',
  'physical education': '⚽', 'pe': '⚽', 'health': '💪',
  'foreign language': '💬', 'spanish': '💬', 'french': '💬',
  'bible': '✝️', 'computer science': '💻', 'life skills': '🏠', 'logic': '🧩',
}

function subjectEmoji(subject: string): string {
  const lower = subject.toLowerCase()
  for (const [key, emoji] of Object.entries(SUBJECT_EMOJI)) {
    if (lower.includes(key)) return emoji
  }
  return '📚'
}

function subjectColor(subject: string): string {
  let hash = 0
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash)
  }
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length]
}

// ─── Pulse Ring ───────────────────────────────────────────────────────────────

function PulseRing({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) {
  const sw = 11
  const r  = (size - sw) / 2
  const c  = 2 * Math.PI * r
  const cx = size / 2, cy = size / 2
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block', flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${(pct / 100) * c} ${c - (pct / 100) * c}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  )
}

// ─── Stuck Modal ──────────────────────────────────────────────────────────────

function StuckModal({ onClose, onGenerateLesson, onGenerateActivity, onAskScout }: {
  onClose: () => void
  onGenerateLesson: () => void
  onGenerateActivity: () => void
  onAskScout: () => void
}) {
  const actions = [
    {
      icon: '📚', label: 'Generate a Lesson', sub: 'Scout writes a full lesson plan',
      color: '#7c3aed',
      onClick: () => { onClose(); onGenerateLesson() },
    },
    {
      icon: '🎯', label: 'Generate an Activity', sub: 'Quick, fun activity in seconds',
      color: '#0d9488',
      onClick: () => { onClose(); onGenerateActivity() },
    },
    {
      icon: null, imgSrc: '/Cardinal_Mascot.png', label: 'Ask Scout', sub: 'Chat with your homeschool co-pilot',
      color: '#f59e0b',
      onClick: () => { onClose(); onAskScout() },
    },
  ]
  return (
    <div style={css.overlay} onClick={onClose}>
      <div style={css.modalBox} onClick={e => e.stopPropagation()}>
        <div style={css.modalHead}>
          <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 70, height: 70, objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#2d1b69' }}>Need a hand?</div>
            <div style={{ fontSize: 14, color: '#7c6faa', marginTop: 3 }}>Scout's got you covered.</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {actions.map(a => (
            <button key={a.label} style={{ ...css.modalAction, borderColor: a.color + '40' }}
              onClick={a.onClick}>
              {a.imgSrc
                ? <img src={a.imgSrc} alt={a.label} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                : <span style={{ fontSize: 28 }}>{a.icon}</span>
              }
              <div style={{ flex: 1, textAlign: 'left' as const }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#2d1b69' }}>{a.label}</div>
                <div style={{ fontSize: 13, color: '#4b5563', marginTop: 2 }}>{a.sub}</div>
              </div>
              <span style={{ color: a.color, fontSize: 18, fontWeight: 700 }}>→</span>
            </button>
          ))}
        </div>
        <button style={css.modalClose} onClick={onClose}>Maybe later</button>
      </div>
    </div>
  )
}

// ─── Today's Learning Modal ───────────────────────────────────────────────────

function TodaysLearningModal({
  onClose, kidPulses, todayLessons, onLessonClick,
}: {
  onClose: () => void
  kidPulses: KidPulse[]
  todayLessons: Record<string, any[]>
  onLessonClick: (lesson: any, kidName: string) => void
}) {
  const router = useRouter()
  const handlePrintDailyPlan = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const childSections = kidPulses.map(pulse => {
      const lessons = todayLessons[pulse.kid.id] || []
      if (!lessons.length) return ''

      const lessonRows = lessons.map((l: any) => {
        // Try to parse Scout JSON description for overview
        let descHtml = ''
        if (l.description) {
          try {
            const parsed = JSON.parse(l.description)
            const overview = parsed.overview || parsed.approach || parsed.description
            if (overview) descHtml = `<p class="desc">${overview}</p>`
            if (parsed.materials?.length) {
              descHtml += `<p class="mats"><strong>Materials:</strong> ${parsed.materials.join(', ')}</p>`
            }
          } catch {
            descHtml = `<p class="desc">${l.description}</p>`
          }
        }
        const statusDot = l.status === 'completed' ? '#10b981' : l.status === 'in_progress' ? '#f59e0b' : '#d1d5db'
        return `<div class="lesson">
          <div class="lesson-top">
            <span class="dot" style="background:${statusDot}"></span>
            <div>
              <div class="lesson-title">${l.title}</div>
              <div class="lesson-meta">${l.subject}${l.duration_minutes ? ` · ${l.duration_minutes} min` : ''}</div>
            </div>
          </div>
          ${descHtml}
        </div>`
      }).join('')

      return `<div class="child-section">
        <div class="child-name">${pulse.kid.displayname}</div>
        <div class="progress-note">${pulse.completedToday} of ${pulse.totalToday} lessons complete</div>
        ${lessonRows}
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><title>Daily Lesson Plan — ${today}</title>
<style>
  body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; color: #1f2937; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 22px; font-weight: 900; color: #2d1b69; margin: 0 0 4px; }
  .date { font-size: 13px; color: #6b7280; margin-bottom: 28px; }
  .child-section { margin-bottom: 28px; page-break-inside: avoid; }
  .child-name { font-size: 17px; font-weight: 900; color: #2d1b69; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 4px; }
  .progress-note { font-size: 11px; color: #9ca3af; margin-bottom: 12px; }
  .lesson { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
  .lesson-top { display: flex; align-items: flex-start; gap: 10px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-top: 5px; flex-shrink: 0; }
  .lesson-title { font-weight: 700; font-size: 14px; color: #111827; }
  .lesson-meta { font-size: 11px; color: #6b7280; margin-top: 2px; font-family: system-ui; }
  .desc { margin: 8px 0 0; font-size: 13px; color: #374151; }
  .mats { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h1>Daily Lesson Plan</h1>
<div class="date">${today}</div>
${childSections}
</body></html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  return (
    <div style={css.overlay} onClick={onClose}>
      <div style={{ ...css.modalBox, maxWidth: 640, maxHeight: '80vh', overflowY: 'auto' as const }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ fontWeight: 900, fontSize: 20, color: '#2d1b69' }}>Today's Learning</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => { onClose(); router.push('/calendar') }}
              title="View Calendar"
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#2563eb' }}
            >
              📅 Calendar
            </button>
            <button
              onClick={handlePrintDailyPlan}
              title="Print Daily Lesson Plan"
              style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#374151' }}
            >
              🖨️ Print
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#4b5563', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {kidPulses.map(pulse => {
          const lessons = todayLessons[pulse.kid.id] || []
          // Group by status
          const complete   = lessons.filter((l: any) => l.status === 'completed')
          const inProgress = lessons.filter((l: any) => l.status === 'in_progress')
          const notStarted = lessons.filter((l: any) => l.status === 'not_started')
          const grouped    = [
            { label: 'Complete',    items: complete,   dot: '#10b981' },
            { label: 'In Progress', items: inProgress, dot: '#f59e0b' },
            { label: 'Not Started', items: notStarted, dot: '#d1d5db' },
          ].filter(g => g.items.length > 0)

          return (
            <div key={pulse.kid.id} style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: pulse.color, flexShrink: 0 }} />
                <div style={{ fontWeight: 900, fontSize: 16, color: '#2d1b69' }}>{pulse.kid.displayname}</div>
                <div style={{ fontSize: 12, color: '#4b5563' }}>{pulse.completedToday} of {pulse.totalToday} done today</div>
              </div>

              {lessons.length === 0 ? (
                <div style={{ fontSize: 13, color: '#b5bec9', paddingLeft: 20 }}>No lessons scheduled today</div>
              ) : (
                grouped.map(group => (
                  <div key={group.label} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#4b5563', letterSpacing: 0.8, marginBottom: 6, paddingLeft: 20 }}>
                      {group.label.toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 20 }}>
                      {group.items.map((l: any) => (
                        <div key={l.id}
                          onClick={() => onLessonClick(l, pulse.kid.displayname)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: 'rgba(255,255,255,0.75)', borderRadius: 10,
                            padding: '9px 14px', border: '1px solid rgba(0,0,0,0.06)',
                            cursor: 'pointer',
                          }}>
                          <div style={{ width: 9, height: 9, borderRadius: '50%', background: group.dot, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#2d1b69' }}>{l.title}</div>
                            <div style={{ fontSize: 12, color: '#4b5563', marginTop: 1 }}>
                              {l.subject}
                            </div>
                          </div>
                          <span style={{ fontSize: 16, color: '#c4b5fd' }}>›</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Life Happens Modal ───────────────────────────────────────────────────────

const SCOUT_QUIPS = [
  "Sunshine > worksheets. Science agrees. 🌞 Let me push those lessons forward so you can enjoy today guilt-free!",
  "Plot twist: today is now a bonus unschool day! 🎉 Your lessons aren't going anywhere — except to tomorrow.",
  "Even Columbus took wrong turns, and he discovered a whole continent. 🧭 Take the day — I'll handle the reschedule.",
  "Rain, sunshine, a really comfy couch, or a spontaneous donut run — life happens! 🍩 I've got your back.",
  "Fun fact: spontaneous days off are basically advanced Life Skills class. ✅ Consider it logged.",
  "The best homeschool families know when to close the books and open the door. 🚪 Go enjoy your day!",
]

function nextSchoolDay(): string {
  const d = new Date()
  do { d.setDate(d.getDate() + 1) } while (d.getDay() === 0 || d.getDay() === 6)
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

function formatNextDay(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function LifeHappensModal({ todayLessons, kidPulses, cardinalSrc, onClose, onRescheduled }: {
  todayLessons: Record<string, any[]>
  kidPulses: KidPulse[]
  cardinalSrc: string
  onClose: () => void
  onRescheduled: () => void
}) {
  const [step, setStep] = useState<'scout' | 'reschedule' | 'done'>('scout')
  const [rescheduling, setRescheduling] = useState(false)
  const [quip] = useState(() => SCOUT_QUIPS[Math.floor(Math.random() * SCOUT_QUIPS.length)])

  const nextDay = nextSchoolDay()

  const unfinished = kidPulses.flatMap(p =>
    (todayLessons[p.kid.id] || [])
      .filter((l: any) => l.status !== 'completed')
      .map((l: any) => ({ ...l, kidName: p.kid.displayname }))
  )

  const handleReschedule = async () => {
    if (unfinished.length === 0) { onClose(); return }
    setRescheduling(true)
    const { error } = await supabase
      .from('lessons')
      .update({ lesson_date: nextDay })
      .in('id', unfinished.map((l: any) => l.id))
    setRescheduling(false)
    if (error) { alert('Something went wrong rescheduling. Please try again.'); return }
    setStep('done')
  }

  return (
    <div style={lh.overlay} onClick={onClose}>
      <div style={lh.modal} onClick={e => e.stopPropagation()}>

        {step === 'scout' && (
          <>
            <button style={lh.closeBtn} onClick={onClose}>×</button>
            <div style={lh.cardinalWrap}>
              <img src={cardinalSrc} alt="Scout" style={{ width: 120, height: 'auto' }} />
            </div>
            <div style={lh.bubble}>{quip}</div>
            <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {unfinished.length > 0 ? (
                <button style={lh.btnPrimary} onClick={() => setStep('reschedule')}>
                  See Today&apos;s Lessons →
                </button>
              ) : (
                <button style={lh.btnPrimary} onClick={onClose}>
                  Enjoy your day! 🎉
                </button>
              )}
              <button style={lh.btnGhost} onClick={onClose}>Never mind, back to school</button>
            </div>
          </>
        )}

        {step === 'reschedule' && (
          <>
            <div style={lh.reschedHead}>
              <button style={lh.backBtn} onClick={() => setStep('scout')}>←</button>
              <div style={lh.reschedTitle}>Reschedule Today</div>
            </div>
            <div style={lh.reschedBody}>
              <div style={lh.nextDayNote}>
                Moving <strong>{unfinished.length} lesson{unfinished.length !== 1 ? 's' : ''}</strong> to{' '}
                <strong>{formatNextDay(nextDay)}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {unfinished.map((l: any) => (
                  <div key={l.id} style={lh.lessonRow}>
                    <span style={lh.kidTag}>{l.kidName}</span>
                    <span style={lh.lessonName}>{l.title}</span>
                    <span style={lh.subjectTag}>{l.subject}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '0 22px 24px' }}>
              <button
                style={{ ...lh.btnPrimary, opacity: rescheduling ? 0.6 : 1 }}
                disabled={rescheduling}
                onClick={handleReschedule}
              >
                {rescheduling ? 'Moving lessons…' : "🎉 Push 'Em Forward!"}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div style={lh.doneWrap}>
            <div style={{ fontSize: 56 }}>🎉</div>
            <div style={lh.doneTitle}>You&apos;re all set!</div>
            <div style={lh.doneSub}>
              <strong>{unfinished.length} lesson{unfinished.length !== 1 ? 's' : ''}</strong> moved to{' '}
              <strong>{formatNextDay(nextDay)}</strong>.<br />Go enjoy your day!
            </div>
            <button style={{ ...lh.btnPrimary, marginTop: 8 }} onClick={onRescheduled}>
              Got it! 👍
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

const lh: Record<string, import('react').CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(15,10,40,0.5)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    padding: '0 16px 24px',
  },
  modal: {
    background: '#fff', borderRadius: 24,
    width: '100%', maxWidth: 420,
    boxShadow: '0 -4px 40px rgba(0,0,0,0.2)',
    position: 'relative', overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 14,
    background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: '50%',
    width: 30, height: 30, fontSize: 18, cursor: 'pointer', color: '#6b7280',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardinalWrap: { display: 'flex', justifyContent: 'center', paddingTop: 28 },
  bubble: {
    margin: '12px 22px 16px',
    background: 'linear-gradient(135deg, #faf5ff, #ede9fe)',
    border: '1.5px solid #ddd6fe',
    borderRadius: 16, padding: '14px 18px',
    fontSize: 14, fontWeight: 600, color: '#4c1d95', lineHeight: 1.65,
    textAlign: 'center', fontFamily: "'Nunito', sans-serif",
  },
  btnPrimary: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    border: 'none', borderRadius: 14, color: '#fff',
    fontSize: 15, fontWeight: 800, cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
  },
  btnGhost: {
    width: '100%', padding: '12px',
    background: 'none', border: '1.5px solid #e5e7eb',
    borderRadius: 14, color: '#9ca3af',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
  },
  reschedHead: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '18px 20px 14px', borderBottom: '1px solid #f3f4f6',
  },
  backBtn: {
    background: 'none', border: 'none',
    fontSize: 20, cursor: 'pointer', color: '#7c3aed', padding: '0 2px',
  },
  reschedTitle: {
    fontSize: 17, fontWeight: 800, color: '#1a1a2e',
    fontFamily: "'Nunito', sans-serif",
  },
  reschedBody: { padding: '14px 20px 16px', maxHeight: 260, overflowY: 'auto' },
  nextDayNote: {
    fontSize: 13, color: '#6b7280', marginBottom: 12,
    fontFamily: "'Nunito', sans-serif", lineHeight: 1.5,
  },
  lessonRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#f9fafb', borderRadius: 10, padding: '9px 12px',
  },
  kidTag: {
    fontSize: 10, fontWeight: 800, color: '#7c3aed',
    background: '#ede9fe', borderRadius: 4, padding: '2px 6px',
    flexShrink: 0, fontFamily: 'system-ui, sans-serif',
  },
  lessonName: {
    flex: 1, fontSize: 13, fontWeight: 700, color: '#1a1a2e',
    fontFamily: "'Nunito', sans-serif",
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  subjectTag: {
    fontSize: 10, color: '#9ca3af',
    fontFamily: 'system-ui, sans-serif', flexShrink: 0,
  },
  doneWrap: {
    padding: '44px 24px 36px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    textAlign: 'center',
  },
  doneTitle: {
    fontSize: 24, fontWeight: 900, color: '#1a1a2e',
    fontFamily: "'Nunito', sans-serif",
  },
  doneSub: {
    fontSize: 14, color: '#6b7280', lineHeight: 1.6,
    fontFamily: "'Nunito', sans-serif",
  },
}

// ─── Dashboard Content ────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter()
  const [user, setUser]                     = useState<any>(null)
  const [loading, setLoading]               = useState(true)
  const [kidPulses, setKidPulses]           = useState<KidPulse[]>([])
  const [todayLessons, setTodayLessons]     = useState<Record<string, any[]>>({})
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [parentName, setParentName]         = useState('')
  const [, setIsCollaborator] = useState(false)
  const [showStuck, setShowStuck]           = useState(false)
  const [showToday, setShowToday]           = useState(false)
  const [schoolState, setSchoolState]       = useState<string | null>(null)
  const [requiredDays, setRequiredDays]     = useState<string | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<LessonViewModalLesson | null>(null)
  const [selectedKidName, setSelectedKidName] = useState<string | undefined>(undefined)
  const [showLifeHappens, setShowLifeHappens] = useState(false)
  const [showActivity, setShowActivity]       = useState(false)
  const [showGenerator, setShowGenerator]     = useState(false)
  const [activePulseKidId, setActivePulseKidId] = useState<string | null>(null)
  const [homeschoolStyle, setHomeschoolStyle] = useState<'flexible' | 'structured' | null | undefined>(undefined)
  const [pinnedFeatures, setPinnedFeatures]   = useState<string[]>([])
  const [showStylePicker, setShowStylePicker] = useState(false)

  const now         = new Date()
  const dow         = now.getDay()
  const greeting    = DAY_GREETINGS[dow]
  const cardinalSrc = DAY_CARDINAL[dow]
  const dateStr     = `${DAYS_SHORT[dow]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const { data: collab } = await supabase
        .from('family_collaborators')
        .select('organization_id, role, name')
        .eq('user_id', user.id)
        .maybeSingle()

      let orgId: string

      if (collab) {
        setIsCollaborator(true)
        orgId = collab.organization_id
        setParentName(collab.name || user.email?.split('@')[0] || '')
      } else {
        const { orgId: resolved } = await getOrganizationId(user.id)
        if (!resolved) { router.push('/onboarding'); return }
        orgId = resolved

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, homeschool_style, pinned_features')
          .eq('user_id', user.id)
          .maybeSingle()
        if (profile?.first_name) setParentName(profile.first_name)
        const style = profile?.homeschool_style ?? null
        setHomeschoolStyle(style)
        setPinnedFeatures(profile?.pinned_features ?? [])
        if (style === null && !sessionStorage.getItem('style_picker_dismissed')) setShowStylePicker(true)

        const { data: sy } = await supabase
          .from('school_year_settings')
          .select('state, required_days, required_months')
          .eq('organization_id', orgId)
          .maybeSingle()
        if (sy) {
          setSchoolState(sy.state || null)
          if (sy.required_days)   setRequiredDays(`${sy.required_days} days / year`)
          else if (sy.required_months) setRequiredDays(`${sy.required_months} months / year`)
        }
      }

      setOrganizationId(orgId)

      const { data: kidsData } = await supabase
        .from('kids')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })

      if (kidsData?.length) {
        const todayStr   = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, '0'),
          String(now.getDate()).padStart(2, '0'),
        ].join('-')
        const lessonsMap: Record<string, any[]> = {}

        const pulses: KidPulse[] = await Promise.all(
          kidsData.map(async (kid: any, idx: number) => {
            const { data: lessons } = await supabase
              .from('lessons')
              .select('id, title, status, subject, start_time, lesson_date, duration_minutes, kid_id, description, lesson_source')
              .eq('kid_id', kid.id)
              .eq('lesson_date', todayStr)
              .order('start_time', { ascending: true })

            lessonsMap[kid.id] = lessons || []

            const total     = lessons?.length ?? 0
            const completed = lessons?.filter((l: any) => l.status === 'completed').length ?? 0

            const subjectNames = [...new Set(
              (lessons || []).map((l: any) => l.subject).filter(Boolean)
            )].slice(0, 3) as string[]

            return {
              kid: { id: kid.id, displayname: kid.displayname, grade_level: kid.grade_level, learning_style: kid.learning_style },
              totalToday: total,
              completedToday: completed,
              pct: total > 0 ? Math.round((completed / total) * 100) : 0,
              subjectNames,
              color: KID_COLORS[idx % KID_COLORS.length],
            }
          })
        )

        setKidPulses(pulses)
        setTodayLessons(lessonsMap)
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleLessonStatusUpdate = (lessonId: string, kidId: string, newStatus: string) => {
    setTodayLessons(prev => {
      const updated: Record<string, any[]> = {}
      for (const kid in prev) {
        updated[kid] = prev[kid].map((l: any) => l.id === lessonId ? { ...l, status: newStatus } : l)
      }
      const kidLessons = updated[kidId] || []
      const total = kidLessons.length
      const completed = kidLessons.filter((l: any) => l.status === 'completed').length
      setKidPulses(pulses => pulses.map(p =>
        p.kid.id === kidId
          ? { ...p, completedToday: completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 }
          : p
      ))
      return updated
    })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #c4b5fd 0%, #e879f9 18%, #f0abfc 36%, #fbcfe8 54%, #bae6fd 76%, #6ee7b7 100%)' }}>
      <div style={{ color: '#7c3aed', fontWeight: 800, fontSize: 18, fontFamily: "'Nunito', sans-serif" }}>Loading...</div>
    </div>
  )

  const attendanceNote = [schoolState, requiredDays].filter(Boolean).join(': ') || 'Daily check-in'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes sparkle { 0%,100% { opacity:.7; transform:scale(1) rotate(0deg); } 50% { opacity:1; transform:scale(1.3) rotate(20deg); } }
        .spark { position:absolute; pointer-events:none; animation:sparkle 2.8s ease-in-out infinite; color:#fff; font-size:18px; opacity:.7; }
        .dash-bg { position:relative; overflow:hidden; }
        .dash-bg::before {
          content:'';
          position:absolute; inset:0; pointer-events:none;
          background:
            radial-gradient(ellipse 400px 300px at 10% 20%, rgba(167,139,250,0.45) 0%, transparent 70%),
            radial-gradient(ellipse 350px 250px at 85% 10%, rgba(249,168,212,0.35) 0%, transparent 70%),
            radial-gradient(ellipse 300px 300px at 90% 70%, rgba(110,231,183,0.30) 0%, transparent 70%),
            radial-gradient(ellipse 250px 200px at 40% 80%, rgba(186,230,253,0.40) 0%, transparent 70%);
          z-index:0;
        }
        .pulse-card { transition: transform 0.15s ease; }
        .pulse-card:hover { transform: translateY(-4px); }
        .pulse-card:active { transform: scale(0.97); }
        .quick-btn { transition: transform 0.13s ease, box-shadow 0.13s ease; }
        .quick-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.11) !important; }
        .quick-btn:active { transform: scale(0.97); }
        .nav-btn:hover { opacity: 0.8; }
        @media (max-width: 900px) {
          .quick-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .pulse-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 580px) {
          .quick-grid { grid-template-columns: 1fr !important; }
          .pulse-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={css.root} className="dash-bg">
        {/* Sparkle decorations */}
        <span className="spark" style={{ top: '8%',  left: '6%',  animationDelay: '0s'   }}>✦</span>
        <span className="spark" style={{ top: '14%', left: '55%', animationDelay: '0.7s', fontSize: 12 }}>✦</span>
        <span className="spark" style={{ top: '5%',  left: '80%', animationDelay: '1.4s' }}>✦</span>
        <span className="spark" style={{ top: '35%', left: '92%', animationDelay: '0.4s', fontSize: 13 }}>✦</span>
        <span className="spark" style={{ top: '60%', left: '3%',  animationDelay: '1.1s', fontSize: 14 }}>✦</span>
        <span className="spark" style={{ top: '75%', left: '70%', animationDelay: '0.2s', fontSize: 11 }}>✦</span>

        {/* ── Header ── */}
        <header style={css.header}>
          <div style={css.headerInner}>
            <div style={css.headerLeft}>
              <div style={css.logo}>
                {/* Line 1: house-H + OMESCHOOL */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <svg viewBox="0 0 18 20" width="22" height="25" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginBottom: 2 }}>
                    <polygon points="9,0 18,8 0,8" fill="#7c3aed" />
                    <rect x="1" y="8" width="5" height="12" rx="0.5" fill="#7c3aed" />
                    <rect x="12" y="8" width="5" height="12" rx="0.5" fill="#7c3aed" />
                    <rect x="1" y="12.5" width="16" height="4" rx="0.5" fill="#7c3aed" />
                  </svg>
                  <span style={css.logoH}>OMESCHOOL</span>
                </div>
                {/* Line 2: READY + checkmark in teal */}
                <div style={css.logoR}>READY ✓</div>
              </div>
              <div style={css.dateStr}>{dateStr}</div>
            </div>
            <div style={css.cardinalWrap}>
              <div style={css.bubble}>
                <div style={css.bubbleBold}>{greeting.line1}{parentName ? `, ${parentName}!` : '!'}</div>
                <div style={css.bubbleSub}>{greeting.line2}</div>
              </div>
              <img src={cardinalSrc} alt="Cardinal mascot" style={css.cardinal} />
            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main style={css.main}>

          {/* Weather */}
          <WeatherWidget />

          {/* Pulse Check — hidden for flexible users unless pinned */}
          {(homeschoolStyle !== 'flexible' || pinnedFeatures.includes('pulse_check')) && <section>
            <div style={css.sectionRow}>
              <span style={css.secTitle}>PULSE CHECK</span>
              <span style={css.secSub}>Tap a child to see their lessons</span>
            </div>
            {kidPulses.length === 0 ? (
              <div style={css.emptyCard}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👧</div>
                <div style={{ fontWeight: 800, color: '#2d1b69', fontSize: 17 }}>No children added yet</div>
                <div style={{ fontSize: 13, color: '#4b5563', marginTop: 6 }}>Add a child in Profile to get started</div>
              </div>
            ) : (
              <div
                className="pulse-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(kidPulses.length, 4)}, 1fr)`,
                  gap: 18,
                }}
              >
                {kidPulses.map(pulse => (
                  <div key={pulse.kid.id} className="pulse-card"
                    style={{ ...css.pulseCard, cursor: 'pointer' }}
                    onClick={() => setActivePulseKidId(pulse.kid.id)}>
                    {/* Ring */}
                    <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto 16px' }}>
                      <PulseRing pct={pulse.pct} color={pulse.color} size={180} />
                      <div style={css.ringCenter}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#374151', marginBottom: 2 }}>{pulse.kid.displayname}</span>
                        <span style={{ fontSize: 34, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{pulse.pct}%</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginTop: 4 }}>Complete</span>
                      </div>
                    </div>
                    {/* Lessons count */}
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', textAlign: 'center' as const, marginBottom: 12 }}>
                      {pulse.totalToday > 0
                        ? `${pulse.completedToday} of ${pulse.totalToday} lessons done today`
                        : 'No lessons scheduled today'}
                    </div>
                    {/* Focus subjects — emoji icon tiles */}
                    {pulse.subjectNames.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', letterSpacing: 0.6, textAlign: 'center' as const, marginBottom: 8 }}>
                          FOCUS SUBJECTS
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, justifyContent: 'center' }}>
                          {pulse.subjectNames.map(s => (
                            <div key={s} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
                              <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: subjectColor(s) + '18',
                                border: `1.5px solid ${subjectColor(s)}40`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18,
                              }}>
                                {subjectEmoji(s)}
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textAlign: 'center' as const, maxWidth: 52 }}>
                                {s.split('/')[0].trim()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>}

          {/* Quick Actions — style-aware */}
          <section>
            <div style={{ ...css.sectionRow, justifyContent: 'space-between' }}>
              <span style={css.secTitle}>
                {homeschoolStyle === 'flexible' ? 'QUICK LOG' : 'QUICK ACTIONS'}
              </span>
              <button
                onClick={() => setShowStylePicker(true)}
                style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
              >
                {homeschoolStyle === 'flexible' ? '🌿 Flexible' : homeschoolStyle === 'structured' ? '📐 Structured' : ''} ✏️
              </button>
            </div>

            {homeschoolStyle === 'flexible' ? (
              /* ── Flexible mode: big quick-log tiles ── */
              <div className="quick-grid" style={css.quickGrid}>
                <button className="quick-btn" style={{ ...css.quickCard, background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}
                  onClick={() => router.push('/attendance')}>
                  <div style={{ ...css.qIcon, background: '#059669' }}><span style={{ fontSize: 22 }}>✅</span></div>
                  <div>
                    <div style={{ ...css.qLabel, color: '#064e3b' }}>Log Attendance</div>
                    <div style={{ ...css.qSub, color: '#059669' }}>Mark today's school day</div>
                  </div>
                </button>

                <button className="quick-btn" style={{ ...css.quickCard, background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}
                  onClick={() => router.push('/reading-log')}>
                  <div style={{ ...css.qIcon, background: '#7c3aed' }}><span style={{ fontSize: 22 }}>📚</span></div>
                  <div>
                    <div style={{ ...css.qLabel, color: '#4c1d95' }}>Log a Book</div>
                    <div style={{ ...css.qSub, color: '#7c3aed' }}>Add to reading log</div>
                  </div>
                </button>

                <button className="quick-btn" style={{ ...css.quickCard, background: 'linear-gradient(135deg, #ccfbf1, #99f6e4)' }}
                  onClick={() => router.push('/field-trips')}>
                  <div style={{ ...css.qIcon, background: '#0d9488' }}><span style={{ fontSize: 22 }}>🚌</span></div>
                  <div>
                    <div style={{ ...css.qLabel, color: '#134e4a' }}>Log an Activity</div>
                    <div style={{ ...css.qSub, color: '#0d9488' }}>Field trip, project, co-op</div>
                  </div>
                </button>

                <button className="quick-btn" style={{ ...css.quickCard, background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)' }}
                  onClick={() => setShowStuck(true)}>
                  <div style={{ ...css.qIcon, background: '#ec4899' }}><span style={{ fontSize: 22 }}>🆘</span></div>
                  <div>
                    <div style={{ ...css.qLabel, color: '#831843' }}>Need Help?</div>
                    <div style={{ ...css.qSub, color: '#ec4899' }}>Scout & ideas</div>
                  </div>
                </button>
              </div>
            ) : (
              /* ── Structured mode: current quick actions ── */
              <div className="quick-grid" style={css.quickGrid}>
                <button className="quick-btn" style={{ ...css.quickCard, background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}
                  onClick={() => setShowToday(true)}>
                  <div style={{ ...css.qIcon, background: '#7c3aed' }}><span style={{ fontSize: 22 }}>📝</span></div>
                  <div>
                    <div style={{ ...css.qLabel, color: '#4c1d95' }}>Today's Learning</div>
                    <div style={{ ...css.qSub, color: '#7c3aed' }}>All children's agenda</div>
                  </div>
                </button>

                <button className="quick-btn" style={{ ...css.quickCard, background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)' }}
                  onClick={() => setShowStuck(true)}>
                  <div style={{ ...css.qIcon, background: '#ec4899' }}><span style={{ fontSize: 22 }}>🆘</span></div>
                  <div>
                    <div style={{ ...css.qLabel, color: '#831843' }}>The Stuck Button</div>
                    <div style={{ ...css.qSub, color: '#ec4899' }}>Need help? Tap me.</div>
                  </div>
                </button>

                <button className="quick-btn" style={{ ...css.quickCard, background: 'linear-gradient(135deg, #ccfbf1, #99f6e4)' }}
                  onClick={() => router.push('/supply-scout')}>
                  <div style={{ ...css.qIcon, background: '#5eead4' }}><span style={{ fontSize: 22 }}>🛒</span></div>
                  <div>
                    <div style={{ ...css.qLabel, color: '#134e4a' }}>Supply Scout</div>
                    <div style={{ ...css.qSub, color: '#0d9488' }}>Materials for your lessons</div>
                  </div>
                </button>

                <button className="quick-btn" style={{ ...css.quickCard, background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}
                  onClick={() => router.push('/attendance')}>
                  <div style={{ ...css.qIcon, background: '#059669' }}><span style={{ fontSize: 22 }}>✅</span></div>
                  <div>
                    <div style={{ ...css.qLabel, color: '#064e3b' }}>Attendance Tracker</div>
                    <div style={{ ...css.qSub, color: '#059669' }}>{attendanceNote}</div>
                  </div>
                </button>
              </div>
            )}

            {/* Pinned features */}
            {pinnedFeatures.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>
                  YOUR PINNED FEATURES
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {pinnedFeatures.map(fid => {
                    const feat = PINNED_FEATURE_MAP[fid]
                    if (!feat) return null
                    return (
                      <button
                        key={fid}
                        onClick={() => router.push(feat.href)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '8px 14px', borderRadius: 20,
                          background: 'rgba(255,255,255,0.82)',
                          border: '1.5px solid rgba(124,58,237,0.15)',
                          fontSize: 13, fontWeight: 700, color: '#374151',
                          cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                        }}
                      >
                        <span>{feat.emoji}</span>
                        <span>{feat.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Life Happens FAB */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0 4px' }}>
              <button style={css.lifeFab} onClick={() => setShowLifeHappens(true)}>
                <span style={{ fontSize: 44 }}>🌤️</span>
              </button>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#92400e', fontFamily: "'Nunito', sans-serif", letterSpacing: 0.5 }}>
                Life Happens?
              </span>
            </div>
          </section>

        </main>

        <div style={{ height: 80 }} />

        {showLifeHappens && (
          <LifeHappensModal
            todayLessons={todayLessons}
            kidPulses={kidPulses}
            cardinalSrc={cardinalSrc}
            onClose={() => setShowLifeHappens(false)}
            onRescheduled={() => {
              setShowLifeHappens(false)
              setTodayLessons(prev => {
                const updated = { ...prev }
                for (const kid in updated) {
                  updated[kid] = updated[kid].filter((l: any) => l.status === 'completed')
                }
                return updated
              })
            }}
          />
        )}
        {showStuck && (
          <StuckModal
            onClose={() => setShowStuck(false)}
            onGenerateLesson={() => setShowGenerator(true)}
            onGenerateActivity={() => setShowActivity(true)}
            onAskScout={() => window.dispatchEvent(new CustomEvent('open-scout-copilot'))}
          />
        )}
        {showGenerator && (
          <LessonGenerator
            kids={kidPulses.map(p => ({ id: p.kid.id, displayname: p.kid.displayname, grade: p.kid.grade_level }))}
            userId={user?.id ?? ''}
            onClose={() => setShowGenerator(false)}
          />
        )}
        {showActivity && (
          <ActivityGenerator
            kids={kidPulses.map(p => p.kid)}
            organizationId={organizationId}
            onClose={() => setShowActivity(false)}
            onSaved={() => {}}
          />
        )}
        {showToday && (
          <TodaysLearningModal
            onClose={() => setShowToday(false)}
            kidPulses={kidPulses}
            todayLessons={todayLessons}
            onLessonClick={(lesson, kidName) => {
              setShowToday(false)
              setSelectedLesson(lesson as LessonViewModalLesson)
              setSelectedKidName(kidName)
            }}
          />
        )}
        {selectedLesson && (
          <LessonViewModal
            lesson={selectedLesson}
            kidName={selectedKidName}
            organizationId={organizationId ?? undefined}
            stateCode={schoolState}
            onClose={() => setSelectedLesson(null)}
            onEdit={() => {
              setSelectedLesson(null)
              router.push(`/subjects?kid=${selectedLesson.kid_id}`)
            }}
            onDelete={async () => {
              await supabase.from('lessons').delete().eq('id', selectedLesson.id)
              setTodayLessons(prev => {
                const updated = { ...prev }
                for (const kid in updated) {
                  updated[kid] = updated[kid].filter(l => l.id !== selectedLesson.id)
                }
                return updated
              })
              setSelectedLesson(null)
            }}
            onCycleStatus={async (lessonId, currentStatus) => {
              const next = currentStatus === 'not_started' ? 'in_progress'
                         : currentStatus === 'in_progress'  ? 'completed'
                         : 'not_started'
              await supabase.from('lessons').update({ status: next }).eq('id', lessonId)
              handleLessonStatusUpdate(lessonId, selectedLesson!.kid_id, next)
              setSelectedLesson(s => s ? { ...s, status: next as LessonViewModalLesson['status'] } : null)
            }}
            onSetStatus={async (lessonId, newStatus) => {
              await supabase.from('lessons').update({ status: newStatus }).eq('id', lessonId)
              handleLessonStatusUpdate(lessonId, selectedLesson!.kid_id, newStatus)
              setSelectedLesson(s => s ? { ...s, status: newStatus as LessonViewModalLesson['status'] } : null)
            }}
            onSave={(lessonId, updates) => {
              setTodayLessons(prev => {
                const updated = { ...prev }
                for (const kid in updated) {
                  updated[kid] = updated[kid].map(l => l.id === lessonId ? { ...l, ...updates } : l)
                }
                return updated
              })
              setSelectedLesson(s => s ? { ...s, ...updates } : null)
            }}
          />
        )}

        {/* ── Homeschool Style Picker ── */}
        {showStylePicker && user && (
          <StylePickerModal
            userId={user.id}
            stateAbbr={schoolState}
            isFirstTime={homeschoolStyle === null}
            onComplete={(style, pins) => {
              setHomeschoolStyle(style)
              setPinnedFeatures(pins)
              sessionStorage.removeItem('style_picker_dismissed')
              setShowStylePicker(false)
            }}
            onCancel={() => {
              if (homeschoolStyle === null) {
                sessionStorage.setItem('style_picker_dismissed', '1')
              }
              setShowStylePicker(false)
            }}
          />
        )}

        {/* ── Kid Today Panel (slide-up) ── */}
        {activePulseKidId && (() => {
          const activePulse = kidPulses.find(p => p.kid.id === activePulseKidId)
          const panelLessons = todayLessons[activePulseKidId] || []
          const STATUS_CONFIG = {
            completed:   { label: 'Done',        bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
            in_progress: { label: 'In Progress', bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
            not_started: { label: 'Not Started', bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' },
          }
          return (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setActivePulseKidId(null)}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                  zIndex: 200, backdropFilter: 'blur(2px)',
                }}
              />
              {/* Sheet */}
              <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: '#fff', borderRadius: '24px 24px 0 0',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
                zIndex: 201, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                fontFamily: "'Nunito', sans-serif",
              }}>
                {/* Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
                </div>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 20px 14px',
                }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e' }}>
                      {activePulse?.kid.displayname}&rsquo;s Lessons Today
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2, fontWeight: 600 }}>
                      {activePulse?.completedToday} of {activePulse?.totalToday} completed · {activePulse?.pct}%
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePulseKidId(null)}
                    style={{
                      background: '#f3f4f6', border: 'none', borderRadius: '50%',
                      width: 36, height: 36, fontSize: 18, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#374151', flexShrink: 0,
                    }}>×</button>
                </div>
                {/* Lesson list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 100px' }}>
                  {panelLessons.length === 0 ? (
                    <div style={{
                      textAlign: 'center', padding: '40px 20px',
                      color: '#9ca3af', fontSize: 15, fontWeight: 600,
                    }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                      No lessons scheduled for today
                    </div>
                  ) : (
                    panelLessons.map((lesson: any) => {
                      const sc = STATUS_CONFIG[lesson.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started
                      return (
                        <div
                          key={lesson.id}
                          onClick={() => {
                            setActivePulseKidId(null)
                            setSelectedLesson(lesson as LessonViewModalLesson)
                            setSelectedKidName(activePulse?.kid.displayname)
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            background: '#f9fafb', borderRadius: 14,
                            padding: '14px 16px', marginBottom: 10,
                            cursor: 'pointer', border: '1.5px solid #f3f4f6',
                            transition: 'all 0.12s',
                          }}
                        >
                          {/* Status dot */}
                          <div style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: sc.dot, flexShrink: 0,
                          }} />
                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 15, fontWeight: 800, color: '#1a1a2e',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{lesson.title}</div>
                            {lesson.subject && (
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, fontWeight: 600 }}>
                                {lesson.subject}
                                {lesson.start_time && ` · ${lesson.start_time.slice(0, 5)}`}
                              </div>
                            )}
                          </div>
                          {/* Status badge */}
                          <div style={{
                            fontSize: 11, fontWeight: 800, padding: '3px 9px',
                            borderRadius: 20, background: sc.bg, color: sc.color,
                            flexShrink: 0,
                          }}>{sc.label}</div>
                          {/* Chevron */}
                          <div style={{ color: '#d1d5db', fontSize: 16, flexShrink: 0 }}>›</div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </>
          )
        })()}

        <DevTierToggle />
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: "'Nunito', sans-serif",
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #c4b5fd 0%, #e879f9 18%, #f0abfc 36%, #fbcfe8 54%, #bae6fd 76%, #6ee7b7 100%)',
  },
  header: {
    background: 'transparent',
    padding: '0 40px',
  },
  headerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '28px 0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  headerLeft: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  logo: { display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 1 },
  logoH: { fontWeight: 900, fontSize: 26, color: '#7c3aed', letterSpacing: 0.5 },
  logoR: { fontWeight: 800, fontSize: 13, color: '#0d9488', letterSpacing: 2, paddingLeft: 24 },
  dateStr: { fontSize: 13, color: '#4b5563', fontWeight: 600 },

  cardinalWrap: { display: 'flex', alignItems: 'flex-end', gap: 12, flexShrink: 0 },
  bubble: {
    background: 'rgba(255,255,255,0.92)',
    borderRadius: '16px 16px 0 16px',
    padding: '14px 18px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
    maxWidth: 280,
    border: '1px solid rgba(255,255,255,0.95)',
  },
  bubbleBold: { fontWeight: 900, fontSize: 15, color: '#1a1a2e' },
  bubbleSub:  { fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.45 },
  cardinal: {
    width: 130,
    height: 130,
    objectFit: 'contain' as const,
  },

  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 40px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 36,
  },

  sectionRow: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 },
  secTitle:   { fontSize: 12, fontWeight: 900, color: '#6d28d9', letterSpacing: 1.2 },
  secSub:     { fontSize: 12, color: '#6b7280', fontWeight: 600 },

  pulseCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '8px 12px 16px',
  },
  ringCenter: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 12px',
    borderRadius: 20,
    border: '1.5px solid',
  },
  emptyCard: {
    background: 'rgba(255,255,255,0.7)',
    borderRadius: 22,
    padding: '48px 32px',
    textAlign: 'center' as const,
    border: '2px dashed #d1d5db',
  },

  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 14,
  },
  quickCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    borderRadius: 20,
    border: '1.5px solid rgba(255,255,255,0.9)',
    padding: '20px 18px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
    textAlign: 'left' as const,
    fontFamily: "'Nunito', sans-serif",
    width: '100%',
  },
  qIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  qLabel: { fontWeight: 900, fontSize: 14, marginBottom: 3 },
  qSub:   { fontSize: 12, fontWeight: 600, lineHeight: 1.4 },

  lifeFab: {
    width: 100, height: 100, borderRadius: '50%',
    background: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 60%, #f59e0b 100%)',
    border: '3px solid rgba(255,255,255,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 24px rgba(251,191,36,0.45), 0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },

  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(45,27,105,0.38)',
    backdropFilter: 'blur(8px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    background: 'linear-gradient(160deg, #faf5ff 0%, #ede9fe 40%, #e0f2fe 100%)',
    borderRadius: 26,
    padding: '30px 26px 26px',
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 24px 64px rgba(45,27,105,0.22)',
    border: '1px solid rgba(255,255,255,0.85)',
  },
  modalHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: '1px solid rgba(124,58,237,0.12)',
  },
  modalAction: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: 'rgba(255,255,255,0.84)',
    border: '1.5px solid',
    borderRadius: 16,
    padding: '15px 18px',
    cursor: 'pointer',
    width: '100%',
    fontFamily: "'Nunito', sans-serif",
  },
  modalClose: {
    marginTop: 20,
    width: '100%',
    background: 'none',
    border: 'none',
    color: '#4b5563',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '8px 0',
    fontFamily: "'Nunito', sans-serif",
  },
}