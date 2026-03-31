'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'
import { MI_INTELLIGENCES, MI_CLUSTERS, MI_REMEMBER } from '@/src/lib/learningProfiles'

const GRADES = [
  'Pre-K','Kindergarten','1st','2nd','3rd','4th','5th',
  '6th','7th','8th','9th','10th','11th','12th',
]

const LEARNING_STYLES = [
  { value: 'visual',      label: '🎨 Visual' },
  { value: 'aural',       label: '👂 Aural / Auditory' },
  { value: 'read_write',  label: '📝 Read / Write' },
  { value: 'kinesthetic', label: '🤲 Kinesthetic' },
]

interface Props {
  kidId: string
  onClose: () => void
  onSaved: (updated: { id: string; displayname: string; grade: string | null; learning_style: string | null; mi_profile: string[] | null }) => void
}

export default function EditChildModal({ kidId, onClose, onSaved }: Props) {
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [displayname, setDisplayname]   = useState('')
  const [grade, setGrade]               = useState('')
  const [learningStyles, setLearningStyles] = useState<string[]>([])
  const [miProfile, setMiProfile]       = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('kids').select('displayname, grade, learning_style, mi_profile').eq('id', kidId).single()
      if (data) {
        setDisplayname(data.displayname ?? '')
        setGrade(data.grade ?? '')
        setLearningStyles(data.learning_style ? data.learning_style.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
        setMiProfile(data.mi_profile ?? [])
      }
      setLoading(false)
    }
    load()
  }, [kidId])

  const toggleStyle = (val: string) =>
    setLearningStyles(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])

  const toggleMi = (id: string) =>
    setMiProfile(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev)

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    const fields = {
      displayname: displayname.trim() || displayname,
      grade: grade || null,
      learning_style: learningStyles.length > 0 ? learningStyles.join(', ') : null,
      mi_profile: miProfile.length > 0 ? miProfile : null,
      updated_at: new Date().toISOString(),
    }
    await supabase.from('kids').update(fields).eq('id', kidId)
    setSaving(false)
    onSaved({ id: kidId, ...fields })
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, backdropFilter: 'blur(2px)' }} />

      {/* Modal card */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 301,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, pointerEvents: 'none',
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28)', pointerEvents: 'all',
          fontFamily: "'Nunito', sans-serif",
        }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)', padding: '14px 18px', borderRadius: '20px 20px 0 0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff' }}>✏️ Edit Child Profile</h3>
              {displayname && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{displayname}</p>}
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', width: 28, height: 28, cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* Scrollable body */}
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14, fontWeight: 600 }}>Loading...</div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Basic Info ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 3 }}>DISPLAY NAME</label>
                  <input
                    value={displayname}
                    onChange={e => setDisplayname(e.target.value)}
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' as const }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 3 }}>GRADE</label>
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' as const }}
                  >
                    <option value="">Select grade...</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Learning Style ── */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 3 }}>LEARNING STYLE</label>
                <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, margin: '0 0 8px' }}>Select all that apply — powers Scout personalization</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {LEARNING_STYLES.map(s => {
                    const selected = learningStyles.includes(s.value)
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleStyle(s.value)}
                        style={{
                          padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${selected ? '#7c3aed' : '#e5e7eb'}`,
                          background: selected ? '#f5f3ff' : '#fff', color: selected ? '#4c1d95' : '#374151',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' as const,
                          display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Nunito', sans-serif",
                        }}
                      >
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected ? '#7c3aed' : '#d1d5db'}`, background: selected ? '#7c3aed' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                        </div>
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── Multiple Intelligences ── */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#4c1d95', letterSpacing: 0.5, marginBottom: 3 }}>MULTIPLE INTELLIGENCES</label>
                <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, margin: '0 0 10px' }}>Pick up to 3 strongest intelligences</p>

                {(['analytical', 'introspective', 'interactive'] as const).map(cluster => {
                  const info  = MI_CLUSTERS[cluster]
                  const items = MI_INTELLIGENCES.filter(mi => mi.cluster === cluster)
                  return (
                    <div key={cluster} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: info.color, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 6 }}>
                        {info.label} — <span style={{ fontWeight: 600, textTransform: 'none' as const, color: '#9ca3af' }}>{info.tagline}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                        {items.map(mi => {
                          const selected = miProfile.includes(mi.id)
                          const maxed    = miProfile.length >= 3 && !selected
                          return (
                            <button
                              key={mi.id}
                              type="button"
                              onClick={() => !maxed && toggleMi(mi.id)}
                              style={{
                                display: 'flex', alignItems: 'flex-start', gap: 10,
                                padding: '10px 12px', borderRadius: 12,
                                border: `1.5px solid ${selected ? '#7c3aed' : '#e5e7eb'}`,
                                background: selected ? '#f5f3ff' : maxed ? '#f9fafb' : '#fff',
                                cursor: maxed ? 'default' : 'pointer', opacity: maxed ? 0.5 : 1,
                                textAlign: 'left' as const, fontFamily: "'Nunito', sans-serif", width: '100%',
                              }}
                            >
                              <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>{mi.emoji}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 2 }}>
                                  {mi.name}
                                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginLeft: 6 }}>
                                    {mi.fullName !== mi.name ? `(${mi.fullName.replace(mi.name, '').replace(/[()]/g, '').trim()})` : ''}
                                  </span>
                                </div>
                                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{mi.detail}</div>
                              </div>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected ? '#7c3aed' : '#d1d5db'}`, background: selected ? '#7c3aed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                {selected && <span style={{ fontSize: 10, color: '#fff', fontWeight: 900 }}>✓</span>}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Remember box */}
                <div style={{ background: '#faf5ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '10px 14px', marginTop: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' as const }}>Remember</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>· This is your child&apos;s superpower! 🌟</div>
                  {MI_REMEMBER.map(r => <div key={r} style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>· {r}</div>)}
                </div>
              </div>

              {/* ── Buttons ── */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ flex: 2, padding: '11px 0', borderRadius: 12, border: 'none', background: saving ? '#e5e7eb' : 'linear-gradient(135deg, #7c3aed, #a855f7)', color: saving ? '#9ca3af' : '#fff', fontSize: 13, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Nunito', sans-serif" }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  )
}
