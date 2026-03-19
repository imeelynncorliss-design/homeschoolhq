'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import LessonCalendar from '@/components/LessonCalendar'
import LessonViewModal, { type LessonViewModalLesson } from '@/components/LessonViewModal'
import AuthGuard from '@/components/AuthGuard'
import { syncBetaTier } from '@/lib/tierTesting'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

// ─── Calendar Content ─────────────────────────────────────────────────────────

const GRADIENT = 'linear-gradient(135deg, #c4b5fd 0%, #e879f9 18%, #f0abfc 36%, #fbcfe8 54%, #bae6fd 76%, #6ee7b7 100%)'

function CalendarContent() {
  const router = useRouter()
  useAppHeader({ title: '📅 Calendar' })
  const [user, setUser] = useState<any>(null)
  const [kids, setKids] = useState<any[]>([])
  const [lessonsByKid, setLessonsByKid] = useState<{ [kidId: string]: any[] }>({})
  const [manualAttendance, setManualAttendance] = useState<any[]>([])
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<LessonViewModalLesson | null>(null)
  const [selectedKidName, setSelectedKidName] = useState('')

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
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 20, border: 'none',
            background: 'rgba(255,255,255,0.7)', color: '#6b7280',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Nunito', sans-serif",
          }}>
          ← Back
        </button>
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
            onLessonClick={(lesson, child) => {
              setSelectedLesson(lesson as LessonViewModalLesson)
              setSelectedKidName(child.displayname ?? '')
            }}
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

      {selectedLesson && (
        <LessonViewModal
          lesson={selectedLesson}
          kidName={selectedKidName}
          organizationId={organizationId ?? undefined}
          onClose={() => setSelectedLesson(null)}
          onEdit={() => {
            setSelectedLesson(null)
            router.push(`/subjects?kid=${selectedLesson.kid_id}`)
          }}
          onDelete={async () => {
            await supabase.from('lessons').delete().eq('id', selectedLesson.id)
            setLessonsByKid(prev => {
              const updated = { ...prev }
              for (const kid in updated) {
                updated[kid] = updated[kid].filter((l: any) => l.id !== selectedLesson.id)
              }
              return updated
            })
            setSelectedLesson(null)
          }}
          onCycleStatus={async (lessonId, currentStatus) => {
            const next = currentStatus === 'not_started' ? 'in_progress'
                       : currentStatus === 'in_progress'  ? 'completed'
                       : 'not_started'
            await supabase.from('lessons').update({ status: next }).eq('id', lessonId)
            setLessonsByKid(prev => {
              const updated = { ...prev }
              for (const kid in updated) {
                updated[kid] = updated[kid].map((l: any) => l.id === lessonId ? { ...l, status: next } : l)
              }
              return updated
            })
            setSelectedLesson(s => s ? { ...s, status: next as LessonViewModalLesson['status'] } : null)
          }}
          onSetStatus={async (lessonId, newStatus) => {
            await supabase.from('lessons').update({ status: newStatus }).eq('id', lessonId)
            setLessonsByKid(prev => {
              const updated = { ...prev }
              for (const kid in updated) {
                updated[kid] = updated[kid].map((l: any) => l.id === lessonId ? { ...l, status: newStatus } : l)
              }
              return updated
            })
            setSelectedLesson(s => s ? { ...s, status: newStatus as LessonViewModalLesson['status'] } : null)
          }}
          onSave={(lessonId, updates) => {
            setLessonsByKid(prev => {
              const updated = { ...prev }
              for (const kid in updated) {
                updated[kid] = updated[kid].map((l: any) => l.id === lessonId ? { ...l, ...updates } : l)
              }
              return updated
            })
            setSelectedLesson(s => s ? { ...s, ...updates } : null)
          }}
        />
      )}

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
