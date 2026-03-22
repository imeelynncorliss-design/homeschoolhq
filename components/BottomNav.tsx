'use client'

import { useRouter, usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { id: 'home',      label: 'Dashboard', icon: '🧭', href: '/dashboard' },
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
      background: '#3d3a52',
      borderTop: '1px solid rgba(124,58,237,0.15)',
      display: 'flex', zIndex: 100,
      padding: '8px 0 12px',
      boxShadow: '0 -2px 12px rgba(79,70,229,0.08)',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = activeId === item.id
        return (
          <button
            key={item.id}
            id={item.id === 'profile' ? 'tour-profile-nav' : undefined}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 0', fontFamily: "'Nunito', sans-serif", gap: 3,
              color: isActive ? '#e9d5ff' : 'rgba(255,255,255,0.72)', position: 'relative',
            }}
            onClick={() => router.push(item.href)}
          >
            {isActive && (
              <span style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 20, height: 3, borderRadius: 2, background: '#c4b5fd',
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
