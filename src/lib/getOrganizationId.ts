import { supabase } from '@/src/lib/supabase'

/**
 * Resolves the correct organizationId for any user, whether they are a
 * parent-admin or a co-teacher (family_collaborator).
 *
 * Usage:
 *   const { orgId, isCoTeacher } = await getOrganizationId(user.id)
 *
 * Place this file at: src/lib/getOrganizationId.ts
 */
export async function getOrganizationId(userId: string): Promise<{
  orgId: string
  isCoTeacher: boolean
}> {
  // 1. Parent-admin path — look up via kids table
  const { data: kid } = await supabase
    .from('kids')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (kid?.organization_id) {
    return { orgId: kid.organization_id, isCoTeacher: false }
  }

  // 2. Co-teacher path — look up via family_collaborators
  const { data: collab } = await supabase
    .from('family_collaborators')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (collab?.organization_id) {
    return { orgId: collab.organization_id, isCoTeacher: true }
  }

  // 3. Fallback — new account with no kids yet, use userId as org
  return { orgId: userId, isCoTeacher: false }
}