'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import ReadingLog from '@/components/ReadingLog'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useOrganizationId } from '@/src/hooks/useOrganizationId'
import { OrganizationLoadingScreen, OrganizationPendingInviteScreen, OrganizationErrorScreen } from '@/components/OrganizationStateScreen'
import { NoStudentsEmptyState } from '@/components/NoStudentsEmptyState'
import { useAppHeader } from '@/components/layout/AppHeader'
import { pageShell } from '@/src/lib/designTokens'

function ReadingLogContent() {
  const router = useRouter()
  const orgState = useOrganizationId()
  useAppHeader({ title: '📚 Reading Log', backHref: '/reports' })

  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [kids, setKids]                     = useState<any[]>([])
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
        .select('id, displayname')
        .eq('organization_id', orgId)
        .neq('archived', true)
        .order('created_at', { ascending: false })

      setOrganizationId(orgId)
      setKids(kidsData || [])
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
        <div className="hr-section-label" style={{ marginBottom: 14, marginTop: 8 }}>TRACK BOOKS READ THIS SCHOOL YEAR</div>
        {kids.length === 0 ? (
          <div className="hr-card">
            <NoStudentsEmptyState message="Reading logs are per student — add your first student to start tracking books." />
          </div>
        ) : (
          <div className="hr-card" style={{ padding: '20px' }}>
            <ReadingLog organizationId={organizationId!} kids={kids} />
          </div>
        )}
      </main>
    </div>
  )
}

export default function ReadingLogPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <ReadingLogContent />
      </Suspense>
    </AuthGuard>
  )
}
