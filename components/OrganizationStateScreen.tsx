'use client'

/**
 * Shared full-page screen for the non-"ready" states of useOrganizationId()
 * (roadmap item 1.3) — loading / pending_invite / error-with-retry — so the
 * 21 pages that used to hard-redirect to /onboarding on a missing org render
 * the same helpful screen instead of crashing or going blank.
 */

import Link from 'next/link'
import { colors } from '@/src/lib/designTokens'

export function OrganizationLoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBackground }}>
      <div style={{ color: colors.purple, fontWeight: 700, fontSize: 16 }}>Loading...</div>
    </div>
  )
}

export function OrganizationPendingInviteScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBackground, padding: 24 }}>
      <div style={{ maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, marginBottom: 16 }}>
          You have a pending invite waiting. Decide whether to accept it or start your own homeschool before continuing.
        </div>
        <Link
          href="/pending-invite"
          style={{ display: 'inline-block', background: colors.purple, color: colors.white, fontWeight: 700, padding: '10px 20px', borderRadius: 10, textDecoration: 'none' }}
        >
          Review invite
        </Link>
      </div>
    </div>
  )
}

export function OrganizationErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBackground, padding: 24 }}>
      <div style={{ maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: colors.red, marginBottom: 16 }}>
          {message}
        </div>
        <button
          onClick={onRetry}
          style={{ background: colors.purple, color: colors.white, fontWeight: 700, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
