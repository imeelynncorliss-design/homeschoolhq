'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import EnhancedVacationManager from '@/components/admin/EnhancedVacationManager'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useOrganizationId } from '@/src/hooks/useOrganizationId'
import { OrganizationLoadingScreen, OrganizationPendingInviteScreen, OrganizationErrorScreen } from '@/components/OrganizationStateScreen'
import { pageShell } from '@/src/lib/designTokens'
import { useAppHeader } from '@/components/layout/AppHeader'

// ─── Page Content ─────────────────────────────────────────────────────────────

function VacationContent() {
  const router = useRouter()
  const orgState = useOrganizationId()
  useAppHeader({ title: '🏖️ Vacation Planner', backHref: '/tools' })
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading]               = useState(true)

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

      setOrganizationId(orgId)
      setLoading(false)
    }

    init()
  }, [orgState.status])

  if (orgState.status === 'pending_invite' && !organizationId) return <OrganizationPendingInviteScreen />
  if (orgState.status === 'error' && !organizationId) {
    return <OrganizationErrorScreen message={orgState.error} onRetry={orgState.retry} />
  }

  if (loading) return <OrganizationLoadingScreen />

  return (
    <div style={css.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={css.topBar}>
      <div style={css.topBarLeft}>
          <button style={css.headerBtn} onClick={() => router.push('/tools')}>
            ← Tools
          </button>
          <div style={css.pageTitle}> 🌴 Vacation Planner </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main style={css.main}>
        <div style={css.sectionLabel}>PLAN BREAKS & SEE YOUR SCHEDULE IMPACT</div>

        <div style={css.card}>
          <div style={css.cardHead}>
            <span style={{ fontSize: 20 }}>🌴</span>
            <span style={css.cardTitle}>Vacation Planner</span>
          </div>
          <div style={css.cardBody}>
            {organizationId && (
              <EnhancedVacationManager organizationId={organizationId} />
            )}
          </div>
        </div>
      </main>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VacationPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <VacationContent />
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