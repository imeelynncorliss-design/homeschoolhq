'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourStep {
  targetId: string
  title: string
  content: string
  bullets?: string[]
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

interface ProductTourProps {
  parentName?: string
  /** Pass true right after StylePickerModal completes to auto-start the tour */
  autoStart?: boolean
  homeschoolStyle?: 'flexible' | 'structured' | null
  pinnedFeatures?: string[]
  onDone: () => void
}

// ─── Build tour steps based on what the user actually has visible ─────────────

function buildTourSteps(
  homeschoolStyle: 'flexible' | 'structured' | null | undefined,
  pinnedFeatures: string[]
): TourStep[] {
  const steps: TourStep[] = []

  // Week strip — always first
  steps.push({
    targetId: 'tour-week-strip',
    title: 'Your Week at a Glance',
    content: "A purple dot means lessons are scheduled that day. Tap any day to see those lessons — and open, edit, check in, or delete right from there. Tap 'View full calendar' to see the full month view.",
    position: 'bottom',
  })

  // Pulse check — only if structured OR user pinned it
  const hasPulse = homeschoolStyle !== 'flexible' || pinnedFeatures.includes('pulse_check')
  if (hasPulse) {
    steps.push({
      targetId: 'tour-pulse',
      title: 'Daily Progress Rings',
      content: "Each ring shows how much of today's work a child has completed. Tap a ring to see their full lesson list and mark things done.",
      position: 'bottom',
    })
  }

  // Quick actions — always present, copy adapts by mode
  const isFlexible = homeschoolStyle === 'flexible'
  steps.push({
    targetId: 'tour-quick-actions',
    title: isFlexible ? 'Your Quick Log' : 'Your Quick Actions',
    content: isFlexible
      ? "Shortcuts for logging what you do each day. Tap any card to jump right in — and tap 'Ask Scout' anytime I can help."
      : "Jump to Today's Learning, log attendance, check compliance, or plan a lesson. Tap 'Ask Scout' anytime you have a question.",
    position: 'bottom',
  })

  // Bottom nav — always
  steps.push({
    targetId: 'tour-bottom-nav',
    title: 'Navigate Your School',
    content: 'Everything your school needs is one tap away:',
    bullets: [
      '📚 Subjects — see what each child is learning and all their scheduled lessons',
      '📋 Records — attendance, compliance, transcripts, reading logs, and more',
      '💡 Resources — manage teaching materials and supplies',
      '🔧 Tools — import curriculum, bulk schedule, plan vacations, add co-teachers',
      '👤 Profile — your account, children\'s profiles, and teaching style',
    ],
    position: 'top',
  })

  // Life Happens — always
  steps.push({
    targetId: 'tour-life-happens',
    title: 'Life Happens 🌤️',
    content: "Sick day? Field trip? Just need a break? Tap the sun button to log it. Life Happens lets you record what happened, adjust your school day, and keep your attendance records accurate — without stress.",
    position: 'top',
  })

  // Ask Scout — always last
  steps.push({
    targetId: 'tour-quick-actions',
    title: "Ask Scout Anything",
    content: "I'm your 24/7 homeschool co-pilot. Ask me about state requirements, curriculum ideas, how to use any feature in the app — anything. Just tap the Ask Scout card.",
    position: 'bottom',
  })

  return steps
}

const STORAGE_KEY = 'hq_tour_done'

// ─── Tooltip position helper ──────────────────────────────────────────────────
// Positions the card adjacent to the target element (below or above),
// clamped to stay within the viewport. Call after scrollIntoView settles.

type ArrowDir = 'up' | 'down' | 'none'

function getTooltipPosition(targetId: string): { style: React.CSSProperties; arrow: ArrowDir } {
  if (typeof window === 'undefined') {
    return { style: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }, arrow: 'none' }
  }

  const vw  = window.innerWidth
  const vh  = window.innerHeight
  const TW  = Math.min(360, vw - 32)
  const TH  = 300  // generous estimated tooltip height
  const GAP = 14
  const M   = 16   // viewport margin

  const el = document.getElementById(targetId)
  if (!el) {
    return { style: { bottom: 110, left: Math.max(M, (vw - TW) / 2), width: TW }, arrow: 'none' }
  }

  const rect = el.getBoundingClientRect()
  // Center the tooltip horizontally over the element, clamped to viewport
  const left = Math.max(M, Math.min(rect.left + rect.width / 2 - TW / 2, vw - TW - M))

  // Prefer placing below the element
  const topBelow = rect.bottom + GAP
  if (topBelow + TH <= vh - M) {
    return { style: { top: topBelow, left, width: TW }, arrow: 'up' }
  }

  // Otherwise place above the element
  const topAbove = rect.top - TH - GAP
  if (topAbove >= M) {
    return { style: { top: Math.max(M, topAbove), left, width: TW }, arrow: 'down' }
  }

  // Last resort: bottom-center above nav
  return { style: { bottom: 110, left: Math.max(M, (vw - TW) / 2), width: TW }, arrow: 'up' }
}

function getArrowStyle(arrow: ArrowDir): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute', width: 0, height: 0, borderStyle: 'solid',
    left: '50%', transform: 'translateX(-50%)',
  }
  if (arrow === 'up')   return { ...base, top: -10,    borderWidth: '0 10px 10px', borderColor: 'transparent transparent #fff transparent' }
  if (arrow === 'down') return { ...base, bottom: -10, borderWidth: '10px 10px 0', borderColor: '#fff transparent transparent transparent' }
  return {}
}

// ─── Highlight ring around target ─────────────────────────────────────────────

function HighlightRing({ targetId }: { targetId: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const el = document.getElementById(targetId)
    if (el) {
      // Wait for scroll to settle before measuring
      setTimeout(() => setRect(el.getBoundingClientRect()), 420)
    }
  }, [targetId])

  if (!rect) return null
  const PAD = 8
  return (
    <div style={{
      position: 'fixed',
      top: rect.top - PAD,
      left: rect.left - PAD,
      width: rect.width + PAD * 2,
      height: rect.height + PAD * 2,
      borderRadius: 18,
      border: '2.5px solid rgba(124,58,237,0.7)',
      boxShadow: '0 0 0 4px rgba(124,58,237,0.18)',
      pointerEvents: 'none',
      zIndex: 9998,
      animation: 'tour-pulse-ring 2s ease-in-out infinite',
    }} />
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductTour({ parentName, autoStart = false, homeschoolStyle, pinnedFeatures = [], onDone }: ProductTourProps) {
  const tourSteps = buildTourSteps(homeschoolStyle, pinnedFeatures)
  const [phase, setPhase]         = useState<'idle' | 'welcome' | 'tour'>('idle')
  const [step, setStep]           = useState(0)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [arrowDir, setArrowDir]         = useState<ArrowDir>('up')
  const [mounted, setMounted]     = useState(false)

  // Show welcome bubble after delay
  useEffect(() => {
    setMounted(true)
    const alreadyDone = localStorage.getItem(STORAGE_KEY)
    if (alreadyDone && !autoStart) return

    if (autoStart) {
      // Came straight from style picker — small delay then show welcome
      const t = setTimeout(() => setPhase('welcome'), 800)
      return () => clearTimeout(t)
    } else {
      // Returning visit, first time ever
      const t = setTimeout(() => setPhase('welcome'), 1400)
      return () => clearTimeout(t)
    }
  }, [autoStart])

  // Recalculate tooltip position whenever step changes
  const recalcPosition = useCallback(() => {
    if (phase !== 'tour') return
    const s = tourSteps[step]
    const el = document.getElementById(s.targetId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => {
        const { style, arrow } = getTooltipPosition(s.targetId)
        setTooltipStyle(style)
        setArrowDir(arrow)
      }, 400)
    } else {
      const { style, arrow } = getTooltipPosition(s.targetId)
      setTooltipStyle(style)
      setArrowDir(arrow)
    }
  }, [phase, step])

  useEffect(() => {
    recalcPosition()
    window.addEventListener('resize', recalcPosition)
    return () => window.removeEventListener('resize', recalcPosition)
  }, [recalcPosition])

  function startTour() {
    setStep(0)
    setPhase('tour')
  }

  function nextStep() {
    if (step < tourSteps.length - 1) {
      setStep(s => s + 1)
    } else {
      finish()
    }
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1')
    setPhase('idle')
    onDone()
  }

  if (!mounted) return null

  const currentTourStep = tourSteps[step]

  return (
    <>
      <style>{`
        @keyframes tour-pulse-ring {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.015); }
        }
        @keyframes tour-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tour-card { animation: tour-fade-in 0.3s ease forwards; }
      `}</style>

      {/* ── Welcome bubble ── */}
      {phase === 'welcome' && (
        <div style={{
          position: 'fixed', bottom: 110, right: 24, zIndex: 10000,
          width: 300, fontFamily: "'Nunito', sans-serif",
          animation: 'tour-fade-in 0.4s ease forwards',
        }}>
          <div style={{
            background: '#fff', borderRadius: 22,
            boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(124,58,237,0.12)',
            border: '1.5px solid rgba(124,58,237,0.15)',
            overflow: 'hidden',
          }}>
            {/* Scout header */}
            <div style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>Hi{parentName ? `, ${parentName}` : ''}! I'm Scout 👋</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Your Homeschool Co-Pilot</div>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: '16px 18px 18px' }}>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: '0 0 14px', fontWeight: 600 }}>
                Your home screen is all set! Want a quick 30-second tour so you know where everything lives?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={startTour}
                  style={{
                    padding: '10px 14px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                    fontFamily: "'Nunito', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  Show me around →
                </button>
                {autoStart && (
                  <button
                    onClick={finish}
                    style={{
                      padding: '10px 14px', borderRadius: 12,
                      border: '1.5px solid #e5e7eb',
                      background: '#fafafa', color: '#6b7280',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      fontFamily: "'Nunito', sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    I'll explore on my own
                    <span style={{ fontSize: 11 }}>skip</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Triangle pointing down toward Scout button */}
          <div style={{
            width: 0, height: 0, borderStyle: 'solid',
            borderWidth: '10px 10px 0',
            borderColor: 'rgba(124,58,237,0.15) transparent transparent',
            marginLeft: 'auto', marginRight: 28, marginTop: -1,
          }} />
        </div>
      )}

      {/* ── Tour overlay ── */}
      {phase === 'tour' && (
        <>
          {/* Dim backdrop */}
          <div
            onClick={finish}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(15,10,40,0.38)',
              zIndex: 9990,
            }}
          />

          {/* Highlight ring */}
          <HighlightRing targetId={currentTourStep.targetId} />

          {/* Tooltip card */}
          <div
            className="tour-card"
            key={step}
            role="dialog"
            aria-modal="true"
            aria-label={`Product tour step ${step + 1} of ${tourSteps.length}: ${currentTourStep.title}`}
            style={{
              position: 'fixed',
              ...tooltipStyle,
              zIndex: 9999,
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {/* Arrow */}
            {arrowDir !== 'none' && (
              <div style={getArrowStyle(arrowDir)} />
            )}

            <div style={{
              background: '#fff', borderRadius: 20,
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
              border: '1.5px solid rgba(124,58,237,0.12)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: '#fff', lineHeight: 1.2 }}>{currentTourStep.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Scout • Step {step + 1} of {tourSteps.length}</div>
                  </div>
                </div>
                <button onClick={finish} aria-label="Close tour" style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 14, cursor: 'pointer', padding: '3px 7px',
                  fontFamily: "'Nunito', sans-serif", fontWeight: 700,
                }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: '18px 20px 20px' }}>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.65, margin: currentTourStep.bullets ? '0 0 12px' : '0 0 18px', fontWeight: 600 }}>
                  {currentTourStep.content}
                </p>
                {currentTourStep.bullets && (
                  <ul style={{ margin: '0 0 18px', padding: '0 0 0 4px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {currentTourStep.bullets.map((b, i) => (
                      <li key={i} style={{ fontSize: 13, color: '#374151', fontWeight: 600, lineHeight: 1.4 }}>{b}</li>
                    ))}
                  </ul>
                )}

                {/* Progress dots + Back/Next buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {tourSteps.map((_, i) => (
                      <div key={i} style={{
                        height: 6, borderRadius: 3,
                        width: i === step ? 22 : 6,
                        background: i === step ? '#7c3aed' : '#e5e7eb',
                        transition: 'all 0.25s',
                      }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {step > 0 && (
                      <button
                        onClick={() => setStep(s => s - 1)}
                        style={{
                          padding: '9px 14px', borderRadius: 10,
                          border: '1.5px solid #e5e7eb',
                          background: '#fafafa', color: '#6b7280',
                          fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          fontFamily: "'Nunito', sans-serif",
                        }}
                      >
                        ← Back
                      </button>
                    )}
                    <button
                      onClick={nextStep}
                      style={{
                        padding: '9px 18px', borderRadius: 10, border: 'none',
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      {step === tourSteps.length - 1 ? "Let's go! 🎉" : 'Next →'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
