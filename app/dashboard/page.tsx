'use client'

import { useEffect, useState, Suspense } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { supabase } from '@/src/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import DevTierToggle from '@/components/DevTierToggle'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import LessonViewModal, { type LessonViewModalLesson } from '@/components/LessonViewModal'
import ActivityGenerator from '@/components/ActivityGenerator'
import LessonGenerator from '@/components/LessonGenerator'
import WeatherWidget from '@/components/WeatherWidget'
import StylePickerModal, { DEFAULT_STRUCTURED, DEFAULT_FLEXIBLE, DEFAULT_UNSTYLED } from '@/components/StylePickerModal'
import ProductTour from '@/components/ProductTour'

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

// Config for each pinnable feature → big button card
const QUICK_ACTION_CONFIG: Record<string, {
  emoji: string; label: string; sub: string
  bg: string; iconBg: string; color: string; subColor: string
  action: 'route' | 'lesson' | 'activity' | 'today' | 'scout'
  href?: string
}> = {
  attendance:  { emoji: '✅', label: 'Log Attendance',      sub: 'Mark today\'s school day',          bg: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', iconBg: '#059669', color: '#064e3b', subColor: '#059669', action: 'route',    href: '/attendance' },
  reading_log: { emoji: '📚', label: 'Log a Book',          sub: 'Add to reading log',                bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', iconBg: '#7c3aed', color: '#4c1d95', subColor: '#7c3aed', action: 'route',    href: '/reading-log' },
  field_trips: { emoji: '🚌', label: 'Log an Activity',     sub: 'Field trip, project, co-op',        bg: 'linear-gradient(135deg,#ccfbf1,#99f6e4)', iconBg: '#0d9488', color: '#134e4a', subColor: '#0d9488', action: 'route',    href: '/field-trips' },
  ai_lessons:  { emoji: '🤖', label: 'Plan a Lesson',       sub: 'Use me if you need a lesson',       bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', iconBg: '#7c3aed', color: '#4c1d95', subColor: '#7c3aed', action: 'lesson' },
  ai_activity: { emoji: '🎯', label: 'Generate Activity',   sub: 'Use me if you need an activity idea', bg: 'linear-gradient(135deg,#ccfbf1,#99f6e4)', iconBg: '#0d9488', color: '#134e4a', subColor: '#0d9488', action: 'activity' },
  compliance:  { emoji: '📋', label: 'Compliance',          sub: 'Days/hours vs. requirements',        bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', iconBg: '#dc2626', color: '#7f1d1d', subColor: '#dc2626', action: 'route',    href: '/compliance' },
  progress:    { emoji: '📊', label: 'Progress Reports',    sub: 'Learning analytics by subject',      bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', iconBg: '#16a34a', color: '#14532d', subColor: '#16a34a', action: 'route',    href: '/progress' },
  transcript:  { emoji: '🎓', label: 'Transcript',          sub: 'GPA, courses, college records',      bg: 'linear-gradient(135deg,#fefce8,#fef08a)', iconBg: '#d97706', color: '#78350f', subColor: '#d97706', action: 'route',    href: '/transcript' },
  mastery:     { emoji: '🏆', label: 'Mastery Tracker',     sub: 'Standards & skill mastery',          bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', iconBg: '#2563eb', color: '#1e3a5f', subColor: '#3b82f6', action: 'route',    href: '/mastery' },
  portfolio:   { emoji: '🗂️', label: 'Portfolio',           sub: 'Work samples & highlights',          bg: 'linear-gradient(135deg,#fdf4ff,#fae8ff)', iconBg: '#9333ea', color: '#4a044e', subColor: '#a855f7', action: 'route',    href: '/portfolio' },
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
  const css = {
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
      background: 'linear-gradient(160deg, #faf5ff 0%, #ede9fe 40%, #f0eff4 100%)',
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
  const trapRef = useFocusTrap(true)
  const css = {
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
      background: 'linear-gradient(160deg, #faf5ff 0%, #ede9fe 40%, #f0eff4 100%)',
      borderRadius: 26,
      padding: '30px 26px 26px',
      width: '100%',
      maxWidth: 460,
      boxShadow: '0 24px 64px rgba(45,27,105,0.22)',
      border: '1px solid rgba(255,255,255,0.85)',
    },
  }
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
    <div style={css.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="todays-learning-title">
      <div ref={trapRef} style={{ ...css.modalBox, maxWidth: 640, maxHeight: '80vh', overflowY: 'auto' as const }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div id="todays-learning-title" style={{ fontWeight: 900, fontSize: 20, color: '#2d1b69' }}>Today's Learning</div>
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
            <button onClick={onClose} aria-label="Close today's learning" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#4b5563', lineHeight: 1 }}>✕</button>
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
                <div style={{ fontSize: 13, color: '#6b7280', paddingLeft: 20 }}>No lessons scheduled today</div>
              ) : (
                grouped.map(group => (
                  <div key={group.label} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#4b5563', letterSpacing: 0.8, marginBottom: 6, paddingLeft: 20 }}>
                      {group.label.toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 20 }}>
                      {group.items.map((l: any) => (
                        <button key={l.id}
                          onClick={() => onLessonClick(l, pulse.kid.displayname)}
                          aria-label={`View lesson: ${l.title}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: 'rgba(255,255,255,0.75)', borderRadius: 10,
                            padding: '9px 14px', border: '1px solid rgba(0,0,0,0.06)',
                            cursor: 'pointer', width: '100%', textAlign: 'left',
                            fontFamily: "'Nunito', sans-serif",
                          }}>
                          <div style={{ width: 9, height: 9, borderRadius: '50%', background: group.dot, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#2d1b69' }}>{l.title}</div>
                            <div style={{ fontSize: 12, color: '#4b5563', marginTop: 1 }}>
                              {l.subject}
                            </div>
                          </div>
                          <span style={{ fontSize: 16, color: '#c4b5fd' }}>›</span>
                        </button>
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

const FT_SUBJECTS = ['Science', 'History', 'Art', 'Geography', 'Language Arts', 'Life Skills', 'Physical Education', 'Other']

function nextSchoolDay(): string {
  const d = new Date()
  do { d.setDate(d.getDate() + 1) } while (d.getDay() === 0 || d.getDay() === 6)
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

function formatNextDay(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

type LHStep = 'scout' | 'reason' | 'note' | 'field_trip' | 'reschedule' | 'done'
type LHReason = 'sick' | 'field_trip' | 'free_day' | 'other'

function LifeHappensModal({ todayLessons, kidPulses, cardinalSrc, organizationId, onClose, onRescheduled }: {
  todayLessons: Record<string, any[]>
  kidPulses: KidPulse[]
  cardinalSrc: string
  organizationId: string | null
  onClose: () => void
  onRescheduled: () => void
}) {
  const [step, setStep]           = useState<LHStep>('scout')
  const [reason, setReason]       = useState<LHReason | null>(null)
  const [note, setNote]           = useState('')
  const [ftTitle, setFtTitle]     = useState('')
  const [ftLocation, setFtLocation] = useState('')
  const [ftSubject, setFtSubject] = useState('Other')
  const [ftHours, setFtHours]     = useState('')
  const [ftKidId, setFtKidId]     = useState(() => kidPulses[0]?.kid.id ?? '')
  const [saving, setSaving]       = useState(false)
  const [quip] = useState(() => SCOUT_QUIPS[Math.floor(Math.random() * SCOUT_QUIPS.length)])
  const trapRef = useFocusTrap(true)

  const today  = new Date().toISOString().split('T')[0]
  const nextDay = nextSchoolDay()

  const unfinished = kidPulses.flatMap(p =>
    (todayLessons[p.kid.id] || [])
      .filter((l: any) => l.status !== 'completed')
      .map((l: any) => ({ ...l, kidName: p.kid.displayname }))
  )

  // Save school_day_log + optionally reschedule lessons
  const handleReschedule = async (resolvedReason: LHReason, resolvedNote: string, ftId?: string) => {
    setSaving(true)
    // 1. Log the day reason
    if (organizationId) {
      await supabase.from('school_day_logs').upsert(
        { organization_id: organizationId, date: today, reason: resolvedReason, note: resolvedNote || null, field_trip_id: ftId ?? null },
        { onConflict: 'organization_id,date' }
      )
    }
    // 2. Reschedule unfinished lessons
    if (unfinished.length > 0) {
      await supabase.from('lessons').update({ lesson_date: nextDay }).in('id', unfinished.map((l: any) => l.id))
    }
    setSaving(false)
    setStep('done')
  }

  // Field trip: insert record then proceed to reschedule
  const handleFieldTripSave = async () => {
    if (!ftTitle.trim()) return
    setSaving(true)
    let ftId: string | undefined
    const { data: ft } = await supabase.from('field_trips').insert({
      title: ftTitle.trim(),
      location: ftLocation.trim() || null,
      subject: ftSubject,
      hours: ftHours ? parseFloat(ftHours) : null,
      trip_date: today,
      kid_id: ftKidId,
    }).select('id').single()
    ftId = ft?.id
    await handleReschedule('field_trip', note, ftId)
  }

  const REASON_OPTIONS: { key: LHReason; emoji: string; label: string; sub: string; bg: string; color: string }[] = [
    { key: 'sick',       emoji: '🤒', label: 'Sick Day',    sub: "Someone's not feeling well",      bg: '#fef2f2', color: '#991b1b' },
    { key: 'field_trip', emoji: '🚌', label: 'Field Trip',  sub: 'We\'re out learning in the world', bg: '#fffbeb', color: '#92400e' },
    { key: 'free_day',   emoji: '☀️', label: 'Free Day',    sub: 'Just taking a break — no worries', bg: '#f0fdf4', color: '#065f46' },
    { key: 'other',      emoji: '✏️', label: 'Something Else', sub: 'Add a note about what happened', bg: '#f5f3ff', color: '#4c1d95' },
  ]

  return (
    <div style={lh.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Life Happens">
      <div ref={trapRef} style={lh.modal} onClick={e => e.stopPropagation()}>

        {/* ── Step 1: Scout quip ── */}
        {step === 'scout' && (
          <>
            <button style={lh.closeBtn} onClick={onClose} aria-label="Close">×</button>
            <div style={lh.cardinalWrap}>
              <img src={cardinalSrc} alt="Scout" style={{ width: 120, height: 'auto' }} />
            </div>
            <div style={lh.bubble}>{quip}</div>
            <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <button style={lh.btnPrimary} onClick={() => setStep('reason')}>
                What&apos;s going on today? →
              </button>
              <button style={lh.btnGhost} onClick={onClose}>Never mind, back to school</button>
            </div>
          </>
        )}

        {/* ── Step 2: Reason picker ── */}
        {step === 'reason' && (
          <>
            <div style={lh.reschedHead}>
              <button style={lh.backBtn} onClick={() => setStep('scout')}>←</button>
              <div style={lh.reschedTitle}>What&apos;s happening today?</div>
            </div>
            <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {REASON_OPTIONS.map(r => (
                <button key={r.key} onClick={() => {
                  setReason(r.key)
                  if (r.key === 'field_trip') setStep('field_trip')
                  else if (r.key === 'other')  setStep('note')
                  else handleReschedule(r.key, '')
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: r.bg, border: `1.5px solid ${r.color}22`,
                  borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                  textAlign: 'left', fontFamily: "'Nunito', sans-serif",
                }}>
                  <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{r.emoji}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: r.color }}>{r.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: r.color, opacity: 0.75, marginTop: 2 }}>{r.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 3a: Note (for "other") ── */}
        {step === 'note' && (
          <>
            <div style={lh.reschedHead}>
              <button style={lh.backBtn} onClick={() => setStep('reason')}>←</button>
              <div style={lh.reschedTitle}>What happened?</div>
            </div>
            <div style={{ padding: '14px 20px 20px' }}>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Co-op day, appointment, travel, spontaneous adventure…"
                rows={4}
                style={{
                  width: '100%', borderRadius: 12, border: '1.5px solid #e5e7eb',
                  padding: '12px 14px', fontSize: 14, fontFamily: "'Nunito', sans-serif",
                  fontWeight: 600, color: '#1a1a2e', resize: 'none', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                style={{ ...lh.btnPrimary, marginTop: 12, opacity: saving ? 0.6 : 1 }}
                disabled={saving}
                onClick={() => handleReschedule('other', note)}
              >
                {saving ? 'Saving…' : 'Save & Reschedule Lessons →'}
              </button>
              <button style={{ ...lh.btnGhost, marginTop: 8 }} onClick={() => handleReschedule('other', '')}>
                Skip note
              </button>
            </div>
          </>
        )}

        {/* ── Step 3b: Field trip quick log ── */}
        {step === 'field_trip' && (
          <>
            <div style={lh.reschedHead}>
              <button style={lh.backBtn} onClick={() => setStep('reason')}>←</button>
              <div style={lh.reschedTitle}>🚌 Log the Field Trip</div>
            </div>
            <div style={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
              <div>
                <label style={lh.fieldLabel}>Where did you go? *</label>
                <input
                  value={ftTitle} onChange={e => setFtTitle(e.target.value)}
                  placeholder="e.g. Natural History Museum"
                  style={lh.input}
                />
              </div>
              <div>
                <label style={lh.fieldLabel}>Location (optional)</label>
                <input
                  value={ftLocation} onChange={e => setFtLocation(e.target.value)}
                  placeholder="City, address, or 'local'"
                  style={lh.input}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lh.fieldLabel}>Subject</label>
                  <select value={ftSubject} onChange={e => setFtSubject(e.target.value)} style={lh.input}>
                    {FT_SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lh.fieldLabel}>Hours</label>
                  <input
                    type="number" min="0.5" max="8" step="0.5"
                    value={ftHours} onChange={e => setFtHours(e.target.value)}
                    placeholder="e.g. 2"
                    style={lh.input}
                  />
                </div>
              </div>
              {kidPulses.length > 1 && (
                <div>
                  <label style={lh.fieldLabel}>Which child?</label>
                  <select value={ftKidId} onChange={e => setFtKidId(e.target.value)} style={lh.input}>
                    {kidPulses.map(p => <option key={p.kid.id} value={p.kid.id}>{p.kid.displayname}</option>)}
                  </select>
                </div>
              )}
              <button
                style={{ ...lh.btnPrimary, opacity: saving || !ftTitle.trim() ? 0.6 : 1 }}
                disabled={saving || !ftTitle.trim()}
                onClick={handleFieldTripSave}
              >
                {saving ? 'Saving…' : '🚌 Log Trip & Reschedule →'}
              </button>
              <button style={lh.btnGhost} onClick={() => handleReschedule('field_trip', '')}>
                Skip log, just reschedule
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Done ── */}
        {step === 'done' && (
          <div style={lh.doneWrap}>
            <div style={{ fontSize: 56 }}>
              {reason === 'sick' ? '🤒' : reason === 'field_trip' ? '🚌' : reason === 'free_day' ? '☀️' : '✅'}
            </div>
            <div style={lh.doneTitle}>You&apos;re all set!</div>
            <div style={lh.doneSub}>
              {unfinished.length > 0 ? (
                <><strong>{unfinished.length} lesson{unfinished.length !== 1 ? 's' : ''}</strong> moved to{' '}
                <strong>{formatNextDay(nextDay)}</strong>.<br /></>
              ) : null}
              {reason === 'sick'       && 'Hope everyone feels better soon! 💊'}
              {reason === 'field_trip' && 'Field trip logged. Have a great time! 🎒'}
              {reason === 'free_day'   && 'Enjoy your well-deserved break! 🌿'}
              {reason === 'other'      && 'Day logged. Go enjoy it! 🌟'}
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
    maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
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
  fieldLabel: {
    display: 'block', fontSize: 11, fontWeight: 800, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
    fontFamily: "'Nunito', sans-serif",
  },
  input: {
    width: '100%', borderRadius: 10, border: '1.5px solid #e5e7eb',
    padding: '10px 12px', fontSize: 14, fontFamily: "'Nunito', sans-serif",
    fontWeight: 600, color: '#1a1a2e', outline: 'none', boxSizing: 'border-box',
    background: '#fff',
  },
}

// ─── Week Strip ───────────────────────────────────────────────────────────────

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function WeekStrip({
  weekLessons, today, onDayClick,
}: {
  weekLessons: Record<string, { lesson: any; kid: Kid }[]>
  today: Date
  onDayClick: (dateKey: string) => void
}) {
  const router = useRouter()
  const todayKey = toDateKey(today)

  const dow = today.getDay()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const key = toDateKey(d)
    return {
      key,
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
      dayNum: d.getDate(),
      count: weekLessons[key]?.length ?? 0,
    }
  })

  return (
    <div id="tour-week-strip" style={{
      background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)',
      borderRadius: 20, border: '1.5px solid rgba(124,58,237,0.10)',
      boxShadow: '0 4px 24px rgba(124,58,237,0.07)',
      marginBottom: 20, padding: '8px 14px',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <div style={{ display: 'flex', flex: 1, gap: 2 }}>
        {days.map(({ key, dayName, dayNum, count }) => {
          const isToday = key === todayKey
          return (
            <button
              key={key}
              onClick={() => onDayClick(key)}
              aria-label={`${dayName} ${dayNum}${count > 0 ? `, ${count} lesson${count === 1 ? '' : 's'} scheduled` : ''}`}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 3,
                padding: '5px 2px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: isToday ? '#7c3aed' : 'transparent',
                transition: 'background 0.15s',
              }}>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 9, fontWeight: 700, color: isToday ? 'rgba(255,255,255,0.85)' : '#6b7280', textTransform: 'uppercase' as const }}>{dayName}</span>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 900, color: isToday ? '#fff' : '#111827', lineHeight: 1 }}>{dayNum}</span>
              <div aria-hidden="true" style={{ width: 4, height: 4, borderRadius: '50%', background: count > 0 ? (isToday ? 'rgba(255,255,255,0.65)' : '#7c3aed') : 'transparent' }} />
            </button>
          )
        })}
      </div>
      <button
        onClick={() => router.push('/calendar')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, color: '#7c3aed', padding: '0 0 0 8px', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
        View full calendar →
      </button>
    </div>
  )
}

// ─── Day Drawer ───────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, { bg: string; label: string }> = {
  completed:   { bg: '#16a34a', label: 'Done' },
  in_progress: { bg: '#2563eb', label: 'In Progress' },
  not_started: { bg: '#d1d5db', label: 'Not Started' },
}

function DayDrawer({
  dateKey, entries, onClose, onLessonClick,
}: {
  dateKey: string
  entries: { lesson: any; kid: Kid }[]
  onClose: () => void
  onLessonClick: (lesson: any, kidName: string) => void
}) {
  const [localDate] = dateKey.split('T')
  const d = new Date(localDate + 'T12:00:00')
  const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Group by kid
  const byKid: Record<string, { kid: Kid; lessons: any[] }> = {}
  for (const { lesson, kid } of entries) {
    if (!byKid[kid.id]) byKid[kid.id] = { kid, lessons: [] }
    byKid[kid.id].lessons.push(lesson)
  }
  const groups = Object.values(byKid)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 540, margin: '0 auto',
          background: '#fff', borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column' as const,
          fontFamily: "'Nunito', sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#1a1a2e' }}>📅 {label}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {entries.length === 0 ? 'No lessons scheduled' : `${entries.length} lesson${entries.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', padding: '0 4px' }}>×</button>
        </div>

        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb', margin: '-8px auto 12px' }} />

        {/* Lesson list */}
        <div style={{ overflowY: 'auto' as const, flex: 1, padding: '0 16px 24px' }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: '32px 0', color: '#9ca3af', fontSize: 14 }}>
              Nothing scheduled — free day! 🎉
            </div>
          ) : (
            groups.map(({ kid, lessons }) => (
              <div key={kid.id} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#7c3aed', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                  {kid.displayname}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {lessons.map((lesson: any) => {
                    const dot = STATUS_DOT[lesson.status] ?? STATUS_DOT.not_started
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => onLessonClick(lesson, kid.displayname)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: '#f9fafb', borderRadius: 14,
                          padding: '12px 14px', border: '1.5px solid #f3f4f6',
                          cursor: 'pointer', textAlign: 'left' as const,
                          transition: 'background 0.12s',
                          width: '100%',
                        }}
                      >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot.bg, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{lesson.title}</div>
                          {lesson.subject && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{lesson.subject}</div>}
                        </div>
                        <div style={{ fontSize: 11, color: dot.bg, fontWeight: 700, flexShrink: 0 }}>{dot.label}</div>
                        <span style={{ color: '#9ca3af', fontSize: 16 }}>›</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Scout Nudge ──────────────────────────────────────────────────────────────

function computeScoutNudge(
  parentName: string,
  kidPulses: KidPulse[],
  weekLessons: Record<string, { lesson: any; kid: Kid }[]>,
  now: Date,
): string {
  const name = parentName ? `, ${parentName}` : ''
  const dow  = now.getDay()

  // Weekend
  if (dow === 0 || dow === 6) {
    return `Enjoy your weekend${name}! 🌿 Your lessons will be waiting on Monday.`
  }

  // Today's lesson counts
  const totalToday     = kidPulses.reduce((s, kp) => s + kp.totalToday, 0)
  const completedToday = kidPulses.reduce((s, kp) => s + kp.completedToday, 0)

  if (totalToday > 0 && completedToday === totalToday) {
    return `🎉 Every lesson is checked off for today${name}! That's a great school day.`
  }
  if (totalToday > 0 && completedToday > 0) {
    const pct = Math.round((completedToday / totalToday) * 100)
    const remaining = totalToday - completedToday
    return `${pct}% done${name}! ${remaining} lesson${remaining > 1 ? 's' : ''} still to go — keep the momentum going 🚀`
  }
  if (totalToday > 0 && completedToday === 0) {
    return `Hey${name}! You've got ${totalToday} lesson${totalToday > 1 ? 's' : ''} on deck today. Ready to kick things off? 📚`
  }

  // Check for activity gap in last 2 school days
  function prevSchoolDay(from: Date, offset: number): string {
    const d = new Date(from)
    let skipped = 0
    while (skipped < offset) {
      d.setDate(d.getDate() - 1)
      if (d.getDay() !== 0 && d.getDay() !== 6) skipped++
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const yesterday    = prevSchoolDay(now, 1)
  const twoDaysAgo   = prevSchoolDay(now, 2)
  const hasRecent    = (weekLessons[yesterday]?.length ?? 0) > 0 || (weekLessons[twoDaysAgo]?.length ?? 0) > 0
  const totalInWeek  = Object.values(weekLessons).flat().length

  if (!hasRecent && totalInWeek > 0) {
    return `Hey${name}, looks like it's been a couple of school days without any logged lessons. Did you school? Tap any card to catch up 📋`
  }

  // Day-specific greetings
  const greetings: Record<number, string> = {
    1: `Good morning${name}! New week, fresh start — let's make it a great one 🌟`,
    2: `Hey${name}! Two days in — you're on a roll 💪`,
    3: `Halfway through the week${name}! Keep it going 🔥`,
    4: `Almost Friday${name}! Finish strong — you've got this 🏁`,
    5: `Happy Friday${name}! Your school is ready when you are ☀️`,
  }
  return greetings[dow] ?? `Hey${name}! Let me know if I can help with anything today 🐦`
}

// ─── Dashboard Content ────────────────────────────────────────────────────────

function DashboardContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
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
  const [showDefaultNudge, setShowDefaultNudge] = useState(false)
  const [orgTeachingStyle,    setOrgTeachingStyle]    = useState<string | null>(null)
  const [showWelcome,         setShowWelcome]         = useState(() => searchParams?.get('preview') === 'welcome')
  const [showCurriculumNudge, setShowCurriculumNudge] = useState(() => searchParams?.get('preview') === 'curriculum')
  const [showTour, setShowTour]               = useState(false)
  const [tourAutoStart, setTourAutoStart]     = useState(false)
  const [tourFromWelcome, setTourFromWelcome] = useState(false)
  const [weekLessons, setWeekLessons]           = useState<Record<string, { lesson: any; kid: Kid }[]>>({})
  const [selectedWeekDay, setSelectedWeekDay]   = useState<string | null>(null)

  const now         = new Date()
  const dow         = now.getDay()
  const greeting    = DAY_GREETINGS[dow]
  const cardinalSrc = DAY_CARDINAL[dow]
  const dateStr     = `${DAYS_SHORT[dow]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`

  // Seed preview state from URL params (for design review)
  useEffect(() => {
    const preview = searchParams?.get('preview')
    if (preview === 'welcome' && !orgTeachingStyle) setOrgTeachingStyle('traditional')
    if (preview === 'curriculum') setShowCurriculumNudge(true)
  }, [searchParams])

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
      let localParentName = ''

      if (collab) {
        setIsCollaborator(true)
        orgId = collab.organization_id
        localParentName = collab.name || user.email?.split('@')[0] || ''
        setParentName(localParentName)
      } else {
        const { orgId: resolved } = await getOrganizationId(user.id)
        if (!resolved) { router.push('/onboarding'); return }
        orgId = resolved

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, homeschool_style, pinned_features, onboarding_completed_at, welcome_shown_at')
          .eq('user_id', user.id)
          .maybeSingle()
        localParentName = profile?.first_name ?? user.email?.split('@')[0] ?? ''
        if (profile?.first_name) setParentName(profile.first_name)
        const style = profile?.homeschool_style ?? null
        setHomeschoolStyle(style)
        const savedPins = profile?.pinned_features ?? []
        if (style === null) {
          // Parent skipped style picker — use defaults and show persistent nudge
          setPinnedFeatures(savedPins.length > 0 ? savedPins : DEFAULT_UNSTYLED)
          setShowDefaultNudge(true)
        } else {
          setPinnedFeatures(savedPins)
        }
        // Show welcome + tour if onboarding is complete but welcome hasn't been shown yet.
        // Uses DB so it works across devices and survives browser/tab interruptions.
        const needsWelcome = !!profile?.onboarding_completed_at && !profile?.welcome_shown_at

        if (needsWelcome) {
          setShowWelcome(true)
          // If pinned features didn't make it into DB yet, derive from style and persist them
          if ((profile?.pinned_features ?? []).length === 0) {
            const defaultPins = style === 'structured' ? DEFAULT_STRUCTURED : DEFAULT_FLEXIBLE
            setPinnedFeatures(defaultPins)
            supabase.from('user_profiles')
              .update({ pinned_features: defaultPins })
              .eq('user_id', user.id)
          }
        } else if (style === null && !localStorage.getItem('style_picker_dismissed')) {
          setShowStylePicker(true)
        } else if (style !== null && !localStorage.getItem('hq_tour_done')) {
          setShowTour(true)
        }

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
        const { data: orgData } = await supabase
          .from('organizations')
          .select('teaching_style')
          .eq('id', orgId)
          .maybeSingle()
        if (orgData?.teaching_style) setOrgTeachingStyle(orgData.teaching_style)
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

        // Fetch full lesson data for the whole week (Mon–Sun)
        const weekStart2 = new Date(now)
        const wDow = now.getDay()
        weekStart2.setDate(now.getDate() - (wDow === 0 ? 6 : wDow - 1))
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart2)
          d.setDate(weekStart2.getDate() + i)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        })
        const kidIds = kidsData.map((k: any) => k.id)
        if (kidIds.length > 0) {
          const { data: weekData } = await supabase
            .from('lessons')
            .select('id, title, status, subject, start_time, lesson_date, duration_minutes, kid_id, description, lesson_source')
            .in('kid_id', kidIds)
            .in('lesson_date', weekDays)
            .order('start_time', { ascending: true })
          const byDate: Record<string, { lesson: any; kid: Kid }[]> = {}
          for (const d of weekDays) byDate[d] = []
          for (const lesson of weekData ?? []) {
            if (!lesson.lesson_date) continue
            const kid = kidsData.find((k: any) => k.id === lesson.kid_id)
            if (kid && byDate[lesson.lesson_date]) {
              byDate[lesson.lesson_date].push({
                lesson,
                kid: { id: kid.id, displayname: kid.displayname, grade_level: kid.grade_level, learning_style: kid.learning_style },
              })
            }
          }
          setWeekLessons(byDate)
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  // Dispatch Scout nudge once data is loaded
  useEffect(() => {
    if (loading) return
    const msg = computeScoutNudge(parentName, kidPulses, weekLessons, now)
    window.dispatchEvent(new CustomEvent('scout-nudge', { detail: { message: msg } }))
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3d3a52' }}>
      <div style={{ color: '#7c3aed', fontWeight: 800, fontSize: 18, fontFamily: "'Nunito', sans-serif" }}>Loading...</div>
    </div>
  )

  const attendanceNote = [schoolState, requiredDays].filter(Boolean).join(': ') || 'Daily check-in'

  const css = {
    root: {
      fontFamily: "'Nunito', sans-serif",
      minHeight: '100vh',
      background: '#3d3a52',
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
    logo: { display: 'flex', flexDirection: 'column' as const, lineHeight: 1, gap: 1 },
    logoH: { fontWeight: 900, fontSize: 26, color: '#7c3aed', letterSpacing: 0.5 },
    logoR: { fontWeight: 800, fontSize: 13, color: '#0d9488', letterSpacing: 2, paddingLeft: 24 },
    dateStr: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 },

    cardinalWrap: { display: 'flex', alignItems: 'flex-end', gap: 12, flexShrink: 0 },
    bubble: {
      background: 'rgba(255,255,255,0.95)',
      borderRadius: '16px 16px 0 16px',
      padding: '14px 18px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      maxWidth: 280,
      border: '1px solid rgba(124,58,237,0.15)',
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
    secTitle:   { fontSize: 12, fontWeight: 900, color: '#c4b5fd', letterSpacing: 1.2 },
    secSub:     { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600 },

    pulseCard: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '18px 12px 16px',
      minHeight: 140,
      background: 'rgba(255,255,255,0.85)',
      borderRadius: 20,
      border: '1.5px solid rgba(124,58,237,0.15)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 2px 16px rgba(124,58,237,0.08)',
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
      background: 'rgba(255,255,255,0.85)',
      borderRadius: 22,
      padding: '48px 32px',
      textAlign: 'center' as const,
      border: '2px dashed #d1d5db',
    },

    quickGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 200px))',
      justifyContent: 'center',
      gap: 14,
      marginBottom: 14,
    },
    quickCard: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 20,
      border: '1.5px solid rgba(255,255,255,0.9)',
      padding: '22px 14px 20px',
      minHeight: 140,
      boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
      textAlign: 'center' as const,
      fontFamily: "'Nunito', sans-serif",
      width: '100%',
    },
    qIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    qLabel: { fontWeight: 900, fontSize: 15, marginBottom: 3, lineHeight: 1.2 },
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
      background: 'linear-gradient(160deg, #faf5ff 0%, #ede9fe 40%, #f0eff4 100%)',
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
        @media (max-width: 400px) {
          .quick-grid { grid-template-columns: repeat(2, 1fr) !important; }
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

          {/* Week Strip */}
          <WeekStrip
            weekLessons={weekLessons}
            today={now}
            onDayClick={key => setSelectedWeekDay(key)}
          />

          {/* Pulse Check — shown only when pinned (DEFAULT_STRUCTURED includes it; DEFAULT_FLEXIBLE does not) */}
          {pinnedFeatures.includes('pulse_check') && <section id="tour-pulse">
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
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 200px))',
                  justifyContent: 'center',
                  gap: 14,
                }}
              >
                {kidPulses.map(pulse => (
                  <div key={pulse.kid.id} className="pulse-card"
                    style={{ ...css.pulseCard, cursor: 'pointer' }}
                    onClick={() => setActivePulseKidId(pulse.kid.id)}>
                    {/* Compact ring */}
                    <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 8px', flexShrink: 0 }}>
                      <PulseRing pct={pulse.pct} color={pulse.color} size={90} />
                      <div style={css.ringCenter}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{pulse.pct}%</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#1a1a2e', textAlign: 'center' as const, marginBottom: 4 }}>{pulse.kid.displayname}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textAlign: 'center' as const }}>
                      {pulse.totalToday > 0
                        ? `${pulse.completedToday}/${pulse.totalToday} done`
                        : 'No lessons today'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>}

          {/* Quick Actions — style-aware */}
          <section id="tour-quick-actions">
            <div style={{ ...css.sectionRow, justifyContent: 'space-between' }}>
              <span style={css.secTitle}>
                {homeschoolStyle === 'flexible' ? 'QUICK LOG' : 'QUICK ACTIONS'}
              </span>
              <button
                onClick={() => setShowStylePicker(true)}
                style={{
                  fontSize: 12, fontWeight: 700, color: '#6b7280',
                  background: 'rgba(255,255,255,0.75)', border: '1.5px solid rgba(209,213,219,0.8)',
                  borderRadius: 20, padding: '5px 12px', cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                ✏️ Customize cards
              </button>
            </div>

            {/* ── Default layout nudge (shown until parent picks a style) ── */}
            {showDefaultNudge && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(196,181,253,0.15)', border: '1.5px solid rgba(124,58,237,0.25)',
                borderRadius: 12, padding: '10px 14px', marginBottom: 12,
              }}>
                <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600, lineHeight: 1.5 }}>
                  Using a <span style={{ fontWeight: 900, color: '#c4b5fd' }}>default layout</span> — not personalized yet.
                </div>
                <button
                  onClick={() => { setShowStylePicker(true) }}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none',
                    borderRadius: 20, padding: '6px 12px', fontSize: 11, fontWeight: 800,
                    color: '#fff', cursor: 'pointer', fontFamily: "'Nunito', sans-serif", flexShrink: 0,
                  }}
                >
                  Personalize →
                </button>
                <button
                  onClick={() => setShowDefaultNudge(false)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 16, cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                  aria-label="Dismiss for now"
                >✕</button>
              </div>
            )}

            {/* ── Dynamic grid driven by pinnedFeatures ── */}
            {(() => {
              // Structured mode always gets Today's Learning first
              const todayBtn = homeschoolStyle === 'structured' ? [{
                key: '__today__',
                emoji: '📝', label: "Today's Learning", sub: "All children's agenda",
                bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', iconBg: '#7c3aed', color: '#4c1d95', subColor: '#7c3aed',
                onClick: () => setShowToday(true),
              }] : []

              // Pinned features (skip pulse_check — that's a section toggle, not a button)
              const pinnedBtns = pinnedFeatures
                .filter(fid => fid !== 'pulse_check' && QUICK_ACTION_CONFIG[fid])
                .map(fid => {
                  const c = QUICK_ACTION_CONFIG[fid]
                  const onClick =
                    c.action === 'route'    ? () => router.push(c.href!)
                    : c.action === 'lesson'  ? () => setShowGenerator(true)
                    : c.action === 'activity'? () => setShowActivity(true)
                    : c.action === 'scout'   ? () => window.dispatchEvent(new CustomEvent('open-scout-copilot'))
                    : () => {}
                  return { key: fid, ...c, onClick }
                })

              // Always append Ask Scout (SOS)
              const helpBtn = {
                key: '__help__',
                emoji: null as null, imgSrc: '/Cardinal_Mascot.png', label: 'Ask Scout', sub: 'Ask me anything, anytime',
                bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', iconBg: '#f59e0b', color: '#78350f', subColor: '#d97706',
                onClick: () => window.dispatchEvent(new CustomEvent('open-scout-copilot')),
              }

              const allBtns = [...todayBtn, ...pinnedBtns, helpBtn]

              return (
                <div className="quick-grid" style={css.quickGrid}>
                  {allBtns.map(btn => (
                    <button key={btn.key} className="quick-btn"
                      style={{ ...css.quickCard, background: btn.bg }}
                      onClick={btn.onClick}>
                      <div style={{ ...css.qIcon, background: btn.iconBg }}>
                        {(btn as any).imgSrc
                          ? <img src={(btn as any).imgSrc} alt={btn.label} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                          : <span style={{ fontSize: 28 }}>{btn.emoji}</span>
                        }
                      </div>
                      <div>
                        <div style={{ ...css.qLabel, color: btn.color }}>{btn.label}</div>
                        <div style={{ ...css.qSub, color: btn.subColor }}>{btn.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* Life Happens FAB */}
            <div id="tour-life-happens" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0 4px' }}>
              <button style={css.lifeFab} onClick={() => setShowLifeHappens(true)}>
                <span style={{ fontSize: 44 }}>🌤️</span>
              </button>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#fbbf24', fontFamily: "'Nunito', sans-serif", letterSpacing: 0.5 }}>
                Life Happens
              </span>
            </div>

            {/* Replay tour — subtle link below Life Happens */}
            <div style={{ textAlign: 'center', paddingTop: 6, paddingBottom: 4 }}>
              <button
                onClick={() => { localStorage.removeItem('hq_tour_done'); setTourAutoStart(false); setShowTour(true) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
                  fontFamily: "'Nunito', sans-serif",
                  letterSpacing: 0.3,
                }}
              >
                🗺️ Replay tour
              </button>
            </div>
          </section>

        </main>

        <div style={{ height: 80 }} />

        {showLifeHappens && (
          <LifeHappensModal
            todayLessons={todayLessons}
            kidPulses={kidPulses}
            cardinalSrc={cardinalSrc}
            organizationId={organizationId}
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
            homeschoolStyle={homeschoolStyle ?? null}
            onClose={() => setShowGenerator(false)}
          />
        )}
        {showActivity && (
          <ActivityGenerator
            kids={kidPulses.map(p => p.kid)}
            organizationId={organizationId}
            homeschoolStyle={homeschoolStyle ?? null}
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
        {/* Day Drawer — opened from week strip */}
        {selectedWeekDay && (
          <DayDrawer
            dateKey={selectedWeekDay}
            entries={weekLessons[selectedWeekDay] ?? []}
            onClose={() => setSelectedWeekDay(null)}
            onLessonClick={(lesson, kidName) => {
              setSelectedKidName(kidName)
              setSelectedLesson(lesson as LessonViewModalLesson)
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
              const id = selectedLesson.id
              await supabase.from('lessons').delete().eq('id', id)
              setTodayLessons(prev => {
                const updated = { ...prev }
                for (const kid in updated) updated[kid] = updated[kid].filter(l => l.id !== id)
                return updated
              })
              setWeekLessons(prev => {
                const updated = { ...prev }
                for (const day in updated) updated[day] = updated[day].filter(e => e.lesson.id !== id)
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
              setWeekLessons(prev => {
                const updated = { ...prev }
                for (const day in updated) updated[day] = updated[day].map(e => e.lesson.id === lessonId ? { ...e, lesson: { ...e.lesson, status: next } } : e)
                return updated
              })
              setSelectedLesson(s => s ? { ...s, status: next as LessonViewModalLesson['status'] } : null)
            }}
            onSetStatus={async (lessonId, newStatus) => {
              await supabase.from('lessons').update({ status: newStatus }).eq('id', lessonId)
              handleLessonStatusUpdate(lessonId, selectedLesson!.kid_id, newStatus)
              setWeekLessons(prev => {
                const updated = { ...prev }
                for (const day in updated) updated[day] = updated[day].map(e => e.lesson.id === lessonId ? { ...e, lesson: { ...e.lesson, status: newStatus } } : e)
                return updated
              })
              setSelectedLesson(s => s ? { ...s, status: newStatus as LessonViewModalLesson['status'] } : null)
            }}
            onSave={(lessonId, updates) => {
              setTodayLessons(prev => {
                const updated = { ...prev }
                for (const kid in updated) updated[kid] = updated[kid].map(l => l.id === lessonId ? { ...l, ...updates } : l)
                return updated
              })
              setWeekLessons(prev => {
                const updated = { ...prev }
                for (const day in updated) updated[day] = updated[day].map(e => e.lesson.id === lessonId ? { ...e, lesson: { ...e.lesson, ...updates } } : e)
                return updated
              })
              setSelectedLesson(s => s ? { ...s, ...updates } : null)
            }}
          />
        )}

        {/* ── First-time Welcome Modal ── */}
        {showWelcome && (() => {
          const STYLE_DISPLAY: Record<string, string> = {
            traditional: 'Traditional', classical: 'Classical',
            charlotte_mason: 'Charlotte Mason', eclectic: 'Eclectic',
            montessori: 'Montessori', waldorf: 'Waldorf',
            unit_studies: 'Unit Studies', unschooling: 'Unschooling',
          }
          const styleKey = orgTeachingStyle ?? homeschoolStyle ?? ''
          const styleName = STYLE_DISPLAY[styleKey] ?? styleKey ?? 'your teaching style'
          const handleDismiss = async () => {
            // Mark welcome as shown in DB so it never re-appears on any device
            await supabase.from('user_profiles')
              .update({ welcome_shown_at: new Date().toISOString() })
              .eq('user_id', user?.id)
            setShowWelcome(false)
            // Always start the tour — parent just clicked "Let's take a tour →"
            localStorage.removeItem('hq_tour_done')
            localStorage.removeItem('hq_curriculum_nudge_done')
            setTourFromWelcome(true)
            setTourAutoStart(true)
            setShowTour(true)
          }
          return (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(10,5,30,0.7)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px 20px 88px',
            }}>
              <div style={{
                background: '#fff', borderRadius: 24, width: '100%', maxWidth: 460,
                padding: '32px 28px 28px', fontFamily: "'Nunito', sans-serif",
                boxShadow: '0 32px 80px rgba(0,0,0,0.3)', textAlign: 'center',
              }}>
                <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 16 }} />
                <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', marginBottom: 10, lineHeight: 1.25 }}>
                  Welcome to your Home page! 🏡
                </div>
                <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7, marginBottom: 8 }}>
                  Your layout has been set up based on your
                </div>
                <div style={{
                  display: 'inline-block', background: '#ede9fe', borderRadius: 20,
                  padding: '4px 16px', fontSize: 14, fontWeight: 800, color: '#7c3aed', marginBottom: 16,
                }}>
                  {styleName} style
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65, marginBottom: 24 }}>
                  Look around — this is your command center. You can customize which cards appear anytime using the{' '}
                  <span style={{ fontWeight: 800, color: '#7c3aed' }}>✏️ Customize</span> pill.
                </div>
                <button
                  onClick={handleDismiss}
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#fff', fontWeight: 800, fontSize: 15,
                    cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  Let's take a tour →
                </button>
              </div>
            </div>
          )
        })()}

        {/* ── Curriculum Import Nudge (structured users, post-tour, one-time) ── */}
        {showCurriculumNudge && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(10,5,30,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 20px 88px',
          }}>
            <div style={{
              background: '#fff', borderRadius: 24, width: '100%', maxWidth: 460,
              padding: '32px 28px 28px', fontFamily: "'Nunito', sans-serif",
              boxShadow: '0 32px 80px rgba(0,0,0,0.3)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', marginBottom: 10, lineHeight: 1.25 }}>
                Ready to import your curriculum?
              </div>
              <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7, marginBottom: 24 }}>
                Since you use a structured curriculum, you can import your lessons directly into HomeschoolReady — saving hours of manual entry.
                Ready to dive in? Tap <strong>Import Now</strong> below. Prefer to do it later? You can always find it under <strong>Tools</strong>.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    localStorage.setItem('hq_curriculum_nudge_done', '1')
                    localStorage.removeItem('hq_curriculum_nudge_pending')
                    setShowCurriculumNudge(false)
                  }}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 12,
                    border: '1.5px solid #e5e7eb', background: '#fff',
                    color: '#6b7280', fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  Maybe later
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('hq_curriculum_nudge_done', '1')
                    localStorage.removeItem('hq_curriculum_nudge_pending')
                    setShowCurriculumNudge(false)
                    router.push('/curriculum/import')
                  }}
                  style={{
                    flex: 2, padding: '12px 16px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#fff', fontWeight: 800, fontSize: 14,
                    cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  Import my curriculum →
                </button>
              </div>
            </div>
          </div>
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
              setShowDefaultNudge(false)
              setShowStylePicker(false)
              // Only auto-launch tour the very first time a parent sets up
              if (!localStorage.getItem('hq_tour_done')) {
                setTourAutoStart(true)
                setShowTour(true)
              }
            }}
            onCancel={() => {
              if (homeschoolStyle === null) {
                localStorage.setItem('style_picker_dismissed', '1')
              }
              setShowStylePicker(false)
            }}
          />
        )}

        {/* ── Product Tour ── */}
        {showTour && (
          <ProductTour
            parentName={parentName || undefined}
            autoStart={tourAutoStart}
            homeschoolStyle={homeschoolStyle ?? null}
            pinnedFeatures={pinnedFeatures}
            onDone={() => {
              setShowTour(false)
              setTourAutoStart(false)
              const structuredTeachingStyles = ['traditional', 'classical', 'charlotte_mason']
              const isStructured = homeschoolStyle === 'structured'
                || structuredTeachingStyles.includes(orgTeachingStyle ?? '')
              // Always show curriculum nudge to structured users coming from the welcome flow
              // (clears stale localStorage so nothing is suppressed)
              const alreadySeen = tourFromWelcome ? false : !!localStorage.getItem('hq_curriculum_nudge_done')
              if (isStructured && !alreadySeen) {
                setShowCurriculumNudge(true)
              }
              setTourFromWelcome(false)
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

