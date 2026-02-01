import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // ⚠️ TEMPORARY: Use service role for testing (REMOVE BEFORE PRODUCTION!)
  const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  console.log('⚠️ Using service role for testing - NEVER deploy this!');
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key
  )
}