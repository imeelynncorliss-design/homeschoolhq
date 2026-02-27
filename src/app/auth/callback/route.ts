/**
 * Supabase Auth Callback
 * Place at: src/app/auth/callback/route.ts
 *
 * Handles post-login/signup redirects from Supabase.
 * Checks org membership to route users correctly:
 *   - Admin     → /dashboard
 *   - Co-teacher / Aide → /teaching-schedule
 *   - No org    → /join (new user with invite code)
 *   - Error     → /login?error=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next'); // optional override (e.g. deep link)

  if (!code) {
    // No code means this wasn't a valid auth callback — send to login
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

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
    // No org — new user, needs to redeem an invite code
    return NextResponse.redirect(`${origin}/join`);
  }

  switch (membership.role) {
    case 'admin':
      return NextResponse.redirect(`${origin}/dashboard`);
    case 'co_teacher':
    case 'aide':
      return NextResponse.redirect(`${origin}/teaching-schedule`);
    default:
      // member or unknown role — send to dashboard as safe fallback
      return NextResponse.redirect(`${origin}/dashboard`);
  }
}