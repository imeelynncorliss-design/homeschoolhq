'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import CurriculumImporter from '@/components/CurriculumImporter'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'

interface Kid {
  id: string
  displayname: string
}

const GRADIENT = 'linear-gradient(135deg, #c4b5fd 0%, #e879f9 18%, #f0abfc 36%, #fbcfe8 54%, #bae6fd 76%, #6ee7b7 100%)'

function ToolsContent() {
  const router = useRouter()
  useAppHeader({ title: '🔧 Tools' })
  const [orgId, setOrgId] = useState<string | null>(null)
  const [kids, setKids] = useState<Kid[]>([])
  const [loading, setLoading] = useState(true)
  const [importKidId, setImportKidId] = useState<string>('')
  const [showImporter, setShowImporter] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { orgId: oid } = await getOrganizationId(user.id)
      if (!oid) { router.push('/onboarding'); return }

      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname')
        .eq('organization_id', oid)
        .order('displayname')

      setOrgId(oid)
      setKids((kidsData ?? []) as Kid[])
      if (kidsData?.length) setImportKidId(kidsData[0].id)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#7c3aed', fontWeight: 700 }}>Loading…</div>
    </div>
  )

  const selectedKid = kids.find(k => k.id === importKidId) ?? null

  return (
    <div style={css.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        .tool-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,58,237,0.18) !important; }
        .tool-card:active { transform: scale(0.98); }
      `}</style>
      <div style={css.inner}>

        {/* Page header */}
        <div style={css.pageHeader}>
          <h1 style={css.pageTitle}>🔧 Tools</h1>
          <p style={css.pageSub}>Setup, scheduling, and account management</p>
        </div>

        {/* Tool cards */}
        <div style={css.grid}>

          {/* Curriculum Import */}
          <div className="tool-card" style={css.card}>
            <div style={css.cardIcon}>📋</div>
            <div style={css.cardTitle}>Curriculum Import</div>
            <div style={css.cardDesc}>
              Got a curriculum with a table of contents? Upload a PDF or photo and Scout will extract the lessons and add them to your schedule automatically.
            </div>
            {kids.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <label style={css.label}>Import for</label>
                <select
                  style={css.select}
                  value={importKidId}
                  onChange={e => setImportKidId(e.target.value)}
                >
                  {kids.map(k => (
                    <option key={k.id} value={k.id}>{k.displayname}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              style={css.primaryBtn}
              onClick={() => setShowImporter(true)}
              disabled={!importKidId}
            >
              📋 Import Curriculum
            </button>
          </div>

          {/* Bulk Schedule */}
          <div className="tool-card" style={css.card}>
            <div style={css.cardIcon}>⚡</div>
            <div style={css.cardTitle}>Bulk Schedule</div>
            <div style={css.cardDesc}>
              Have a pile of unscheduled lessons? Assign dates to many lessons at once — perfect for planning out a full semester in minutes.
            </div>
            <button
              style={css.secondaryBtn}
              onClick={() => router.push('/bulk-schedule')}
            >
              ⚡ Open Scheduler
            </button>
          </div>

          {/* Vacation Planner */}
          <div className="tool-card" style={css.card}>
            <div style={css.cardIcon}>🌴</div>
            <div style={css.cardTitle}>Vacation Planner</div>
            <div style={css.cardDesc}>
              Add holidays, breaks, and family trips to your school calendar. Scout won't schedule lessons on days you mark as off.
            </div>
            <button
              style={css.secondaryBtn}
              onClick={() => router.push('/vacation')}
            >
              🌴 Manage Vacations
            </button>
          </div>

          {/* Co-Teachers */}
          <div className="tool-card" style={css.card}>
            <div style={css.cardIcon}>👩‍🏫</div>
            <div style={css.cardTitle}>Co-Teachers</div>
            <div style={css.cardDesc}>
              Invite a spouse, grandparent, or tutor to view and log lessons alongside you. They get their own login with access to your school.
            </div>
            <button
              style={css.secondaryBtn}
              onClick={() => router.push('/co-teachers')}
            >
              👩‍🏫 Manage Co-Teachers
            </button>
          </div>

          {/* Standards Setup */}
          <div className="tool-card" style={css.card}>
            <div style={css.cardIcon}>📌</div>
            <div style={css.cardTitle}>Standards Setup</div>
            <div style={css.cardDesc}>
              Import Common Core standards for your kids' grade levels. Once imported, you can tag standards to lessons and track coverage automatically.
            </div>
            <button
              style={css.secondaryBtn}
              onClick={() => router.push('/standards-setup')}
            >
              📥 Import Standards
            </button>
          </div>

          {/* Google Calendar Sync */}
          <div className="tool-card" style={css.card}>
            <div style={css.cardIcon}>📅</div>
            <div style={css.cardTitle}>Google Calendar Sync</div>
            <div style={css.cardDesc}>
              Connect your Google Calendar or Outlook to detect conflicts between work meetings and homeschool lessons — automatically, every 15 minutes.
            </div>
            <button
              style={css.secondaryBtn}
              onClick={() => router.push('/calendar/connect')}
            >
              📅 Connect Calendar
            </button>
          </div>
        </div>

        {/* Spacer for bottom nav */}
        <div style={{ height: 88 }} />
      </div>

      {/* Curriculum Importer modal */}
      {showImporter && selectedKid && orgId && (
        <CurriculumImporter
          childId={selectedKid.id}
          childName={selectedKid.displayname}
          onClose={() => setShowImporter(false)}
          onImportComplete={() => {
            setShowImporter(false)
            router.push('/lessons')
          }}
        />
      )}
    </div>
  )
}

export default function ToolsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading…</div>}>
        <ToolsContent />
      </Suspense>
    </AuthGuard>
  )
}

const css: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: GRADIENT,
    fontFamily: "'Nunito', sans-serif",
    paddingBottom: 80,
  },
  inner: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '28px 20px 0',
  },
  pageHeader: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 900,
    color: '#1e1b4b',
    margin: '0 0 6px',
    fontFamily: "'Nunito', sans-serif",
  },
  pageSub: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: 600,
    margin: '0 0 24px',
    lineHeight: 1.6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 16,
    marginBottom: 20,
  },
  card: {
    background: 'rgba(255,255,255,0.82)',
    borderRadius: 18,
    border: '1.5px solid rgba(124,58,237,0.13)',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 2px 12px rgba(124,58,237,0.08)',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    flexShrink: 0,
    background: 'linear-gradient(135deg, #ede9fe, #dbeafe)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#1a1a2e',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: 600,
    lineHeight: 1.4,
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: 800,
    color: '#4b5563',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    display: 'block',
    marginBottom: 5,
  },
  select: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    fontSize: 14,
    color: '#1f2937',
    background: '#fff',
    marginBottom: 8,
  },
  primaryBtn: {
    padding: '11px 18px',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: 4,
  },
  secondaryBtn: {
    padding: '11px 18px',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: 4,
  },
  inlinePanel: {
    background: '#fff',
    borderRadius: 16,
    padding: '20px 22px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    border: '1px solid rgba(124,58,237,0.12)',
    marginBottom: 20,
  },
  inlinePanelHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeInline: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: '#9ca3af',
    cursor: 'pointer',
  },
}
