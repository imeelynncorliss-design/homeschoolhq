'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import SchoolYearConfig from '@/components/SchoolYearConfig'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useOrganizationId } from '@/src/hooks/useOrganizationId'
import { OrganizationLoadingScreen, OrganizationPendingInviteScreen, OrganizationErrorScreen } from '@/components/OrganizationStateScreen'
import { pageShell } from '@/src/lib/designTokens'

// ─── Page Content ─────────────────────────────────────────────────────────────

function SchoolYearContent() {
  const router = useRouter()
  const orgState = useOrganizationId()
  const [user, setUser]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // ── Auth ──────────────────────────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // ── Resolve org + co-teacher guard (admin-only) ───────────────────────
      let { orgId, isCoTeacher } = await getOrganizationId(user.id)
      if (!orgId) {
        // No org via the direct read — resolve via the shared hook instead
        // of the old hard redirect to the now-removed onboarding gate.
        if (orgState.status === 'loading') return
        if (orgState.status !== 'ready') return
        orgId = orgState.organizationId
        isCoTeacher = orgState.isCoTeacher
      }
      if (isCoTeacher) { router.push('/dashboard'); return }

      setUser(user)
      setLoading(false)
    }

    init()
  }, [orgState.status])

  if (orgState.status === 'pending_invite' && !user) return <OrganizationPendingInviteScreen />
  if (orgState.status === 'error' && !user) {
    return <OrganizationErrorScreen message={orgState.error} onRetry={orgState.retry} />
  }

  if (loading) return <OrganizationLoadingScreen />

  return (
    <div style={css.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={css.topBar}>
      <div style={css.topBarLeft}>
          <button style={css.headerBtn} onClick={() => router.push('/dashboard')}>
            ← Dashboard
          </button>
          <div style={css.pageTitle}>🏫 School Year & Compliance </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main style={css.main}>
        <div style={css.sectionLabel}>CONFIGURE YOUR CALENDAR, STATE COMPLIANCE & GOALS</div>

        <div style={css.card}>
          <div style={css.cardHead}>
            <span style={{ fontSize: 20 }}>🏫</span>
            <span style={css.cardTitle}>School Year & Compliance</span>
          </div>
          <div style={css.cardBody}>
            <SchoolYearConfig userId={user.id} />
          </div>
        </div>
      </main>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchoolYearPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <SchoolYearContent />
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