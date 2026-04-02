'use client'

import { useState, useRef } from 'react'
import { MI_INTELLIGENCES, MI_CLUSTERS } from '@/src/lib/learningProfiles'

// ── Constants ─────────────────────────────────────────────────────────────────

const GRADES = [
  'Pre-K', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', '10th', '11th', '12th',
]

const LEARNING_STYLES = [
  { value: 'visual',      label: '🎨 Visual',      desc: 'Learns through images, diagrams, and color' },
  { value: 'aural',       label: '👂 Aural',        desc: 'Learns through listening, discussion, and audio' },
  { value: 'read_write',  label: '📝 Read / Write', desc: 'Learns through reading, note-taking, and text' },
  { value: 'kinesthetic', label: '🤲 Kinesthetic',  desc: 'Learns through doing, building, and moving' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface KidData {
  id?: string
  firstname?: string
  lastname?: string
  displayname?: string
  age?: number | null
  grade?: string | null
  photo_url?: string
  learning_style?: string | null
  mi_profile?: string[] | null
  current_hook?: string | null
  curriculum?: string | null
  photoFile?: File
}

interface KidProfileFormProps {
  kid?: KidData
  onSave: (data: KidData & { photoFile?: File }) => Promise<void>
  onCancel: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KidProfileForm({ kid, onSave, onCancel }: KidProfileFormProps) {
  const isEditing = !!kid?.id
  const [activeTab, setActiveTab] = useState<'core' | 'learning'>('core')
  const [saving, setSaving] = useState(false)

  // Core Info
  const [firstname, setFirstname]       = useState(kid?.firstname || '')
  const [lastname, setLastname]         = useState(kid?.lastname || '')
  const [displayname, setDisplayname]   = useState(kid?.displayname || '')
  const [age, setAge]                   = useState(kid?.age?.toString() || '')
  const [grade, setGrade]               = useState(kid?.grade || '')
  const [photoFile, setPhotoFile]       = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState(kid?.photo_url || '')
  const fileInputRef                    = useRef<HTMLInputElement>(null)

  // How They Learn
  const [learningStyles, setLearningStyles] = useState<string[]>(
    kid?.learning_style ? kid.learning_style.split(',').map((s: string) => s.trim()) : []
  )
  const [miProfile, setMiProfile] = useState<string[]>(kid?.mi_profile ?? [])
  const [currentHook, setCurrentHook] = useState(kid?.current_hook || '')
  const [curriculum, setCurriculum] = useState(kid?.curriculum || '')

  const toggleStyle = (value: string) => {
    setLearningStyles(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    )
  }

  // No cap — select as many MI as apply
  const toggleMi = (id: string) => {
    setMiProfile(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // ── Photo handler ─────────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const coreComplete     = firstname.trim().length > 0
  const learningComplete = learningStyles.length > 0
  const canSave          = coreComplete && learningComplete

  const tabStatus = {
    core:     coreComplete,
    learning: learningComplete,
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await onSave({
        id: kid?.id,
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        displayname: displayname.trim() || firstname.trim(),
        age: age ? parseInt(age) : null,
        grade: grade || null,
        learning_style: learningStyles.length > 0 ? learningStyles.join(', ') : null,
        mi_profile: miProfile.length > 0 ? miProfile : null,
        current_hook: currentHook.trim() || null,
        curriculum: curriculum || null,
        photoFile: photoFile || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'core' as const,     label: 'Core Info',       done: tabStatus.core },
    { id: 'learning' as const, label: 'How They Learn',  done: tabStatus.learning },
  ]

  const headerGradient = 'linear-gradient(135deg, #7c3aed, #4f46e5)'
  const saveBtnStyle: React.CSSProperties = {
    flex: 1, padding: '10px 14px', borderRadius: 12, border: 'none',
    background: (!canSave || saving) ? '#c4b5fd' : headerGradient,
    color: '#fff', fontWeight: 800, fontSize: 13, cursor: (!canSave || saving) ? 'not-allowed' : 'pointer',
    fontFamily: "'Nunito', sans-serif", opacity: (!canSave || saving) ? 0.7 : 1,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '16px 16px 96px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', maxHeight: 'calc(100vh - 104px)',
      }}>

        {/* Header */}
        <div style={{ background: headerGradient, padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0, fontFamily: "'Nunito', sans-serif" }}>
                {isEditing ? 'Edit Student Profile' : 'Add Your Child'}
              </h2>
              {isEditing && kid?.displayname && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: '2px 0 0', fontFamily: "'Nunito', sans-serif" }}>
                  {kid.displayname}
                </p>
              )}
            </div>
            <button
              onClick={onCancel}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: '0 0 4px' }}
            >
              ×
            </button>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: '10px 10px 0 0', border: 'none',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                  background: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.15)',
                  color: activeTab === tab.id ? '#7c3aed' : 'rgba(255,255,255,0.85)',
                  transition: 'all 0.15s',
                }}
              >
                {tab.done && activeTab !== tab.id && (
                  <span style={{ color: '#fde68a', fontSize: 11 }}>✓</span>
                )}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Core Info Tab ────────────────────────────────────────────── */}
          {activeTab === 'core' && (
            <>
              {/* Photo */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 8 }}>
                  Student Photo
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {photoPreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={photoPreview} alt="Preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '4px solid #ede9fe' }} />
                      <button
                        onClick={() => { setPhotoPreview(''); setPhotoFile(null) }}
                        style={{ position: 'absolute', top: -4, right: -4, width: 22, height: 22, background: '#ef4444', color: '#fff', borderRadius: '50%', border: 'none', fontSize: 12, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >×</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{ width: 80, height: 80, borderRadius: '50%', border: '2px dashed #c4b5fd', background: '#faf5ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 2 }}
                    >
                      <span style={{ fontSize: 22 }}>🖼</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed' }}>Upload</span>
                    </button>
                  )}
                  {!photoPreview && (
                    <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
                      Upload a photo to personalize<br />the app for your child.
                    </p>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </div>

              {/* First + Last Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 4 }}>
                    First Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text" value={firstname} onChange={e => setFirstname(e.target.value)}
                    placeholder="e.g. Emma" autoFocus
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 13, color: '#111827', outline: 'none', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 4 }}>Last Name</label>
                  <input
                    type="text" value={lastname} onChange={e => setLastname(e.target.value)} placeholder="Last name"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 13, color: '#111827', outline: 'none', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 4 }}>
                  Display Name <span style={{ fontWeight: 600, color: '#9ca3af' }}>(optional)</span>
                </label>
                <input
                  type="text" value={displayname} onChange={e => setDisplayname(e.target.value)}
                  placeholder={`e.g. ${firstname || 'Em'}, Bug, Buddy...`}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 13, color: '#111827', outline: 'none', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                  onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                />
                {firstname && (
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Leave blank to use first name: {firstname}</p>
                )}
              </div>

              {/* Age + Grade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 4 }}>Age</label>
                  <input
                    type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 9" min="3" max="18"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 13, color: '#111827', outline: 'none', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 4 }}>Grade</label>
                  <select
                    value={grade} onChange={e => setGrade(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 13, color: '#111827', outline: 'none', fontFamily: "'Nunito', sans-serif", background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="">Select grade...</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* Next tab nudge */}
              {coreComplete && (
                <button
                  onClick={() => setActiveTab('learning')}
                  style={{ width: '100%', padding: '12px', background: headerGradient, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
                >
                  Next: How They Learn →
                </button>
              )}
            </>
          )}

          {/* ── How They Learn Tab ───────────────────────────────────────── */}
          {activeTab === 'learning' && (
            <>
              {/* Premium callout */}
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                <p style={{ fontSize: 12, color: '#6d28d9', lineHeight: 1.5, margin: 0, fontWeight: 600 }}>
                  <strong>This powers Scout's lesson generation.</strong> The more accurate this is, the more personalized every generated lesson will be.
                </p>
              </div>

              {/* Learning Style — multi-select */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 4 }}>
                  How does {displayname || firstname || 'your child'} learn best? <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>
                  Select all that apply — Scout uses this to structure every lesson it generates
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {LEARNING_STYLES.map(style => {
                    const selected = learningStyles.includes(style.value)
                    return (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => toggleStyle(style.value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', borderRadius: 12,
                          border: `2px solid ${selected ? '#7c3aed' : '#e5e7eb'}`,
                          background: selected ? '#f5f3ff' : '#fff',
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                          fontFamily: "'Nunito', sans-serif", transition: 'all 0.15s',
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          background: selected ? '#7c3aed' : '#fff',
                          border: `2px solid ${selected ? '#7c3aed' : '#d1d5db'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: selected ? '#6d28d9' : '#1f2937', margin: 0 }}>{style.label}</p>
                          <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>{style.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {learningStyles.length > 1 && (
                  <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, marginTop: 8 }}>
                    ✓ Multimodal learner — Scout will blend these styles
                  </p>
                )}
              </div>

              {/* Multiple Intelligences */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 4 }}>
                  Multiple Intelligences <span style={{ fontWeight: 600, color: '#9ca3af' }}>(optional)</span>
                </label>
                <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>
                  Where do they naturally shine? Select all that apply — this powers the Teaching Blueprint.
                </p>
                {miProfile.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                    <div style={{ background: '#f5f3ff', border: '1.5px solid #c4b5fd', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>
                      {miProfile.length} selected
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {(['analytical', 'introspective', 'interactive'] as const).map(cluster => {
                    const clusterInfo = MI_CLUSTERS[cluster]
                    return (
                      <div key={cluster}>
                        {/* Cluster header — matches onboarding: label — tagline on one line */}
                        <div style={{ fontSize: 13, fontWeight: 800, color: clusterInfo.color, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
                          {clusterInfo.label} — <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>{clusterInfo.tagline}</span>
                        </div>
                        {/* MI cards — always show detail, circle check on right */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {MI_INTELLIGENCES.filter(m => m.cluster === cluster).map(m => {
                            const selected = miProfile.includes(m.id)
                            const subtitle = m.fullName !== m.name
                              ? m.fullName.replace(m.name, '').replace(/[()]/g, '').trim()
                              : ''
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => toggleMi(m.id)}
                                style={{
                                  display: 'flex', alignItems: 'flex-start', gap: 14,
                                  padding: '14px 16px', borderRadius: 14, width: '100%',
                                  border: `2px solid ${selected ? '#a855f7' : '#e5e7eb'}`,
                                  background: selected ? 'rgba(168,85,247,0.08)' : '#fafafa',
                                  cursor: 'pointer', textAlign: 'left',
                                  fontFamily: "'Nunito', sans-serif", transition: 'all 0.15s',
                                }}
                              >
                                {/* Emoji */}
                                <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{m.emoji}</span>
                                {/* Text */}
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 15, fontWeight: 800, color: selected ? '#6d28d9' : '#1f2937', marginBottom: 4, lineHeight: 1.2 }}>
                                    {m.name}
                                    {subtitle && (
                                      <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginLeft: 6 }}>({subtitle})</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 13, color: selected ? '#4b5563' : '#6b7280', lineHeight: 1.6 }}>{m.detail}</div>
                                </div>
                                {/* Circle check — right side, matches onboarding */}
                                <div style={{
                                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                                  border: `2px solid ${selected ? '#a855f7' : '#d1d5db'}`,
                                  background: selected ? '#a855f7' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}>
                                  {selected && <span style={{ fontSize: 11, color: '#fff', fontWeight: 900 }}>✓</span>}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {miProfile.length > 0 && (
                  <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, marginTop: 10 }}>
                    ✓ {miProfile.length} intelligence{miProfile.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Current Hook */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 4 }}>
                  What are they into right now? <span style={{ fontWeight: 600, color: '#9ca3af' }}>(optional)</span>
                </label>
                <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                  Scout weaves their current interests into lessons — update this as their obsessions change
                </p>
                <input
                  type="text" value={currentHook} onChange={e => setCurrentHook(e.target.value)}
                  placeholder="e.g. Minecraft, Dinosaurs, Drawing animals, Space..."
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 13, color: '#111827', outline: 'none', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' }}
                  onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                />
              </div>

              {/* Curriculum */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 4 }}>
                  Curriculum <span style={{ fontWeight: 600, color: '#9ca3af' }}>(optional)</span>
                </label>
                <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                  Scout aligns lesson structure and terminology with your chosen curriculum
                </p>
                <select
                  value={curriculum} onChange={e => setCurriculum(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 13, color: '#111827', outline: 'none', fontFamily: "'Nunito', sans-serif", background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="">Select curriculum...</option>
                  <optgroup label="All-in-One">
                    {['Sonlight', 'Abeka', 'BJU Press', "My Father's World", 'Classical Conversations', 'Memoria Press', 'Veritas Press', 'Bookshark', 'The Good and the Beautiful'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Math">
                    {['Singapore Math', 'Saxon Math', 'Math-U-See', 'RightStart Math', 'Beast Academy', 'Teaching Textbooks', 'Math Mammoth', 'Life of Fred'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Language Arts">
                    {['All About Reading', 'All About Spelling', 'IEW', 'Brave Writer', 'Shurley English'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Science">
                    {['Apologia', 'Real Science Odyssey'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="History">
                    {['Story of the World', 'Mystery of History', 'Notgrass History'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other">
                    <option value="Eclectic / Mix">Eclectic / Mix</option>
                    <option value="Custom">Custom / Not Listed</option>
                  </optgroup>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, borderTop: '1px solid #f3f4f6', padding: '14px 24px', display: 'flex', gap: 10, background: '#fafafa' }}>
          <button
            onClick={onCancel}
            style={{ padding: '10px 18px', border: '2px solid #e5e7eb', background: '#fff', color: '#6b7280', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
          >
            Cancel
          </button>

          {!canSave && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                {!coreComplete && 'Add a first name to continue.'}
                {coreComplete && !learningComplete && (
                  <button
                    onClick={() => setActiveTab('learning')}
                    style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 700, fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: "'Nunito', sans-serif" }}
                  >
                    Select a learning style to save →
                  </button>
                )}
              </p>
            </div>
          )}

          <button onClick={handleSave} disabled={!canSave || saving} style={saveBtnStyle}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Child'}
          </button>
        </div>

      </div>
    </div>
  )
}
