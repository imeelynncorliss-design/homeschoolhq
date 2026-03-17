'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import LessonCalendar from '@/components/LessonCalendar'
import AuthGuard from '@/components/AuthGuard'
import { syncBetaTier } from '@/lib/tierTesting'
import { getOrganizationId } from '@/src/lib/getOrganizationId'

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'home',      label: 'Home',      icon: '🏠', href: '/dashboard' },
  { id: 'plan',      label: 'Subjects',     icon: '📚', href: '/subjects'  },
  { id: 'records',   label: 'Records',   icon: '📋', href: '/reports'   },
  { id: 'resources', label: 'Resources', icon: '💡', href: '/resources' },
  { id: 'profile',   label: 'Profile',   icon: '👤', href: '/profile'   },
]

function BottomNav({ active }: { active: string }) {
  const router = useRouter()
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(0,0,0,0.08)',
      display: 'flex', height: 64, zIndex: 50,
      fontFamily: "'Nunito', sans-serif",
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = item.id === active
        return (
          <button key={item.id}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
              justifyContent: 'center', gap: 2, background: 'none', border: 'none',
              cursor: 'pointer', color: isActive ? '#7c3aed' : '#9ca3af',
              fontFamily: "'Nunito', sans-serif", position: 'relative',
            }}
            onClick={() => router.push(item.href)}>
            {isActive && <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 3, borderRadius: 2, background: '#7c3aed' }} />}
            <span style={{ fontSize: isActive ? 28 : 22, lineHeight: 1, transition: 'font-size 0.15s' }}>{item.icon}</span>
            <span style={{ fontSize: isActive ? 12 : 10, fontWeight: isActive ? 800 : 500, transition: 'all 0.15s' }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ─── Calendar Content ─────────────────────────────────────────────────────────

const GRADIENT = 'linear-gradient(135deg, #c4b5fd 0%, #e879f9 18%, #f0abfc 36%, #fbcfe8 54%, #bae6fd 76%, #6ee7b7 100%)'

function CalendarContent() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [kids, setKids] = useState<any[]>([])
  const [lessonsByKid, setLessonsByKid] = useState<{ [kidId: string]: any[] }>({})
  const [manualAttendance, setManualAttendance] = useState<any[]>([])
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/'); return }
      if (mounted) setUser(authUser)

      await syncBetaTier(authUser.id)
      await supabase
        .from('user_profiles')
        .update({ calendar_visited_at: new Date().toISOString() })
        .eq('user_id', authUser.id)
        .is('calendar_visited_at', null)

      const { orgId } = await getOrganizationId(authUser.id)
      if (!orgId || !mounted) { setLoading(false); return }

      const { data: kidsData } = await supabase
        .from('kids')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (kidsData && kidsData.length > 0) {
        const [lessonsResult, attendResult] = await Promise.all([
          supabase.from('lessons').select('*').eq('organization_id', orgId).order('lesson_date', { ascending: false }),
          supabase.from('daily_attendance').select('*').eq('organization_id', orgId).order('attendance_date', { ascending: false }),
        ])

        if (lessonsResult.data && mounted) {
          const grouped: { [kidId: string]: any[] } = {}
          lessonsResult.data.forEach((lesson: any) => {
            if (!grouped[lesson.kid_id]) grouped[lesson.kid_id] = []
            grouped[lesson.kid_id].push(lesson)
          })
          setLessonsByKid(grouped)
        }
        if (attendResult.data && mounted) setManualAttendance(attendResult.data)
      }

      if (mounted) {
        setOrganizationId(orgId)
        setKids(kidsData || [])
        setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e9d5ff', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", minHeight: '100vh', background: GRADIENT, paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* Top bar */}
      <div className="no-print" style={{ maxWidth: 960, margin: '0 auto', padding: '16px 20px 0', display: 'flex', alignItems: 'center' }}>
        {/* Lessons / Calendar tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => router.push('/lessons')}
            style={{
              padding: '7px 14px', borderRadius: 20, border: 'none',
              background: 'rgba(255,255,255,0.55)', color: '#6b7280',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Nunito', sans-serif",
            }}>
            📚 Lessons
          </button>
          <button
            style={{
              padding: '7px 14px', borderRadius: 20, border: 'none',
              background: 'rgba(255,255,255,0.95)', color: '#7c3aed',
              fontSize: 13, fontWeight: 800, cursor: 'default',
              fontFamily: "'Nunito', sans-serif",
              boxShadow: '0 1px 6px rgba(124,58,237,0.15)',
            }}>
            📅 Calendar
          </button>
        </div>
      </div>

      {/* Page title */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 20px 0' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1e1b4b', margin: '0 0 20px', fontFamily: "'Nunito', sans-serif" }}>
          Calendar
        </h1>

        {/* Calendar */}
        {organizationId && user ? (
          <LessonCalendar
            kids={kids}
            lessonsByKid={lessonsByKid}
            socialEvents={[]}
            coopEnrollments={[]}
            manualAttendance={manualAttendance}
            filters={{ showLessons: true, showManualAttendance: false }}
            onLessonClick={() => {}}
            userId={user.id}
            organizationId={organizationId}
          />
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.82)', borderRadius: 18,
            border: '1.5px solid rgba(124,58,237,0.13)', padding: '40px 24px',
            textAlign: 'center', color: '#6b7280', fontSize: 15, fontWeight: 600,
          }}>
            Add children to your account to see lessons on the calendar.
          </div>
        )}
      </div>

      <BottomNav active="plan" />
    </div>
  )
}

export default function CalendarPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: GRADIENT }} />}>
        <CalendarContent />
      </Suspense>
    </AuthGuard>
  )
}
