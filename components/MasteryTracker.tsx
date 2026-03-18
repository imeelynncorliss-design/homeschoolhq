'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Proficiency = 'needs_support' | 'progressing' | 'got_it'

interface Kid {
  id: string
  displayname: string
}

interface CheckInRow {
  id: string
  kid_id: string
  lesson_id: string
  proficiency: Proficiency
  notes: string | null
  checked_in_at: string
  lessons: { subject: string | null; title: string } | null
}

interface SubjectSummary {
  subject: string
  total: number
  needs_support: number
  progressing: number
  got_it: number
  recentNotes: { note: string; date: string; proficiency: Proficiency }[]
}

interface MasteryTrackerProps {
  organizationId: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KID_COLORS = ['#7c3aed', '#0d9488', '#ec4899', '#f59e0b', '#3b82f6']

const PROF_CONFIG = {
  needs_support: { emoji: '🔴', label: 'Needs Support', color: '#dc2626', bg: '#fef2f2' },
  progressing:   { emoji: '🟡', label: 'Progressing',   color: '#d97706', bg: '#fefce8' },
  got_it:        { emoji: '🟢', label: 'Got It',         color: '#16a34a', bg: '#f0fdf4' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MasteryTracker({ organizationId }: MasteryTrackerProps) {
  const [kids, setKids]                 = useState<Kid[]>([])
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null)
  const [checkIns, setCheckIns]         = useState<CheckInRow[]>([])
  const [loading, setLoading]           = useState(true)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [drillDown, setDrillDown] = useState<{ subject: string; proficiency: Proficiency } | null>(null)

  useEffect(() => {
    if (organizationId) load()
  }, [organizationId])

  const load = async () => {
    setLoading(true)

    const { data: kidsData } = await supabase
      .from('kids')
      .select('id, displayname')
      .eq('organization_id', organizationId)
      .order('displayname')

    const kidList = (kidsData || []) as Kid[]
    setKids(kidList)
    if (kidList.length > 0) setSelectedKidId(kidList[0].id)

    const kidIds = kidList.map(k => k.id)
    if (kidIds.length > 0) {
      const { data } = await supabase
        .from('lesson_checkins')
        .select('id, kid_id, lesson_id, proficiency, notes, checked_in_at, lessons(subject, title)')
        .in('kid_id', kidIds)
        .order('checked_in_at', { ascending: false })

      setCheckIns((data || []) as CheckInRow[])
    }

    setLoading(false)
  }

  const getSubjectSummaries = (): SubjectSummary[] => {
    const filtered = selectedKidId
      ? checkIns.filter(c => c.kid_id === selectedKidId)
      : checkIns

    const map: Record<string, SubjectSummary> = {}

    filtered.forEach(c => {
      const subject = c.lessons?.subject || 'Other'
      if (!map[subject]) {
        map[subject] = { subject, total: 0, needs_support: 0, progressing: 0, got_it: 0, recentNotes: [] }
      }
      map[subject].total++
      map[subject][c.proficiency]++
      if (c.notes && map[subject].recentNotes.length < 3) {
        map[subject].recentNotes.push({
          note: c.notes,
          date: c.checked_in_at,
          proficiency: c.proficiency,
        })
      }
    })

    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  const getMasteryLevel = (s: SubjectSummary) => {
    if (s.total === 0) return null
    const score = (s.got_it * 2 + s.progressing * 1) / (s.total * 2)
    if (score >= 0.7) return 'got_it'
    if (score >= 0.4) return 'progressing'
    return 'needs_support'
  }

  const getNeedsAttention = (summaries: SubjectSummary[]) =>
    summaries.filter(s => s.total >= 2 && s.needs_support / s.total > 0.3)

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 700 }}>
      Loading...
    </div>
  )

  const summaries = getSubjectSummaries()
  const attention = getNeedsAttention(summaries)
  const totalCheckins = selectedKidId
    ? checkIns.filter(c => c.kid_id === selectedKidId).length
    : checkIns.length

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", maxWidth: 800, margin: '0 auto' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>

      {/* ── Intro ── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b', margin: '0 0 6px' }}>
          🎯 Mastery Tracker
        </h2>
        <p style={{ fontSize: 14, color: '#4b5563', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
          Built from your lesson check-ins — a picture of how each subject is going.
        </p>
      </div>

      {/* ── Kid pills ── */}
      {kids.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {kids.map((kid, idx) => {
            const color = KID_COLORS[idx % KID_COLORS.length]
            const isActive = kid.id === selectedKidId
            return (
              <button
                key={kid.id}
                onClick={() => setSelectedKidId(kid.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 16px 7px 10px', borderRadius: 999,
                  fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: `2px solid ${isActive ? color : '#e5e7eb'}`,
                  background: isActive ? `${color}18` : '#fff',
                  color: isActive ? color : '#6b7280',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: isActive ? color : '#d1d5db',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, fontWeight: 800,
                }}>
                  {kid.displayname.charAt(0).toUpperCase()}
                </div>
                {kid.displayname}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {totalCheckins === 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.82)', borderRadius: 18,
          border: '1.5px solid rgba(124,58,237,0.13)', padding: '40px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b', marginBottom: 8 }}>
            No check-ins yet
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 600, lineHeight: 1.6 }}>
            After completing a lesson, open it and use the Check-In tab to log how it went.
            Your mastery picture will build up automatically over time.
          </div>
        </div>
      )}

      {totalCheckins > 0 && (
        <>
          {/* ── Needs attention ── */}
          {attention.length > 0 && (
            <div style={{
              background: '#fef2f2', borderRadius: 16,
              border: '1.5px solid #fca5a5', padding: '16px 20px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#dc2626', marginBottom: 10 }}>
                ⚠️ Needs Attention
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {attention.map(s => (
                  <div key={s.subject} style={{ fontSize: 14, color: '#7f1d1d', fontWeight: 600 }}>
                    <strong>{s.subject}</strong> — {Math.round((s.needs_support / s.total) * 100)}% of check-ins flagged as Needs Support
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Subject cards ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {summaries.map(s => {
              const mastery = getMasteryLevel(s)
              const masteryConf = mastery ? PROF_CONFIG[mastery] : null
              const isExpanded = expandedSubject === s.subject
              const gotItPct = Math.round((s.got_it / s.total) * 100)
              const progressingPct = Math.round((s.progressing / s.total) * 100)
              const needsSupportPct = Math.round((s.needs_support / s.total) * 100)

              return (
                <div
                  key={s.subject}
                  style={{
                    background: 'rgba(255,255,255,0.88)', borderRadius: 18,
                    border: '1.5px solid rgba(124,58,237,0.13)',
                    boxShadow: '0 2px 12px rgba(124,58,237,0.07)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedSubject(isExpanded ? null : s.subject)}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      padding: '16px 20px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                    }}
                  >
                    {/* Overall mastery badge */}
                    {masteryConf && (
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: masteryConf.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20,
                      }}>
                        {masteryConf.emoji}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>
                        {s.subject}
                      </div>
                      {/* Distribution bar */}
                      <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', gap: 1 }}>
                        {s.got_it > 0 && (
                          <div style={{ width: `${gotItPct}%`, background: '#4ade80', borderRadius: 99 }} />
                        )}
                        {s.progressing > 0 && (
                          <div style={{ width: `${progressingPct}%`, background: '#fbbf24', borderRadius: 99 }} />
                        )}
                        {s.needs_support > 0 && (
                          <div style={{ width: `${needsSupportPct}%`, background: '#f87171', borderRadius: 99 }} />
                        )}
                      </div>
                    </div>

                    {/* Stats + chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: 8, fontSize: 13, fontWeight: 700 }}>
                        {s.got_it > 0 && <span style={{ color: '#16a34a' }}>🟢 {s.got_it}</span>}
                        {s.progressing > 0 && <span style={{ color: '#d97706' }}>🟡 {s.progressing}</span>}
                        {s.needs_support > 0 && <span style={{ color: '#dc2626' }}>🔴 {s.needs_support}</span>}
                      </div>
                      <span style={{ color: '#c4b5fd', fontSize: 18, fontWeight: 700 }}>
                        {isExpanded ? '▾' : '›'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
                      {/* Breakdown cards — clickable to drill into lessons */}
                      <div style={{ display: 'flex', gap: 10, marginTop: 16, marginBottom: 16 }}>
                        {(['got_it', 'progressing', 'needs_support'] as Proficiency[]).map(p => {
                          const conf = PROF_CONFIG[p]
                          const count = s[p]
                          const pct = Math.round((count / s.total) * 100)
                          const isActive = drillDown?.subject === s.subject && drillDown?.proficiency === p
                          return (
                            <button
                              key={p}
                              onClick={() => setDrillDown(isActive ? null : { subject: s.subject, proficiency: p })}
                              disabled={count === 0}
                              style={{
                                flex: 1, background: isActive ? conf.color : conf.bg,
                                borderRadius: 12, padding: '12px 14px', textAlign: 'center' as const,
                                border: `2px solid ${isActive ? conf.color : 'transparent'}`,
                                cursor: count === 0 ? 'default' : 'pointer',
                                transition: 'all 0.15s', fontFamily: "'Nunito', sans-serif",
                              }}
                            >
                              <div style={{ fontSize: 20, marginBottom: 4 }}>{conf.emoji}</div>
                              <div style={{ fontSize: 18, fontWeight: 900, color: isActive ? '#fff' : conf.color }}>{count}</div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? 'rgba(255,255,255,0.8)' : conf.color, opacity: 0.8 }}>
                                {pct}%
                              </div>
                              <div style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.7)' : '#6b7280', fontWeight: 600, marginTop: 2 }}>
                                {conf.label}
                              </div>
                              {count > 0 && (
                                <div style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.6)' : '#9ca3af', marginTop: 4, fontWeight: 700 }}>
                                  {isActive ? 'tap to close' : 'tap to view'}
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Drill-down: lessons for selected proficiency */}
                      {drillDown?.subject === s.subject && (() => {
                        const conf = PROF_CONFIG[drillDown.proficiency]
                        const lessons = checkIns.filter(c =>
                          c.kid_id === selectedKidId &&
                          (c.lessons?.subject || 'Other') === s.subject &&
                          c.proficiency === drillDown.proficiency
                        )
                        return (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: conf.color, letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                              {conf.emoji} {conf.label} — {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                              {lessons.map(c => (
                                <div key={c.id} style={{
                                  background: '#f9fafb', borderRadius: 10,
                                  padding: '10px 14px', fontSize: 13,
                                  borderLeft: `3px solid ${conf.color}`,
                                }}>
                                  <div style={{ fontWeight: 800, color: '#1e1b4b', marginBottom: c.notes ? 4 : 0 }}>
                                    {c.lessons?.title || 'Untitled Lesson'}
                                  </div>
                                  {c.notes && (
                                    <div style={{ color: '#4b5563', fontWeight: 600, lineHeight: 1.5 }}>{c.notes}</div>
                                  )}
                                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 4 }}>
                                    {new Date(c.checked_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Footer note ── */}
          <div style={{
            marginTop: 24, padding: '14px 18px',
            background: 'rgba(124,58,237,0.06)', borderRadius: 14,
            fontSize: 13, color: '#6b7280', fontWeight: 600, lineHeight: 1.6,
          }}>
            💡 Based on <strong>{totalCheckins} check-in{totalCheckins !== 1 ? 's' : ''}</strong>. Add more check-ins after lessons to get a more accurate picture.
          </div>
        </>
      )}
    </div>
  )
}
