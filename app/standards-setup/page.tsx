'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import CommonCoreImporter from '@/components/CommonCoreImporter'
import StandardsImporter from '@/components/StandardsImporter'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { colors } from '@/src/lib/designTokens'
import { useAppHeader } from '@/components/layout/AppHeader'

type Section = 'ccss' | 'state'

function StandardsSetupContent() {
  const router = useRouter()
  useAppHeader({ title: '📥 Standards Setup', backHref: '/tools' })

  const [organizationId, setOrganizationId] = useState<string>('')
  const [loading, setLoading]               = useState(true)
  const [openSection, setOpenSection]       = useState<Section>('ccss')
  const [showStateImporter, setShowStateImporter] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }

      setOrganizationId(orgId)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBackground }}>
      <div style={{ color: colors.purple, fontWeight: 700, fontSize: 16 }}>Loading...</div>
    </div>
  )

  const sectionCard = (
    key: Section,
    emoji: string,
    title: string,
    subtitle: string,
    children: React.ReactNode
  ) => {
    const isOpen = openSection === key
    return (
      <div style={{
        background: 'rgba(255,255,255,0.88)', borderRadius: 18,
        border: `1.5px solid ${isOpen ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.13)'}`,
        boxShadow: isOpen ? '0 4px 20px rgba(124,58,237,0.1)' : '0 2px 12px rgba(124,58,237,0.07)',
        marginBottom: 16, overflow: 'hidden', transition: 'all 0.2s',
      }}>
        <button
          onClick={() => setOpenSection(isOpen ? key : key)}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14,
            fontFamily: "'Nunito', sans-serif", textAlign: 'left' as const,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: isOpen ? 'linear-gradient(135deg, #ede9fe, #dbeafe)' : '#f3f4f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            transition: 'background 0.2s',
          }}>{emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b' }}>{title}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginTop: 2 }}>{subtitle}</div>
          </div>
          <span style={{ color: '#c4b5fd', fontSize: 18, fontWeight: 700 }}>{isOpen ? '▾' : '›'}</span>
        </button>

        {isOpen && (
          <div style={{ padding: '0 22px 24px', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ paddingTop: 20 }}>{children}</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.pageBackground, fontFamily: "'Nunito', sans-serif", paddingBottom: 100 }}>
      <main style={{ padding: '20px', maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b', margin: '0 0 6px', fontFamily: "'Nunito', sans-serif" }}>
            📥 Standards Setup
          </h2>
          <p style={{ fontSize: 14, color: '#4b5563', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
            Import standards once — then tag them to lessons to track coverage over time.
          </p>
        </div>

        {/* Option 1: Common Core */}
        {sectionCard(
          'ccss',
          '🇺🇸',
          'Common Core Standards',
          'Math & ELA · Grades K–12 · Used across most US states',
          <CommonCoreImporter
            organizationId={organizationId}
            onImported={() => setTimeout(() => router.push('/standards'), 2500)}
          />
        )}

        {/* Option 2: State-specific */}
        {sectionCard(
          'state',
          '🗺️',
          'Your State\'s Standards',
          'Upload a screenshot of your state education website or paste a URL',
          <div>
            {/* Beta badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                color: '#fff', fontSize: 11, fontWeight: 900,
                padding: '3px 10px', borderRadius: 99,
                letterSpacing: 0.5, textTransform: 'uppercase' as const,
                fontFamily: "'Nunito', sans-serif",
              }}>
                🧪 Beta
              </span>
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, fontFamily: "'Nunito', sans-serif" }}>
                Free during beta · Pro feature at launch
              </span>
            </div>

            <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, lineHeight: 1.6, margin: '0 0 16px' }}>
              Every state publishes their own academic standards. Use Scout to extract them directly
              from a screenshot of your state's education website — no manual entry needed.
            </p>
            <button
              onClick={() => setShowStateImporter(true)}
              style={{
                width: '100%', padding: '14px 20px',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 800, cursor: 'pointer',
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              🗺️ Import State Standards with Scout
            </button>
          </div>
        )}

        {/* Link to coverage */}
        <div style={{ textAlign: 'center' as const, marginTop: 8 }}>
          <button
            onClick={() => router.push('/standards')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700, color: '#7c3aed',
              fontFamily: "'Nunito', sans-serif", textDecoration: 'underline',
            }}
          >
            View Standards Coverage →
          </button>
        </div>

      </main>

      {/* State importer modal */}
      {showStateImporter && (
        <StandardsImporter
          onClose={() => setShowStateImporter(false)}
          onImport={() => setShowStateImporter(false)}
        />
      )}
    </div>
  )
}

export default function StandardsSetupPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <StandardsSetupContent />
      </Suspense>
    </AuthGuard>
  )
}
