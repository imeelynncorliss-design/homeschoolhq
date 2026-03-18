'use client'

import { usePathname } from 'next/navigation'
import AppHeader, { AppHeaderProvider } from '@/components/layout/AppHeader'
import BottomNav from '@/components/BottomNav'

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
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showHeader = !NO_HEADER_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  if (!showHeader) return <>{children}</>

  return (
    <AppHeaderProvider>
      <AppHeader />
      {children}
      <BottomNav />
    </AppHeaderProvider>
  )
}
