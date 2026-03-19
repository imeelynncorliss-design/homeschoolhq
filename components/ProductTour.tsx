'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourStep {
  targetId: string
  title: string
  content: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

interface ProductTourProps {
  parentName?: string
  /** Pass true right after StylePickerModal completes to auto-start the tour */
  autoStart?: boolean
  onDone: () => void
}

// ─── Tour steps ───────────────────────────────────────────────────────────────

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-pulse',
    title: 'Your Daily Pulse Check',
    content: "These rings show each child's daily progress at a glance. Tap any ring to see their full lesson list and mark things done.",
    position: 'bottom',
  },
  {
    targetId: 'tour-quick-actions',
    title: 'Quick Actions',
    content: 'Your most-used shortcuts live here. Log attendance, plan a lesson, or hit the Stuck button and I\'ll jump in to help.',
    position: 'bottom',
  },
  {
    targetId: 'tour-bottom-nav',
    title: 'Navigate Your School',
    content: 'Use the bottom bar to move between Calendar, Records, Tools, and more. Everything your school needs — one tap away.',
    position: 'top',
  },
  {
    targetId: 'tour-scout-btn',
    title: "I'm always here!",
    content: "Tap the Scout button anytime to plan a lesson, generate an activity, or just ask me a question. I'm your 24/7 co-pilot.",
    position: 'top',
  },
]

const STORAGE_KEY = 'hq_tour_done'

// ─── Tooltip position helper ──────────────────────────────────────────────────

function getTooltipStyle(targetId: string, position: TourStep['position']): React.CSSProperties {
  if (typeof window === 'undefined') return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  const el = document.getElementById(targetId)
  if (!el || position === 'center') return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }

  const rect = el.getBoundingClientRect()
  const TW = 320 // tooltip width
  const GAP = 18

  const clampX = (x: number) => Math.max(12, Math.min(x, window.innerWidth - TW - 12))

  switch (position) {
    case 'bottom':
      return { top: rect.bottom + GAP, left: clampX(rect.left + rect.width / 2 - TW / 2) }
    case 'top':
      return { bottom: window.innerHeight - rect.top + GAP, left: clampX(rect.left + rect.width / 2 - TW / 2) }
    case 'left':
      return { top: rect.top, right: window.innerWidth - rect.left + GAP }
    case 'right':
      return { top: rect.top, left: rect.right + GAP }
    default:
      return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  }
}

function getArrowStyle(position: TourStep['position']): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute', width: 0, height: 0, borderStyle: 'solid',
  }
  switch (position) {
    case 'bottom': return { ...base, top: -10, left: '50%', transform: 'translateX(-50%)', borderWidth: '0 10px 10px', borderColor: 'transparent transparent #fff transparent' }
    case 'top':    return { ...base, bottom: -10, left: '50%', transform: 'translateX(-50%)', borderWidth: '10px 10px 0', borderColor: '#fff transparent transparent transparent' }
    case 'right':  return { ...base, left: -10, top: 20, borderWidth: '10px 10px 10px 0', borderColor: 'transparent #fff transparent transparent' }
    case 'left':   return { ...base, right: -10, top: 20, borderWidth: '10px 0 10px 10px', borderColor: 'transparent transparent transparent #fff' }
    default:       return {}
  }
}

// ─── Highlight ring around target ─────────────────────────────────────────────

function HighlightRing({ targetId }: { targetId: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const el = document.getElementById(targetId)
    if (el) setRect(el.getBoundingClientRect())
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

export default function ProductTour({ parentName, autoStart = false, onDone }: ProductTourProps) {
  const [phase, setPhase]         = useState<'idle' | 'welcome' | 'tour'>('idle')
  const [step, setStep]           = useState(0)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
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
    const s = TOUR_STEPS[step]
    setTooltipStyle(getTooltipStyle(s.targetId, s.position))
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
    if (step < TOUR_STEPS.length - 1) {
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

  const currentTourStep = TOUR_STEPS[step]

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
              background: 'rgba(15,10,40,0.52)',
              backdropFilter: 'blur(2px)',
              zIndex: 9990,
            }}
          />

          {/* Highlight ring */}
          <HighlightRing targetId={currentTourStep.targetId} />

          {/* Tooltip card */}
          <div
            className="tour-card"
            key={step}
            style={{
              position: 'fixed',
              ...tooltipStyle,
              width: 320,
              zIndex: 9999,
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {/* Arrow */}
            {currentTourStep.position !== 'center' && (
              <div style={getArrowStyle(currentTourStep.position)} />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 13, color: '#fff', lineHeight: 1.2 }}>{currentTourStep.title}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Scout • Step {step + 1} of {TOUR_STEPS.length}</div>
                  </div>
                </div>
                <button onClick={finish} style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 14, cursor: 'pointer', padding: '3px 7px',
                  fontFamily: "'Nunito', sans-serif", fontWeight: 700,
                }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 18px 18px' }}>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: '0 0 16px', fontWeight: 600 }}>
                  {currentTourStep.content}
                </p>

                {/* Progress dots + Next button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {TOUR_STEPS.map((_, i) => (
                      <div key={i} style={{
                        height: 6, borderRadius: 3,
                        width: i === step ? 22 : 6,
                        background: i === step ? '#7c3aed' : '#e5e7eb',
                        transition: 'all 0.25s',
                      }} />
                    ))}
                  </div>
                  <button
                    onClick={nextStep}
                    style={{
                      padding: '9px 18px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    {step === TOUR_STEPS.length - 1 ? "Let's go! 🎉" : 'Next →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
