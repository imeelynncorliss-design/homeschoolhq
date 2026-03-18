'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'

const GRADIENT = 'linear-gradient(135deg, #c4b5fd 0%, #e879f9 18%, #f0abfc 36%, #fbcfe8 54%, #bae6fd 76%, #6ee7b7 100%)'

function ReportsContent() {
  const router = useRouter()

  const hubCards = [
    {
      icon: '📅',
      label: 'Attendance',
      desc: 'Daily check-ins & school day tracking',
      href: '/attendance',
      comingSoon: false,
    },
    {
      icon: '📋',
      label: 'Compliance',
      desc: 'State requirements & hours tracking',
      href: '/compliance',
      comingSoon: false,
    },
    {
      icon: '🎓',
      label: 'Transcript',
      desc: 'Academic records & course history',
      href: '/transcript',
      comingSoon: false,
    },
    {
      icon: '📊',
      label: 'Progress Reports',
      desc: 'Learning analytics & summaries',
      href: '/progress',
      comingSoon: false,
    },
    {
      icon: '🗂️',
      label: 'Portfolio',
      desc: 'Work samples & uploaded documents',
      href: '/portfolio',
      comingSoon: false,
    },
    {
      icon: '🎯',
      label: 'Mastery Tracker',
      desc: 'Subject-by-subject learning insights from your check-ins',
      href: '/mastery',
      comingSoon: false,
    },
    {
      icon: '📌',
      label: 'Standards',
      desc: 'Track which standards your lessons cover and where the gaps are',
      href: '/standards',
      comingSoon: false,
    },
  ]

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", minHeight: '100vh', background: GRADIENT, paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        .hub-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,58,237,0.18) !important; }
        .hub-card:active { transform: scale(0.98); }
      `}</style>


      {/* Page title */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px 0' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1e1b4b', margin: '0 0 6px', fontFamily: "'Nunito', sans-serif" }}>
          Records
        </h1>
        <p style={{ fontSize: 14, color: '#4b5563', fontWeight: 600, margin: '0 0 24px', lineHeight: 1.6 }}>
          Track attendance, compliance, transcripts, and progress.
        </p>

        {/* Hub cards */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
          {hubCards.map(card => (
            <div
              key={card.label}
              className={card.comingSoon ? '' : 'hub-card'}
              onClick={card.href ? () => router.push(card.href!) : undefined}
              style={{
                background: 'rgba(255,255,255,0.82)',
                borderRadius: 18,
                border: '1.5px solid rgba(124,58,237,0.13)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 12px rgba(124,58,237,0.08)',
                padding: '18px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
                cursor: card.comingSoon ? 'default' : 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                opacity: card.comingSoon ? 0.75 : 1,
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                background: 'linear-gradient(135deg, #ede9fe, #dbeafe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26,
              }}>
                {card.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 3 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, lineHeight: 1.4 }}>
                  {card.desc}
                </div>
              </div>
              {card.comingSoon ? (
                <span style={{
                  background: 'rgba(124,58,237,0.1)', color: '#7c3aed',
                  fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                  letterSpacing: 0.5, whiteSpace: 'nowrap' as const, flexShrink: 0,
                }}>
                  Coming soon
                </span>
              ) : (
                <span style={{ color: '#c4b5fd', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>›</span>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default function ReportsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: GRADIENT }} />}>
        <ReportsContent />
      </Suspense>
    </AuthGuard>
  )
}
