'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/src/lib/supabase'

interface Book {
  id: string
  title: string
  author: string | null
  pages: number | null
  date_completed: string | null
  notes: string | null
  kid_id: string
}

interface Kid {
  id: string
  displayname: string
}

interface ReadingLogProps {
  organizationId: string
  kids: Kid[]
}

const SUBJECTS = ['Language Arts', 'Literature', 'History', 'Science', 'Other']

export default function ReadingLog({ organizationId, kids }: ReadingLogProps) {
  const [books, setBooks]           = useState<Book[]>([])
  const [selectedKid, setSelectedKid] = useState<string>(kids[0]?.id ?? '')
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [saving, setSaving]         = useState(false)

  // Form state
  const [fTitle, setFTitle]             = useState('')
  const [fAuthor, setFAuthor]           = useState('')
  const [fPages, setFPages]             = useState('')
  const [fDate, setFDate]               = useState('')
  const [fNotes, setFNotes]             = useState('')

  const loadBooks = useCallback(async () => {
    if (!selectedKid) return
    setLoading(true)
    const { data } = await supabase
      .from('reading_log')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('kid_id', selectedKid)
      .order('date_completed', { ascending: false })
    setBooks((data || []) as Book[])
    setLoading(false)
  }, [organizationId, selectedKid])

  useEffect(() => { loadBooks() }, [loadBooks])

  const resetForm = () => {
    setFTitle(''); setFAuthor(''); setFPages(''); setFDate(''); setFNotes('')
    setEditingBook(null)
  }

  const openAdd = () => { resetForm(); setShowForm(true) }

  const openEdit = (b: Book) => {
    setEditingBook(b)
    setFTitle(b.title); setFAuthor(b.author ?? ''); setFPages(b.pages?.toString() ?? '')
    setFDate(b.date_completed ?? ''); setFNotes(b.notes ?? '')
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fTitle.trim()) return
    setSaving(true)
    const payload = {
      organization_id: organizationId,
      kid_id: selectedKid,
      title: fTitle.trim(),
      author: fAuthor.trim() || null,
      pages: fPages ? parseInt(fPages) : null,
      date_completed: fDate || null,
      notes: fNotes.trim() || null,
    }
    if (editingBook) {
      await supabase.from('reading_log').update(payload).eq('id', editingBook.id)
    } else {
      await supabase.from('reading_log').insert([payload])
    }
    setSaving(false)
    setShowForm(false)
    resetForm()
    loadBooks()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this book?')) return
    await supabase.from('reading_log').delete().eq('id', id)
    loadBooks()
  }

  const handlePrint = () => window.print()

  // Group by month
  const grouped = books.reduce<Record<string, Book[]>>((acc, b) => {
    const key = b.date_completed
      ? new Date(b.date_completed + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'No date'
    ;(acc[key] = acc[key] || []).push(b)
    return acc
  }, {})

  const kidName = kids.find(k => k.id === selectedKid)?.displayname ?? 'Student'
  const totalPages = books.reduce((sum, b) => sum + (b.pages ?? 0), 0)

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-card { break-inside: avoid; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Reading Log</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Track books read throughout the school year</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint} style={btn.ghost}>🖨️ Print</button>
          <button onClick={openAdd} style={btn.primary}>+ Add Book</button>
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
          { label: 'Books Read', value: books.length, emoji: '📚' },
          { label: 'Pages Read', value: totalPages > 0 ? totalPages.toLocaleString() : '—', emoji: '📄' },
          { label: 'This Year', value: new Date().getFullYear(), emoji: '📅' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: 20 }}>{s.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#7c3aed' }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Print header (only visible when printing) */}
      <div style={{ display: 'none' }} className="print-header">
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Reading Log — {kidName}</h1>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px' }}>
          {books.length} books · {totalPages > 0 ? `${totalPages.toLocaleString()} pages` : ''} · Printed {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Book list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#7c3aed', fontWeight: 700 }}>Loading...</div>
      ) : books.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>No books yet</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Start logging books to build your reading record.</div>
          <button onClick={openAdd} style={btn.primary} className="no-print">+ Add First Book</button>
        </div>
      ) : (
        Object.entries(grouped).map(([month, monthBooks]) => (
          <div key={month} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{month}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {monthBooks.map(book => (
                <div key={book.id} className="print-card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📖</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{book.title}</div>
                    {book.author && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>by {book.author}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {book.pages && <span style={chip}>{book.pages.toLocaleString()} pages</span>}
                      {book.date_completed && <span style={chip}>{new Date(book.date_completed + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    </div>
                    {book.notes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontStyle: 'italic' }}>{book.notes}</div>}
                  </div>
                  <div className="no-print" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => openEdit(book)} style={btn.icon}>✏️</button>
                    <button onClick={() => handleDelete(book.id)} style={btn.iconRed}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', position: 'relative' }}>
            <button onClick={() => { setShowForm(false); resetForm() }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer' }}>✕</button>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '0 0 20px' }}>
              {editingBook ? 'Edit Book' : 'Add Book'}
            </h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Book Title *</label>
                <input value={fTitle} onChange={e => setFTitle(e.target.value)} required placeholder="e.g. Charlotte's Web" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Author</label>
                <input value={fAuthor} onChange={e => setFAuthor(e.target.value)} placeholder="e.g. E.B. White" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Pages</label>
                  <input type="number" value={fPages} onChange={e => setFPages(e.target.value)} placeholder="184" min="1" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date Completed</label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="What did they think of it?" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => { setShowForm(false); resetForm() }} style={btn.ghost}>Cancel</button>
                <button type="submit" disabled={saving} style={btn.primary}>{saving ? 'Saving...' : editingBook ? 'Save Changes' : 'Add Book'}</button>
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
