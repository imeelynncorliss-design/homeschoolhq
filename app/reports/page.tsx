'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'

const GRADIENT = '#3d3a52'

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
    {
      icon: '📚',
      label: 'Reading Log',
      desc: 'Track books read throughout the school year',
      href: '/reading-log',
      comingSoon: false,
    },
    {
      icon: '🚌',
      label: 'Field Trips & Activities',
      desc: 'Log field trips, co-op classes, museum visits, and extracurriculars',
      href: '/field-trips',
      comingSoon: false,
    },
  ]

  return (
    <div className="hr-page" style={{ fontFamily: "'Nunito', sans-serif", paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        .hub-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,58,237,0.18) !important; }
        .hub-card:active { transform: scale(0.98); }
      `}</style>


      {/* Page title */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px 0' }}>
        <h1 className="hr-h1" style={{ fontSize: 26, margin: '0 0 6px', fontFamily: "'Nunito', sans-serif" }}>
          Records
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 600, margin: '0 0 24px', lineHeight: 1.6 }}>
          Track attendance, compliance, transcripts, and progress.
        </p>

        {/* Hub cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {hubCards.map(card => (
            <button
              key={card.label}
              className={`hr-card${card.comingSoon ? '' : ' hub-card'}`}
              onClick={card.href ? () => router.push(card.href!) : undefined}
              disabled={card.comingSoon}
              aria-label={card.comingSoon ? `${card.label} — coming soon` : card.label}
              style={{
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: card.comingSoon ? 'default' : 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                opacity: card.comingSoon ? 0.75 : 1,
                textAlign: 'left', fontFamily: "'Nunito', sans-serif", width: '100%',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #ede9fe, #dbeafe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>
                {card.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.3 }}>
                  {card.label}
                </div>
                {card.comingSoon && (
                  <span style={{
                    background: 'rgba(124,58,237,0.1)', color: '#7c3aed',
                    fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20,
                    letterSpacing: 0.5, display: 'inline-block', marginTop: 4,
                  }}>
                    Soon
                  </span>
                )}
              </div>
              {!card.comingSoon && (
                <span style={{ color: '#c4b5fd', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>›</span>
              )}
            </button>
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
