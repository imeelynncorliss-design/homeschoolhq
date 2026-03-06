'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import DevTierToggle from '@/components/DevTierToggle'
import HelpWidget from '../../components/HelpWidget'
import StatsBar from '@/src/components/dashboard/StatsBar'
import { type UserTier, getTierForTesting, getChildLimit } from '@/lib/tierTesting'

// ─── Nav Card Data ────────────────────────────────────────────────────────────

const NAV_CARDS = [
  {
    id: 'school',
    icon: '🏫',
    title: 'My School',
    gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    shadow: 'rgba(124,58,237,0.22)',
    border: '#ede9fe',
    dotColor: '#7c3aed',
    items: [
      { label: 'Calendar', icon: '📅', href: '/calendar' },
      { label: 'Lessons', icon: '📚', href: '/lessons' },
      { label: 'Attendance', icon: '✅', href: '/admin?tab=attendance' },
      { label: 'Teaching Schedule', icon: '👩‍🏫', href: '/teaching-schedule' },
    ],
  },
  {
    id: 'kids',
    icon: '👧',
    title: 'My Kids',
    gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
    shadow: 'rgba(14,165,233,0.22)',
    border: '#e0f2fe',
    dotColor: '#0ea5e9',
    items: [
      { label: 'Progress Tracking', icon: '📈', href: '/admin?tab=progress' },
      { label: 'Assessments & Standards', icon: '📊', href: '/admin/assessments' },
      { label: 'Courses', icon: '🎓', href: '/courses' },
      { label: 'Transcripts', icon: '📄', href: '/transcript' },
    ],
  },
  {
    id: 'planning',
    icon: '📋',
    title: 'Planning',
    gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
    shadow: 'rgba(236,72,153,0.22)',
    border: '#fce7f3',
    dotColor: '#ec4899',
    items: [
      { label: 'Control Center (All Tools)', icon: '⚙️', href: '/admin' },
      { label: 'Planning Mode', icon: '🎨', href: '/planning' },
      { label: 'School Year & Compliance', icon: '⚖️', href: '/admin?tab=school-year' },
      { label: 'Vacation Planner', icon: '🌴', href: '/admin?tab=vacation' },
      { label: 'Bulk Scheduler', icon: '⚡', href: '/admin?tab=bulk-schedule' },
    ],
  },
  {
    id: 'collaborate',
    icon: '🤝',
    title: 'Collaborate',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
    shadow: 'rgba(16,185,129,0.22)',
    border: '#d1fae5',
    dotColor: '#10b981',
    items: [
      { label: 'Social Hub', icon: '💬', href: '/social' },
      { label: 'Work Calendar', icon: '🗓️', href: '/calendar/connect' },
      { label: 'Manage Co-Teachers', icon: '👩‍🏫', href: '/co-teachers' },
    ],
  },
  {
    id: 'resources',
    icon: '📦',
    title: 'Resources',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    shadow: 'rgba(245,158,11,0.22)',
    border: '#fef3c7',
    dotColor: '#f59e0b',
    items: [
      { label: 'Materials', icon: '🗂️', href: '/materials' },
      { label: 'Curriculum Import', icon: '⬆️', href: '/lessons' },
    ],
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface KidScheduleStatus {
  id: string
  name: string
  unscheduled: number
  total: number
}

// ─── Onboarding Steps ─────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  // FIX: Added href so the "Go →" button renders for new admins with no kids yet
  { id: 1, icon: '👧', title: 'Add Your Child', desc: 'Create a profile so everything is personalized.', completedLabel: 'Profile created!', href: '/calendar' },
  { id: 2, icon: '📚', title: 'Add Your First Lesson', desc: 'Create a lesson or import from your curriculum.', completedLabel: 'First lesson added!', href: '/lessons' },
  { id: 3, icon: '⚡', title: 'Schedule Your Lessons', desc: 'Use the Bulk Scheduler to assign dates to lessons.', completedLabel: 'All lessons scheduled!', href: '/admin?tab=bulk-schedule' },
  { id: 4, icon: '📅', title: 'View Your Teaching Day', desc: "See what you're teaching at a glance.", completedLabel: "You're ready to teach!", href: '/calendar' },
]

// ─── Onboarding Checklist ─────────────────────────────────────────────────────

function OnboardingChecklist({
  hasKids,
  hasLessons,
  kidScheduleStatuses,
  calendarVisited,
}: {
  hasKids: boolean
  hasLessons: boolean
  kidScheduleStatuses: KidScheduleStatus[]
  calendarVisited: boolean
}) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const allScheduled =
    kidScheduleStatuses.length > 0 &&
    kidScheduleStatuses.every(k => k.unscheduled === 0)

  const completed = {
    1: hasKids,
    2: hasLessons,
    3: allScheduled,
    4: calendarVisited,
  }

  const completedCount = Object.values(completed).filter(Boolean).length
  const progressPct = Math.round((completedCount / 4) * 100)
  const allDone = completedCount === 4

  if (dismissed) return null

  return (
    <div style={css.checklistCard}>
      <div style={css.checklistHeader}>
        <div style={css.checklistHeaderLeft}>
          <span style={{ fontSize: 22 }}>🚀</span>
          <div>
            <div style={css.checklistTitle}>Get Started with HomeschoolReady</div>
            <div style={css.checklistSub}>
              {allDone ? "You're fully set up!" : `${completedCount} of 4 steps complete`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {allDone && (
            <button style={css.checklistBtn} onClick={() => setDismissed(true)}>✕</button>
          )}
          <button style={css.checklistBtn} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      <div style={css.progressTrack}>
        <div style={{
          ...css.progressFill,
          width: `${progressPct}%`,
          background: allDone
            ? 'linear-gradient(90deg, #10b981, #34d399)'
            : 'linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)'
        }} />
      </div>

      {!collapsed && (
        <div style={css.checklistSteps}>
          {ONBOARDING_STEPS.map((step) => {
            const isDone = completed[step.id as keyof typeof completed]
            const isAccessible = isDone || completed[(step.id - 1) as keyof typeof completed] || step.id === 1
            const isCurrent = !isDone && isAccessible
            const isStep3 = step.id === 3

            return (
              <div key={step.id} style={{ ...css.checklistStep, opacity: isAccessible ? 1 : 0.45 }}>
                <div style={{
                  ...css.stepBadge,
                  background: isDone ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : isCurrent ? '#fff' : '#f3f4f6',
                  color: isDone ? '#fff' : isCurrent ? '#7c3aed' : '#9ca3af',
                  border: isDone ? 'none' : isCurrent ? '2px solid #7c3aed' : '2px solid #e5e7eb',
                }}>
                  {isDone ? '✓' : step.id}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{step.icon}</span>
                    <span style={{
                      fontWeight: 700, fontSize: 13.5,
                      color: isDone ? '#6b7280' : '#111827',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>
                      {step.title}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    {isDone ? step.completedLabel : step.desc}
                  </div>

                  {isStep3 && isCurrent && kidScheduleStatuses.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {kidScheduleStatuses.map(kid => {
                        const done = kid.unscheduled === 0
                        return (
                          <div key={kid.id} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 12,
                            color: done ? '#065f46' : '#92400e',
                            background: done ? '#f0fdf4' : '#fffbeb',
                            border: `1px solid ${done ? '#bbf7d0' : '#fde68a'}`,
                            borderRadius: 6, padding: '4px 10px',
                          }}>
                            <span>{done ? '✓' : '⚠️'}</span>
                            <span style={{ fontWeight: 700 }}>{kid.name}</span>
                            <span style={{ color: '#6b7280' }}>
                              {done
                                ? 'all scheduled'
                                : `${kid.unscheduled} lesson${kid.unscheduled !== 1 ? 's' : ''} still need dates`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {!isDone && step.href && isAccessible && (
                    <button style={css.stepCta} onClick={() => router.push(step.href!)}>
                      Go →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Nav Card ────────────────────────────────────────────────────────────────

function NavCard({ card }: { card: typeof NAV_CARDS[0] }) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <div
      style={{
        ...css.card,
        borderColor: card.border,
        boxShadow: hovered
          ? `0 16px 40px ${card.shadow}, 0 2px 8px rgba(0,0,0,0.06)`
          : `0 2px 12px ${card.shadow}80`,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...css.cardHead, background: card.gradient }}>
        <span style={{ fontSize: 20 }}>{card.icon}</span>
        <span style={css.cardTitle}>{card.title}</span>
      </div>
      <ul style={css.itemList}>
        {card.items.map((item, i) => (
          <li
            key={i}
            style={{
              ...css.item,
              background: hoveredItem === `${card.id}-${i}` ? card.border : 'transparent',
            }}
            onMouseEnter={() => setHoveredItem(`${card.id}-${i}`)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => router.push(item.href)}
          >
            <span style={{ fontSize: 15, width: 22, textAlign: 'center' as const }}>{item.icon}</span>
            <span style={css.itemLabel}>{item.label}</span>
            <span style={{ fontSize: 12, color: card.dotColor, opacity: hoveredItem === `${card.id}-${i}` ? 1 : 0, transition: 'opacity 0.15s' }}>→</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Dashboard Content ────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<any[]>([])
  const [hasLessons, setHasLessons] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [userTier, setUserTier] = useState<UserTier>('FREE')
  const [parentName, setParentName] = useState('')
  const [kidScheduleStatuses, setKidScheduleStatuses] = useState<KidScheduleStatus[]>([])
  const [calendarVisited, setCalendarVisited] = useState(false)
  const [isCollaborator, setIsCollaborator] = useState(false)

  const visibleNavCards = NAV_CARDS.map(card => {
    if (card.id === 'collaborate' && isCollaborator) {
      return {
        ...card,
        items: card.items.filter(item => item.label !== 'Manage Co-Teachers')
      }
    }
    return card
  })

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      // Check if user is a co-teacher/collaborator first
      const { data: collaboration } = await supabase
        .from('family_collaborators')
        .select('organization_id, role, name')
        .eq('user_id', user.id)
        .maybeSingle()

      let orgId: string

      if (collaboration) {
        // Co-teacher — use the family's org
        setIsCollaborator(true)
        orgId = collaboration.organization_id
        setOrganizationId(orgId)
        setParentName(collaboration.name || user.email?.split('@')[0] || '')

        // Load the family's kids using organization_id
        const { data: kidsData } = await supabase
          .from('kids')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })

        setKids(kidsData || [])
      } else {
        // FIX: Admin — resolve org from user_organizations first, NOT from kids table.
        // The old pattern queried kids by user_id and fell back to user.id as orgId,
        // which broke the Add Child flow for new admins who have no kids yet.
        const { data: orgMembership } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        orgId = orgMembership?.organization_id || user.id
        setOrganizationId(orgId)

        // FIX: Query kids by organization_id, not user_id
        const { data: kidsData } = await supabase
          .from('kids')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })

        if (kidsData?.length) {
          setKids(kidsData)

          // FIX: Use organization_id for lessons count, not user_id
          const { count: totalCount } = await supabase
            .from('lessons')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
          setHasLessons((totalCount ?? 0) > 0)

          const statuses: KidScheduleStatus[] = await Promise.all(
            kidsData.map(async (kid: any) => {
              const { count: total } = await supabase
                .from('lessons')
                .select('id', { count: 'exact', head: true })
                .eq('kid_id', kid.id)

              const { count: unscheduled } = await supabase
                .from('lessons')
                .select('id', { count: 'exact', head: true })
                .eq('kid_id', kid.id)
                .is('lesson_date', null)

              return {
                id: kid.id,
                name: kid.displayname,
                total: total ?? 0,
                unscheduled: unscheduled ?? 0,
              }
            })
          )
          setKidScheduleStatuses(statuses.filter(s => s.total > 0))
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, calendar_visited_at')
          .eq('user_id', user.id)
          .maybeSingle()
        if (profile?.first_name) setParentName(profile.first_name)
        if (profile?.calendar_visited_at) setCalendarVisited(true)
      }

      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff' }}>
      <div style={{ color: '#7c3aed', fontWeight: 700, fontSize: 16 }}>Loading...</div>
    </div>
  )

  return (
    <div style={css.root}>
      <header style={css.topBar}>
        <div style={css.topBarLeft}>
          <div style={css.logo}>
            <span style={css.logoMain}>Homeschool</span>
            <span style={css.logoAccent}>Ready</span>
          </div>
          <div style={css.welcomeMsg}>
            Welcome, <strong>{parentName || user?.email?.split('@')[0]}</strong> 👋
          </div>
        </div>
        <div style={css.topBarRight}>
          <button style={css.howToBtn} onClick={() => router.push('/calendar')}>💡 How To</button>
          <button style={css.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {!isCollaborator && <StatsBar organizationId={organizationId} />}

      <main style={css.main}>
        {/* Only show onboarding for admins */}
        {!isCollaborator && (
          <OnboardingChecklist
            hasKids={kids.length > 0}
            hasLessons={hasLessons}
            kidScheduleStatuses={kidScheduleStatuses}
            calendarVisited={calendarVisited}
          />
        )}

        {/* Co-teachers always see nav cards; admins only see them after adding a kid */}
        {(isCollaborator || kids.length > 0) && (
          <>
            <div style={css.sectionLabel}>WHERE WOULD YOU LIKE TO GO?</div>
            <div style={css.grid}>
              {visibleNavCards.map(card => <NavCard key={card.id} card={card} />)}
            </div>
          </>
        )}
      </main>

      <DevTierToggle />
      <HelpWidget />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  root: { fontFamily: 'var(--font-dm-sans), var(--font-nunito), sans-serif', background: '#f5f3ff', minHeight: '100vh' },
  topBar: {
    background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 45%, #a855f7 75%, #ec4899 100%)',
    padding: '0 24px', height: 58, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 16, position: 'sticky', top: 0, zIndex: 50,
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: 16, flex: 1 },
  logo: { display: 'flex', alignItems: 'baseline', gap: 1 },
  logoMain: { color: '#fff', fontWeight: 900, fontSize: 17, letterSpacing: -0.3 },
  logoAccent: { color: '#fbbf24', fontWeight: 900, fontSize: 17 },
  welcomeMsg: { color: 'rgba(255,255,255,0.85)', fontSize: 13.5 },
  topBarRight: { display: 'flex', alignItems: 'center', gap: 10 },
  howToBtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 8, color: '#fff', fontSize: 12.5, fontWeight: 600,
    padding: '6px 14px', cursor: 'pointer',
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 8, color: '#fff', fontSize: 12.5, fontWeight: 600,
    padding: '6px 14px', cursor: 'pointer',
  },
  main: { maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 14, marginTop: 8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
  card: { background: '#fff', borderRadius: 14, border: '1.5px solid', overflow: 'hidden', transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)', cursor: 'pointer' },
  cardHead: { padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10 },
  cardTitle: { color: '#fff', fontWeight: 900, fontSize: 15, flex: 1, letterSpacing: 0.1 },
  itemList: { listStyle: 'none', margin: 0, padding: '6px 0 10px' },
  item: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 16px', cursor: 'pointer', transition: 'background 0.12s ease', borderRadius: 6, margin: '0 6px' },
  itemLabel: { fontSize: 13, color: '#374151', fontWeight: 500, flex: 1 },
  checklistCard: { background: '#fff', borderRadius: 14, border: '1.5px solid #ede9fe', overflow: 'hidden', marginBottom: 20, boxShadow: '0 4px 16px rgba(124,58,237,0.08)' },
  checklistHeader: { background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  checklistHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  checklistTitle: { color: '#fff', fontWeight: 800, fontSize: 15 },
  checklistSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  checklistBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', width: 28, height: 28, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 5, background: '#ede9fe' },
  progressFill: { height: '100%', transition: 'width 0.6s ease', borderRadius: '0 4px 4px 0' },
  checklistSteps: { padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 12 },
  checklistStep: { display: 'flex', alignItems: 'flex-start', gap: 12, transition: 'opacity 0.2s ease' },
  stepBadge: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0, marginTop: 2 },
  stepCta: { marginTop: 8, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
}