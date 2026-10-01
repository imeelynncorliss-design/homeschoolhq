/**
 * ensureOrganization.ts
 * Client wrapper around the ensure_organization_for_user Postgres function
 * (supabase/migrations/20260930000000_ensure_organization_for_user.sql).
 *
 * Call this at first login/signup instead of creating organizations/
 * user_organizations rows directly — it's idempotent and safe to call on
 * every login. Identity is derived from the caller's own session by the
 * database function itself; nothing identity-related is passed here.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type EnsureOrganizationSource =
  | 'existing_owner'
  | 'collaborator'
  | 'pending_invite'
  | 'created'

export interface EnsureOrganizationResult {
  organizationId: string | null
  source: EnsureOrganizationSource
  inviteOrganizationId?: string
  inviteOrganizationName?: string
  inviteCode?: string
}

export interface EnsureOrganizationOptions {
  /** Placeholder name for a brand-new organization. Setup overwrites this later. */
  placeholderName?: string
  /** Referral/invite-link source captured at signup (sessionStorage('hsr_referral')). */
  referralSource?: string | null
  /** Skip the pending-invite check and create the user's own org regardless. */
  forceCreate?: boolean
}

export async function ensureOrganizationForUser(
  supabase: SupabaseClient,
  options: EnsureOrganizationOptions = {}
): Promise<EnsureOrganizationResult> {
  const { data, error } = await supabase.rpc('ensure_organization_for_user', {
    p_placeholder_name: options.placeholderName ?? 'My Homeschool',
    p_referral_source: options.referralSource ?? null,
    p_force_create: options.forceCreate ?? false,
  })

  if (error) {
    throw error
  }

  return {
    organizationId: data.organization_id ?? null,
    source: data.source,
    inviteOrganizationId: data.invite_organization_id ?? undefined,
    inviteOrganizationName: data.invite_organization_name ?? undefined,
    inviteCode: data.invite_code ?? undefined,
  }
}
