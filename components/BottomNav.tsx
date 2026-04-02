'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef } from 'react'

const NAV_ITEMS = [
  { id: 'home',      label: 'Dashboard', icon: '🧭', href: '/dashboard'       },
  { id: 'subjects',  label: 'Subjects',  icon: '📚', href: '/subjects'        },
  { id: 'records',   label: 'Records',   icon: '📋', href: '/reports'         },
  { id: 'corner',    label: 'For Parents', icon: '🪴', href: '/parents-corner' },
  { id: 'resources', label: 'Resources', icon: '💡', href: '/resources'       },
  { id: 'tools',     label: 'Tools',     icon: '🔧', href: '/tools'           },
  { id: 'profile',   label: 'Profile',   icon: '👤', href: '/profile'         },
]

const ACTIVE_MAP: Record<string, string[]> = {
  home:      ['/dashboard'],
  subjects:  ['/subjects'],
  records:   ['/reports', '/attendance', '/transcript', '/portfolio', '/compliance', '/progress', '/courses', '/assessments', '/reading-log', '/field-trips'],
  corner:    ['/parents-corner'],
  resources: ['/resources', '/materials', '/supply-scout'],
  tools:     ['/tools', '/bulk-schedule', '/lessons', '/calendar'],
  profile:   ['/profile'],
}

const TOOLTIPS: Record<string, string[]> = {
  home:      ['Today\'s lessons & agenda', 'Supply Scout', 'Quick log shortcuts', 'Week at a glance'],
  subjects:  ['All lessons by subject', 'Schedule & track lessons', 'Subject progress'],
  records:   ['Attendance log', 'Compliance & hours', 'Transcripts & GPA', 'Reading log', 'Field trips', 'Portfolio', 'Progress reports'],
  corner:    ['Teaching Blueprint', 'Learning style tips', 'Multiple Intelligences tips', 'Homeschool guides'],
  resources: ['State homeschool laws', 'Teaching style library', 'My materials list'],
  tools:     ['Curriculum import', 'Bulk scheduling', 'Vacation planner', 'Co-teachers', 'Standards setup', 'Calendar sync'],
  profile:   ['Manage children', 'School year dates', 'Teaching style', 'School name & state'],
}

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeId = (() => {
    for (const [id, paths] of Object.entries(ACTIVE_MAP)) {
      if (paths.some(p => pathname === p || pathname.startsWith(p + '/'))) return id
    }
    return null
  })()

  const handleMouseEnter = (id: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setHoveredId(id), 300)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setHoveredId(null)
  }

  return (
    <>
      <style>{`
        @media (hover: hover) {
          .nav-tooltip { display: block; }
        }
        @media (hover: none) {
          .nav-tooltip { display: none !important; }
        }
        @keyframes tooltip-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <nav id="tour-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        boxShadow: '0 -4px 20px rgba(79,70,229,0.35)',
      }}>
        <div style={{
          textAlign: 'center', fontSize: 9, fontWeight: 600,
          color: 'rgba(255,255,255,0.35)', fontFamily: 'system-ui, sans-serif',
          padding: '5px 0 0', letterSpacing: '0.03em',
        }}>
          © 2026 HomeschoolReady, LLC. All rights reserved.
        </div>
        <div style={{ display: 'flex', padding: '6px 0 12px' }}>
          {NAV_ITEMS.map((item, idx) => {
            const isActive = activeId === item.id
            const isHovered = hoveredId === item.id
            const tips = TOOLTIPS[item.id] ?? []
            const isFirst = idx === 0
            const isLast = idx === NAV_ITEMS.length - 1
            const tooltipAlign = isFirst
              ? { left: 0, transform: 'none' }
              : isLast
              ? { right: 0, left: 'auto', transform: 'none' }
              : { left: '50%', transform: 'translateX(-50%)' }

            return (
              <div
                key={item.id}
                style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center' }}
                onMouseEnter={() => handleMouseEnter(item.id)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Hover tooltip — desktop only via CSS */}
                {isHovered && tips.length > 0 && (
                  <div
                    className="nav-tooltip"
                    style={{
                      position: 'absolute', bottom: 'calc(100% + 10px)',
                      ...tooltipAlign,
                      background: 'rgba(30,20,70,0.97)',
                      border: '1px solid rgba(196,181,253,0.25)',
                      borderRadius: 12, padding: '10px 14px',
                      minWidth: 180, zIndex: 200,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                      animation: 'tooltip-in 0.18s ease forwards',
                      pointerEvents: 'none',
                    }}
                  >
                    {/* Arrow */}
                    <div style={{
                      position: 'absolute', bottom: -6,
                      left: isFirst ? 20 : isLast ? 'auto' : '50%',
                      right: isLast ? 20 : 'auto',
                      transform: isFirst || isLast ? 'none' : 'translateX(-50%)',
                      width: 0, height: 0, borderStyle: 'solid',
                      borderWidth: '6px 6px 0',
                      borderColor: 'rgba(30,20,70,0.97) transparent transparent',
                    }} />
                    <div style={{
                      fontSize: 10, fontWeight: 800, color: '#c4b5fd',
                      fontFamily: 'system-ui, sans-serif', letterSpacing: '0.06em',
                      textTransform: 'uppercase', marginBottom: 7,
                    }}>
                      {item.label}
                    </div>
                    {tips.map(tip => (
                      <div key={tip} style={{
                        fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                        fontFamily: 'system-ui, sans-serif', lineHeight: 1.5,
                        paddingLeft: 8, borderLeft: '2px solid rgba(196,181,253,0.4)',
                        marginBottom: 4,
                      }}>
                        {tip}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  id={item.id === 'profile' ? 'tour-profile-nav' : undefined}
                  style={{
                    width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px 0', fontFamily: "'Nunito', sans-serif", gap: 3,
                    color: isActive ? '#e9d5ff' : isHovered ? '#fff' : 'rgba(255,255,255,0.72)',
                    position: 'relative', transition: 'color 0.15s',
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
              </div>
            )
          })}
        </div>
      </nav>
    </>
  )
}
