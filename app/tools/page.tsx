'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import CurriculumImporter from '@/components/CurriculumImporter'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'
import { pageShell } from '@/src/lib/designTokens'

interface Kid {
  id: string
  displayname: string
}

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3d3a52' }}>
      <div style={{ color: '#7c3aed', fontWeight: 700 }}>Loading…</div>
    </div>
  )

  const selectedKid = kids.find(k => k.id === importKidId) ?? null

  const btnStyle: React.CSSProperties = {
    padding: '11px 18px',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 800, cursor: 'pointer', marginTop: 4,
    fontFamily: "'Nunito', sans-serif",
  }

  return (
    <div style={{ ...pageShell.root, paddingBottom: 80 }}>
      <style>{`
        .tool-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,58,237,0.18) !important; }
        .tool-card:active { transform: scale(0.98); }
      `}</style>
      <main style={pageShell.main}>

        <div className="hr-section-label" style={{ marginBottom: 14, marginTop: 8 }}>SETUP, SCHEDULING &amp; ACCOUNT MANAGEMENT</div>

        {/* Tool cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>

          {/* Curriculum Import */}
          <div className="hr-card tool-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 4 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 3 }}>Curriculum Import</div>
            <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
              Got a curriculum with a table of contents? Upload a PDF or photo and Scout will extract the lessons and add them to your schedule automatically.
            </div>
            {kids.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#4b5563', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Import for</label>
                <select
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, color: '#1f2937', background: '#fff', marginBottom: 8 }}
                  value={importKidId}
                  onChange={e => setImportKidId(e.target.value)}
                >
                  {kids.map(k => (
                    <option key={k.id} value={k.id}>{k.displayname}</option>
                  ))}
                </select>
              </div>
            )}
            <button style={btnStyle} onClick={() => setShowImporter(true)} disabled={!importKidId}>
              📋 Import Curriculum
            </button>
          </div>

          {/* Bulk Schedule */}
          <div className="hr-card tool-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 4 }}>⚡</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 3 }}>Bulk Schedule</div>
            <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
              Have a pile of unscheduled lessons? Assign dates to many lessons at once — perfect for planning out a full semester in minutes.
            </div>
            <button style={btnStyle} onClick={() => router.push('/bulk-schedule')}>⚡ Open Scheduler</button>
          </div>

          {/* Vacation Planner */}
          <div className="hr-card tool-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 4 }}>🌴</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 3 }}>Vacation Planner</div>
            <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
              Add holidays, breaks, and family trips to your school calendar. Scout won't schedule lessons on days you mark as off.
            </div>
            <button style={btnStyle} onClick={() => router.push('/vacation')}>🌴 Manage Vacations</button>
          </div>

          {/* Co-Teachers */}
          <div className="hr-card tool-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 4 }}>👩‍🏫</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 3 }}>Co-Teachers</div>
            <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
              Invite a spouse, grandparent, or tutor to view and log lessons alongside you. They get their own login with access to your school.
            </div>
            <button style={btnStyle} onClick={() => router.push('/co-teachers')}>👩‍🏫 Manage Co-Teachers</button>
          </div>

          {/* Standards Setup */}
          <div className="hr-card tool-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 4 }}>📌</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 3 }}>Standards Setup</div>
            <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
              Import Common Core standards for your kids' grade levels. Once imported, you can tag standards to lessons and track coverage automatically.
            </div>
            <button style={btnStyle} onClick={() => router.push('/standards-setup')}>📥 Import Standards</button>
          </div>

          {/* Google Calendar Sync */}
          <div className="hr-card tool-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 4 }}>📅</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 3 }}>Google Calendar Sync</div>
            <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
              Connect your Google Calendar or Outlook to detect conflicts between work meetings and homeschool lessons — automatically, every 15 minutes.
            </div>
            <button style={btnStyle} onClick={() => router.push('/calendar/connect')}>📅 Connect Calendar</button>
          </div>
        </div>
      </main>

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

