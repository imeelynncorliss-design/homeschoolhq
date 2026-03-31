'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { ExternalLink } from '@/components/ExternalLink'
import { supabase } from '@/src/lib/supabase'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'
import { pageShell } from '@/src/lib/designTokens'
import { MI_INTELLIGENCES, MI_CLUSTERS, MI_REMEMBER, VAK_TIPS } from '@/src/lib/learningProfiles'
import { getVakBridge, getMiTips } from '@/src/lib/teachingBlueprint'

type BlueprintKid = {
  id: string
  displayname: string
  learning_style?: string | null
  mi_profile?: string[] | null
}

// ─── Guides Tab ───────────────────────────────────────────────────────────────

function GuidesTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[
        {
          title: '🌱 What is deschooling?',
          body: "Deschooling is the intentional transition period between traditional school and homeschooling. It's not a break from learning — it's a reset. Children (and parents) need time to shed the habits and expectations of institutional school before a new rhythm can take hold.",
          link: 'https://hslda.org/post/deschooling-making-the-switch-from-traditional-school-to-homeschooling',
          linkLabel: "Read HSLDA's guide to deschooling →",
          bg: '#f5f3ff',
          border: '#ede9fe',
        },
        {
          title: '📁 What is a portfolio?',
          body: 'A homeschool portfolio is a collection of your child\'s work over time — writing samples, art, projects, photos of experiments, test scores, and more. In some states it\'s required; in others it\'s just a powerful record of growth. HomeschoolReady helps you build yours automatically.',
          link: null,
          bg: '#f0fdf4',
          border: '#d1fae5',
        },
        {
          title: '📋 What is an NOI (Notice of Intent)?',
          body: "A Notice of Intent is a simple letter you file with your school district (or state) to notify them that you're homeschooling. Some states call it a Declaration of Intent, Affidavit, or IHIP. HomeschoolReady's compliance tracker knows what your state requires.",
          link: null,
          bg: '#fff7ed',
          border: '#fed7aa',
        },
      ].map(g => (
        <div key={g.title} style={{ background: g.bg, borderRadius: 14, padding: '16px 20px', border: `1px solid ${g.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1e1b4b', marginBottom: 6 }}>{g.title}</div>
          <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7, margin: g.link ? '0 0 10px' : 0 }}>{g.body}</p>
          {g.link && (
            <ExternalLink href={g.link} style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>
              {g.linkLabel}
            </ExternalLink>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ParentsCornerContent() {
  const router = useRouter()
  useAppHeader({ title: "🪴 Parent's Corner" })

  const [loading, setLoading] = useState(true)
  const [blueprintKids, setBlueprintKids] = useState<BlueprintKid[]>([])
  const [blueprintOrgStyle, setBlueprintOrgStyle] = useState<string | null>(null)

  const [activeSection, setActiveSection] = useState<'blueprint' | 'vak' | 'mi' | 'mi_tips' | 'guides'>('blueprint')
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null)
  const [miProfile, setMiProfile] = useState<string[]>([])
  const [expandedVak, setExpandedVak] = useState<string | null>(null)
  const [expandedMiTip, setExpandedMiTip] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { orgId } = await getOrganizationId(user.id)
      if (orgId) {
        const [orgRes, kidsRes] = await Promise.all([
          supabase.from('organizations').select('teaching_style').eq('id', orgId).maybeSingle(),
          supabase.from('kids').select('id, displayname, learning_style, mi_profile').eq('organization_id', orgId).eq('archived', false).order('displayname'),
        ])
        setBlueprintOrgStyle(orgRes.data?.teaching_style ?? null)
        const kids = kidsRes.data ?? []
        setBlueprintKids(kids)
        if (kids.length > 0) setSelectedKidId(kids[0].id)
      }
      setLoading(false)
    }
    init()
  }, [])

  const toggleMi = (id: string) =>
    setMiProfile(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3d3a52' }}>
        <div style={{ color: '#7c3aed', fontWeight: 700, fontSize: 16 }}>Loading...</div>
      </div>
    )
  }

  const styleMap: Record<string, string> = { charlotte_mason: 'charlotte', unit_studies: 'unit' }
  const vakMap: Record<string, string> = { aural: 'auditory' }
  const blueprintOrgStyleId = styleMap[blueprintOrgStyle ?? ''] ?? blueprintOrgStyle ?? ''
  const kid = blueprintKids.find(k => k.id === selectedKidId) ?? blueprintKids[0]

  const SECTIONS = [
    { id: 'blueprint' as const, label: '🗺️ Teaching Blueprint' },
    { id: 'vak' as const,       label: '👁️ Learning Style Tips' },
    { id: 'mi' as const,        label: '🧠 Parent Self-Assessment' },
    { id: 'mi_tips' as const,   label: '💡 MI Tips' },
    { id: 'guides' as const,    label: '🌱 Guides' },
  ]

  return (
    <div style={{ ...pageShell.root, paddingBottom: 80 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px 48px' }}>

        <div className="hr-section-label" style={{ marginBottom: 14 }}>TEACHING BLUEPRINT · LEARNING STYLE TIPS · PARENT SELF-ASSESSMENT · MI TIPS · GUIDES</div>

        {/* Section pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' as const }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700,
                border: '1.5px solid',
                borderColor: activeSection === s.id ? '#7c3aed' : 'rgba(124,58,237,0.2)',
                background: activeSection === s.id ? '#7c3aed' : 'rgba(255,255,255,0.7)',
                color: activeSection === s.id ? '#fff' : '#7c3aed',
                cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Teaching Blueprint ── */}
        {activeSection === 'blueprint' && (() => {
          if (!blueprintOrgStyle || blueprintKids.length === 0) {
            return (
              <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #e5e7eb', textAlign: 'center' as const }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🗺️</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 6 }}>No blueprint yet</div>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                  Complete onboarding and set your child&apos;s learning style to generate your Teaching Blueprint.
                </p>
              </div>
            )
          }

          const vakStyles = kid?.learning_style ? kid.learning_style.split(',').map(s => s.trim()).filter(Boolean) : []
          let bridge = null
          let topVak: string | null = null
          for (const s of vakStyles) {
            const mapped = vakMap[s] ?? s
            const b = getVakBridge(blueprintOrgStyleId, mapped)
            if (b) { bridge = b; topVak = mapped; break }
          }
          const extraStyles = vakStyles.filter(s => (vakMap[s] ?? s) !== topVak)
          const miTips = (kid?.mi_profile?.length ?? 0) > 0 ? getMiTips(kid!.mi_profile!, blueprintOrgStyleId) : []

          return (
            <div>
              {blueprintKids.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
                  {blueprintKids.map(k => (
                    <button
                      key={k.id}
                      onClick={() => setSelectedKidId(k.id)}
                      style={{
                        padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700,
                        border: '1.5px solid',
                        borderColor: selectedKidId === k.id ? '#7c3aed' : 'rgba(124,58,237,0.2)',
                        background: selectedKidId === k.id ? '#7c3aed' : 'rgba(255,255,255,0.7)',
                        color: selectedKidId === k.id ? '#fff' : '#7c3aed',
                        cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                      }}
                    >{k.displayname}</button>
                  ))}
                </div>
              )}

              {!bridge && miTips.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #e5e7eb', textAlign: 'center' as const }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🗺️</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
                    No learning profile for {kid?.displayname ?? 'this child'}
                  </div>
                  <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                    Set their learning style and MI profile in Profile → Edit Child to unlock their blueprint.
                  </p>
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e5e7eb' }}>
                  {bridge && (
                    <>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{bridge.headline}</div>
                      {extraStyles.length > 0 && (
                        <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginBottom: 8 }}>
                          Also selected: {extraStyles.map(s => s === 'read_write' ? 'Read/Write' : s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
                          {extraStyles.includes('read_write') && ' — Read/Write learners benefit from written notes and outlines; ask Scout to create written summaries for any lesson.'}
                        </div>
                      )}
                      <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: '0 0 16px' }}>{bridge.intro}</p>
                      <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                        {bridge.tips.map((tip: string, i: number) => (
                          <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                            <span style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }}>•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                      {bridge.scoutTip && (
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('open-scout-copilot', { detail: { prompt: bridge.scoutTip } }))}
                          style={{ background: '#f5f3ff', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: miTips.length > 0 ? 20 : 0, border: '1.5px solid #ede9fe', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#ede9fe')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#f5f3ff')}
                        >
                          <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 4px', fontSize: 15, color: '#6d28d9', lineHeight: 1.6 }}>{bridge.scoutTip}</p>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>Tap to ask Scout →</span>
                          </div>
                        </button>
                      )}
                    </>
                  )}

                  {miTips.length > 0 && (
                    <div style={bridge ? { paddingTop: 16, borderTop: '1px solid #f3f4f6' } : {}}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>
                        {kid?.displayname}&apos;s Intelligence Strengths
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                        {(kid?.mi_profile ?? []).map((miId, i) => {
                          const miDef = MI_INTELLIGENCES.find(m => m.id === miId)
                          const tipEntry = miTips[i]
                          if (!miDef || !tipEntry) return null
                          return (
                            <div key={miId}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 20 }}>{miDef.emoji}</span>
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#1e1b4b' }}>{miDef.fullName}</span>
                              </div>
                              <p style={{ margin: '0 0 4px 28px', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{miDef.detail}</p>
                              {tipEntry.styleTip && (
                                <div style={{ margin: '0 0 0 28px', fontSize: 13, color: '#7c3aed', fontWeight: 600, lineHeight: 1.5 }}>
                                  → {tipEntry.styleTip}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Parent Self-Assessment ── */}
        {activeSection === 'mi' && (
          <div>
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e5e7eb', marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Parent Self-Assessment</div>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: '0 0 16px' }}>
                How you learn often shapes how you teach — even unconsciously. Pick your top 3 intelligences to build your own MI profile. Use this alongside your child&apos;s profile to find your best teaching fit.
              </p>

              {(['analytical', 'introspective', 'interactive'] as const).map(cluster => {
                const clusterInfo = MI_CLUSTERS[cluster]
                const items = MI_INTELLIGENCES.filter(mi => mi.cluster === cluster)
                return (
                  <div key={cluster} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: clusterInfo.color, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                      {clusterInfo.label} — <span style={{ fontWeight: 600, textTransform: 'none' as const, color: '#9ca3af' }}>{clusterInfo.tagline}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      {items.map(mi => {
                        const selected = miProfile.includes(mi.id)
                        const maxed = miProfile.length >= 3 && !selected
                        return (
                          <button
                            key={mi.id}
                            onClick={() => !maxed && toggleMi(mi.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                              border: `1.5px solid ${selected ? '#7c3aed' : '#e5e7eb'}`,
                              background: selected ? '#f5f3ff' : maxed ? '#f9fafb' : '#fff',
                              cursor: maxed ? 'default' : 'pointer',
                              opacity: maxed ? 0.5 : 1,
                              fontFamily: "'Nunito', sans-serif", width: '100%',
                            }}
                          >
                            <span style={{ fontSize: 20 }}>{mi.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{mi.name}</div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>{mi.detail}</div>
                            </div>
                            {selected && <span style={{ fontSize: 16, color: '#7c3aed' }}>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {miProfile.length > 0 && (
                <div style={{ marginTop: 12, padding: '14px 16px', background: '#f5f3ff', borderRadius: 12, border: '1.5px solid #ede9fe' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', marginBottom: 8 }}>Your top intelligences:</div>
                  {miProfile.map(id => {
                    const mi = MI_INTELLIGENCES.find(m => m.id === id)
                    return (
                      <div key={id} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e1b4b' }}>{mi?.emoji} {mi?.fullName}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{mi?.detail}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ marginTop: 14, padding: '10px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' as const }}>Remember</div>
                {MI_REMEMBER.map(r => <div key={r} style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>· {r}</div>)}
              </div>
            </div>
          </div>
        )}

        {/* ── VAK Learning Style Tips ── */}
        {activeSection === 'vak' && (
          <div>
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e5e7eb', marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Learning Style Tips (VAK)</div>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: '0 0 16px' }}>
                Visual, Auditory, and Kinesthetic — the three modes of how information is best received. Use these tips to shape how you deliver lessons to your child.
              </p>
              {Object.entries(VAK_TIPS).map(([key, vak]) => (
                <div key={key} style={{ border: '1.5px solid', borderColor: expandedVak === key ? '#7c3aed' : '#e5e7eb', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpandedVak(expandedVak === key ? null : key)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: expandedVak === key ? '#f5f3ff' : '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{vak.emoji} {vak.label} Learners</span>
                    <span style={{ fontSize: 18, color: '#9ca3af' }}>{expandedVak === key ? '−' : '+'}</span>
                  </button>
                  {expandedVak === key && (
                    <div style={{ padding: '0 16px 16px' }}>
                      {vak.tips.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
                          <span style={{ color: '#7c3aed', fontWeight: 800, flexShrink: 0 }}>→</span>
                          <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MI Tips ── */}
        {activeSection === 'mi_tips' && (
          <div>
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e5e7eb', marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 6 }}>MI Tips for Parents</div>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: '0 0 16px' }}>
                Each intelligence type comes with a unique superpower and practical strategies you can use right now. Expand any type to see how to bring it to life in your child&apos;s lessons.
              </p>
              {[
                {
                  id: 'linguistic',
                  emoji: '📝',
                  name: 'Linguistic',
                  badge: '"Word Smart"',
                  description: 'Thinks in words; loves reading, writing, storytelling, and wordplay.',
                  superpower: 'You love stories, puns, and the "why" behind words.',
                  strategy: 'Have them narrate the lesson back to you or write a "journal entry" from a historical figure\'s POV.',
                },
                {
                  id: 'logical',
                  emoji: '🔢',
                  name: 'Logical-Mathematical',
                  badge: '"Number Smart"',
                  description: 'Reasons by logic, patterns, and cause-and-effect.',
                  superpower: 'You see patterns, categories, and cause-and-effect everywhere.',
                  strategy: 'Use timelines for history, logic puzzles for breaks, and "if/then" scenarios for science.',
                },
                {
                  id: 'spatial',
                  emoji: '🎨',
                  name: 'Spatial',
                  badge: '"Picture Smart"',
                  description: 'Thinks visually; excels at maps, puzzles, and 3D reasoning.',
                  superpower: 'You think in 3D and remember what you see better than what you hear.',
                  strategy: 'Swap a written report for a poster, a mind-map, or a Minecraft build of the lesson topic.',
                },
                {
                  id: 'kinesthetic',
                  emoji: '🤸',
                  name: 'Kinesthetic',
                  badge: '"Body Smart"',
                  description: 'Learns through movement, hands-on activities, and physical sensation.',
                  superpower: 'You learn by doing. Sitting still is your biggest "learning tax."',
                  strategy: 'Use "math manipulatives" (blocks/beads), take "nature walks" for science, or use a standing desk.',
                },
                {
                  id: 'musical',
                  emoji: '🎵',
                  name: 'Musical',
                  badge: '"Music Smart"',
                  description: 'Sensitive to rhythm, pitch, and sound patterns.',
                  superpower: 'You are sensitive to rhythm, pitch, and patterns in sound.',
                  strategy: 'Turn facts into a rap/song, use background music to set the "mood" of a lesson, or use a metronome for math facts.',
                },
                {
                  id: 'interpersonal',
                  emoji: '🤝',
                  name: 'Interpersonal',
                  badge: '"People Smart"',
                  description: 'Understands and connects with others easily.',
                  superpower: 'You process information best when talking it through with others.',
                  strategy: 'Host a family "debate," have them "tutor" a younger sibling, or use a "Socratic seminar" style of questioning.',
                },
                {
                  id: 'intrapersonal',
                  emoji: '🧘',
                  name: 'Intrapersonal',
                  badge: '"Self Smart"',
                  description: 'Self-aware and reflective; understands their own emotions and goals.',
                  superpower: 'You need quiet time to "mull things over" and set your own goals.',
                  strategy: 'Give them a quiet corner, let them choose their own project topics, and encourage "self-reflection" logs.',
                },
                {
                  id: 'naturalist',
                  emoji: '🌿',
                  name: 'Naturalist',
                  badge: '"Nature Smart"',
                  description: 'Energized by the natural world; excels at categorizing living things.',
                  superpower: 'You are energized by the outdoors and categorizing the living world.',
                  strategy: 'Move the classroom outside, use "real-world" examples (leaves, bugs, rocks), and connect lessons to the environment.',
                },
              ].map(mi => {
                const isOpen = expandedMiTip === mi.id
                return (
                  <div key={mi.id} style={{ border: `1.5px solid ${isOpen ? '#7c3aed' : '#e5e7eb'}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedMiTip(isOpen ? null : mi.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: isOpen ? '#f5f3ff' : '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Nunito', sans-serif", gap: 10 }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{mi.emoji}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{mi.name} <span style={{ color: '#9ca3af', fontWeight: 600 }}>{mi.badge}</span></span>
                      </span>
                      <span style={{ fontSize: 18, color: '#9ca3af', flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                        <div style={{ paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{mi.description}</p>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>The Student&apos;s Superpower ✨</div>
                          <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6, fontStyle: 'italic' }}>&ldquo;{mi.superpower}&rdquo;</p>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>Parent Strategy: Try This...</div>
                          <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                            <span style={{ color: '#7c3aed', fontWeight: 800, flexShrink: 0 }}>→</span>
                            <span>{mi.strategy}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Guides ── */}
        {activeSection === 'guides' && <GuidesTab />}

      </div>
    </div>
  )
}

export default function ParentsCornerPage() {
  return (
    <AuthGuard>
      <Suspense>
        <ParentsCornerContent />
      </Suspense>
    </AuthGuard>
  )
}
