'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/src/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Proficiency = 'needs_support' | 'progressing' | 'got_it'

interface Kid       { id: string; displayname: string; grade: string | null }
interface Standard  { id: string; standard_code: string; description: string; subject: string; grade_level: string; domain: string | null }
interface LessonLink { standard_id: string; lesson_id: string; kid_id: string }
interface CheckIn   { lesson_id: string; kid_id: string; proficiency: Proficiency }

type CoverageStatus = 'demonstrated' | 'in_progress' | 'needs_work' | 'covered' | 'gap'

interface StandardWithStatus extends Standard {
  status: CoverageStatus
  lessonCount: number
  checkInCounts: { got_it: number; progressing: number; needs_support: number }
}

interface StandardsCoverageProps {
  organizationId: string
}

// ─── Grade normalization ──────────────────────────────────────────────────────
// Maps onboarding dropdown values ('5th', 'Kindergarten', etc.) to grade_level
// values stored in standard_templates ('5', 'K', '9-10', 'HS', etc.)

function normalizeGrade(grade: string): string[] {
  const g = grade.toLowerCase().trim().replace(/\s*grade\s*/g, '').trim()
  if (g === 'kindergarten' || g === 'k') return ['K']
  if (g === '1st'  || g === '1')  return ['1']
  if (g === '2nd'  || g === '2')  return ['2']
  if (g === '3rd'  || g === '3')  return ['3']
  if (g === '4th'  || g === '4')  return ['4']
  if (g === '5th'  || g === '5')  return ['5']
  if (g === '6th'  || g === '6')  return ['6']
  if (g === '7th'  || g === '7')  return ['7']
  if (g === '8th'  || g === '8')  return ['8']
  if (g === '9th'  || g === '9')  return ['9-10', 'HS']
  if (g === '10th' || g === '10') return ['9-10', 'HS']
  if (g === '11th' || g === '11') return ['11-12', 'HS']
  if (g === '12th' || g === '12') return ['11-12', 'HS']
  return [grade]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const KID_COLORS = ['#7c3aed', '#0d9488', '#ec4899', '#f59e0b', '#3b82f6']

const STATUS_CONFIG: Record<CoverageStatus, { label: string; emoji: string; color: string; bg: string; border: string; order: number }> = {
  demonstrated: { label: 'Demonstrated',  emoji: '🟢', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', order: 1 },
  in_progress:  { label: 'In Progress',   emoji: '🟡', color: '#d97706', bg: '#fefce8', border: '#fde68a', order: 2 },
  needs_work:   { label: 'Needs Work',    emoji: '🔴', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', order: 3 },
  covered:      { label: 'Covered',       emoji: '📘', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', order: 4 },
  gap:          { label: 'Not Yet Covered', emoji: '⬜', color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', order: 5 },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StandardsCoverage({ organizationId }: StandardsCoverageProps) {
  const [kids, setKids]                   = useState<Kid[]>([])
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null)
  const [standards, setStandards]         = useState<Standard[]>([])
  const [lessonLinks, setLessonLinks]     = useState<LessonLink[]>([])
  const [checkIns, setCheckIns]           = useState<CheckIn[]>([])
  const [loading, setLoading]             = useState(true)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter]   = useState<CoverageStatus | 'all'>('all')
  const [expandedId, setExpandedId]       = useState<string | null>(null)

  useEffect(() => { if (organizationId) load() }, [organizationId])

  const load = async () => {
    setLoading(true)

    const { data: kidsData } = await supabase
      .from('kids')
      .select('id, displayname, grade')
      .eq('organization_id', organizationId)
      .order('displayname')

    const kidList = (kidsData || []) as Kid[]
    setKids(kidList)
    if (kidList.length > 0) setSelectedKidId(kidList[0].id)

    const kidIds = kidList.map(k => k.id)

    const [{ data: stdData }, { data: linkData }, { data: ciData }] = await Promise.all([
      supabase
        .from('user_standards')
        .select('id, standard_code, description, subject, grade_level, domain')
        .eq('organization_id', organizationId)
        .eq('state_code', 'CCSS')
        .eq('active', true)
        .order('subject').order('grade_level').order('standard_code'),

      kidIds.length > 0
        ? supabase
            .from('lesson_standards')
            .select('user_standard_id, lesson_id, lessons(kid_id)')
            .in('lessons.kid_id', kidIds)
        : { data: [] },

      kidIds.length > 0
        ? supabase
            .from('lesson_checkins')
            .select('lesson_id, kid_id, proficiency')
            .in('kid_id', kidIds)
        : { data: [] },
    ])

    setStandards((stdData || []) as Standard[])
    setLessonLinks(
      (linkData || []).map((l: any) => ({
        standard_id: l.user_standard_id,
        lesson_id: l.lesson_id,
        kid_id: l.lessons?.kid_id,
      })).filter((l: LessonLink) => l.kid_id)
    )
    setCheckIns((ciData || []) as CheckIn[])
    setLoading(false)
  }

  const standardsWithStatus = useMemo((): StandardWithStatus[] => {
    return standards.map(std => {
      const links = lessonLinks.filter(l =>
        l.standard_id === std.id && (!selectedKidId || l.kid_id === selectedKidId)
      )
      const lessonIds = new Set(links.map(l => l.lesson_id))
      const relevantCIs = checkIns.filter(c =>
        lessonIds.has(c.lesson_id) && (!selectedKidId || c.kid_id === selectedKidId)
      )

      const counts = { got_it: 0, progressing: 0, needs_support: 0 }
      relevantCIs.forEach(c => counts[c.proficiency]++)

      const lessonCount = lessonIds.size
      let status: CoverageStatus = 'gap'

      if (lessonCount > 0) {
        if (relevantCIs.length === 0) {
          status = 'covered'
        } else if (counts.got_it > counts.progressing + counts.needs_support) {
          status = 'demonstrated'
        } else if (counts.needs_support > counts.got_it + counts.progressing) {
          status = 'needs_work'
        } else {
          status = 'in_progress'
        }
      }

      return { ...std, status, lessonCount, checkInCounts: counts }
    })
  }, [standards, lessonLinks, checkIns, selectedKidId])

  const selectedKidGrade = useMemo(() => {
    if (!selectedKidId) return null
    return kids.find(k => k.id === selectedKidId)?.grade ?? null
  }, [selectedKidId, kids])

  const gradeFilteredStandards = useMemo(() => {
    if (!selectedKidGrade) return standardsWithStatus
    const gradeLevels = normalizeGrade(selectedKidGrade)
    return standardsWithStatus.filter(s => gradeLevels.includes(s.grade_level))
  }, [standardsWithStatus, selectedKidGrade])

  const subjects = useMemo(() =>
    ['all', ...Array.from(new Set(gradeFilteredStandards.map(s => s.subject))).sort()],
    [gradeFilteredStandards]
  )

  const filtered = useMemo(() =>
    gradeFilteredStandards
      .filter(s => subjectFilter === 'all' || s.subject === subjectFilter)
      .filter(s => statusFilter === 'all' || s.status === statusFilter)
      .sort((a, b) => STATUS_CONFIG[a.status].order - STATUS_CONFIG[b.status].order),
    [gradeFilteredStandards, subjectFilter, statusFilter]
  )

  const summary = useMemo(() => {
    const counts: Record<CoverageStatus, number> = { demonstrated: 0, in_progress: 0, needs_work: 0, covered: 0, gap: 0 }
    gradeFilteredStandards.forEach(s => counts[s.status]++)
    return counts
  }, [gradeFilteredStandards])

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
        Import Common Core standards for your kids' grade levels to start tracking coverage.
      </div>
      <a
        href="/standards-setup"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 800,
          fontFamily: "'Nunito', sans-serif", textDecoration: 'none',
        }}
      >
        📥 Go to Standards Setup
      </a>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>

      {/* ── Kid pills ── */}
      {kids.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {kids.map((kid, idx) => {
            const color = KID_COLORS[idx % KID_COLORS.length]
            const isActive = kid.id === selectedKidId
            return (
              <button key={kid.id} onClick={() => { setSelectedKidId(kid.id); setSubjectFilter('all') }} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 16px 7px 10px', borderRadius: 999,
                fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14,
                cursor: 'pointer', transition: 'all 0.15s',
                border: `2px solid ${isActive ? color : '#e5e7eb'}`,
                background: isActive ? `${color}18` : '#fff',
                color: isActive ? color : '#6b7280',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: isActive ? color : '#d1d5db',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, fontWeight: 800,
                }}>
                  {kid.displayname.charAt(0).toUpperCase()}
                </div>
                {kid.displayname}
                {kid.grade && (
                  <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>
                    · Gr {kid.grade}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Summary strip ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {(Object.entries(STATUS_CONFIG) as [CoverageStatus, typeof STATUS_CONFIG[CoverageStatus]][])
          .sort((a, b) => a[1].order - b[1].order)
          .map(([key, conf]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 999,
                fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.15s',
                border: `2px solid ${statusFilter === key ? conf.color : conf.border}`,
                background: statusFilter === key ? conf.bg : '#fff',
                color: statusFilter === key ? conf.color : '#6b7280',
              }}
            >
              {conf.emoji} {conf.label}
              <span style={{
                background: statusFilter === key ? conf.color : '#e5e7eb',
                color: statusFilter === key ? '#fff' : '#6b7280',
                borderRadius: 99, padding: '1px 7px', fontSize: 12, fontWeight: 800,
              }}>
                {summary[key]}
              </span>
            </button>
          ))}
      </div>

      {/* ── Subject filter ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {subjects.map(s => (
          <button
            key={s}
            onClick={() => setSubjectFilter(s)}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'Nunito', sans-serif",
              border: `2px solid ${subjectFilter === s ? '#7c3aed' : '#e5e7eb'}`,
              background: subjectFilter === s ? '#ede9fe' : '#fff',
              color: subjectFilter === s ? '#7c3aed' : '#6b7280',
            }}
          >
            {s === 'all' ? 'All Subjects' : s}
          </button>
        ))}
      </div>

      {/* ── Standards list ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontWeight: 600 }}>
          No standards match the current filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(std => {
            const conf = STATUS_CONFIG[std.status]
            const isExpanded = expandedId === std.id
            return (
              <div key={std.id} style={{
                background: 'rgba(255,255,255,0.88)', borderRadius: 14,
                border: `1.5px solid ${isExpanded ? conf.border : 'rgba(124,58,237,0.1)'}`,
                overflow: 'hidden', transition: 'border-color 0.15s',
              }}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : std.id)}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    padding: '13px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                  }}
                >
                  {/* Status badge */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: conf.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 16,
                  }}>
                    {conf.emoji}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed' }}>
                        {std.standard_code}
                      </span>
                      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                        {std.subject}{std.grade_level ? ` · Gr ${std.grade_level}` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, lineHeight: 1.4, marginTop: 2 }}>
                      {std.description}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: conf.color,
                      background: conf.bg, padding: '3px 10px', borderRadius: 99,
                    }}>
                      {conf.label}
                    </span>
                    <span style={{ color: '#c4b5fd', fontSize: 16 }}>{isExpanded ? '▾' : '›'}</span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                      <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 16px', flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#1e1b4b' }}>{std.lessonCount}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700 }}>Lessons tagged</div>
                      </div>
                      {std.checkInCounts.got_it + std.checkInCounts.progressing + std.checkInCounts.needs_support > 0 && (
                        <>
                          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 16px', flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#16a34a' }}>{std.checkInCounts.got_it}</div>
                            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>🟢 Got It</div>
                          </div>
                          <div style={{ background: '#fefce8', borderRadius: 10, padding: '10px 16px', flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#d97706' }}>{std.checkInCounts.progressing}</div>
                            <div style={{ fontSize: 11, color: '#d97706', fontWeight: 700 }}>🟡 Progressing</div>
                          </div>
                          <div style={{ background: '#fef2f2', borderRadius: 10, padding: '10px 16px', flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{std.checkInCounts.needs_support}</div>
                            <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>🔴 Needs Support</div>
                          </div>
                        </>
                      )}
                    </div>
                    {std.lessonCount === 0 && (
                      <div style={{ marginTop: 10, fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                        No lessons tagged to this standard yet. Open a lesson and use the Standards tab to link it.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        marginTop: 24, padding: '14px 18px',
        background: 'rgba(124,58,237,0.06)', borderRadius: 14,
        fontSize: 13, color: '#6b7280', fontWeight: 600, lineHeight: 1.6,
      }}>
        💡 Tag standards to lessons using the <strong>Standards tab</strong> inside any lesson. Check-ins on those lessons automatically update the mastery status here.
      </div>
    </div>
  )
}
