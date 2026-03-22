'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import AttendanceTracker from '@/components/AttendanceTracker'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'
import { pageShell, colors } from '@/src/lib/designTokens'

// ─── Page Content ─────────────────────────────────────────────────────────────

function AttendanceContent() {
  const router = useRouter()
  const [user, setUser]                     = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [kids, setKids]                     = useState<any[]>([])
  const [loading, setLoading]               = useState(true)

  // Wire AppHeader — sets the back arrow + page title in the global nav
  useAppHeader({ title: '📋 Attendance', backHref: '/reports' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { orgId } = await getOrganizationId(user.id)

      // Co-teacher guard — attendance is admin-only
      // Only applies if the user is NOT an org owner
      if (!orgId) {
        const { data: collaboration } = await supabase
          .from('family_collaborators')
          .select('organization_id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (collaboration) { router.push('/dashboard'); return }
        router.push('/onboarding'); return
      }

      const { data: kidsData } = await supabase
        .from('kids')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      setUser(user)
      setOrganizationId(orgId)
      setKids(kidsData || [])
      setLoading(false)
    }

    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBackground }}>
      <div style={{ color: colors.purple, fontWeight: 700, fontSize: 16 }}>Loading...</div>
    </div>
  )

  return (
    <div style={css.root}>
      <main style={{ ...css.main, paddingBottom: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 8 }}>
          <div className="hr-section-label">TRACK YOUR SCHOOL DAYS & HOURS</div>
        </div>

        <div className="hr-card" style={{ padding: '24px', minHeight: 500 }}>
          {organizationId && (
            <AttendanceTracker
              kids={kids}
              organizationId={organizationId}
              userId={user.id}
            />
          )}
        </div>
      </main>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <AttendanceContent />
      </Suspense>
    </AuthGuard>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  ...pageShell,

  calBtn: {
    flexShrink: 0,
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: 0,
  },
}