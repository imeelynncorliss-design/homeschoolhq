'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import BulkLessonScheduler from '@/components/BulkLessonScheduler'
import CurriculumImporter from '@/components/CurriculumImporter'
import { getOrganizationId } from '@/src/lib/getOrganizationId'

interface Kid {
  id: string
  displayname: string
}

function ToolsContent() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [kids, setKids] = useState<Kid[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTool, setActiveTool] = useState<'bulk' | 'import' | null>(null)
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

      setUserId(user.id)
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
      <div style={css.inner}>

        {/* Page header */}
        <div style={css.pageHeader}>
          <div style={css.pageTitle}>🔧 Tools</div>
          <div style={css.pageSub}>Curriculum import, bulk scheduling, and more</div>
        </div>

        {/* Tool cards */}
        <div style={css.grid}>

          {/* Curriculum Import */}
          <div style={css.card}>
            <div style={css.cardIcon}>📋</div>
            <div style={css.cardTitle}>Curriculum Import</div>
            <div style={css.cardDesc}>
              Upload a PDF or photo of your curriculum table of contents — Scout will extract lessons and schedule them automatically.
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
          <div style={css.card}>
            <div style={css.cardIcon}>⚡</div>
            <div style={css.cardTitle}>Bulk Schedule</div>
            <div style={css.cardDesc}>
              Assign dates to multiple unscheduled lessons at once. Great for getting a whole semester set up quickly.
            </div>
            <button
              style={css.secondaryBtn}
              onClick={() => setActiveTool(activeTool === 'bulk' ? null : 'bulk')}
            >
              {activeTool === 'bulk' ? '▲ Hide Scheduler' : '⚡ Open Scheduler'}
            </button>
          </div>
        </div>

        {/* Inline Bulk Scheduler */}
        {activeTool === 'bulk' && userId && (
          <div style={css.inlinePanel}>
            <div style={css.inlinePanelHead}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#2d1b69' }}>⚡ Bulk Lesson Scheduler</span>
              <button style={css.closeInline} onClick={() => setActiveTool(null)}>✕</button>
            </div>
            <BulkLessonScheduler userId={userId} />
          </div>
        )}

        {/* Spacer for bottom nav */}
        <div style={{ height: 88 }} />
      </div>

      {/* Curriculum Importer modal */}
      {showImporter && selectedKid && orgId && (
        <CurriculumImporter
          childId={selectedKid.id}
          childName={selectedKid.displayname}
          organizationId={orgId}
          onClose={() => setShowImporter(false)}
          onImported={() => {
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
    background: 'linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%)',
    fontFamily: "'Nunito', sans-serif",
  },
  inner: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '24px 20px 0',
  },
  pageHeader: {
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 900,
    color: '#2d1b69',
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 16,
    marginBottom: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '22px 22px 20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    border: '1px solid rgba(124,58,237,0.08)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  cardIcon: {
    fontSize: 32,
    lineHeight: 1,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 900,
    color: '#2d1b69',
  },
  cardDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 1.55,
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
    background: '#f3f4f6',
    color: '#374151',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
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
