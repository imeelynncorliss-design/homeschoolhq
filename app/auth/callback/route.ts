// app/auth/callback/route.ts
import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error.message)}`)
    }
  }

  // Successful login - redirect to dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}
