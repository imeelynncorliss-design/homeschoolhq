'use client'

import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'
import { printHeader, printHeaderCSS } from '@/lib/printHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kid {
  id: string
  displayname: string
  grade_level?: string
  learning_style?: string | null
}

interface GeneratedActivity {
  title: string
  emoji: string
  duration_minutes: number
  description: string
  materials_have: string[]
  materials_need: string[]
  steps: string[]
}

interface ActivityGeneratorProps {
  kids: Kid[]
  organizationId?: string | null
  onClose: () => void
  onSaved?: () => void
  homeschoolStyle?: 'flexible' | 'structured' | null
}

// ─── Vibe Options ─────────────────────────────────────────────────────────────

const VIBES = [
  { id: 'hands_on',    emoji: '🛠️', label: 'Hands-On',    sub: 'Build, make, do' },
  { id: 'game',        emoji: '🎮', label: 'Game',         sub: 'Playful & fun' },
  { id: 'brain_break', emoji: '🤸', label: 'Brain Break',  sub: 'Move & recharge' },
  { id: 'review',      emoji: '🔁', label: 'Review',       sub: 'Reinforce it' },
]

// ─── Learning Style → Vibe mapping ───────────────────────────────────────────

const STYLE_VIBE: Record<string, string> = {
  visual:      'hands_on',
  aural:       'game',
  read_write:  'review',
  kinesthetic: 'hands_on',
}

const STYLE_LABEL: Record<string, string> = {
  visual:      'Visual',
  aural:       'Aural',
  read_write:  'Read / Write',
  kinesthetic: 'Kinesthetic',
}

// ─── ActivityGenerator ────────────────────────────────────────────────────────

export default function ActivityGenerator({ kids, organizationId, onClose, onSaved, homeschoolStyle }: ActivityGeneratorProps) {
  const { isDark } = useTheme()
  const [step, setStep] = useState<'setup' | 'vibe' | 'loading' | 'results'>('setup')
  const [selectedKidId, setSelectedKidId] = useState<string>(kids[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
  const [activities, setActivities] = useState<GeneratedActivity[]>([])
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedKid = kids.find(k => k.id === selectedKidId)

  // learning_style may be comma-separated ("visual, kinesthetic") — map first matching style to a vibe
  const styleList = selectedKid?.learning_style
    ? selectedKid.learning_style.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []
  const recommendedVibe = styleList.map((s: string) => STYLE_VIBE[s]).find(Boolean) ?? null
  const recommendedVibeObj = VIBES.find(v => v.id === recommendedVibe)
  const styleDisplayLabel = styleList
    .map((s: string) => STYLE_LABEL[s] || s)
    .join(' & ')

  const handleGenerate = async (chosenVibe: string) => {
    setStep('loading')
    setError('')
    try {
      const res = await fetch('/api/generate-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidId: selectedKidId, organizationId, subject, topic, vibe: chosenVibe, homeschoolStyle }),
      })
      const data = await res.json()
      if (!res.ok || !data.activities?.length) throw new Error(data.error || 'No activities returned')
      setActivities(data.activities)
      setStep('results')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('vibe')
    }
  }

  const handlePrintActivities = () => {
    const selectedKid = kids.find(k => k.id === selectedKidId)
    const rows = activities.map(act => `
      <div class="card">
        <div class="card-top">
          <span class="emoji">${act.emoji}</span>
          <div>
            <div class="act-title">${act.title}</div>
            <div class="act-meta">⏱ ${act.duration_minutes} min · ${subject}</div>
          </div>
        </div>
        <p>${act.description}</p>
        ${act.steps?.length ? `<ol>${act.steps.map(s => `<li>${s}</li>`).join('')}</ol>` : ''}
        ${act.materials_have?.length ? `<div class="mat-section"><span class="mat-label have">✅ Have:</span> ${act.materials_have.join(', ')}</div>` : ''}
        ${act.materials_need?.length ? `<div class="mat-section"><span class="mat-label need">🛒 Need:</span> ${act.materials_need.join(', ')}</div>` : ''}
      </div>`).join('')

    const origin = window.location.origin
    const html = `<!DOCTYPE html><html><head><title>Activities — ${selectedKid?.displayname ?? ''}</title>
<style>
  body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; color: #1f2937; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 20px; font-weight: 900; color: #2d1b69; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
  .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
  .card-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; }
  .emoji { font-size: 28px; line-height: 1; }
  .act-title { font-weight: 800; font-size: 15px; color: #2d1b69; }
  .act-meta { font-size: 12px; color: #7c6faa; margin-top: 2px; }
  p { margin: 0 0 8px; }
  ol { margin: 0 0 8px; padding-left: 20px; }
  li { margin-bottom: 3px; font-size: 13px; }
  .mat-section { font-size: 12px; margin-top: 6px; }
  .mat-label { font-weight: 700; }
  .mat-label.have { color: #059669; }
  .mat-label.need { color: #dc2626; }
  @media print { body { margin: 20px; } }
  ${printHeaderCSS()}
</style>
</head><body>
${printHeader(origin, true)}
<h1>Activities for ${selectedKid?.displayname ?? 'Student'}</h1>
<div class="meta">${subject}${topic ? ` · ${topic}` : ''} · Generated ${new Date().toLocaleDateString()}</div>
${rows}
</body></html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  const handlePrintOne = (act: GeneratedActivity) => {
    const stepsHtml = act.steps?.length
      ? `<h3>Steps</h3><ol>${act.steps.map(s => `<li>${s}</li>`).join('')}</ol>`
      : ''
    const haveHtml = act.materials_have?.length
      ? `<div class="mat-section"><span class="have">✅ You already have:</span> ${act.materials_have.join(', ')}</div>`
      : ''
    const needHtml = act.materials_need?.length
      ? `<div class="mat-section"><span class="need">🛒 Still need:</span> ${act.materials_need.join(', ')}</div>`
      : ''
    const origin = window.location.origin
    const html = `<!DOCTYPE html><html><head><title>${act.title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; color: #1f2937; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 22px; font-weight: 900; color: #2d1b69; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #7c6faa; margin-bottom: 20px; }
  h3 { font-size: 13px; font-weight: 700; color: #1a1a2e; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  p { margin: 0 0 10px; }
  ol { margin: 0 0 12px; padding-left: 20px; }
  li { margin-bottom: 5px; }
  .mat-section { font-size: 13px; margin-top: 8px; }
  .have { font-weight: 700; color: #059669; }
  .need { font-weight: 700; color: #dc2626; }
  @media print { body { margin: 20px; } }
  ${printHeaderCSS()}
</style></head><body>
${printHeader(origin, true)}
<h1>${act.emoji} ${act.title}</h1>
<div class="meta">${subject}${topic ? ` · ${topic}` : ''} · ${act.duration_minutes} min · ${selectedKid?.displayname ?? ''}</div>
<p>${act.description}</p>
${stepsHtml}${haveHtml}${needHtml}
</body></html>`
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  const handleSave = async (idx: number) => {
    if (saving || savedIdx.has(idx)) return
    setSaving(true)
    const act = activities[idx]
    const { error: dbErr } = await supabase.from('lessons').insert({
      kid_id: selectedKidId,
      organization_id: organizationId,
      subject,
      title: act.title,
      description: JSON.stringify({
        overview: act.description,
        steps: act.steps,
        materials: [...(act.materials_have ?? []), ...(act.materials_need ?? [])],
      }),
      lesson_date: scheduledDate,
      status: 'not_started',
      lesson_source: 'scout_activity',
    })
    setSaving(false)
    if (dbErr) { setError('Failed to save activity'); return }
    setSavedIdx(prev => new Set([...prev, idx]))
    onSaved?.()
  }

  // ── Styles (dark-mode aware) ─────────────────────────────────────────────────
  const s: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(30,20,60,0.55)',
      backdropFilter: 'blur(4px)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px 16px 96px',
    },
    modal: {
      background: isDark ? 'var(--hr-bg-card)' : '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
      maxHeight: 'calc(100vh - 112px)', overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    },
    header: {
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '20px 20px 0', position: 'relative',
    },
    cardinal: { width: 52, height: 52, objectFit: 'contain' as const },
    title: { fontWeight: 900, fontSize: 18, color: isDark ? 'var(--hr-text-primary)' : '#2d1b69' },
    sub: { fontSize: 13, color: isDark ? 'var(--hr-text-secondary)' : '#7c6faa', marginTop: 2 },
    closeBtn: {
      position: 'absolute', right: 16, top: 16,
      background: 'none', border: 'none', fontSize: 18,
      color: '#9ca3af', cursor: 'pointer', lineHeight: 1,
    },
    body: {
      display: 'flex', flexDirection: 'column' as const,
      padding: '18px 20px 24px',
    },
    field: { marginBottom: 16 },
    label: { display: 'block', fontWeight: 700, fontSize: 13, color: isDark ? 'var(--hr-text-secondary)' : '#374151', marginBottom: 6 },
    kidRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 8 },
    kidBtn: {
      padding: '6px 14px', borderRadius: 20, border: '2px solid',
      borderColor: isDark ? 'var(--hr-border)' : '#e5e7eb',
      background: isDark ? 'var(--hr-bg-surface)' : '#f9fafb',
      fontWeight: 600, fontSize: 13,
      color: isDark ? 'var(--hr-text-secondary)' : '#374151', cursor: 'pointer',
    },
    kidBtnActive: { borderColor: '#7c3aed', background: '#ede9fe', color: '#7c3aed' },
    select: {
      width: '100%', padding: '10px 12px', borderRadius: 10,
      border: `1.5px solid ${isDark ? 'var(--hr-border)' : '#e5e7eb'}`,
      fontSize: 14, color: isDark ? 'var(--hr-text-primary)' : '#111827',
      background: isDark ? 'var(--hr-input-bg)' : '#fff', outline: 'none',
    },
    input: {
      width: '100%', padding: '10px 12px', borderRadius: 10,
      border: `1.5px solid ${isDark ? 'var(--hr-border)' : '#e5e7eb'}`,
      fontSize: 14, color: isDark ? 'var(--hr-text-primary)' : '#111827',
      background: isDark ? 'var(--hr-input-bg)' : '#fff', outline: 'none', boxSizing: 'border-box' as const,
    },
    primaryBtn: {
      padding: '12px 20px', borderRadius: 12, border: 'none',
      background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
      color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
      alignSelf: 'stretch',
    },
    backBtn: {
      padding: '10px 16px', borderRadius: 10,
      border: `1.5px solid ${isDark ? 'var(--hr-border)' : '#e5e7eb'}`,
      background: isDark ? 'var(--hr-bg-surface)' : '#f9fafb',
      color: isDark ? 'var(--hr-text-secondary)' : '#6b7280',
      fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' as const,
    },
    styleCallout: {
      background: isDark ? 'rgba(45,27,105,0.4)' : 'linear-gradient(135deg, #eff6ff, #f5f3ff)',
      border: `1.5px solid ${isDark ? 'var(--hr-border)' : '#c7d2fe'}`,
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start' as const, gap: 2,
    },
    useRecommendedBtn: {
      marginTop: 10, padding: '9px 18px', borderRadius: 10, border: 'none',
      background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
      color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
    },
    vibeGrid: {
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
    },
    vibeBtn: {
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
      padding: '18px 12px', borderRadius: 14,
      border: `2px solid ${isDark ? 'var(--hr-border)' : '#e5e7eb'}`,
      background: isDark ? 'var(--hr-bg-surface)' : '#fafafa',
      cursor: 'pointer', transition: 'border-color 0.15s',
    },
    vibeBtnRecommended: {
      borderColor: '#7c3aed', background: isDark ? 'rgba(124,58,237,0.2)' : '#faf5ff',
    },
    activityCard: {
      border: `1.5px solid ${isDark ? 'var(--hr-border)' : '#e5e7eb'}`, borderRadius: 14, padding: '14px 16px',
      background: isDark ? 'var(--hr-bg-surface)' : '#fafafa',
    },
    actCardTop: { display: 'flex', alignItems: 'flex-start', gap: 10 },
    saveBtn: {
      padding: '6px 14px', borderRadius: 20, border: 'none',
      background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
      color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' as const,
    },
    savedBtn: { background: '#d1fae5', color: '#059669', cursor: 'default' },
    printOneBtn: {
      padding: '6px 10px', borderRadius: 20,
      border: `1.5px solid ${isDark ? 'var(--hr-border)' : '#e5e7eb'}`,
      background: isDark ? 'var(--hr-bg-surface)' : '#fff',
      color: isDark ? 'var(--hr-text-secondary)' : '#6b7280', fontSize: 14, cursor: 'pointer',
    },
    chipHave: {
      padding: '3px 10px', borderRadius: 20, background: '#dcfce7',
      color: '#15803d', fontSize: 11, fontWeight: 600,
    },
    chipNeed: {
      padding: '3px 10px', borderRadius: 20, background: '#fee2e2',
      color: '#dc2626', fontSize: 11, fontWeight: 600,
    },
    error: {
      background: isDark ? 'rgba(220,38,38,0.15)' : '#fef2f2',
      border: `1px solid ${isDark ? 'rgba(220,38,38,0.4)' : '#fecaca'}`,
      borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626',
    },
    spinner: {
      width: 44, height: 44,
      border: '4px solid #ede9fe', borderTopColor: '#7c3aed',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    },
  }

  // ── Overlay wrapper ──────────────────────────────────────────────────────────
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        {/* Header */}
        <div style={s.header}>
          <img src="/Cardinal_Mascot.png" alt="Scout" style={s.cardinal} />
          <div>
            <div style={s.title}>Generate an Activity</div>
            <div style={s.sub}>Scout will find something fun ✨</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Step: setup ───────────────────────────────────────────────────── */}
        {step === 'setup' && (
          <div style={s.body}>
            {/* Kid selector — only show if >1 kid */}
            {kids.length > 1 && (
              <div style={s.field}>
                <label style={s.label}>For which student?</label>
                <div style={s.kidRow}>
                  {kids.map(k => (
                    <button key={k.id}
                      style={{ ...s.kidBtn, ...(selectedKidId === k.id ? s.kidBtnActive : {}) }}
                      onClick={() => setSelectedKidId(k.id)}>
                      {k.displayname}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subject */}
            <div style={s.field}>
              <label style={s.label}>Subject</label>
              <select style={s.select} value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="">Pick a subject…</option>
                {CANONICAL_SUBJECTS.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* Optional topic */}
            <div style={s.field}>
              <label style={s.label}>Topic or concept <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
              <input style={s.input} placeholder="e.g. fractions, photosynthesis, Civil War…"
                value={topic} onChange={e => setTopic(e.target.value)} />
            </div>

            {/* Schedule date */}
            <div style={s.field}>
              <label style={s.label}>Schedule for</label>
              <input
                type="date"
                style={s.input}
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
              />
            </div>

            <button style={{ ...s.primaryBtn, opacity: subject ? 1 : 0.45, cursor: subject ? 'pointer' : 'not-allowed' }}
              disabled={!subject}
              onClick={() => setStep('vibe')}>
              Next: Pick a vibe →
            </button>
          </div>
        )}

        {/* ── Step: vibe ────────────────────────────────────────────────────── */}
        {step === 'vibe' && (
          <div style={s.body}>

            {/* Learning style recommendation callout */}
            {recommendedVibeObj && selectedKid?.learning_style && (
              <div style={s.styleCallout}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{recommendedVibeObj.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#4f46e5', marginBottom: 2 }}>
                  {styleDisplayLabel} Learner
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                  Based on <strong>{selectedKid.displayname}</strong>'s {styleDisplayLabel.toLowerCase()} learning style,
                  we recommend <strong>{recommendedVibeObj.label}</strong> activities.
                </div>
                <button
                  style={s.useRecommendedBtn}
                  onClick={() => handleGenerate(recommendedVibe!)}>
                  Continue with {recommendedVibeObj.label} →
                </button>
              </div>
            )}

            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, marginTop: recommendedVibeObj ? 14 : 0 }}>
              {recommendedVibeObj ? 'Or choose a different vibe:' : `What kind of activity for ${selectedKid?.displayname}?`}
            </div>

            {error && <div style={s.error}>{error}</div>}

            <div style={s.vibeGrid}>
              {VIBES.map(v => {
                const isRecommended = v.id === recommendedVibe
                return (
                  <button key={v.id}
                    style={{ ...s.vibeBtn, ...(isRecommended ? s.vibeBtnRecommended : {}) }}
                    onClick={() => handleGenerate(v.id)}>
                    <span style={{ fontSize: 32 }}>{v.emoji}</span>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#2d1b69', marginTop: 6 }}>{v.label}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{v.sub}</div>
                  </button>
                )
              })}
            </div>
            <button style={s.backBtn} onClick={() => setStep('setup')}>← Back</button>
          </div>
        )}

        {/* ── Step: loading ─────────────────────────────────────────────────── */}
        {step === 'loading' && (
          <div style={{ ...s.body, alignItems: 'center', textAlign: 'center' as const, padding: '40px 24px' }}>
            <div style={s.spinner} />
            <div style={{ fontWeight: 700, fontSize: 16, color: '#2d1b69', marginTop: 18 }}>
              Scout is thinking…
            </div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>
              Cooking up 3 great activities for {selectedKid?.displayname}
            </div>
          </div>
        )}

        {/* ── Step: results ─────────────────────────────────────────────────── */}
        {step === 'results' && (
          <div style={s.body}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
              Tap <strong>Save</strong> to schedule for <strong>{new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong>.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              {activities.map((act, i) => (
                <div key={i} style={s.activityCard}>
                  <div style={s.actCardTop}>
                    <span style={{ fontSize: 28 }}>{act.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#2d1b69' }}>{act.title}</div>
                      <div style={{ fontSize: 12, color: '#7c6faa', marginTop: 2 }}>⏱ {act.duration_minutes} min · {subject}</div>
                    </div>
                    <button
                      style={{ ...s.saveBtn, ...(savedIdx.has(i) ? s.savedBtn : {}) }}
                      onClick={() => handleSave(i)}
                      disabled={savedIdx.has(i)}>
                      {savedIdx.has(i) ? '✓ Saved' : 'Save'}
                    </button>
                    <button
                      style={s.printOneBtn}
                      onClick={() => handlePrintOne(act)}
                      title="Print this activity">
                      🖨️
                    </button>
                  </div>

                  <p style={{ fontSize: 13, color: '#374151', margin: '8px 0 0' }}>{act.description}</p>

                  {act.steps?.length > 0 && (
                    <ol style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: '#4b5563' }}>
                      {act.steps.map((st, si) => <li key={si} style={{ marginBottom: 3 }}>{st}</li>)}
                    </ol>
                  )}

                  {/* Materials — what they have vs what they need */}
                  {((act.materials_have?.length > 0) || (act.materials_need?.length > 0)) && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      {act.materials_have?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 4 }}>✅ You already have:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                            {act.materials_have.map((m, mi) => (
                              <span key={mi} style={s.chipHave}>{m}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {act.materials_need?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>🛒 Still need:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                            {act.materials_need.map((m, mi) => (
                              <span key={mi} style={s.chipNeed}>{m}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {error && <div style={{ ...s.error, marginTop: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' as const }}>
              <button style={s.backBtn} onClick={() => setStep('vibe')}>← Try different vibe</button>
              <button style={s.backBtn} onClick={handlePrintActivities}>🖨️ Print</button>
              {savedIdx.size > 0 && (
                <button style={s.primaryBtn} onClick={onClose}>Done ✓</button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

