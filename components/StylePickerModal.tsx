'use client'

import { useState } from 'react'
import { supabase } from '@/src/lib/supabase'
import { getRegLevel, REG_LABEL, REG_DESC } from '@/lib/stateRegulation'

// ─── Feature options ──────────────────────────────────────────────────────────

const FEATURES = [
  { id: 'attendance',  emoji: '✅', label: 'Attendance Tracking',  href: '/attendance' },
  { id: 'reading_log', emoji: '📚', label: 'Reading Log',           href: '/reading-log' },
  { id: 'field_trips', emoji: '🚌', label: 'Field Trips & Activities', href: '/field-trips' },
  { id: 'ai_lessons',  emoji: '🤖', label: 'AI Lesson Planning',   href: '/lessons' },
  { id: 'compliance',  emoji: '📋', label: 'Compliance Tracking',  href: '/compliance' },
  { id: 'progress',    emoji: '📊', label: 'Progress Reports',     href: '/progress' },
  { id: 'transcript',  emoji: '🎓', label: 'Transcript Builder',   href: '/transcript' },
  { id: 'scout_chat',  emoji: '💬', label: 'Scout AI Chat',        href: '/scout' },
]

// ─── Default pins per style ───────────────────────────────────────────────────

const DEFAULT_FLEXIBLE   = ['attendance', 'reading_log', 'field_trips', 'scout_chat']
const DEFAULT_STRUCTURED = ['attendance', 'compliance', 'ai_lessons', 'progress']

// ─── Props ────────────────────────────────────────────────────────────────────

interface StylePickerModalProps {
  userId: string
  stateAbbr: string | null
  onComplete: (style: 'flexible' | 'structured', pins: string[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StylePickerModal({ userId, stateAbbr, onComplete }: StylePickerModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [style, setStyle] = useState<'flexible' | 'structured' | null>(null)
  const [pins, setPins] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

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
    await supabase
      .from('user_profiles')
      .update({ homeschool_style: style, pinned_features: pinnedArray })
      .eq('user_id', userId)
    setSaving(false)
    onComplete(style, pinnedArray)
  }

  return (
    <div style={ov}>
      <div style={modal}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>

        {/* ── Step 1: Style choice ─────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Header */}
            <div style={hdr}>
              <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 52, height: 52, objectFit: 'contain' }} />
              <div>
                <div style={hdrTitle}>Let's set up your home base 🏡</div>
                <div style={hdrSub}>Quick question before we dive in</div>
              </div>
            </div>

            {/* State context */}
            {regLevel && (
              <div style={stateBadge(regLevel)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>
                    {regLevel === 'low' ? '🌿' : regLevel === 'moderate' ? '⚖️' : '📋'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>
                      {stateName} — {REG_LABEL[regLevel]}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>
                      {REG_DESC[regLevel]}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '20px 24px 8px', fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>
              How do you like to homeschool?
            </div>
            <div style={{ padding: '0 24px 20px', fontSize: 13, color: '#6b7280' }}>
              This helps us show you what matters most on your home screen. You can always change it later.
            </div>

            {/* Style cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '0 24px 28px' }}>

              <button style={styleCard} onClick={() => pickStyle('flexible')}>
                <span style={{ fontSize: 40, lineHeight: 1, marginBottom: 10 }}>🌿</span>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#065f46', marginBottom: 6 }}>Flexible & Relaxed</div>
                <div style={{ fontSize: 12, color: '#065f46', opacity: 0.8, lineHeight: 1.5 }}>
                  I log what we do, keep it low-key, and don't follow a rigid schedule
                </div>
                <div style={{ marginTop: 14, padding: '8px 16px', borderRadius: 20, background: '#059669', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
                  This is me →
                </div>
              </button>

              <button style={{ ...styleCard, background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)' }} onClick={() => pickStyle('structured')}>
                <span style={{ fontSize: 40, lineHeight: 1, marginBottom: 10 }}>📐</span>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#1e3a5f', marginBottom: 6 }}>Structured & Planned</div>
                <div style={{ fontSize: 12, color: '#1e3a5f', opacity: 0.8, lineHeight: 1.5 }}>
                  I track lessons, hours, and standards — I like staying organized
                </div>
                <div style={{ marginTop: 14, padding: '8px 16px', borderRadius: 20, background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
                  This is me →
                </div>
              </button>

            </div>
          </div>
        )}

        {/* ── Step 2: Feature pins ─────────────────────────────────── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            <div style={hdr}>
              <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 44, height: 44, objectFit: 'contain' }} />
              <div>
                <div style={hdrTitle}>
                  {style === 'flexible' ? '🌿 Flexible & Relaxed' : '📐 Structured & Planned'}
                </div>
                <div style={hdrSub}>Great choice! Now pin your go-to features</div>
              </div>
            </div>

            <div style={{ padding: '4px 24px 12px', fontSize: 13, color: '#6b7280' }}>
              These will show as shortcuts on your home screen. Pick as many as you like.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 24px 20px' }}>
              {FEATURES.map(f => {
                const active = pins.has(f.id)
                return (
                  <button
                    key={f.id}
                    onClick={() => togglePin(f.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', borderRadius: 14,
                      border: active ? '2px solid #7c3aed' : '2px solid #e5e7eb',
                      background: active ? '#f5f3ff' : '#fafafa',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s',
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{f.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#5b21b6' : '#374151', lineHeight: 1.3 }}>
                      {f.label}
                    </span>
                    {active && (
                      <span style={{ marginLeft: 'auto', color: '#7c3aed', fontSize: 14, flexShrink: 0 }}>✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, padding: '0 24px 28px' }}>
              <button onClick={() => setStep(1)} style={btnGhost}>← Back</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ ...btnPrimary, flex: 1 }}
              >
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
  display: 'flex', alignItems: 'center', gap: 14,
  padding: '24px 24px 16px',
  borderBottom: '1px solid #f3f4f6',
  marginBottom: 0,
}

const hdrTitle: React.CSSProperties = {
  fontSize: 17, fontWeight: 900, color: '#1a1a2e', lineHeight: 1.2,
}

const hdrSub: React.CSSProperties = {
  fontSize: 12, color: '#9ca3af', fontWeight: 600, marginTop: 3,
}

const styleCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  padding: '24px 16px', borderRadius: 18,
  background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
  border: '2px solid transparent', cursor: 'pointer',
  transition: 'transform 0.15s, box-shadow 0.15s',
  fontFamily: F,
}

const btnPrimary: React.CSSProperties = {
  padding: '13px 20px', borderRadius: 12, border: 'none',
  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
  color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
  fontFamily: F,
}

const btnGhost: React.CSSProperties = {
  padding: '13px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb',
  background: '#fff', color: '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  fontFamily: F,
}

function stateBadge(level: 'low' | 'moderate' | 'high'): React.CSSProperties {
  const colors = {
    low:      { bg: '#f0fdf4', border: '#86efac', color: '#14532d' },
    moderate: { bg: '#fffbeb', border: '#fcd34d', color: '#78350f' },
    high:     { bg: '#fef2f2', border: '#fca5a5', color: '#7f1d1d' },
  }
  const c = colors[level]
  return {
    margin: '12px 24px 0',
    padding: '12px 16px',
    borderRadius: 12,
    background: c.bg,
    border: `1.5px solid ${c.border}`,
    color: c.color,
    fontSize: 13,
  }
}
