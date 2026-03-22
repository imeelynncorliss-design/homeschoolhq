'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import FieldTripLog from '@/components/FieldTripLog'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'
import { pageShell, colors } from '@/src/lib/designTokens'

function FieldTripsContent() {
  const router = useRouter()
  useAppHeader({ title: '🚌 Field Trips', backHref: '/reports' })

  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [kids, setKids]                     = useState<any[]>([])
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }

      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

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
    <div style={{ ...pageShell.root, paddingBottom: 100 }}>
      <main style={pageShell.main}>
        <div className="hr-section-label" style={{ marginBottom: 14, marginTop: 8 }}>LOG FIELD TRIPS, CO-OP CLASSES & ACTIVITIES</div>
        {kids.length === 0 ? (
          <div className="hr-card" style={{ padding: '48px 24px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤷‍♀️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: colors.textPrimary, marginBottom: 8 }}>No students found</div>
            <div style={{ fontSize: 13, color: colors.textSecondary }}>Add a child to your account first.</div>
          </div>
        ) : (
          <div className="hr-card" style={{ padding: '20px' }}>
            <FieldTripLog organizationId={organizationId!} kids={kids} />
          </div>
        )}
      </main>
    </div>
  )
}

export default function FieldTripsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <FieldTripsContent />
      </Suspense>
    </AuthGuard>
  )
}
