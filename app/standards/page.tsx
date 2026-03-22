'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import StandardsCoverage from '@/components/StandardsCoverage'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { colors } from '@/src/lib/designTokens'
import { useAppHeader } from '@/components/layout/AppHeader'

type Tab = 'coverage' | 'browse'

interface BrowseStandard {
  id: string
  standard_code: string
  description: string
  subject: string
  grade_level: string
  domain: string | null
}

const GRADE_ORDER = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9-10', '11-12', 'HS']

const gradeLabel = (g: string) => {
  if (g === 'K') return 'Kindergarten'
  if (g === '9-10') return 'Grades 9–10'
  if (g === '11-12') return 'Grades 11–12'
  if (g === 'HS') return 'High School Math'
  const suffix = g === '1' ? 'st' : g === '2' ? 'nd' : g === '3' ? 'rd' : 'th'
  return `${g}${suffix} Grade`
}

function StandardsBrowser({ organizationId }: { organizationId: string }) {
  const [standards, setStandards]           = useState<BrowseStandard[]>([])
  const [loading, setLoading]               = useState(true)
  const [selectedGrade, setSelectedGrade]   = useState<string | null>(null)
  const [subjectFilter, setSubjectFilter]   = useState<string>('all')
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null)

  useEffect(() => {
    if (!organizationId) return
    supabase
      .from('user_standards')
      .select('id, standard_code, description, subject, grade_level, domain')
      .eq('organization_id', organizationId)
      .eq('state_code', 'CCSS')
      .eq('active', true)
      .order('subject').order('grade_level').order('standard_code')
      .then(({ data }: { data: BrowseStandard[] | null }) => {
        const rows = data || []
        setStandards(rows)
        const firstGrade = GRADE_ORDER.find(g => rows.some(s => s.grade_level === g))
        if (firstGrade) setSelectedGrade(firstGrade)
        setLoading(false)
      })
  }, [organizationId])

  const availableGrades = useMemo(() =>
    GRADE_ORDER.filter(g => standards.some(s => s.grade_level === g)),
    [standards]
  )

  const gradeStandards = useMemo(() =>
    selectedGrade ? standards.filter(s => s.grade_level === selectedGrade) : [],
    [standards, selectedGrade]
  )

  const subjects = useMemo(() =>
    ['all', ...Array.from(new Set(gradeStandards.map(s => s.subject))).sort()],
    [gradeStandards]
  )

  const filtered = useMemo(() =>
    subjectFilter === 'all' ? gradeStandards : gradeStandards.filter(s => s.subject === subjectFilter),
    [gradeStandards, subjectFilter]
  )

  // Group by domain within the selected grade
  const grouped = useMemo(() => {
    const map = new Map<string, BrowseStandard[]>()
    filtered.forEach(s => {
      const key = s.domain || s.subject
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
      Loading…
    </div>
  )

  if (standards.length === 0) return (
    <div style={{
      background: 'rgba(255,255,255,0.82)', borderRadius: 18,
      border: '1.5px solid rgba(124,58,237,0.13)', padding: '40px 24px',
      textAlign: 'center', fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📌</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b', marginBottom: 8 }}>No standards imported yet</div>
      <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 600, lineHeight: 1.6, marginBottom: 20 }}>
        Import Common Core standards to browse them here.
      </div>
      <a href="/standards-setup" style={{
        display: 'inline-block', padding: '12px 24px',
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 800,
        fontFamily: "'Nunito', sans-serif", textDecoration: 'none',
      }}>
        📥 Go to Standards Setup
      </a>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>

      {/* Grade pills */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>
          Grade Level
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {availableGrades.map(g => {
            const isActive = selectedGrade === g
            const count = standards.filter(s => s.grade_level === g).length
            return (
              <button key={g} onClick={() => { setSelectedGrade(g); setSubjectFilter('all'); setExpandedDomain(null) }} style={{
                padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'Nunito', sans-serif",
                border: `2px solid ${isActive ? '#7c3aed' : '#e5e7eb'}`,
                background: isActive ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#fff',
                color: isActive ? '#fff' : '#6b7280',
              }}>
                {g}
                <span style={{ fontSize: 10, marginLeft: 5, opacity: 0.75 }}>({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {selectedGrade && (
        <>
          {/* Grade header */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#c4b5fd' }}>{gradeLabel(selectedGrade)}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
              {gradeStandards.length} standards · {subjects.length - 1} subject{subjects.length - 1 !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Subject filter (only when >1 subject) */}
          {subjects.length > 2 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 16 }}>
              {subjects.map(s => (
                <button key={s} onClick={() => { setSubjectFilter(s); setExpandedDomain(null) }} style={{
                  padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'Nunito', sans-serif",
                  border: `2px solid ${subjectFilter === s ? '#7c3aed' : '#e5e7eb'}`,
                  background: subjectFilter === s ? '#ede9fe' : '#fff',
                  color: subjectFilter === s ? '#7c3aed' : '#6b7280',
                }}>
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          )}

          {/* Domains within grade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {grouped.map(([domain, items]) => {
              const isOpen = expandedDomain === domain
              return (
                <div key={domain} style={{
                  background: 'rgba(255,255,255,0.88)', borderRadius: 14,
                  border: '1.5px solid rgba(124,58,237,0.1)', overflow: 'hidden',
                }}>
                  <button
                    onClick={() => setExpandedDomain(isOpen ? null : domain)}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      padding: '13px 16px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        background: '#ede9fe', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 16,
                      }}>📖</div>
                      <div style={{ textAlign: 'left' as const }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1e1b4b' }}>{domain}</div>
                        <div style={{ fontSize: 11, color: '#4b5563', fontWeight: 700 }}>
                          {items[0].subject} · {items.length} standard{items.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{ color: '#c4b5fd', fontSize: 16, fontWeight: 700 }}>{isOpen ? '▾' : '›'}</span>
                  </button>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid #f3f4f6' }}>
                      {items.map((std, idx) => (
                        <div key={std.id} style={{
                          padding: '10px 16px',
                          borderBottom: idx < items.length - 1 ? '1px solid #f9fafb' : 'none',
                          display: 'flex', gap: 12, alignItems: 'flex-start',
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 800, color: '#7c3aed',
                            background: '#ede9fe', padding: '3px 8px', borderRadius: 6,
                            flexShrink: 0, marginTop: 1,
                          }}>
                            {std.standard_code}
                          </span>
                          <div style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 600, lineHeight: 1.5 }}>
                            {std.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      <div style={{
        marginTop: 24, padding: '14px 18px',
        background: 'rgba(196,181,253,0.12)', borderRadius: 14,
        border: '1px solid rgba(196,181,253,0.2)',
        fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 600, lineHeight: 1.6,
      }}>
        💡 Standards are shared across all your kids — each child tracks their own coverage independently through lesson tagging.
      </div>
    </div>
  )
}

function StandardsContent() {
  const router = useRouter()
  useAppHeader({ title: '📌 Standards', backHref: '/reports' })

  const [organizationId, setOrganizationId] = useState<string>('')
  const [loading, setLoading]               = useState(true)
  const [guideOpen, setGuideOpen]           = useState(true)
  const [activeTab, setActiveTab]           = useState<Tab>('browse')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { router.push('/onboarding'); return }

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
    <div style={{ minHeight: '100vh', background: colors.pageBackground, fontFamily: "'Nunito', sans-serif", paddingBottom: 100 }}>
      <main style={{ padding: '20px', maxWidth: 800, margin: '0 auto' }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#c4b5fd', margin: '0 0 6px', fontFamily: "'Nunito', sans-serif" }}>
            📌 Standards
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
            Browse your imported standards or track lesson coverage.
          </p>
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 4, border: '1.5px solid rgba(124,58,237,0.1)' }}>
          {([
            { key: 'browse',   label: '📖 Browse Standards' },
            { key: 'coverage', label: '📊 Coverage' },
          ] as { key: Tab; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 9,
                border: 'none', cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                fontWeight: 800, fontSize: 14, transition: 'all 0.15s',
                background: activeTab === tab.key ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'transparent',
                color: activeTab === tab.key ? '#fff' : '#6b7280',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Browse tab ── */}
        {activeTab === 'browse' && <StandardsBrowser organizationId={organizationId} />}

        {/* ── Coverage tab ── */}
        {activeTab === 'coverage' && (
          <>
            {/* Why this matters collapsible */}
            <div style={{
              background: 'rgba(255,255,255,0.88)', borderRadius: 18,
              border: '1.5px solid rgba(124,58,237,0.13)',
              boxShadow: '0 2px 12px rgba(124,58,237,0.07)',
              marginBottom: 24, overflow: 'hidden',
            }}>
              <button
                onClick={() => setGuideOpen(o => !o)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  padding: '16px 20px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, #ede9fe, #dbeafe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    💡
                  </div>
                  <div style={{ textAlign: 'left' as const }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b' }}>Why standards matter — and how to use this</div>
                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                      {guideOpen ? 'Tap to collapse' : 'Tap to expand'}
                    </div>
                  </div>
                </div>
                <span style={{ color: '#c4b5fd', fontSize: 20, fontWeight: 700 }}>{guideOpen ? '▾' : '›'}</span>
              </button>

              {guideOpen && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ marginTop: 16, marginBottom: 20, padding: '14px 16px', background: '#f5f3ff', borderRadius: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#7c3aed', marginBottom: 6 }}>Why this matters</div>
                    <p style={{ fontSize: 13, color: '#374151', fontWeight: 600, margin: 0, lineHeight: 1.7 }}>
                      Most states require homeschool families to teach to grade-level standards — but tracking that manually is a nightmare.
                      This page does it automatically. As you tag lessons and log check-ins, you'll always know which standards your child
                      has demonstrated mastery of, which need more practice, and which haven't been covered yet.
                      It's also great evidence to have on hand if your state ever asks for documentation.
                    </p>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#4b5563', marginBottom: 10, letterSpacing: 0.3 }}>
                      WHAT THE COLOURS MEAN
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      {[
                        { emoji: '🟢', label: 'Demonstrated', desc: 'Lessons tagged + majority of check-ins were "Got It"' },
                        { emoji: '🟡', label: 'In Progress', desc: 'Lessons tagged + mixed check-in results' },
                        { emoji: '🔴', label: 'Needs Work', desc: 'Lessons tagged + mostly "Needs Support" check-ins' },
                        { emoji: '📘', label: 'Covered', desc: 'Lessons tagged but no check-ins logged yet' },
                        { emoji: '⬜', label: 'Not Yet Covered', desc: 'No lessons tagged to this standard yet' },
                      ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
                          <span style={{ fontWeight: 800, color: '#374151', flexShrink: 0 }}>{item.label}</span>
                          <span style={{ color: '#4b5563', fontWeight: 600 }}>— {item.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <StandardsCoverage organizationId={organizationId} />
          </>
        )}
      </main>
    </div>
  )
}

export default function StandardsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <StandardsContent />
      </Suspense>
    </AuthGuard>
  )
}
