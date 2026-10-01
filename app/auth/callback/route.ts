import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const explicitNext = searchParams.get('next')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // An explicit destination (e.g. password reset) is honored as-is.
      if (explicitNext) {
        return NextResponse.redirect(`${origin}${explicitNext}`)
      }

      // A signup-time invite code (stashed in user_metadata — see app/signup)
      // takes priority over the RPC: a code-only invite has no email on it,
      // so the RPC's email match would miss it and create a placeholder org
      // before /pending-invite ever gets a chance to redeem the code.
      const { data: { user } } = await supabase.auth.getUser()
      if (typeof user?.user_metadata?.invite_code === 'string' && user.user_metadata.invite_code.trim()) {
        return NextResponse.redirect(`${origin}/pending-invite`)
      }

      // Idempotent: creates an org only for a genuinely new user with no
      // pending invite waiting for them. Safe to call on every callback.
      const { data, error: rpcError } = await supabase.rpc('ensure_organization_for_user', {})

      if (!rpcError && data?.source === 'pending_invite') {
        return NextResponse.redirect(`${origin}/pending-invite`)
      }
      if (!rpcError && data?.source === 'created') {
        return NextResponse.redirect(`${origin}/agree`)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_reset_link`)
}
