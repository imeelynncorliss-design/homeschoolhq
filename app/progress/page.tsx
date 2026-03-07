'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import ProgressDashboard from '@/components/ProgressDashboard'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { pageShell, colors } from '@/src/lib/designTokens'

// ─── Page Content ─────────────────────────────────────────────────────────────

function ProgressContent() {
  const router = useRouter()
  const [user, setUser]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // ── Auth ──────────────────────────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // ── Co-teacher guard — progress tracking is admin-only ────────────────
      const { data: collaboration } = await supabase
        .from('family_collaborators')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (collaboration) { router.push('/dashboard'); return }

      // ── Resolve org ───────────────────────────────────────────────────────
      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }

      setUser(user)
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

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={css.topBar}>
      <div style={css.topBarLeft}>
          <button style={css.headerBtn} onClick={() => router.push('/dashboard')}>
            ← Dashboard
          </button>
          <div style={css.pageTitle}>  📈 Progress Tracking </div>
        </div>
        <div style={css.topBarRight}>
          <button style={css.headerBtn} onClick={() => router.push('/calendar')}>
            📅 Calendar
          </button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main style={css.main}>
        <div style={css.sectionLabel}>TRACK LEARNING GOALS & MILESTONES</div>

        <div style={css.card}>
          <div style={css.cardHead}>
            <span style={{ fontSize: 20 }}>📈</span>
            <span style={css.cardTitle}>Progress Tracking</span>
          </div>
          <div style={css.cardBody}>
            <ProgressDashboard userId={user.id} />
          </div>
        </div>
      </main>

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  ...pageShell,
  cardBody: {
    padding: '24px',
  },
}