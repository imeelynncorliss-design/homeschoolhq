/**
 * Supabase Auth Callback
 * Place at: src/app/auth/callback/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // Handle password reset via token hash
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (tokenHash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=invalid_reset_link`);
    }
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // Exchange the code for a session
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionError) {
    console.error('Auth callback session error:', sessionError.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(sessionError.message)}`
    );
  }

  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // If a specific next destination was requested, honour it
  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Check org membership to determine where to send this user
  const { data: membership } = await supabase
    .from('user_organizations')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.redirect(`${origin}/join`);
  }

  switch (membership.role) {
    case 'admin': {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed_at')
        .eq('user_id', user.id)
        .maybeSingle();

      const destination = profile?.onboarding_completed_at ? '/dashboard' : '/onboarding';
      return NextResponse.redirect(`${origin}${destination}`);
    }
    case 'co_teacher':
    case 'aide':
      return NextResponse.redirect(`${origin}/teaching-schedule`);
    default:
      return NextResponse.redirect(`${origin}/dashboard`);
  }
}