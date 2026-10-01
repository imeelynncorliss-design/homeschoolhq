'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import ProgressDashboard from '@/components/ProgressDashboard'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useOrganizationId } from '@/src/hooks/useOrganizationId'
import { OrganizationLoadingScreen, OrganizationPendingInviteScreen, OrganizationErrorScreen } from '@/components/OrganizationStateScreen'
import { NoStudentsEmptyState } from '@/components/NoStudentsEmptyState'
import { pageShell } from '@/src/lib/designTokens'
import { useAppHeader } from '@/components/layout/AppHeader'

// ─── Page Content ─────────────────────────────────────────────────────────────

function ProgressContent() {
  const router = useRouter()
  const orgState = useOrganizationId()
  useAppHeader({ title: '📈 School Year Progress', backHref: '/reports' })

  const [user, setUser]                     = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string>('')
  const [hasKids, setHasKids]               = useState<boolean | null>(null)
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

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

      const { data: kidsData } = await supabase
        .from('kids')
        .select('id')
        .eq('organization_id', orgId)
        .neq('archived', true)
        .limit(1)

      setUser(user)
      setOrganizationId(orgId)
      setHasKids((kidsData?.length ?? 0) > 0)
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
    <div style={{ ...pageShell.root, paddingBottom: 100 }}>
      <main style={pageShell.main}>
        <div className="hr-section-label" style={{ marginBottom: 14, marginTop: 8 }}>LEARNING ANALYTICS & SUMMARIES</div>
        <div className="hr-card" style={{ padding: '20px' }}>
          {hasKids ? (
            <ProgressDashboard userId={user.id} organizationId={organizationId} />
          ) : (
            <NoStudentsEmptyState message="Progress is tracked per student — add your first student to see analytics here." />
          )}
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
