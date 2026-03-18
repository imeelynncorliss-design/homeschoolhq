'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { supabase } from '@/src/lib/supabase'
import { getOrganizationId } from '@/src/lib/getOrganizationId'

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADIENT = 'linear-gradient(135deg, #c4b5fd 0%, #e879f9 18%, #f0abfc 36%, #fbcfe8 54%, #bae6fd 76%, #6ee7b7 100%)'

const NAV_ITEMS = [
  { id: 'home',      label: 'Home',      icon: '🏠', href: '/dashboard' },
  { id: 'plan',      label: 'Subjects',  icon: '📚', href: '/subjects'  },
  { id: 'records',   label: 'Records',   icon: '📋', href: '/reports'   },
  { id: 'resources', label: 'Resources', icon: '💡', href: '/resources' },
  { id: 'profile',   label: 'Profile',   icon: '👤', href: '/profile'   },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Upload {
  id: string
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  attendance_date: string
  lesson_id: string | null
  created_at: string
  signedUrl: string | null
  lesson_title?: string | null
  subject?: string | null
}

interface KidGroup {
  kid_id: string
  kid_name: string
  uploads: Upload[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(fileType: string | null, fileName: string) {
  if (fileType?.startsWith('image/')) return true
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({ active }: { active: string }) {
  const router = useRouter()
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(0,0,0,0.08)',
      display: 'flex', height: 64, zIndex: 50,
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = item.id === active
        return (
          <button key={item.id}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
              justifyContent: 'center', gap: 2, background: 'none', border: 'none',
              cursor: 'pointer', color: isActive ? '#7c3aed' : '#9ca3af',
              fontFamily: "'Nunito', sans-serif", position: 'relative',
            }}
            onClick={() => router.push(item.href)}
          >
            {isActive && <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 3, borderRadius: 2, background: '#7c3aed' }} />}
            <span style={{ fontSize: isActive ? 28 : 22, lineHeight: 1, transition: 'font-size 0.15s' }}>{item.icon}</span>
            <span style={{ fontSize: isActive ? 12 : 10, fontWeight: isActive ? 800 : 500, transition: 'all 0.15s' }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────

function PortfolioContent() {
  const router = useRouter()

  const [groups, setGroups]     = useState<KidGroup[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [activeKid, setActiveKid] = useState<string | null>(null)
  const [preview, setPreview]   = useState<Upload | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { setGroups([]); setLoading(false); return }

      const { data: uploads, error: uploadsErr } = await supabase
        .from('portfolio_uploads')
        .select('id, file_name, file_path, file_type, file_size, attendance_date, lesson_id, kid_id, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
      if (uploadsErr) throw uploadsErr
      if (!uploads || uploads.length === 0) { setGroups([]); setLoading(false); return }

      const kidIds = [...new Set(uploads.map((u: { kid_id: string }) => u.kid_id).filter(Boolean))]
      const { data: kids } = await supabase
        .from('kids').select('id, displayname').in('id', kidIds)

      const lessonIds = [...new Set(uploads.map((u: { lesson_id: string | null }) => u.lesson_id).filter(Boolean))] as string[]
      let lessonMap: Record<string, { title: string; subject: string }> = {}
      if (lessonIds.length > 0) {
        const { data: lessons } = await supabase
          .from('lessons').select('id, title, subject').in('id', lessonIds)
        if (lessons) {
          lessonMap = Object.fromEntries(
            lessons.map((l: { id: string; title: string; subject: string }) => [l.id, { title: l.title, subject: l.subject }])
          )
        }
      }

      const enriched: Upload[] = await Promise.all(
        uploads.map(async (u: { id: string; file_name: string; file_path: string; file_type: string | null; file_size: number | null; attendance_date: string; lesson_id: string | null; created_at: string; kid_id: string }) => {
          const { data: signed } = await supabase.storage
            .from('portfolio-uploads').createSignedUrl(u.file_path, 3600)
          const lesson = u.lesson_id ? lessonMap[u.lesson_id] : null
          return { ...u, signedUrl: signed?.signedUrl ?? null, lesson_title: lesson?.title ?? null, subject: lesson?.subject ?? null }
        })
      )

      const kidMap: Record<string, KidGroup> = {}
      for (const upload of enriched) {
        const u = upload as Upload & { kid_id: string }
        const kid = kids?.find((k: { id: string; displayname: string }) => k.id === u.kid_id)
        const kidId = u.kid_id ?? 'unknown'
        const kidName = kid?.displayname ?? 'Unknown Child'
        if (!kidMap[kidId]) kidMap[kidId] = { kid_id: kidId, kid_name: kidName, uploads: [] }
        kidMap[kidId].uploads.push(upload)
      }

      const grouped = Object.values(kidMap)
      setGroups(grouped)
      if (grouped.length > 0) setActiveKid(grouped[0].kid_id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (upload: Upload) => {
    if (!confirm(`Delete "${upload.file_name}"? This cannot be undone.`)) return
    setDeleting(upload.id)
    await supabase.storage.from('portfolio-uploads').remove([upload.file_path])
    await supabase.from('portfolio_uploads').delete().eq('id', upload.id)
    setGroups(prev => prev
      .map(g => ({ ...g, uploads: g.uploads.filter(u => u.id !== upload.id) }))
      .filter(g => g.uploads.length > 0)
    )
    if (preview?.id === upload.id) setPreview(null)
    setDeleting(null)
  }

  const activeGroup = groups.find(g => g.kid_id === activeKid)

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", minHeight: '100vh', background: GRADIENT, paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 0 12px' }}>

        {/* Back button */}
        <div style={{ padding: '16px 20px 0' }}>
          <button
            onClick={() => router.push('/reports')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.72)', border: '1.5px solid rgba(124,58,237,0.15)',
              borderRadius: 20, padding: '7px 16px 7px 12px',
              fontSize: 13, fontWeight: 700, color: '#7c3aed',
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
            }}
          >
            ‹ Records
          </button>
        </div>

        {/* Page title */}
        <div style={{ padding: '16px 20px 4px' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1e1b4b', margin: '0 0 4px', fontFamily: "'Nunito', sans-serif" }}>
            🗂️ Portfolio
          </h1>
          <p style={{ fontSize: 14, color: '#4b5563', fontWeight: 600, margin: 0, lineHeight: 1.6 }}>
            Work samples uploaded during lesson check-ins.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#7c3aed', fontSize: 14, fontWeight: 700 }}>
            Loading portfolio…
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ margin: '16px 20px', padding: '12px 16px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && groups.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🗂️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b', marginBottom: 8 }}>No work samples yet</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, fontWeight: 600 }}>
              Upload photos or PDFs from the Check-In tab inside any lesson.
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && groups.length > 0 && (
          <>
            {/* Kid tabs */}
            {groups.length > 1 && (
              <div style={{ display: 'flex', gap: 8, padding: '12px 20px 0', overflowX: 'auto' }}>
                {groups.map(g => (
                  <button
                    key={g.kid_id}
                    onClick={() => setActiveKid(g.kid_id)}
                    style={{
                      padding: '7px 16px', borderRadius: 100, border: '2px solid',
                      borderColor: activeKid === g.kid_id ? '#7c3aed' : 'rgba(124,58,237,0.2)',
                      background: activeKid === g.kid_id ? '#7c3aed' : 'rgba(255,255,255,0.7)',
                      color: activeKid === g.kid_id ? '#fff' : '#7c3aed',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const,
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    {g.kid_name}
                    <span style={{ marginLeft: 6, opacity: 0.75, fontSize: 11 }}>({g.uploads.length})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Summary */}
            {activeGroup && (
              <div style={{ padding: '14px 20px 6px' }}>
                <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 700 }}>
                  {activeGroup.uploads.length} file{activeGroup.uploads.length !== 1 ? 's' : ''} for{' '}
                  <strong style={{ color: '#1e1b4b' }}>{activeGroup.kid_name}</strong>
                </div>
              </div>
            )}

            {/* Cards */}
            {activeGroup && (
              <div style={{ padding: '4px 20px', display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                {activeGroup.uploads.map(upload => (
                  <div
                    key={upload.id}
                    style={{
                      background: 'rgba(255,255,255,0.88)', borderRadius: 16,
                      border: '1.5px solid rgba(124,58,237,0.13)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 2px 12px rgba(124,58,237,0.08)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Image thumbnail */}
                    {upload.signedUrl && isImage(upload.file_type, upload.file_name) && (
                      <div
                        onClick={() => setPreview(upload)}
                        style={{
                          width: '100%', height: 160, cursor: 'zoom-in',
                          background: '#f9fafb',
                          backgroundImage: `url(${upload.signedUrl})`,
                          backgroundSize: 'contain',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          borderBottom: '1px solid rgba(124,58,237,0.08)',
                        }}
                      />
                    )}

                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>
                        {isImage(upload.file_type, upload.file_name) ? '🖼️' : '📄'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {upload.file_name}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' as const, fontWeight: 600 }}>
                          <span>📅 {formatDate(upload.attendance_date)}</span>
                          {upload.subject && <span>· 📚 {upload.subject}</span>}
                          {upload.lesson_title && <span>· {upload.lesson_title}</span>}
                          {upload.file_size && <span>· {formatBytes(upload.file_size)}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {upload.signedUrl && (
                          <a
                            href={upload.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 12px', borderRadius: 8,
                              background: '#eff6ff', border: '1px solid #bfdbfe',
                              fontSize: 11, fontWeight: 700, color: '#2563eb',
                              textDecoration: 'none',
                            }}
                          >
                            View
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(upload)}
                          disabled={deleting === upload.id}
                          style={{
                            padding: '6px 10px', borderRadius: 8,
                            background: '#fff', border: '1px solid #fca5a5',
                            fontSize: 11, fontWeight: 700, color: '#ef4444',
                            cursor: deleting === upload.id ? 'not-allowed' : 'pointer',
                            opacity: deleting === upload.id ? 0.5 : 1,
                            fontFamily: "'Nunito', sans-serif",
                          }}
                        >
                          {deleting === upload.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav active="records" />

      {/* Lightbox */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', position: 'relative' }}>
            <img
              src={preview.signedUrl!}
              alt={preview.file_name}
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }}
            />
            <div style={{
              position: 'absolute', bottom: -36, left: 0, right: 0,
              textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.75)',
              fontFamily: "'Nunito', sans-serif",
            }}>
              {preview.file_name} · {formatDate(preview.attendance_date)}
              {preview.lesson_title && ` · ${preview.lesson_title}`}
            </div>
            <button
              onClick={() => setPreview(null)}
              style={{
                position: 'absolute', top: -16, right: -16,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', border: 'none',
                color: '#fff', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: GRADIENT }} />}>
        <PortfolioContent />
      </Suspense>
    </AuthGuard>
  )
}
