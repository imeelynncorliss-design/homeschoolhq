'use client'

import { useRouter, usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { id: 'home',      label: 'Home',      icon: '🏠', href: '/dashboard' },
  { id: 'subjects',  label: 'Subjects',  icon: '📚', href: '/subjects'  },
  { id: 'records',   label: 'Records',   icon: '📋', href: '/reports'   },
  { id: 'resources', label: 'Resources', icon: '💡', href: '/resources' },
  { id: 'tools',     label: 'Tools',     icon: '🔧', href: '/tools'     },
  { id: 'profile',   label: 'Profile',   icon: '👤', href: '/profile'   },
]

const ACTIVE_MAP: Record<string, string[]> = {
  home:      ['/dashboard'],
  subjects:  ['/subjects'],
  records:   ['/reports', '/attendance', '/transcript', '/portfolio', '/compliance', '/progress', '/courses', '/assessments', '/reading-log', '/field-trips'],
  resources: ['/resources', '/materials', '/supply-scout'],
  tools:     ['/tools', '/bulk-schedule', '/lessons', '/calendar'],
  profile:   ['/profile'],
}

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  const activeId = (() => {
    for (const [id, paths] of Object.entries(ACTIVE_MAP)) {
      if (paths.some(p => pathname === p || pathname.startsWith(p + '/'))) return id
    }
    return null
  })()

  return (
    <nav id="tour-bottom-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(255,255,255,0.94)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(124,58,237,0.10)',
      display: 'flex', zIndex: 100,
      padding: '8px 0 12px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.07)',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = activeId === item.id
        return (
          <button
            key={item.id}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 0', fontFamily: "'Nunito', sans-serif", gap: 3,
              color: isActive ? '#7c3aed' : '#9ca3af', position: 'relative',
            }}
            onClick={() => router.push(item.href)}
          >
            {isActive && (
              <span style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 20, height: 3, borderRadius: 2, background: '#7c3aed',
              }} />
            )}
            <span style={{ fontSize: isActive ? 30 : 26, lineHeight: 1, transition: 'font-size 0.15s' }}>
              {item.icon}
            </span>
            <span style={{ fontSize: isActive ? 12 : 11, fontWeight: isActive ? 800 : 600, marginTop: 2, transition: 'all 0.15s' }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
