/**
 * pendingInviteCode.ts
 * Helpers for carrying an invite code typed at signup through to the first
 * signed-in session, where it actually gets redeemed (RLS requires a live
 * session for the family_collaborators insert — see redeemInvite()).
 *
 * Stored in two places:
 * - user_metadata (set via signUp options.data.invite_code) — survives the
 *   email-confirmation link being opened in a different browser/device.
 * - sessionStorage — same-tab fallback for the "confirmations disabled,
 *   session already live" path.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const SESSION_KEY = 'hsr_pending_invite_code'

export function storeInviteCodeForSession(code: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, code)
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — metadata copy still works
  }
}

export async function getStoredInviteCode(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  const metadataCode = user?.user_metadata?.invite_code
  if (typeof metadataCode === 'string' && metadataCode.trim()) {
    return metadataCode.trim()
  }

  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored?.trim() || null
  } catch {
    return null
  }
}

export async function clearStoredInviteCode(supabase: SupabaseClient) {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }

  try {
    await supabase.auth.updateUser({ data: { invite_code: null } })
  } catch {
    // non-fatal — worst case a stale code is re-attempted and fails harmlessly
  }
}
