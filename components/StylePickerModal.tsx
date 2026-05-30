'use client'

import { useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { supabase } from '@/src/lib/supabase'
import { getRegLevel, REG_LABEL, REG_DESC } from '@/lib/stateRegulation'

// ─── Feature options ──────────────────────────────────────────────────────────

export const STYLE_FEATURES = [
  { id: 'attendance',  emoji: '✅', label: 'Attendance Tracking',      desc: 'Log school days and hours' },
  { id: 'reading_log', emoji: '📚', label: 'Reading Log',              desc: 'Track books read this year' },
  { id: 'field_trips', emoji: '🚌', label: 'Activities',               desc: 'Log trips or generate activity ideas' },
  { id: 'ai_lessons',  emoji: '📚', label: 'Add Lesson',               desc: 'Generate, write, or use curriculum' },
  { id: 'mastery',     emoji: '🏆', label: 'Mastery Tracker',          desc: 'Standards & skill mastery' },
  { id: 'portfolio',   emoji: '🗂️', label: 'Portfolio',                desc: 'Work samples & highlights' },
  { id: 'calendar',    emoji: '📅', label: 'Calendar',                 desc: 'Full month lesson calendar' },
]

// ─── Defaults per style ───────────────────────────────────────────────────────

export const DEFAULT_FLEXIBLE   = ['attendance', 'reading_log', 'field_trips']
export const DEFAULT_STRUCTURED = ['attendance', 'ai_lessons', 'field_trips', 'reading_log']
export const DEFAULT_UNSTYLED   = ['ai_lessons', 'field_trips', 'attendance', 'reading_log']

// ─── Props ────────────────────────────────────────────────────────────────────

interface StylePickerModalProps {
  userId: string
  stateAbbr: string | null
  isFirstTime: boolean   // true = auto-shown (style was null), false = re-opened via ✏️
  currentStyle?: 'flexible' | 'structured' | null
  currentPins?: string[]
  onComplete: (style: 'flexible' | 'structured', pins: string[]) => void
  onCancel: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StylePickerModal({ userId, stateAbbr, isFirstTime, currentStyle, currentPins, onComplete, onCancel }: StylePickerModalProps) {
  const availableIds = new Set(STYLE_FEATURES.map(f => f.id))
  const startingPins = (currentPins ?? []).filter(id => availableIds.has(id))
  const [style] = useState<'flexible' | 'structured'>(currentStyle ?? 'flexible')
  const [pins, setPins] = useState<Set<string>>(() => new Set(startingPins.length ? startingPins : DEFAULT_UNSTYLED))
  const [saving, setSaving] = useState(false)
  const trapRef = useFocusTrap(true)

  const regLevel = getRegLevel(stateAbbr)
  const stateName = stateAbbr || 'Your State'

  function togglePin(id: string) {
    setPins(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSave() {
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

        <div style={hdr}>
          <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <div style={{ flex: 1 }}>
            <div id="style-picker-title" style={hdrTitle}>Customize your Home shortcuts 🏡</div>
            <div style={hdrSub}>Choose what appears on your dashboard</div>
          </div>
          <button onClick={onCancel} style={xBtn} aria-label="Close" title="Close">✕</button>
        </div>

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

        <div style={{ padding: '18px 24px 8px', fontWeight: 900, fontSize: 15, color: '#1a1a2e' }}>
          Choose your Home shortcuts
        </div>
        <div style={{ padding: '0 24px 14px', fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>
          Pick the shortcuts that help you move fastest. You can change these anytime from Customize Home.
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
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>
            {saving ? 'Saving…' : '✓ Save Home Shortcuts'}
          </button>
        </div>
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
