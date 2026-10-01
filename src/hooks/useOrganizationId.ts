'use client'

/**
 * useOrganizationId.ts
 *
 * Shared replacement for every page's old "getOrganizationId() ->
 * router.push('/onboarding') if missing" boilerplate (roadmap item 1.2/1.3).
 * Org creation now happens at login (ensureOrganizationForUser, item 1.1),
 * so the fast path here is just a read. The fallback only runs for a page
 * reached without going through that login flow (e.g. a resumed session
 * opened directly to a deep link) — it self-heals by calling the same
 * idempotent RPC login uses, which is also how a stale pending invite gets
 * surfaced here instead of silently creating a duplicate org.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { ensureOrganizationForUser } from '@/src/lib/ensureOrganization'

export type UseOrganizationIdResult =
  | { status: 'loading'; organizationId: null; isCoTeacher: boolean; userId: null; error: null; retry: () => void }
  | { status: 'ready'; organizationId: string; isCoTeacher: boolean; userId: string; error: null; retry: () => void }
  | { status: 'pending_invite'; organizationId: null; isCoTeacher: boolean; userId: string; error: null; retry: () => void }
  | { status: 'error'; organizationId: null; isCoTeacher: boolean; userId: string | null; error: string; retry: () => void }

export function useOrganizationId(): UseOrganizationIdResult {
  const router = useRouter()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<Omit<UseOrganizationIdResult, 'retry'>>({
    status: 'loading',
    organizationId: null,
    isCoTeacher: false,
    userId: null,
    error: null,
  })
  const cancelledRef = useRef(false)

  const retry = useCallback(() => setAttempt((a) => a + 1), [])

  useEffect(() => {
    cancelledRef.current = false

    async function run() {
      setState({ status: 'loading', organizationId: null, isCoTeacher: false, userId: null, error: null })

      const { data: { user } } = await supabase.auth.getUser()
      if (cancelledRef.current) return
      if (!user) {
        router.push('/login')
        return
      }

      try {
        // Fast path: same read every page already did. Keeps isCoTeacher's
        // existing meaning (a user_organizations row) for the common case.
        const { orgId, isCoTeacher } = await getOrganizationId(user.id)
        if (cancelledRef.current) return
        if (orgId) {
          setState({ status: 'ready', organizationId: orgId, isCoTeacher, userId: user.id, error: null })
          return
        }

        // Fallback: no org found by the direct read. Self-heal the same way
        // login does — idempotent, and surfaces a pending invite instead of
        // creating a second org underneath it.
        const result = await ensureOrganizationForUser(supabase)
        if (cancelledRef.current) return

        if (result.source === 'pending_invite') {
          setState({ status: 'pending_invite', organizationId: null, isCoTeacher: false, userId: user.id, error: null })
          return
        }

        if (!result.organizationId) {
          setState({
            status: 'error',
            organizationId: null,
            isCoTeacher: false,
            userId: user.id,
            error: 'Could not set up your account. Please try again.',
          })
          return
        }

        setState({
          status: 'ready',
          organizationId: result.organizationId,
          isCoTeacher: result.source === 'collaborator',
          userId: user.id,
          error: null,
        })
      } catch {
        if (cancelledRef.current) return
        setState({
          status: 'error',
          organizationId: null,
          isCoTeacher: false,
          userId: user.id,
          error: 'Something went wrong loading your account. Please try again.',
        })
      }
    }

    run()

    return () => {
      cancelledRef.current = true
    }
  }, [attempt, router])

  return { ...state, retry } as UseOrganizationIdResult
}
