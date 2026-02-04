import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const code = requestUrl.searchParams.get('code')

  console.log('🔍 Callback params:', { token_hash: token_hash ? 'present' : 'missing', type, next, code })

  const supabase = await createClient()

  // Handle password recovery
  if (token_hash && type === 'recovery') {
    console.log('🔐 Processing recovery...')
    
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash,
    })

    if (error) {
      console.error('❌ Recovery error:', error)
      return NextResponse.redirect(
        new URL('/reset-password?error=invalid_link', request.url)
      )
    }

    console.log('✅ Recovery verified, redirecting to:', next)
    
    // Force absolute URL for localhost
    const redirectUrl = new URL(next, request.url)
    console.log('📍 Full redirect URL:', redirectUrl.toString())
    
    return NextResponse.redirect(redirectUrl)
  }

  // Handle email confirmation with code
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Code exchange error:', error)
      return NextResponse.redirect(new URL('/login?error=invalid_code', request.url))
    }

    return NextResponse.redirect(new URL(next, request.url))
  }

  // No valid params
  console.log('⚠️ No valid params, redirecting to login')
  return NextResponse.redirect(new URL('/login', request.url))
}