'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/src/lib/supabase'
import { printHeader, printHeaderCSS } from '@/lib/printHeader'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface FieldTrip {
  id: string
  title: string
  location: string | null
  description: string | null
  subject: string | null
  hours: number | null
  trip_date: string
  kid_id: string
}

interface Kid {
  id: string
  displayname: string
}

interface FieldTripLogProps {
  organizationId: string
  kids: Kid[]
}

const SUBJECTS = ['Science', 'History', 'Art', 'Geography', 'Language Arts', 'Life Skills', 'Physical Education', 'Other']

export default function FieldTripLog({ organizationId, kids }: FieldTripLogProps) {
  const [trips, setTrips]           = useState<FieldTrip[]>([])
  const [selectedKid, setSelectedKid] = useState<string>(kids[0]?.id ?? '')
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editingTrip, setEditingTrip] = useState<FieldTrip | null>(null)
  const [saving, setSaving]         = useState(false)
  const trapRef = useFocusTrap(showForm)

  // Form state
  const [fTitle, setFTitle]           = useState('')
  const [fLocation, setFLocation]     = useState('')
  const [fDescription, setFDescription] = useState('')
  const [fSubject, setFSubject]       = useState('')
  const [fHours, setFHours]           = useState('')
  const [fDate, setFDate]             = useState('')

  const loadTrips = useCallback(async () => {
    if (!selectedKid) return
    setLoading(true)
    const { data } = await supabase
      .from('field_trips')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('kid_id', selectedKid)
      .order('trip_date', { ascending: false })
    setTrips((data || []) as FieldTrip[])
    setLoading(false)
  }, [organizationId, selectedKid])

  useEffect(() => { loadTrips() }, [loadTrips])

  const resetForm = () => {
    setFTitle(''); setFLocation(''); setFDescription(''); setFSubject(''); setFHours(''); setFDate('')
    setEditingTrip(null)
  }

  const openAdd = () => { resetForm(); setShowForm(true) }

  const openEdit = (t: FieldTrip) => {
    setEditingTrip(t)
    setFTitle(t.title); setFLocation(t.location ?? ''); setFDescription(t.description ?? '')
    setFSubject(t.subject ?? ''); setFHours(t.hours?.toString() ?? ''); setFDate(t.trip_date)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fTitle.trim() || !fDate) return
    setSaving(true)
    const payload = {
      organization_id: organizationId,
      kid_id: selectedKid,
      title: fTitle.trim(),
      location: fLocation.trim() || null,
      description: fDescription.trim() || null,
      subject: fSubject || null,
      hours: fHours ? parseFloat(fHours) : null,
      trip_date: fDate,
    }
    if (editingTrip) {
      await supabase.from('field_trips').update(payload).eq('id', editingTrip.id)
    } else {
      await supabase.from('field_trips').insert([payload])
    }
    setSaving(false)
    setShowForm(false)
    resetForm()
    loadTrips()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this field trip?')) return
    await supabase.from('field_trips').delete().eq('id', id)
    loadTrips()
  }

  const handlePrint = () => {
    const origin = window.location.origin
    const subjectColors: Record<string, string> = {
      Science: '#059669', History: '#d97706', Art: '#ec4899',
      Geography: '#0284c7', 'Language Arts': '#7c3aed', 'Life Skills': '#6366f1',
      'Physical Education': '#16a34a', Other: '#6b7280',
    }

    const tripsHTML = Object.entries(grouped).map(([month, monthTrips]) => `
      <div class="month-group">
        <div class="month-label">${month}</div>
        ${monthTrips.map(trip => {
          const color = trip.subject ? (subjectColors[trip.subject] ?? '#6b7280') : '#6b7280'
          const dateStr = new Date(trip.trip_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          return `
          <div class="trip-card">
            <div class="trip-title">${trip.title}</div>
            ${trip.location ? `<div class="trip-location">📍 ${trip.location}</div>` : ''}
            <div class="trip-meta">
              <span class="chip">${dateStr}</span>
              ${trip.subject ? `<span class="chip" style="background:${color}18;color:${color}">${trip.subject}</span>` : ''}
              ${trip.hours ? `<span class="chip">⏱️ ${trip.hours}h</span>` : ''}
            </div>
            ${trip.description ? `<div class="trip-desc">${trip.description}</div>` : ''}
          </div>`
        }).join('')}
      </div>
    `).join('')

    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Field Trip Log — ${kidName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        ${printHeaderCSS()}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito', sans-serif; background: #fff; color: #111827; padding: 36px; }
        h1 { font-size: 22px; font-weight: 900; color: #111827; margin-bottom: 4px; }
        .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
        .stats { display: flex; gap: 16px; margin-bottom: 28px; }
        .stat { flex: 1; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 12px 16px; text-align: center; }
        .stat-val { font-size: 24px; font-weight: 900; color: #7c3aed; }
        .stat-lbl { font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; }
        .month-group { margin-bottom: 22px; }
        .month-label { font-size: 10px; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
        .trip-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; margin-bottom: 8px; break-inside: avoid; }
        .trip-title { font-size: 14px; font-weight: 800; color: #111827; margin-bottom: 3px; }
        .trip-location { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
        .trip-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 5px; }
        .chip { font-size: 11px; font-weight: 700; background: #ede9fe; color: #7c3aed; border-radius: 5px; padding: 2px 8px; }
        .trip-desc { font-size: 12px; color: #6b7280; margin-top: 4px; }
        @media print { body { padding: 20px; } }
      </style>
    </head><body>
      ${printHeader(origin)}
      <h1>Field Trip Log — ${kidName}</h1>
      <div class="subtitle">${trips.length} trip${trips.length !== 1 ? 's' : ''} · ${totalHours > 0 ? `${totalHours} total hours · ` : ''}Printed ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
      <div class="stats">
        <div class="stat"><div class="stat-val">${trips.length}</div><div class="stat-lbl">Total Trips</div></div>
        <div class="stat"><div class="stat-val">${totalHours > 0 ? totalHours + 'h' : '—'}</div><div class="stat-lbl">Total Hours</div></div>
        <div class="stat"><div class="stat-val">${new Set(trips.map(t => t.subject).filter(Boolean)).size || '—'}</div><div class="stat-lbl">Subjects</div></div>
      </div>
      ${tripsHTML}
    </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 600)
  }

  const totalHours = trips.reduce((sum, t) => sum + (t.hours ?? 0), 0)
  const kidName = kids.find(k => k.id === selectedKid)?.displayname ?? 'Student'

  // Group by month
  const grouped = trips.reduce<Record<string, FieldTrip[]>>((acc, t) => {
    const key = new Date(t.trip_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    ;(acc[key] = acc[key] || []).push(t)
    return acc
  }, {})

  const SUBJECT_COLORS: Record<string, string> = {
    Science: '#059669', History: '#d97706', Art: '#ec4899',
    Geography: '#0284c7', 'Language Arts': '#7c3aed', 'Life Skills': '#6366f1',
    'Physical Education': '#16a34a', Other: '#6b7280',
  }

  return (
    <div>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Field Trip & Activity Log</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Log field trips, co-op classes, museum visits, and extracurriculars</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint} style={btn.ghost}>🖨️ Print</button>
          <button onClick={openAdd} style={btn.primary}>+ Add Trip</button>
        </div>
      </div>

      {/* Kid selector */}
      {kids.length > 1 && (
        <div className="no-print" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {kids.map(k => (
              <button key={k.id} onClick={() => setSelectedKid(k.id)} style={{
                padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
                fontSize: 12, fontWeight: 700, border: 'none',
                background: selectedKid === k.id ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#f3f4f6',
                color: selectedKid === k.id ? '#fff' : '#6b7280',
              }}>{k.displayname}</button>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Trips', value: trips.length, emoji: '🚌' },
          { label: 'Total Hours', value: totalHours > 0 ? `${totalHours}h` : '—', emoji: '⏱️' },
          { label: 'Subjects', value: new Set(trips.map(t => t.subject).filter(Boolean)).size || '—', emoji: '📚' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: 20 }}>{s.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#7c3aed' }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trip list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#7c3aed', fontWeight: 700 }}>Loading...</div>
      ) : trips.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚌</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>No trips logged yet</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Museum visits, nature walks, co-op classes — log them all here.</div>
          <button onClick={openAdd} style={btn.primary} className="no-print">+ Add First Trip</button>
        </div>
      ) : (
        Object.entries(grouped).map(([month, monthTrips]) => (
          <div key={month} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{month}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {monthTrips.map(trip => {
                const subjectColor = trip.subject ? (SUBJECT_COLORS[trip.subject] ?? '#6b7280') : '#6b7280'
                return (
                  <div key={trip.id} className="print-card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🚌</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{trip.title}</div>
                      {trip.location && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>📍 {trip.location}</div>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={chip}>{new Date(trip.trip_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        {trip.subject && <span style={{ ...chip, background: `${subjectColor}18`, color: subjectColor }}>{trip.subject}</span>}
                        {trip.hours && <span style={chip}>⏱️ {trip.hours}h</span>}
                      </div>
                      {trip.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{trip.description}</div>}
                    </div>
                    <div className="no-print" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openEdit(trip)} style={btn.icon} aria-label={`Edit ${trip.title}`}>✏️</button>
                      <button onClick={() => handleDelete(trip.id)} style={btn.iconRed} aria-label={`Delete ${trip.title}`}>🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div role="dialog" aria-modal="true" aria-labelledby="field-trip-form-title" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 16px 88px' }}>
          <div ref={trapRef} style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 104px)', overflowY: 'auto', padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', position: 'relative' }}>
            <button onClick={() => { setShowForm(false); resetForm() }} aria-label="Close form" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer' }}>✕</button>
            <h3 id="field-trip-form-title" style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '0 0 20px' }}>
              {editingTrip ? 'Edit Trip' : 'Add Field Trip'}
            </h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Activity / Trip Name *</label>
                <input value={fTitle} onChange={e => setFTitle(e.target.value)} required placeholder="e.g. Natural History Museum" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hours</label>
                  <input type="number" value={fHours} onChange={e => setFHours(e.target.value)} placeholder="2.5" min="0.5" step="0.5" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input value={fLocation} onChange={e => setFLocation(e.target.value)} placeholder="e.g. New York, NY" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Subject Area</label>
                <select value={fSubject} onChange={e => setFSubject(e.target.value)} style={inputStyle}>
                  <option value="">Select subject...</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Description / Notes</label>
                <textarea value={fDescription} onChange={e => setFDescription(e.target.value)} placeholder="What did they learn or experience?" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => { setShowForm(false); resetForm() }} style={btn.ghost}>Cancel</button>
                <button type="submit" disabled={saving} style={btn.primary}>{saving ? 'Saving...' : editingTrip ? 'Save Changes' : 'Add Trip'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const chip: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', borderRadius: 6, padding: '2px 8px' }
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: 'none', color: '#111827', background: '#fafafa' }
const btn = {
  primary: { background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" } as React.CSSProperties,
  ghost: { background: '#fff', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" } as React.CSSProperties,
  icon: { background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
  iconRed: { background: '#fef2f2', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
}
