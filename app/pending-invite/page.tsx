'use client'

/**
 * Shown instead of auto-creating an organization when the logged-in user's
 * (confirmed) email matches a pending, unexpired co-teacher/aide invite.
 * Lets them accept that invite or explicitly start their own homeschool
 * instead of silently getting either outcome picked for them.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase'
import { redeemInvite } from '@/src/lib/invites'
import { ensureOrganizationForUser } from '@/src/lib/ensureOrganization'

export default function PendingInvitePage() {
  const router = useRouter()
  const supabase = createClient()

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [inviteOrgName, setInviteOrgName] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<'accept' | 'own' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const result = await ensureOrganizationForUser(supabase)
        if (!mounted) return

        if (result.source !== 'pending_invite') {
          // No longer pending (already resolved elsewhere) — move on.
          router.replace('/dashboard')
          return
        }

        setInviteOrgName(result.inviteOrganizationName ?? 'a family account')
        setInviteCode(result.inviteCode ?? null)
        setStatus('ready')
      } catch {
        if (mounted) setStatus('error')
      }
    })()

    return () => { mounted = false }
  }, [])

  async function handleAccept() {
    if (!inviteCode) return
    setActionLoading('accept')
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setError('Please sign in again and retry.')
      setActionLoading(null)
      return
    }

    const result = await redeemInvite(inviteCode, user.id, user.email)
    if (!result.success) {
      setError(result.error ?? 'Something went wrong. Please try again.')
      setActionLoading(null)
      return
    }

    router.push('/teaching-schedule')
  }

  async function handleStartOwn() {
    setActionLoading('own')
    setError(null)

    try {
      await ensureOrganizationForUser(supabase, { forceCreate: true })
      router.push('/agree')
    } catch {
      setError('Something went wrong. Please try again.')
      setActionLoading(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-slate-800 font-semibold">Something went wrong loading your account.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">You've been invited</h1>
          <p className="text-slate-500 text-sm mt-2">
            {inviteOrgName} invited you to help teach. You can accept, or start your own homeschool instead.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={actionLoading !== null}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading === 'accept' ? 'Joining…' : `Accept invite to ${inviteOrgName}`}
          </button>
          <button
            onClick={handleStartOwn}
            disabled={actionLoading !== null}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            {actionLoading === 'own' ? 'Setting up…' : 'Start my own homeschool instead'}
          </button>
        </div>
      </div>
    </div>
  )
}
