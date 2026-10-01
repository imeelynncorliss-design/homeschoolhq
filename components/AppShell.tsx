'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AppHeader, { AppHeaderProvider } from '@/components/layout/AppHeader'
import BottomNav from '@/components/BottomNav'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Routes that should NOT show the app header (auth, onboarding, public pages)
const NO_HEADER_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/pricing',
  '/agree',
  '/onboarding',
  '/join',
  '/pending-invite',
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showHeader = !NO_HEADER_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  if (!showHeader) return <ThemeProvider>{children}</ThemeProvider>

  return (
    <ThemeProvider>
      <AppHeaderProvider>
        <AppHeader />
        <style>{`
          /* Reserve room below page content so the Scout FAB never covers
             the last row — matches Scout's own clearance + diameter. */
          .app-shell-content { padding-bottom: 179px; }
          @media (min-width: 768px) {
            .app-shell-content { padding-bottom: 112px; }
          }
        `}</style>
        <div className="app-shell-content">
          {children}
        </div>
        <BottomNav />
      </AppHeaderProvider>
    </ThemeProvider>
  )
}
