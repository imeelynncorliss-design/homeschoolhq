'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import GradeBook from '@/components/GradeBook'
import TranscriptSettings from '@/components/TranscriptSettings'
import TranscriptGenerator from '@/components/TranscriptGenerator'
import AuthGuard from '@/components/AuthGuard'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { pageShell, colors } from '@/src/lib/designTokens'
import { useAppHeader } from '@/components/layout/AppHeader'

// ─── Page Content ─────────────────────────────────────────────────────────────

function TranscriptsContent() {
  const router = useRouter()
  useAppHeader({ title: '📄 Transcripts', backHref: '/dashboard' })
  const [user, setUser]           = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('gradebook')
  const [kids, setKids]           = useState<any[]>([])
  const [selectedKid, setSelectedKid] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      // ── Auth ────────────────────────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // ── Co-teacher guard — transcripts is admin-only ───────────────────
      const { data: collaboration } = await supabase
        .from('family_collaborators')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (collaboration) { router.push('/dashboard'); return }

      // ── Resolve org ─────────────────────────────────────────────────────
      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }

      // ── Load kids ────────────────────────────────────────────────────────
      const { data: kidsData } = await supabase
        .from('kids')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      setUser(user)
      if (kidsData && kidsData.length > 0) {
        setKids(kidsData)
        setSelectedKid(kidsData[0].id)
      }
      setLoading(false)
    }

    init()
  }, [])

  const tabs = [
    { id: 'gradebook', label: '📊 Grade Book', description: 'Grades' },
    { id: 'settings',  label: '⚙️ Settings',   description: 'Info'   },
    { id: 'generate',  label: '📄 Generate',    description: 'PDF'    },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBackground }}>
      <div style={{ color: colors.purple, fontWeight: 700, fontSize: 16 }}>Loading...</div>
    </div>
  )
  return (
    <div style={css.root}>
      <button onClick={() => router.push('/reports')} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.72)', border: '1.5px solid rgba(124,58,237,0.15)',
        borderRadius: 20, padding: '7px 16px 7px 12px',
        fontSize: 13, fontWeight: 700, color: '#7c3aed',
        cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
        margin: '16px 20px 0',
      }}>
        ‹ Records
      </button>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <main style={{ ...css.main, paddingBottom: 100 }}>
        <div style={css.sectionLabel}>CREATE OFFICIAL TRANSCRIPTS WITH GPA CALCULATIONS</div>

        {/* Courses callout banner */}
        <div style={css.banner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📚</span>
            <p style={{ fontSize: 13, color: colors.purpleDark, margin: 0 }}>
              <strong>Need to add or manage courses?</strong> Courses now have their own dedicated section.
            </p>
          </div>
          <button style={css.bannerBtn} onClick={() => router.push('/courses')}>
            Go to Courses →
          </button>
        </div>

        {/* Empty state */}
        {kids.length === 0 ? (
          <div style={css.emptyCard}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤷‍♀️</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, marginBottom: 8 }}>No students found</h2>
            <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
              Add a child to your account before creating transcripts.
            </p>
            <button style={css.emptyBtn} onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Kid selector */}
            <div style={css.kidSelector}>
              <label style={{ fontSize: 10, fontWeight: 800, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }}>
                Active Student
              </label>
              <select
                value={selectedKid || ''}
                onChange={(e) => setSelectedKid(e.target.value)}
                style={css.kidSelect}
              >
                {kids.map((kid) => (
                  <option key={kid.id} value={kid.id}>{kid.displayname || kid.firstname}</option>
                ))}
              </select>
            </div>

            {/* Tabs */}
            <div style={css.tabRow}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...css.tab,
                    background: activeTab === tab.id ? colors.white : 'transparent',
                    color: activeTab === tab.id ? colors.purple : colors.textMuted,
                    boxShadow: activeTab === tab.id ? '0 2px 8px rgba(124,58,237,0.12)' : 'none',
                    transform: activeTab === tab.id ? 'translateY(-2px)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={css.tabContent}>
              {activeTab === 'gradebook' && selectedKid && user &&
                <GradeBook kidId={selectedKid} userId={user.id} />}
              {activeTab === 'settings' && selectedKid && user &&
                <TranscriptSettings kidId={selectedKid} userId={user.id} />}
              {activeTab === 'generate' && selectedKid && user &&
                <TranscriptGenerator kidId={selectedKid} userId={user.id} kidData={kids.find(k => k.id === selectedKid)} />}
            </div>
          </>
        )}
      </main>

      {/* ── Bottom Nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(124,58,237,0.10)',
        display: 'flex', zIndex: 100,
        padding: '8px 0 12px',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.07)',
      }}>
        {[
          { label: 'Home',      icon: '🏠', href: '/dashboard' },
          { label: 'Subjects',  icon: '📚', href: '/subjects'  },
          { label: 'Records',   icon: '📋', href: '/reports'   },
          { label: 'Resources', icon: '💡', href: '/resources' },
          { label: 'Profile',   icon: '👤', href: '/profile'   },
        ].map(item => (
          <button key={item.label}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 0', fontFamily: "'Nunito', sans-serif", gap: 2,
              color: '#9ca3af',
            }}
            onClick={() => router.push(item.href)}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 500, marginTop: 2 }}>{item.label}</span>
          </button>
        ))}
      </nav>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TranscriptsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <TranscriptsContent />
      </Suspense>
    </AuthGuard>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  ...pageShell,
  banner: {
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: 12,
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  bannerBtn: {
    flexShrink: 0,
    padding: '8px 16px',
    background: '#4f46e5',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
  },
  emptyCard: {
    background: colors.white,
    borderRadius: 16,
    padding: '48px 24px',
    textAlign: 'center' as const,
    boxShadow: '0 4px 16px rgba(124,58,237,0.08)',
  },
  emptyBtn: {
    padding: '10px 24px',
    background: colors.purple,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
  },
  kidSelector: {
    background: colors.white,
    borderRadius: 14,
    padding: '16px 20px',
    marginBottom: 20,
    boxShadow: '0 2px 8px rgba(124,58,237,0.06)',
    border: `1px solid ${colors.purpleBorder}`,
  },
  kidSelect: {
    padding: '8px 16px',
    background: colors.white,
    border: `2px solid ${colors.gray200}`,
    borderRadius: 10,
    fontWeight: 800,
    color: colors.textSecondary,
    outline: 'none',
    cursor: 'pointer',
    minWidth: 200,
    fontSize: 13,
  },
  tabRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    overflowX: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as any,
    paddingBottom: 4,
  },
  tab: {
    padding: '12px 24px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabContent: {
    background: colors.white,
    borderRadius: 14,
    padding: '16px',
    minHeight: 500,
    boxShadow: '0 4px 16px rgba(124,58,237,0.08)',
    border: `1px solid ${colors.purpleBorder}`,
  },
}