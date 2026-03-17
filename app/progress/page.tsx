'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import ProgressDashboard from '@/components/ProgressDashboard'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { colors } from '@/src/lib/designTokens'
import { useAppHeader } from '@/components/layout/AppHeader'

const NAV_ITEMS = [
  { label: 'Home',      icon: '🏠', href: '/dashboard' },
  { label: 'Subjects',  icon: '📚', href: '/subjects'  },
  { label: 'Records',   icon: '📋', href: '/reports'   },
  { label: 'Resources', icon: '💡', href: '/resources' },
  { label: 'Profile',   icon: '👤', href: '/profile'   },
]

// ─── Page Content ─────────────────────────────────────────────────────────────

function ProgressContent() {
  const router = useRouter()
  useAppHeader({ title: '📊 Progress Reports', backHref: '/reports' })

  const [user, setUser]                     = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string>('')
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: collaboration } = await supabase
        .from('family_collaborators')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (collaboration) { router.push('/dashboard'); return }

      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }

      setUser(user)
      setOrganizationId(orgId)
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
    <div style={{ minHeight: '100vh', background: colors.pageBackground, fontFamily: "'Nunito', sans-serif", paddingBottom: 100 }}>

      {/* Back button */}
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

      {/* Main content */}
      <main style={{ padding: '20px' }}>
        <ProgressDashboard userId={user.id} organizationId={organizationId} />
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(124,58,237,0.10)',
        display: 'flex', zIndex: 100,
        padding: '8px 0 12px',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.07)',
      }}>
        {NAV_ITEMS.map(item => (
          <button key={item.label}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 0', fontFamily: "'Nunito', sans-serif", gap: 2,
              color: item.href === '/reports' ? '#7c3aed' : '#9ca3af',
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

export default function ProgressPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <ProgressContent />
      </Suspense>
    </AuthGuard>
  )
}
