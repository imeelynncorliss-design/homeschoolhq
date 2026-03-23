'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'
import { pageShell } from '@/src/lib/designTokens'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kid {
  id: string
  displayname: string
}

interface LessonRow {
  id: string
  title: string
  subject: string
  lesson_date: string
  kid_id: string
  description?: string | null
  lesson_source?: string | null
}

interface DayGroup {
  dateStr: string
  date: Date
  lessons: Array<{ lesson: LessonRow; kidName: string; materials: string[] }>
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getWeekDates(weekOffset: 0 | 1): { dateStrs: string[]; dates: Date[]; label: string } {
  const today = new Date()
  const dow = today.getDay()
  // Current week: Mon of this week
  const daysToThisMon = dow === 0 ? -6 : 1 - dow
  // Next week: Mon of next week (Sun→+1, Mon→+7, Tue→+6, etc.)
  const daysToNextMon = dow === 0 ? 1 : 8 - dow
  const daysToMon = weekOffset === 0 ? daysToThisMon : daysToNextMon
  const dates: Date[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + daysToMon + i)
    d.setHours(12, 0, 0, 0)
    dates.push(d)
  }
  const dateStrs = dates.map(d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  )
  const label = `${MONTHS[dates[0].getMonth()]} ${dates[0].getDate()} – ${MONTHS[dates[4].getMonth()]} ${dates[4].getDate()}, ${dates[4].getFullYear()}`
  return { dateStrs, dates, label }
}

function extractMaterials(description?: string | null, lesson_source?: string | null): string[] {
  if (!description) return []
  const trimmed = description.trim()
  if (lesson_source !== 'scout' && !trimmed.startsWith('{')) return []
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed?.materials && Array.isArray(parsed.materials)) {
      return parsed.materials.filter((m: unknown) => typeof m === 'string' && (m as string).trim())
    }
  } catch { /* not JSON */ }
  return []
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function SupplyScoutContent() {
  const router = useRouter()
  useAppHeader({ title: '🔍 Supply Scout', backHref: '/tools' })
  const supabase = createClient()

  const [loading, setLoading]         = useState(true)
  const [thisWeek, setThisWeek]       = useState<DayGroup[]>([])
  const [nextWeek, setNextWeek]       = useState<DayGroup[]>([])
  const [thisWeekLabel, setThisWeekLabel] = useState('')
  const [nextWeekLabel, setNextWeekLabel] = useState('')
  const [activeTab, setActiveTab]     = useState<'next' | 'this'>('this')
  const [checked, setChecked]         = useState<Set<string>>(new Set())

  const dayGroups  = activeTab === 'next' ? nextWeek : thisWeek
  const weekLabel  = activeTab === 'next' ? nextWeekLabel : thisWeekLabel

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }

      const thisW = getWeekDates(0)
      const nextW = getWeekDates(1)
      setThisWeekLabel(thisW.label)
      setNextWeekLabel(nextW.label)

      const [kidsResult, lessonsResult] = await Promise.all([
        supabase.from('kids').select('id, displayname').eq('organization_id', orgId).order('created_at', { ascending: true }),
        supabase.from('lessons')
          .select('id, title, subject, lesson_date, kid_id, description, lesson_source')
          .eq('organization_id', orgId)
          .gte('lesson_date', thisW.dateStrs[0])
          .lte('lesson_date', nextW.dateStrs[4])
          .order('lesson_date', { ascending: true }),
      ])

      const kids: Kid[] = kidsResult.data || []
      const lessons: LessonRow[] = lessonsResult.data || []
      const kidMap: Record<string, string> = {}
      kids.forEach(k => { kidMap[k.id] = k.displayname })

      const buildGroups = (w: ReturnType<typeof getWeekDates>): DayGroup[] =>
        w.dates.map((date: Date, i: number) => {
          const dateStr = w.dateStrs[i]
          const dayLessons = lessons
            .filter(l => l.lesson_date === dateStr)
            .map(l => ({
              lesson: l,
              kidName: kidMap[l.kid_id] || 'Unknown',
              materials: extractMaterials(l.description, l.lesson_source),
            }))
          return { dateStr, date, lessons: dayLessons }
        })

      setThisWeek(buildGroups(thisW))
      setNextWeek(buildGroups(nextW))
      setLoading(false)
    }
    load()
  }, [])

  const toggleCheck = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const totalMaterials = dayGroups.reduce((sum, d) =>
    sum + d.lessons.reduce((s, l) => s + l.materials.length, 0), 0)

  const checkedCount = checked.size

  if (loading) {
    return (
      <div style={{ ...pageShell.root, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #fde68a', borderTopColor: '#f59e0b', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ ...pageShell.root, paddingBottom: 96 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        .material-row:hover { background: rgba(124,58,237,0.06) !important; }
        .lesson-block { transition: box-shadow 0.15s; }
        .lesson-block:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>🛒</span>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: '#7c3aed', margin: 0, fontFamily: "'Nunito', sans-serif" }}>
                Supply Scout
              </h1>
            </div>
            {/* Week toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              {(['this', 'next'] as const).map(tab => {
                const isActive = activeTab === tab
                const label = tab === 'next' ? 'Next Week' : 'This Week'
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: isActive ? 800 : 600,
                    background: isActive ? '#7c3aed' : 'rgba(255,255,255,0.6)',
                    color: isActive ? '#fff' : '#6b7280',
                    boxShadow: isActive ? '0 2px 8px rgba(124,58,237,0.35)' : 'none',
                    transition: 'all 0.15s',
                  }}>{label}</button>
                )
              })}
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, margin: '0 0 4px' }}>
              {weekLabel}
            </p>
          </div>
          {/* Progress pill */}
          {totalMaterials > 0 && (
            <div style={{
              background: checkedCount === totalMaterials ? '#d1fae5' : 'rgba(255,255,255,0.9)',
              border: `1.5px solid ${checkedCount === totalMaterials ? '#10b981' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: 30, padding: '8px 16px', textAlign: 'center' as const, flexShrink: 0,
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: checkedCount === totalMaterials ? '#065f46' : '#1e1b4b' }}>
                {checkedCount}/{totalMaterials}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginTop: 1 }}>
                {checkedCount === totalMaterials ? '✓ All ready' : 'items ready'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '20px auto 0', padding: '0 20px' }}>

        {totalMaterials === 0 && dayGroups.every(d => d.lessons.length === 0) ? (
          /* No lessons at all */
          <div style={{
            background: 'rgba(255,255,255,0.82)', borderRadius: 20,
            border: '1.5px solid rgba(0,0,0,0.06)', padding: '48px 24px',
            textAlign: 'center', marginTop: 12,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b', marginBottom: 6 }}>Nothing scheduled yet</div>
            <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 600, lineHeight: 1.5 }}>
              No lessons found for next week. Add lessons in Subjects to see materials here.
            </div>
          </div>
        ) : totalMaterials === 0 ? (
          /* Lessons exist but no materials listed */
          <div style={{
            background: 'rgba(255,255,255,0.82)', borderRadius: 20,
            border: '1.5px solid rgba(0,0,0,0.06)', padding: '48px 24px',
            textAlign: 'center', marginTop: 12,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b', marginBottom: 6 }}>No special supplies needed!</div>
            <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 600, lineHeight: 1.5 }}>
              Lessons are scheduled for next week but none list specific materials. You&rsquo;re all set.
            </div>
          </div>
        ) : (
          <>
            {/* Summary banner */}
            <div style={{
              background: 'rgba(255,255,255,0.75)', borderRadius: 14,
              border: '1px solid rgba(124,58,237,0.2)',
              padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, color: '#5b21b6', fontWeight: 700,
            }}>
              <span style={{ fontSize: 18 }}>💡</span>
              <span>
                {totalMaterials} item{totalMaterials !== 1 ? 's' : ''} needed across{' '}
                {dayGroups.reduce((n, d) => n + d.lessons.filter(l => l.materials.length > 0).length, 0)} lesson{dayGroups.reduce((n, d) => n + d.lessons.filter(l => l.materials.length > 0).length, 0) !== 1 ? 's' : ''} next week.
                Tap items to check them off as you gather them.
              </span>
            </div>

            {/* Day groups */}
            {dayGroups.map(group => {
              const mssnLessons = group.lessons.filter(l => l.materials.length > 0)
              if (mssnLessons.length === 0) return null
              return (
                <div key={group.dateStr} style={{ marginBottom: 28 }}>
                  {/* Day header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                  }}>
                    <div style={{
                      background: '#7c3aed', color: '#fff', borderRadius: 10,
                      padding: '4px 12px', fontSize: 12, fontWeight: 900, letterSpacing: 0.5,
                    }}>
                      {DAYS[group.date.getDay()].toUpperCase()}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>
                      {MONTHS[group.date.getMonth()]} {group.date.getDate()}
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.07)' }} />
                  </div>

                  {/* Lessons with materials */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {mssnLessons.map(({ lesson, kidName, materials }) => (
                      <div
                        key={lesson.id}
                        className="lesson-block"
                        style={{
                          background: 'rgba(255,255,255,0.90)',
                          borderRadius: 16, border: '1.5px solid rgba(124,58,237,0.15)',
                          overflow: 'hidden',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                        }}
                      >
                        {/* Lesson header */}
                        <div style={{
                          padding: '12px 16px 10px',
                          borderBottom: '1px solid rgba(0,0,0,0.05)',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <div style={{
                            fontSize: 10, fontWeight: 900, color: '#7c3aed',
                            background: '#ede9fe', borderRadius: 6, padding: '2px 8px',
                            flexShrink: 0,
                          }}>
                            {kidName.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 14, fontWeight: 800, color: '#1e1b4b',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {lesson.title}
                            </div>
                            {lesson.subject && (
                              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 1 }}>
                                {lesson.subject}
                              </div>
                            )}
                          </div>
                          <div style={{
                            fontSize: 11, fontWeight: 800, color: '#5b21b6',
                            background: '#ede9fe', borderRadius: 8, padding: '3px 8px', flexShrink: 0,
                          }}>
                            {materials.length} item{materials.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Materials checklist */}
                        <div style={{ padding: '6px 0 8px' }}>
                          {materials.map((mat, idx) => {
                            const key = `${lesson.id}::${idx}`
                            const done = checked.has(key)
                            return (
                              <div
                                key={key}
                                className="material-row"
                                onClick={() => toggleCheck(key)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '9px 16px', cursor: 'pointer',
                                  transition: 'background 0.1s',
                                  background: done ? 'rgba(16,185,129,0.05)' : 'transparent',
                                }}
                              >
                                {/* Checkbox */}
                                <div style={{
                                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                                  border: `2px solid ${done ? '#10b981' : '#d1d5db'}`,
                                  background: done ? '#10b981' : '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}>
                                  {done && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1, fontWeight: 900 }}>✓</span>}
                                </div>
                                <span style={{
                                  fontSize: 14, fontWeight: 600,
                                  color: done ? '#9ca3af' : '#374151',
                                  textDecoration: done ? 'line-through' : 'none',
                                  transition: 'all 0.15s',
                                }}>
                                  {mat}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* All done celebration */}
            {checkedCount === totalMaterials && totalMaterials > 0 && (
              <div style={{
                background: 'rgba(209,250,229,0.85)', borderRadius: 16,
                border: '1.5px solid #10b981', padding: '20px 24px',
                textAlign: 'center', marginTop: 8,
              }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#065f46' }}>You&rsquo;re all prepped!</div>
                <div style={{ fontSize: 13, color: '#047857', fontWeight: 600, marginTop: 4 }}>
                  All materials gathered. Have a great week!
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupplyScoutPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ ...pageShell.root }} />}>
        <SupplyScoutContent />
      </Suspense>
    </AuthGuard>
  )
}
