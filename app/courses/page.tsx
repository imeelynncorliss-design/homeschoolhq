'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import CourseManager from '@/components/CourseManager'
import AuthGuard from '@/components/AuthGuard'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'
import { pageShell, colors } from '@/src/lib/designTokens'

function CoursesContent() {
  const router = useRouter()
  useAppHeader({ title: '📚 Courses', backHref: '/reports' })
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<any[]>([])
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [isCoTeacher, setIsCoTeacher] = useState(false)

  const loadKids = async (userId: string) => {
    const { orgId, isCoTeacher } = await getOrganizationId(userId)
    setIsCoTeacher(isCoTeacher)

    const { data } = await supabase
      .from('kids')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      setKids(data)
      setSelectedKid(data[0].id)
    }
  }

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    await loadKids(user.id)
    setLoading(false)
  }

  useEffect(() => { checkUser() }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBackground }}>
      <div style={{ color: colors.purple, fontWeight: 700, fontSize: 16 }}>Loading Courses...</div>
    </div>
  )

  return (
    <div style={css.root}>
      <main style={{ ...css.main, paddingBottom: 100 }}>
        <div className="hr-section-label" style={{ marginBottom: 14, marginTop: 8 }}>MANAGE COURSES & CREDITS</div>

        {kids.length === 0 ? (
          <div className="hr-card" style={{ padding: '48px 24px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤷‍♀️</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, marginBottom: 8 }}>No students found</h2>
            <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
              {isCoTeacher
                ? "No students have been added to this account yet. Check back once the account admin has set things up."
                : "Add a child to your account before creating courses."}
            </p>
            {!isCoTeacher && (
              <button onClick={() => router.push('/dashboard')} style={css.emptyBtn}>
                Go to Dashboard
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Kid selector */}
            <div className="hr-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }}>
                Active Student
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const }}>
                <select
                  value={selectedKid || ''}
                  onChange={(e) => setSelectedKid(e.target.value)}
                  style={css.kidSelect}
                >
                  {kids.map((kid) => (
                    <option key={kid.id} value={kid.id}>{kid.displayname || kid.firstname}</option>
                  ))}
                </select>
                <div style={{ fontSize: 12, color: colors.textSecondary }}>
                  Courses are per-student. Switch students to manage each child's course catalog separately.
                </div>
              </div>
            </div>

            <div className="hr-card" style={{ padding: '16px', minHeight: 500 }}>
              {selectedKid && user && <CourseManager kidId={selectedKid} userId={user.id} />}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function CoursesPage() {
  return (
    <AuthGuard>
      <CoursesContent />
    </AuthGuard>
  )
}

const css: Record<string, React.CSSProperties> = {
  ...pageShell,
  emptyBtn: {
    padding: '10px 24px',
    background: colors.purple,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
  },
  kidSelect: {
    padding: '8px 16px',
    background: colors.white,
    border: `2px solid ${colors.gray200}`,
    borderRadius: 10,
    fontWeight: 800,
    color: colors.textSecondary,
    outline: 'none',
    cursor: 'pointer',
    minWidth: 200,
    fontSize: 13,
  },
}
