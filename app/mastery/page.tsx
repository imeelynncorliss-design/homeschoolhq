'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import MasteryTracker from '@/components/MasteryTracker'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useOrganizationId } from '@/src/hooks/useOrganizationId'
import { OrganizationLoadingScreen, OrganizationPendingInviteScreen, OrganizationErrorScreen } from '@/components/OrganizationStateScreen'
import { NoStudentsEmptyState } from '@/components/NoStudentsEmptyState'
import { pageShell } from '@/src/lib/designTokens'
import { useAppHeader } from '@/components/layout/AppHeader'

function MasteryContent() {
  const router = useRouter()
  const orgState = useOrganizationId()
  useAppHeader({ title: '🎯 Mastery Tracker', backHref: '/reports' })

  const [user, setUser]                     = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string>('')
  const [hasKids, setHasKids]               = useState<boolean | null>(null)
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      let { orgId } = await getOrganizationId(user.id)
      if (!orgId) {
        // No org via the direct read — resolve via the shared hook instead
        // of the old hard redirect to the now-removed onboarding gate.
        if (orgState.status === 'loading') return
        if (orgState.status !== 'ready') return
        orgId = orgState.organizationId
      }

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
        <div className="hr-section-label" style={{ marginBottom: 14, marginTop: 8 }}>SUBJECT-BY-SUBJECT LEARNING INSIGHTS</div>
        <div className="hr-card" style={{ padding: '20px' }}>
          {hasKids ? (
            <MasteryTracker organizationId={organizationId} />
          ) : (
            <NoStudentsEmptyState message="Mastery is tracked per student — add your first student to start logging concepts." />
          )}
        </div>
      </main>
    </div>
  )
}

export default function MasteryPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <MasteryContent />
      </Suspense>
    </AuthGuard>
  )
}
