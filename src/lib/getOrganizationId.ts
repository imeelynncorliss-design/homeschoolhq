import { supabase } from '@/src/lib/supabase'

/**
 * Resolves the correct organizationId for any user — owner or co-teacher.
 *
 * Owner path:   organizations.user_id = userId  → organizations.id
 * Co-teacher:   user_organizations.user_id = userId → organization_id
 *
 * Returns null if no org found (new account, auth error, etc).
 * NEVER falls back to userId — that was the source of the org_id data bug.
 */
export async function getOrganizationId(userId: string): Promise<{
  orgId: string | null
  isCoTeacher: boolean
}> {
  // 1. Owner path — direct lookup on organizations table
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (org?.id) {
    return { orgId: org.id, isCoTeacher: false }
  }

  // 2. Co-teacher path — via user_organizations junction table
  const { data: membership } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (membership?.organization_id) {
    return { orgId: membership.organization_id, isCoTeacher: true }
  }

  // 3. No org found — return null, never fall back to userId
  return { orgId: null, isCoTeacher: false }
}