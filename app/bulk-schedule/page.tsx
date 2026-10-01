'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import BulkLessonScheduler from '@/components/BulkLessonScheduler'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useOrganizationId } from '@/src/hooks/useOrganizationId'
import { OrganizationLoadingScreen, OrganizationPendingInviteScreen, OrganizationErrorScreen } from '@/components/OrganizationStateScreen'
import { NoStudentsEmptyState } from '@/components/NoStudentsEmptyState'
import { colors } from '@/src/lib/designTokens'
import { useAppHeader } from '@/components/layout/AppHeader'

// ─── Page Content ─────────────────────────────────────────────────────────────

function BulkScheduleContent() {
  const router = useRouter()
  const orgState = useOrganizationId()
  useAppHeader({ title: '📆 Bulk Schedule', backHref: '/tools' })
  const [user, setUser]     = useState<any>(null)
  const [hasKids, setHasKids] = useState<boolean | null>(null)
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

      const { data: kidsData } = await supabase
        .from('kids')
        .select('id')
        .eq('organization_id', orgId)
        .neq('archived', true)
        .limit(1)

      setUser(user)
      setHasKids((kidsData?.length ?? 0) > 0)
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
    <div style={{ minHeight: '100vh', background: colors.pageBackground, paddingBottom: 100 }}>
      <main style={{ padding: '20px', maxWidth: 800, margin: '0 auto' }}>
        {hasKids ? (
          <BulkLessonScheduler userId={user.id} />
        ) : (
          <NoStudentsEmptyState message="Lessons are scheduled per student — add your first student before bulk-scheduling." />
        )}
      </main>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BulkSchedulePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <BulkScheduleContent />
      </Suspense>
    </AuthGuard>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
