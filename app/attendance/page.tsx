'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import AttendanceTracker from '@/components/AttendanceTracker'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'
import { pageShell, colors } from '@/src/lib/designTokens'

// ─── Page Content ─────────────────────────────────────────────────────────────

function AttendanceContent() {
  const router = useRouter()
  const [user, setUser]                     = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [kids, setKids]                     = useState<any[]>([])
  const [loading, setLoading]               = useState(true)

  // Wire AppHeader — sets the back arrow + page title in the global nav
  useAppHeader({ title: '📋 Attendance', backHref: '/dashboard' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Co-teacher guard — attendance is admin-only
      const { data: collaboration } = await supabase
        .from('family_collaborators')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (collaboration) { router.push('/dashboard'); return }

      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }

      const { data: kidsData } = await supabase
        .from('kids')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      setUser(user)
      setOrganizationId(orgId)
      setKids(kidsData || [])
      setLoading(false)
    }

    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBackground }}>
      <div style={{ color: colors.purple, fontWeight: 700, fontSize: 16 }}>Loading...</div>
    </div>
  )

  return (
    <div style={css.root}>
      <button onClick={() => router.push('/reports')} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.72)', border: '1.5px solid rgba(124,58,237,0.15)',
        borderRadius: 20, padding: '7px 16px 7px 12px',
        fontSize: 13, fontWeight: 700, color: '#7c3aed',
        cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
        margin: '16px 20px 0',
      }}>
        ‹ Records
      </button>
      <main style={{ ...css.main, paddingBottom: 100 }}>
        <div style={css.sectionLabel}>TRACK YOUR SCHOOL DAYS & HOURS</div>

        <div style={css.card}>
          <div style={css.cardHead}>
            <span style={{ fontSize: 20 }}>📋</span>
            <span style={css.cardTitle}>Attendance Tracker</span>
            {/* Calendar shortcut — useful on mobile where AppHeader has no room for it */}
            <button
              onClick={() => router.push('/calendar')}
              style={css.calBtn}
            >
              📅 Calendar
            </button>
          </div>
          <div style={css.cardBody}>
            {organizationId && (
              <AttendanceTracker
                kids={kids}
                organizationId={organizationId}
                userId={user.id}
              />
            )}
          </div>
        </div>
      </main>

      {/* ── Bottom Nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(124,58,237,0.10)',
        display: 'flex', zIndex: 100,
        padding: '8px 0 12px',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.07)',
      }}>
        {[
          { id: 'home',      label: 'Home',      icon: '🏠', href: '/dashboard' },
          { id: 'plan',      label: 'Subjects',  icon: '📚', href: '/subjects'  },
          { id: 'records',   label: 'Records',   icon: '📋', href: '/reports'   },
          { id: 'resources', label: 'Resources', icon: '💡', href: '/resources' },
          { id: 'profile',   label: 'Profile',   icon: '👤', href: '/profile'   },
        ].map(item => (
          <button key={item.id}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 0', fontFamily: "'Nunito', sans-serif", gap: 2,
              color: '#9ca3af',
            }}
            onClick={() => router.push(item.href)}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 500, marginTop: 2 }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <AttendanceContent />
      </Suspense>
    </AuthGuard>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  ...pageShell,
  cardBody: {
    padding: '24px',
  },
  // Calendar shortcut button inside the card header
  calBtn: {
    marginLeft: 'auto',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
}