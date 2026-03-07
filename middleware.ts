import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes — redirect to login if not authenticated
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protect onboarding routes — redirect to login if not authenticated
  if (request.nextUrl.pathname.startsWith('/onboarding') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from auth pages
  // Exception: reset-password and invite signups bypass this
  if (user && !request.nextUrl.pathname.startsWith('/reset-password')) {
    const hasInviteCode = request.nextUrl.searchParams.get('invite')
    if (!hasInviteCode && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
      // Send to onboarding — it will redirect to dashboard if already complete
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/onboarding',
    '/co-teachers/:path*',
    '/co-teachers',
    '/api/invites/:path*',
    '/login',
    '/signup',
    '/reset-password',
  ],
}