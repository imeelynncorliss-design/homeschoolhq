'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import BulkLessonScheduler from '@/components/BulkLessonScheduler'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { colors } from '@/src/lib/designTokens'
import { useAppHeader } from '@/components/layout/AppHeader'

// ─── Page Content ─────────────────────────────────────────────────────────────

function BulkScheduleContent() {
  const router = useRouter()
  useAppHeader({ title: '📆 Bulk Schedule', backHref: '/tools' })
  const [user, setUser]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // ── Auth ──────────────────────────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // ── Resolve org + co-teacher guard (admin-only) ───────────────────────
      const { orgId, isCoTeacher } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }
      if (isCoTeacher) { router.push('/dashboard'); return }

      setUser(user)
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
    <div style={{ minHeight: '100vh', background: colors.pageBackground, paddingBottom: 100 }}>
      <main style={{ padding: '20px', maxWidth: 800, margin: '0 auto' }}>
        <BulkLessonScheduler userId={user.id} />
      </main>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BulkSchedulePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <BulkScheduleContent />
      </Suspense>
    </AuthGuard>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
