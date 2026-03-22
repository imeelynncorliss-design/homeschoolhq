'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import GradeBook from '@/components/GradeBook'
import TranscriptSettings from '@/components/TranscriptSettings'
import TranscriptGenerator from '@/components/TranscriptGenerator'
import CourseDescriptions from '@/components/CourseDescriptions'
import AuthGuard from '@/components/AuthGuard'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { pageShell, colors } from '@/src/lib/designTokens'
import { useAppHeader } from '@/components/layout/AppHeader'

// ─── Page Content ─────────────────────────────────────────────────────────────

function TranscriptsContent() {
  const router = useRouter()
  useAppHeader({ title: '📄 Transcripts', backHref: '/reports' })
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

      // ── Resolve org + co-teacher guard (admin-only) ─────────────────────
      const { orgId, isCoTeacher } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }
      if (isCoTeacher) { router.push('/dashboard'); return }

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
    { id: 'gradebook',     label: '📊 Grade Book',       description: 'Grades'       },
    { id: 'descriptions',  label: '📝 Course Descriptions', description: 'Descriptions' },
    { id: 'settings',      label: '⚙️ Settings',          description: 'Info'         },
    { id: 'generate',      label: '📄 Generate',           description: 'PDF'          },
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
        <div className="hr-section-label" style={{ marginBottom: 14, marginTop: 8 }}>CREATE OFFICIAL TRANSCRIPTS WITH GPA CALCULATIONS</div>

        {/* Courses callout banner */}
        <div style={css.banner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📚</span>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
              <strong>Need to add or manage courses?</strong> Courses now have their own dedicated section.
            </p>
          </div>
          <button style={css.bannerBtn} onClick={() => router.push('/courses')}>
            Go to Courses →
          </button>
        </div>

        {/* Empty state */}
        {kids.length === 0 ? (
          <div className="hr-card" style={{ padding: '48px 24px', textAlign: 'center' as const }}>
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
            <div className="hr-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }}>
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
            <div className="hr-pill-row" style={{ marginBottom: 16 }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`hr-pill${activeTab === tab.id ? ' active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="hr-card" style={{ padding: '16px', minHeight: 500 }}>
              {activeTab === 'gradebook' && selectedKid && user &&
                <GradeBook kidId={selectedKid} userId={user.id} />}
              {activeTab === 'descriptions' && selectedKid &&
                <CourseDescriptions kidId={selectedKid} />}
              {activeTab === 'settings' && selectedKid && user &&
                <TranscriptSettings kidId={selectedKid} userId={user.id} />}
              {activeTab === 'generate' && selectedKid && user &&
                <TranscriptGenerator kidId={selectedKid} userId={user.id} kidData={kids.find(k => k.id === selectedKid)} />}
            </div>
          </>
        )}
      </main>


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
    background: 'var(--hr-bg-surface)',
    border: '1px solid var(--hr-border)',
    borderRadius: 12,
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: 12,
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
  kidSelect: {
    padding: '8px 16px',
    background: colors.white,
    border: `2px solid ${colors.gray200}`,
    borderRadius: 10,
    fontWeight: 800,
    color: colors.textSecondary,
    outline: 'none',
    cursor: 'pointer',
    width: '100%',
    maxWidth: 320,
    fontSize: 13,
  },
}