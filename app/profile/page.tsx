'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { TIER_INFO, type UserTier } from '@/lib/tierTesting'
import KidProfileForm from '@/components/KidProfileForm'

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADIENT = '#3d3a52'

const KID_COLORS = ['#7c3aed', '#0d9488', '#ec4899', '#f59e0b', '#3b82f6']

const STYLE_NAMES: Record<string, string> = {
  charlotte:       'Charlotte Mason',
  charlottemason:  'Charlotte Mason',
  charlotte_mason: 'Charlotte Mason',
  traditional:     'Traditional',
  eclectic:        'Eclectic',
  unschooling:     'Unschooling',
  classical:       'Classical',
  montessori:      'Montessori',
  waldorf:         'Waldorf',
  unitstudies:     'Unit Studies',
  unit_studies:    'Unit Studies',
}

const STYLE_DESCS: Record<string, string> = {
  charlotte:       'Living books, nature study, and narration. Short, focused lessons that connect learning to the real world.',
  charlottemason:  'Living books, nature study, and narration. Short, focused lessons that connect learning to the real world.',
  charlotte_mason: 'Living books, nature study, and narration. Short, focused lessons that connect learning to the real world.',
  traditional:     'Textbooks, workbooks, and scheduled lessons. Closest to a classroom experience with one-on-one attention.',
  eclectic:        'Mix and match methods based on what works for each child and subject.',
  unschooling:     "Learning flows from the child's interests and daily life. Trust the learner, follow the curiosity.",
  classical:       'Grammar, logic, rhetoric — teaching kids how to think, not what to think.',
  montessori:      "Child-led, hands-on learning that respects each child's natural developmental pace.",
  waldorf:         'Arts-integrated, imagination-rich education aligned with seasonal rhythms and child development.',
  unitstudies:     'Deep dives into one topic that weave all subjects together naturally.',
  unit_studies:    'Deep dives into one topic that weave all subjects together naturally.',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kid {
  id: string
  displayname: string
  grade?: string | null
  subjects: string[]
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

// ─── Row helper ───────────────────────────────────────────────────────────────

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px',
      borderBottom: last ? 'none' : '1px solid rgba(0,0,0,0.06)',
    }}>
      <span style={{ fontSize: 14, color: '#4b5563', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', textAlign: 'right' as const, maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

// ─── Profile Content ──────────────────────────────────────────────────────────

function ProfileContent() {
  const router  = useRouter()
  const supabase = createClient()

  const [loading,        setLoading]        = useState(true)
  const [email,          setEmail]          = useState('')
  const [fullName,       setFullName]       = useState('')
  const [initials,       setInitials]       = useState('U')
  const [orgName,        setOrgName]        = useState<string | null>(null)
  const [orgState,       setOrgState]       = useState<string | null>(null)
  const [teachingStyle,  setTeachingStyle]  = useState<string | null>(null)
  const [schoolYearStr,  setSchoolYearStr]  = useState('—')
  const [schoolYearStartRaw, setSchoolYearStartRaw] = useState('')
  const [schoolYearEndRaw,   setSchoolYearEndRaw]   = useState('')
  const [editingSchoolYear,  setEditingSchoolYear]  = useState(false)
  const [syStartInput,       setSyStartInput]       = useState('')
  const [syEndInput,         setSyEndInput]         = useState('')
  const [syStartSaving,      setSyStartSaving]      = useState(false)
  const [requiredDays,   setRequiredDays]   = useState('—')
  const [coTeacherCount, setCoTeacherCount] = useState(0)
  const [kids,           setKids]           = useState<Kid[]>([])
  const [tier,           setTier]           = useState<UserTier>('FREE')
  const [renewDate,      setRenewDate]      = useState<string | null>(null)
  const [editingKid,     setEditingKid]     = useState<any | null>(null)
  const [addingKid,      setAddingKid]      = useState(false)
  const [orgId,          setOrgId]          = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Email + name from auth metadata
      const userEmail = user.email ?? ''
      setEmail(userEmail)
      const name = user.user_metadata?.full_name || user.user_metadata?.name || ''
      setFullName(name)
      if (name) {
        const parts = name.trim().split(' ')
        setInitials(parts.map((p: string) => p[0]).join('').toUpperCase().slice(0, 2))
      } else {
        setInitials(userEmail.slice(0, 2).toUpperCase())
      }

      const { orgId } = await getOrganizationId(user.id)
      if (!orgId) { setLoading(false); return }
      setOrgId(orgId)

      // Parallel data fetches
      const [orgRes, syRes, kidsRes, coRes, subRes] = await Promise.all([
        supabase.from('organizations')
          .select('name, state, teaching_style')
          .eq('id', orgId)
          .maybeSingle(),
        supabase.from('school_year_settings')
          .select('school_year_start, school_year_end, annual_goal_value, annual_goal_type')
          .eq('organization_id', orgId)
          .maybeSingle(),
        supabase.from('kids')
          .select('id, displayname, grade')
          .eq('organization_id', orgId)
          .order('displayname'),
        supabase.from('user_organizations')
          .select('user_id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        supabase.from('user_subscriptions')
          .select('tier, subscription_end')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      // Org
      if (orgRes.data) {
        setOrgName(orgRes.data.name ?? null)
        setOrgState(orgRes.data.state ?? null)
        setTeachingStyle(orgRes.data.teaching_style ?? null)
      }

      // School year
      if (syRes.data) {
        const fmt = (s: string | null) => {
          if (!s) return null
          const d = new Date(s + 'T12:00:00')
          return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        }
        const start = fmt(syRes.data.school_year_start)
        const end   = fmt(syRes.data.school_year_end)
        if (start && end) setSchoolYearStr(`${start} – ${end}`)
        else if (start)   setSchoolYearStr(start)
        if (syRes.data.school_year_start) setSchoolYearStartRaw(syRes.data.school_year_start)
        if (syRes.data.school_year_end)   setSchoolYearEndRaw(syRes.data.school_year_end)

        const val  = syRes.data.annual_goal_value
        const type = (syRes.data.annual_goal_type ?? 'days').toLowerCase()
        if (val) {
          setRequiredDays(type === 'hours' ? `${val} hours` : `${val} days / 9 months`)
        }
      }

      // Kids + subjects
      const kidsData = kidsRes.data ?? []
      if (kidsData.length > 0) {
        const kidIds = kidsData.map((k: { id: string }) => k.id)
        const { data: lessonRows } = await supabase
          .from('lessons')
          .select('kid_id, subject')
          .in('kid_id', kidIds)
          .not('subject', 'is', null)

        const subsByKid: Record<string, Set<string>> = {}
        for (const row of (lessonRows ?? [])) {
          if (!row.kid_id || !row.subject) continue
          if (!subsByKid[row.kid_id]) subsByKid[row.kid_id] = new Set()
          subsByKid[row.kid_id].add(row.subject)
        }

        setKids(kidsData.map((k: { id: string; displayname: string; grade?: string }) => ({
          ...k,
          subjects: subsByKid[k.id] ? Array.from(subsByKid[k.id]).slice(0, 5) : [],
        })))
      } else {
        setKids([])
      }

      // Co-teachers
      setCoTeacherCount(coRes.count ?? 0)

      // Subscription
      if (subRes.data) {
        setTier((subRes.data.tier as UserTier) || 'FREE')
        if (subRes.data.subscription_end) {
          setRenewDate(new Date(subRes.data.subscription_end).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          }))
        }
      }

      setLoading(false)
    }
    init()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3d3a52' }}>
        <div style={{ color: '#c4b5fd', fontWeight: 800, fontSize: 18, fontFamily: "'Nunito', sans-serif" }}>Loading...</div>
      </div>
    )
  }

  const openEditKid = async (kidId: string) => {
    const { data } = await supabase.from('kids').select('*').eq('id', kidId).single()
    if (data) setEditingKid(data)
  }

  const handleSaveKid = async (data: any) => {
    const { photoFile, ...fields } = data
    if (photoFile) {
      const ext  = photoFile.name.split('.').pop()
      const path = `kids/${data.id}/avatar.${ext}`
      await supabase.storage.from('avatars').upload(path, photoFile, { upsert: true })
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      fields.photo_url = publicUrl
    }
    await supabase.from('kids').update(fields).eq('id', data.id)
    // Update local state so name/grade reflects immediately
    setKids(prev => prev.map(k => k.id === data.id ? { ...k, displayname: fields.displayname, grade: fields.grade } : k))
    setEditingKid(null)
  }

  const handleAddKid = async (data: any) => {
    if (!orgId) return
    const { photoFile, id: _id, ...fields } = data
    const { data: newKid } = await supabase
      .from('kids')
      .insert({ ...fields, organization_id: orgId })
      .select('id, displayname, grade')
      .single()
    if (newKid && photoFile) {
      const ext  = photoFile.name.split('.').pop()
      const path = `kids/${newKid.id}/avatar.${ext}`
      await supabase.storage.from('avatars').upload(path, photoFile, { upsert: true })
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('kids').update({ photo_url: publicUrl }).eq('id', newKid.id)
    }
    if (newKid) {
      setKids(prev => [...prev, { id: newKid.id, displayname: newKid.displayname, grade: newKid.grade, subjects: [] }])
    }
    setAddingKid(false)
  }

  const tierInfo  = TIER_INFO[tier]
  const styleKey  = teachingStyle?.toLowerCase().replace(/[\s_-]/g, '') ?? ''
  const styleName = STYLE_NAMES[styleKey] ?? teachingStyle ?? null
  const styleDesc = STYLE_DESCS[styleKey] ?? ''

  const accountRows = [
    { label: 'Email',        value: email },
    { label: 'Subscription', value: `${tierInfo.name} · ${tierInfo.priceYearly}` },
    { label: 'Renews',       value: renewDate ?? (tier === 'FREE' ? 'N/A' : '—') },
  ]

  return (
    <>
    <div className="hr-page" style={{ fontFamily: "'Nunito', sans-serif", paddingBottom: 88 }}>
      <style>{`.profile-kid-row:hover { background: rgba(124,58,237,0.04) !important; }`}</style>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 20px 0' }}>

        {/* ── Header hero card ── */}
        <div className="hr-card" style={{ padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Initials avatar */}
            <div style={{
              width: 66, height: 66, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(124,58,237,0.12)',
              border: '2px solid rgba(124,58,237,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 900, color: '#7c3aed',
            }}>
              {initials}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', marginBottom: 2 }}>
                {fullName || email}
              </div>
              {orgName && (
                <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, marginBottom: 8 }}>
                  {orgName}{orgState ? ` · ${orgState}` : ''}
                </div>
              )}
              <span style={{
                background: '#ede9fe', borderRadius: 20,
                padding: '3px 12px', fontSize: 11, fontWeight: 800, color: '#7c3aed',
              }}>
                {tierInfo.name} plan
              </span>
            </div>

            <button
              onClick={() => router.push('/profile/edit')}
              style={{
                background: 'none', border: 'none', color: '#7c3aed',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Nunito', sans-serif", alignSelf: 'flex-start',
              }}>
              Edit
            </button>
          </div>
        </div>

        {/* ── School Setup ── */}
        <div className="hr-section-label" style={{ marginBottom: 8, paddingLeft: 4 }}>
          SCHOOL SETUP
        </div>
        <div className="hr-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
          {/* School year — inline editable */}
          {editingSchoolYear ? (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4b5563', marginBottom: 10 }}>School year</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>Start</label>
                  <input
                    type="date"
                    value={syStartInput}
                    onChange={e => setSyStartInput(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 13, fontFamily: "'Nunito', sans-serif", color: '#1a1a2e' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>End <span style={{ fontWeight: 400 }}>(optional)</span></label>
                  <input
                    type="date"
                    value={syEndInput}
                    onChange={e => setSyEndInput(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 13, fontFamily: "'Nunito', sans-serif", color: '#1a1a2e' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={!syStartInput || syStartSaving}
                  onClick={async () => {
                    if (!orgId || !syStartInput) return
                    setSyStartSaving(true)
                    await supabase.from('school_year_settings').upsert({
                      organization_id: orgId,
                      school_year_start: syStartInput,
                      school_year_end: syEndInput || null,
                      updated_at: new Date().toISOString(),
                    }, { onConflict: 'organization_id' })
                    setSchoolYearStartRaw(syStartInput)
                    setSchoolYearEndRaw(syEndInput)
                    const fmt = (s: string) => {
                      if (!s) return null
                      return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    }
                    const s = fmt(syStartInput)
                    const e = fmt(syEndInput)
                    setSchoolYearStr(s && e ? `${s} – ${e}` : s ?? '—')
                    setSyStartSaving(false)
                    setEditingSchoolYear(false)
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
                    border: 'none', borderRadius: 8, padding: '8px 16px',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'Nunito', sans-serif",
                    opacity: !syStartInput || syStartSaving ? 0.5 : 1,
                  }}
                >
                  {syStartSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingSchoolYear(false)}
                  style={{
                    background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8,
                    padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#6b7280',
                    cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 14, color: '#4b5563', fontWeight: 600 }}>School year</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{schoolYearStr}</span>
                <button
                  onClick={() => {
                    setSyStartInput(schoolYearStartRaw)
                    setSyEndInput(schoolYearEndRaw)
                    setEditingSchoolYear(true)
                  }}
                  style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", padding: '2px 6px' }}
                >
                  Edit
                </button>
              </div>
            </div>
          )}
          <InfoRow label="State"         value={orgState || '—'} />
          <InfoRow label="Required days" value={requiredDays} />
          <InfoRow label="Co-teachers"   value={coTeacherCount > 0 ? `${coTeacherCount} active` : '—'} last />
        </div>

        {/* ── Teaching Style ── */}
        <div className="hr-section-label" style={{ marginBottom: 8, paddingLeft: 4 }}>
          TEACHING STYLE
        </div>
        <div className="hr-card" style={{ padding: '18px 22px', marginBottom: 20 }}>
          {styleName ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e' }}>{styleName}</span>
                <span style={{
                  background: '#dcfce7', borderRadius: 20,
                  padding: '3px 12px', fontSize: 11, fontWeight: 800, color: '#15803d',
                  border: '1px solid #bbf7d0',
                }}>
                  Active
                </span>
              </div>
              {styleDesc && (
                <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.65, margin: '0 0 12px' }}>
                  {styleDesc}
                </p>
              )}
              <div style={{
                background: '#f5f3ff', borderRadius: 10,
                padding: '10px 14px', fontSize: 12, color: '#7c3aed',
                fontWeight: 600, marginBottom: 14, lineHeight: 1.5,
              }}>
                • Copilot uses this style when generating lessons and activities for your family.
              </div>
              <button
                onClick={() => router.push('/profile/teaching-style')}
                style={{
                  background: 'none', border: 'none', color: '#7c3aed',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif", padding: 0,
                }}>
                Change teaching style
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, margin: '0 0 14px' }}>
                Not set yet. Answer a few quick questions and we'll find your style.
              </p>
              <button
                onClick={() => router.push('/profile/teaching-style')}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                  border: 'none', borderRadius: 12, color: '#fff',
                  fontSize: 13, fontWeight: 800, padding: '10px 20px',
                  cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                  boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
                }}>
                Find my teaching style →
              </button>
            </>
          )}
        </div>

        {/* ── Children ── */}
        <div className="hr-section-label" style={{ marginBottom: 8, paddingLeft: 4 }}>
          CHILDREN
        </div>
        <div className="hr-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
          {kids.map((kid, idx) => {
            const color = KID_COLORS[idx % KID_COLORS.length]
            const grade = kid.grade
            const subjectLine = kid.subjects.join(', ')
            const subtitle = [grade, subjectLine].filter(Boolean).join(' · ')
            return (
              <div key={kid.id} className="profile-kid-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  transition: 'background 0.1s',
                }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, cursor: 'pointer' }}
                  onClick={() => router.push(`/subjects?kid=${kid.id}`)}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 900, color: '#fff',
                  }}>
                    {kid.displayname[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 2 }}>
                      {kid.displayname}
                    </div>
                    {subtitle && (
                      <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 600 }}>{subtitle}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openEditKid(kid.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, color: '#7c3aed',
                    fontFamily: "'Nunito', sans-serif", padding: '4px 8px',
                  }}>
                  Edit
                </button>
              </div>
            )
          })}

          {/* Add another child */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px', cursor: 'pointer',
            }}
            onClick={() => setAddingKid(true)}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              border: '2px dashed #7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: '#7c3aed',
            }}>
              +
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>Add another child</span>
          </div>
        </div>

        {/* ── Account ── */}
        <div className="hr-section-label" style={{ marginBottom: 8, paddingLeft: 4 }}>
          ACCOUNT
        </div>
        <div className="hr-card" style={{ marginBottom: 24, overflow: 'hidden' }}>
          {accountRows.map((row, i) => (
            <InfoRow key={row.label} label={row.label} value={row.value} last={i === accountRows.length - 1} />
          ))}
        </div>

        {/* Upgrade if not premium */}
        {tier !== 'PREMIUM' && (
          <button
            onClick={() => router.push('/pricing')}
            style={{
              width: '100%', marginBottom: 16,
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              border: 'none', borderRadius: 14, color: '#fff',
              fontSize: 14, fontWeight: 800, padding: '13px 0',
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
            }}>
            Upgrade Plan ›
          </button>
        )}

        {/* Sign out */}
        <div style={{ textAlign: 'center' as const, paddingBottom: 8 }}>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/')
            }}
            style={{
              background: 'rgba(255,255,255,0.72)', border: '1.5px solid rgba(239,68,68,0.3)',
              borderRadius: 12, padding: '11px 32px',
              fontSize: 14, fontWeight: 700, color: '#ef4444',
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
            }}>
            Sign Out
          </button>
        </div>

      </div>

    </div>

    {editingKid && (
      <KidProfileForm
        kid={editingKid}
        onSave={handleSaveKid}
        onCancel={() => setEditingKid(null)}
      />
    )}
    {addingKid && (
      <KidProfileForm
        onSave={handleAddKid}
        onCancel={() => setAddingKid(false)}
      />
    )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#3d3a52' }} />}>
        <ProfileContent />
      </Suspense>
    </AuthGuard>
  )
}
