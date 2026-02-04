import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  console.log('Auth confirm - type:', type, 'token_hash:', token_hash ? 'present' : 'missing')

  if (token_hash && type === 'recovery') {
    const supabase = await createClient()

    // For recovery, we need to verify the OTP token
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash,
    })

    if (error) {
      console.error('Recovery verification error:', error)
      return NextResponse.redirect(
        new URL('/reset-password?error=invalid_link', request.url)
      )
    }

    // Successfully verified - redirect to reset password page
    return NextResponse.redirect(new URL('/reset-password', request.url))
  }

  // If we get here, something is wrong
  console.error('Missing token_hash or invalid type')
  return NextResponse.redirect(
    new URL('/reset-password?error=invalid_link', request.url)
  )
}
