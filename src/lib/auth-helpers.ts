import { getCurrentUser } from '@/src/lib/auth'
import { createClient } from '@/src/lib/supabase/server'

export async function getOrganizationId(): Promise<string | null> {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }

  const supabase = await createClient()
  
  // Get organization from kids table (not user_profiles)
  const { data: kids, error } = await supabase
    .from('kids')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)

  if (error || !kids || kids.length === 0) {
    console.error('getOrganizationId error:', error)
    return null
  }

  return kids[0].organization_id
}