'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import ReadingLog from '@/components/ReadingLog'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'
import { colors } from '@/src/lib/designTokens'

function ReadingLogContent() {
  const router = useRouter()
  useAppHeader({ title: '📚 Reading Log', backHref: '/reports' })

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
    <div style={{ minHeight: '100vh', background: colors.pageBackground, fontFamily: "'Nunito', sans-serif", paddingBottom: 100 }}>
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
      <main style={{ padding: '20px', maxWidth: 800, margin: '0 auto' }}>
        {kids.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', background: '#fff', borderRadius: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤷‍♀️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>No students found</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Add a child to your account first.</div>
          </div>
        ) : (
          <ReadingLog organizationId={organizationId!} kids={kids} />
        )}
      </main>
    </div>
  )
}

export default function ReadingLogPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <ReadingLogContent />
      </Suspense>
    </AuthGuard>
  )
}
