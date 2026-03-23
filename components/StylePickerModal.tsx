'use client'

import { useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { supabase } from '@/src/lib/supabase'
import { getRegLevel, REG_LABEL, REG_DESC } from '@/lib/stateRegulation'

// ─── Feature options ──────────────────────────────────────────────────────────

export const STYLE_FEATURES = [
  { id: 'pulse_check', emoji: '🎯', label: 'Progress Dials',           desc: 'Daily % completion rings per child' },
  { id: 'attendance',  emoji: '✅', label: 'Attendance Tracking',      desc: 'Log school days and hours' },
  { id: 'reading_log', emoji: '📚', label: 'Reading Log',              desc: 'Track books read this year' },
  { id: 'field_trips', emoji: '🚌', label: 'Field Trips & Activities', desc: 'Log outings, co-ops, projects' },
  { id: 'ai_lessons',  emoji: '🤖', label: 'Plan a Lesson',            desc: 'Use me if you need a lesson' },
  { id: 'ai_activity', emoji: '🎯', label: 'Generate Activity',        desc: 'Use me if you need an activity idea' },
  { id: 'compliance',  emoji: '📋', label: 'Compliance Tracking',      desc: 'Days/hours vs. state requirements' },
  { id: 'progress',    emoji: '📊', label: 'Progress Reports',         desc: 'Learning analytics by subject' },
  { id: 'transcript',  emoji: '🎓', label: 'Transcript Builder',       desc: 'GPA, courses, college-ready records' },
  { id: 'mastery',     emoji: '🏆', label: 'Mastery Tracker',          desc: 'Standards & skill mastery' },
  { id: 'portfolio',   emoji: '🗂️', label: 'Portfolio',                desc: 'Work samples & highlights' },
  { id: 'supply_scout', emoji: '🔍', label: 'Supply Scout',            desc: 'Check materials needed this week & next' },
]

// ─── Defaults per style ───────────────────────────────────────────────────────

export const DEFAULT_FLEXIBLE   = ['attendance', 'reading_log', 'field_trips']
export const DEFAULT_STRUCTURED = ['pulse_check', 'attendance', 'compliance', 'ai_lessons', 'progress']
export const DEFAULT_UNSTYLED   = ['ai_lessons', 'ai_activity', 'attendance', 'reading_log']

// ─── Props ────────────────────────────────────────────────────────────────────

interface StylePickerModalProps {
  userId: string
  stateAbbr: string | null
  isFirstTime: boolean   // true = auto-shown (style was null), false = re-opened via ✏️
  onComplete: (style: 'flexible' | 'structured', pins: string[]) => void
  onCancel: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StylePickerModal({ userId, stateAbbr, isFirstTime, onComplete, onCancel }: StylePickerModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [style, setStyle] = useState<'flexible' | 'structured' | null>(null)
  const [pins, setPins] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const trapRef = useFocusTrap(true)

  const regLevel = getRegLevel(stateAbbr)
  const stateName = stateAbbr || 'Your State'

  function pickStyle(s: 'flexible' | 'structured') {
    setStyle(s)
    setPins(new Set(s === 'flexible' ? DEFAULT_FLEXIBLE : DEFAULT_STRUCTURED))
    setStep(2)
  }

  function togglePin(id: string) {
    setPins(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSave() {
    if (!style) return
    setSaving(true)
    const pinnedArray = Array.from(pins)
    const { error } = await supabase
      .from('user_profiles')
      .upsert(
        { user_id: userId, homeschool_style: style, pinned_features: pinnedArray },
        { onConflict: 'user_id' }
      )
    setSaving(false)
    if (!error) onComplete(style, pinnedArray)
  }

  return (
    <div style={ov} onClick={isFirstTime ? undefined : onCancel} role="dialog" aria-modal="true" aria-labelledby="style-picker-title">
      <div ref={trapRef} style={modal} onClick={e => e.stopPropagation()}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>

        {/* ── Step 1: Style choice ─────────────────────────────────── */}
        {step === 1 && (
          <div>
            {/* Header */}
            <div style={hdr}>
              <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 48, height: 48, objectFit: 'contain' }} />
              <div style={{ flex: 1 }}>
                <div id="style-picker-title" style={hdrTitle}>Let's set up your home screen 🏡</div>
                <div style={hdrSub}>Quick question before we dive in</div>
              </div>
              <button onClick={onCancel} style={xBtn} aria-label="Close" title="Close">✕</button>
            </div>

            {/* State context */}
            {regLevel && (
              <div style={stateBadge(regLevel)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>
                    {regLevel === 'low' ? '🌿' : regLevel === 'moderate' ? '⚖️' : '📋'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>
                      {stateName} — {REG_LABEL[regLevel]}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 3, opacity: 0.85, lineHeight: 1.4 }}>
                      {REG_DESC[regLevel]}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '18px 24px 6px', fontWeight: 800, fontSize: 15, color: '#1a1a2e' }}>
              How do you like to homeschool?
            </div>
            <div style={{ padding: '0 24px 16px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
              This personalizes your home screen. You can always change it with the ✏️ button.
            </div>

            {/* Style cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 24px 24px' }}>

              <button style={styleCard('#ecfdf5', '#d1fae5', '#065f46')} onClick={() => pickStyle('flexible')}>
                <span style={{ fontSize: 36, lineHeight: 1, marginBottom: 8 }}>🌿</span>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#065f46', marginBottom: 6 }}>Flexible & Relaxed</div>
                <div style={{ fontSize: 11, color: '#065f46', opacity: 0.8, lineHeight: 1.5, marginBottom: 12 }}>
                  I log what we do and keep it low-key — no rigid schedule
                </div>
                <div style={{ padding: '7px 14px', borderRadius: 20, background: '#059669', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                  This is me →
                </div>
              </button>

              <button style={styleCard('#eff6ff', '#e0e7ff', '#1e3a5f')} onClick={() => pickStyle('structured')}>
                <span style={{ fontSize: 36, lineHeight: 1, marginBottom: 8 }}>📐</span>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#1e3a5f', marginBottom: 6 }}>Structured & Planned</div>
                <div style={{ fontSize: 11, color: '#1e3a5f', opacity: 0.8, lineHeight: 1.5, marginBottom: 12 }}>
                  I track lessons, hours, and standards — I like being organized
                </div>
                <div style={{ padding: '7px 14px', borderRadius: 20, background: '#4f46e5', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                  This is me →
                </div>
              </button>

            </div>
          </div>
        )}

        {/* ── Step 2: Feature pins ─────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div style={hdr}>
              <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <div style={{ flex: 1 }}>
                <div style={hdrTitle}>
                  {style === 'flexible' ? '🌿 Flexible & Relaxed' : '📐 Structured & Planned'}
                </div>
                <div style={hdrSub}>Choose your Home tab cards</div>
              </div>
              <button onClick={onCancel} style={xBtn} aria-label="Close" title="Close">✕</button>
            </div>

            <div style={{ padding: '4px 24px 12px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
              Toggle cards on or off — selected ones appear on your Home tab.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 24px 16px' }}>
              {STYLE_FEATURES.map(f => {
                const active = pins.has(f.id)
                return (
                  <button
                    key={f.id}
                    onClick={() => togglePin(f.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 13px', borderRadius: 14,
                      border: `2px solid ${active ? '#7c3aed' : '#e5e7eb'}`,
                      background: active ? '#f5f3ff' : '#fafafa',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s',
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{f.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: active ? '#5b21b6' : '#374151', lineHeight: 1.2 }}>
                        {f.label}
                      </div>
                      <div style={{ fontSize: 10, color: active ? '#7c3aed' : '#9ca3af', marginTop: 2, lineHeight: 1.3 }}>
                        {f.desc}
                      </div>
                    </div>
                    {active && <span style={{ color: '#7c3aed', fontSize: 14, flexShrink: 0 }}>✓</span>}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, padding: '0 24px 24px' }}>
              <button onClick={() => setStep(1)} style={btnGhost}>← Back</button>
              <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>
                {saving ? 'Saving…' : 'Set up my home screen →'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const F = "'Nunito', sans-serif"

const ov: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(10,5,30,0.65)', backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '16px 16px 96px',
}

const modal: React.CSSProperties = {
  background: '#fff', borderRadius: 24, width: '100%', maxWidth: 520,
  maxHeight: 'calc(100vh - 112px)', overflowY: 'auto',
  boxShadow: '0 32px 80px rgba(0,0,0,0.30)',
  fontFamily: F,
}

const hdr: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '20px 20px 16px',
  borderBottom: '1px solid #f3f4f6',
}

const hdrTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 900, color: '#1a1a2e', lineHeight: 1.2,
}

const hdrSub: React.CSSProperties = {
  fontSize: 12, color: '#9ca3af', fontWeight: 600, marginTop: 2,
}

const xBtn: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 18, color: '#9ca3af',
  cursor: 'pointer', padding: '4px 6px', flexShrink: 0, lineHeight: 1,
}

function styleCard(bg1: string, bg2: string, _color: string): React.CSSProperties {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    padding: '20px 14px', borderRadius: 16,
    background: `linear-gradient(135deg, ${bg1}, ${bg2})`,
    border: '2px solid transparent', cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    fontFamily: F,
  }
}

const btnPrimary: React.CSSProperties = {
  padding: '13px 20px', borderRadius: 12, border: 'none',
  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
  color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: F,
}

const btnGhost: React.CSSProperties = {
  padding: '13px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb',
  background: '#fff', color: '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: F,
}

function stateBadge(level: 'low' | 'moderate' | 'high'): React.CSSProperties {
  const colors = {
    low:      { bg: '#f0fdf4', border: '#86efac', color: '#14532d' },
    moderate: { bg: '#fffbeb', border: '#fcd34d', color: '#78350f' },
    high:     { bg: '#fef2f2', border: '#fca5a5', color: '#7f1d1d' },
  }
  const c = colors[level]
  return {
    margin: '12px 24px 0', padding: '12px 16px', borderRadius: 12,
    background: c.bg, border: `1.5px solid ${c.border}`, color: c.color, fontSize: 13,
  }
}
