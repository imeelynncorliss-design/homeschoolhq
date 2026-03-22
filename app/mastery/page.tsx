'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import MasteryTracker from '@/components/MasteryTracker'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { pageShell, colors } from '@/src/lib/designTokens'
import { useAppHeader } from '@/components/layout/AppHeader'

function MasteryContent() {
  const router = useRouter()
  useAppHeader({ title: '🎯 Mastery Tracker', backHref: '/reports' })

  const [user, setUser]                     = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string>('')
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }

      setUser(user)
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

  return (
    <div style={{ ...pageShell.root, paddingBottom: 100 }}>
      <main style={pageShell.main}>
        <div className="hr-section-label" style={{ marginBottom: 14, marginTop: 8 }}>SUBJECT-BY-SUBJECT LEARNING INSIGHTS</div>
        <div className="hr-card" style={{ padding: '20px' }}>
          <MasteryTracker organizationId={organizationId} />
        </div>
      </main>
    </div>
  )
}

export default function MasteryPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <MasteryContent />
      </Suspense>
    </AuthGuard>
  )
}
