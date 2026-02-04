import { getCurrentUser } from '@/src/lib/auth'
import { createClient } from '@/src/lib/supabase/server'

export async function getOrganizationId(): Promise<string | null> {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  return profile?.organization_id || null
}