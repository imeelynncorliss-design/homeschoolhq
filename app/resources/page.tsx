'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { supabase } from '@/src/lib/supabase'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'

// ─── Static Data ──────────────────────────────────────────────────────────────

const TEACHING_STYLES = [
  {
    id: 'charlotte',
    emoji: '🌿',
    name: 'Charlotte Mason',
    color: '#7c3aed',
    bg: '#ede9fe',
    tagline: 'Learning through living — short lessons, big ideas, the great outdoors.',
    desc: 'Short focused lessons, living books, nature study, and narration. Typically 15–20 minutes per lesson, keeping kids energized and curious.',
    strengths: ['Short focused lessons', 'Builds love of reading', 'Lots of hands-on learning'],
    curricula: ['Ambleside Online', 'Simply Charlotte Mason', 'Gentle + Classical'],
  },
  {
    id: 'traditional',
    emoji: '🏫',
    name: 'Traditional',
    color: '#6d28d9',
    bg: '#ede9fe',
    tagline: 'Structure gives you confidence — and your kids know what to expect.',
    desc: 'Textbooks, workbooks, and scheduled lessons. Closest to a classroom experience — with the huge advantage of one-on-one attention.',
    strengths: ['Clear daily structure', 'Easy to track progress', 'Familiar to new parents'],
    curricula: ['Abeka', 'Saxon Math', 'Easy Peasy All-in-One'],
  },
  {
    id: 'eclectic',
    emoji: '🎨',
    name: 'Eclectic',
    color: '#9333ea',
    bg: '#f5f3ff',
    tagline: 'You take the best from everything — and make it your own.',
    desc: 'Mix and match methods based on what works for each child and subject. The most common approach among experienced homeschool families.',
    strengths: ['Maximum flexibility', 'Tailored to each child', 'Adapts as kids grow'],
    curricula: ['Build Your Library', 'Teaching Textbooks', 'Khan Academy'],
  },
  {
    id: 'unschooling',
    emoji: '✨',
    name: 'Unschooling',
    color: '#a855f7',
    bg: '#f5f3ff',
    tagline: 'Trust the learner. Follow the curiosity. Get out of the way.',
    desc: "Learning flows from the child's interests and daily life. Requires deep trust in the process and an abundance of rich experiences.",
    strengths: ['Intrinsically motivated', 'No curriculum cost', 'Builds independent thinkers'],
    curricula: ['Khan Academy', 'Library + Real Life', 'Brave Writer'],
  },
  {
    id: 'classical',
    emoji: '📜',
    name: 'Classical',
    color: '#ec4899',
    bg: '#fdf2f8',
    tagline: 'Grammar, logic, rhetoric — teaching kids how to think, not what to think.',
    desc: 'Three-stage learning aligned to child\'s development. Heavy on great books, Latin, and Socratic discussion.',
    strengths: ['Trains critical thinking', 'Deep engagement with ideas', 'Strong writing foundation'],
    curricula: ['Classical Conversations', 'The Well-Trained Mind', 'Memoria Press'],
  },
]

const CURRICULUM_DETAILS: Record<string, Array<{ name: string; type: 'free' | 'paid'; desc: string; url: string }>> = {
  charlotte: [
    { name: 'Ambleside Online', type: 'free', desc: 'Free CM curriculum with curated living book lists and a structured year plan.', url: 'https://www.amblesideonline.org' },
    { name: 'Simply Charlotte Mason', type: 'paid', desc: 'Practical guides and planners for implementing the CM method. Great for beginners.', url: 'https://simplycharlottemason.com' },
    { name: 'Gentle + Classical', type: 'paid', desc: 'Blends CM with classical elements. Beautiful books and a warm, unhurried pace.', url: 'https://gentleclassical.com' },
  ],
  traditional: [
    { name: 'Abeka', type: 'paid', desc: 'Faith-based, fully structured K–12 curriculum with daily lesson plans and assessments.', url: 'https://www.abeka.com' },
    { name: 'Saxon Math', type: 'paid', desc: 'Incremental math curriculum with a strong track record in homeschool families.', url: 'https://www.saxonmath.com' },
    { name: 'Easy Peasy All-in-One', type: 'free', desc: 'A completely free online curriculum covering all core subjects K–8.', url: 'https://allinonehomeschool.com' },
  ],
  eclectic: [
    { name: 'Build Your Library', type: 'paid', desc: 'Literature-based guides you layer over any resources you already have.', url: 'https://buildyourlibrary.com' },
    { name: 'Teaching Textbooks', type: 'paid', desc: 'Self-grading math with audio/visual lessons. Kids love the independence.', url: 'https://www.teachingtextbooks.com' },
    { name: 'Khan Academy', type: 'free', desc: 'Free world-class math, science, and more. Works for all styles as a supplement.', url: 'https://www.khanacademy.org' },
  ],
  unschooling: [
    { name: 'Khan Academy', type: 'free', desc: 'Self-paced, child-led learning with zero pressure.', url: 'https://www.khanacademy.org' },
    { name: 'Library + Real Life', type: 'free', desc: 'A library card, documentaries, and daily experiences often provide everything needed.', url: 'https://www.worldcat.org/libraries' },
    { name: 'Brave Writer', type: 'paid', desc: "Child-led writing approach that celebrates each child's natural voice.", url: 'https://bravewriter.com' },
  ],
  classical: [
    { name: 'Classical Conversations', type: 'paid', desc: 'Community-based classical program with weekly group learning.', url: 'https://classicalconversations.com' },
    { name: 'The Well-Trained Mind', type: 'paid', desc: 'The definitive guide to classical homeschooling by Susan Wise Bauer.', url: 'https://welltrainedmind.com' },
    { name: 'Memoria Press', type: 'paid', desc: 'Traditional classical curriculum with Latin, logic, and great books.', url: 'https://www.memoriapress.com' },
  ],
}

const COMPLIANCE_TERMS = [
  {
    term: '📋 Notice of Intent (NOI)',
    def: 'A formal letter sent to your local school district to notify them you are homeschooling. Some states require this annually — others don\'t require it at all. Think of it as registering your homeschool each year.',
  },
  {
    term: '📁 Portfolio',
    def: "A collection of your child's work throughout the year — writing samples, art, worksheets, project photos, and reading logs. Some states require annual submission to a certified teacher to show educational progress.",
  },
  {
    term: '📊 Annual Assessment',
    def: "An evaluation of your child's progress. Can be a standardized test, portfolio review, or another approved method depending on your state.",
  },
  {
    term: '📅 Instructional Days',
    def: 'The minimum number of days you must teach each year. Most states require 150–180 days. HomeschoolReady counts a teaching day when at least one lesson is marked complete.',
  },
  {
    term: '🏫 Umbrella School',
    def: 'A private school that homeschool families can enroll in to satisfy legal requirements in certain states. The umbrella school holds official records and may provide accreditation.',
  },
]

// ─── Gradient helpers ─────────────────────────────────────────────────────────

const G = {
  full: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 45%, #a855f7 75%, #ec4899 100%)',
  purple: 'linear-gradient(135deg, #7c3aed, #a855f7)',
  pink: 'linear-gradient(135deg, #a855f7, #ec4899)',
}

// ─── Teaching Styles Tab ──────────────────────────────────────────────────────

function TeachingStylesTab({
  userStyle,
  onViewCurriculum,
}: {
  userStyle: string | null
  onViewCurriculum: (styleId: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(userStyle || 'charlotte')

  return (
    <div>
      {userStyle && (
        <div style={css.infoBanner}>
          🎨 Your current teaching style is{' '}
          <strong>{TEACHING_STYLES.find(s => s.id === userStyle)?.name ?? userStyle}</strong>.
          Explore others below — most families blend two styles over time.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TEACHING_STYLES.map(style => {
          const isOpen = expanded === style.id
          const isUserStyle = style.id === userStyle

          return (
            <div
              key={style.id}
              style={{
                background: '#fff',
                borderRadius: 14,
                border: `2px solid ${isOpen ? style.color : '#e5e7eb'}`,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Accordion Header */}
              <div
                onClick={() => setExpanded(isOpen ? null : style.id)}
                style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  background: isOpen ? `linear-gradient(135deg, ${style.color}, #ec4899)` : style.bg,
                  transition: 'background 0.2s',
                }}>
                  {style.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{style.name}</span>
                    {isUserStyle && (
                      <span style={{
                        background: G.full, color: '#fff',
                        fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, letterSpacing: '0.04em',
                      }}>
                        YOUR STYLE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>"{style.tagline}"</div>
                </div>
                <span style={{
                  color: '#9ca3af', fontSize: 14,
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                  display: 'block',
                }}>
                  ▾
                </span>
              </div>

              {/* Accordion Body */}
              {isOpen && (
                <div style={{ padding: '0 18px 18px', borderTop: '1px solid #f3f4f6' }}>
                  <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7, margin: '14px 0' }}>{style.desc}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{
                      background: `${style.color}0f`,
                      borderRadius: 10, padding: '12px 14px',
                      border: `1px solid ${style.color}22`,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: style.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                        ✦ Strengths
                      </div>
                      {style.strengths.map(s => (
                        <div key={s} style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}>→ {s}</div>
                      ))}
                    </div>
                    <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                        📚 Often paired with
                      </div>
                      {style.curricula.map(c => (
                        <div key={c} style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}>→ {c}</div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onViewCurriculum(style.id)}
                    style={css.gradientBtn}
                  >
                    See {style.name} curriculum suggestions →
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Curriculum Tab ───────────────────────────────────────────────────────────

function CurriculumTab({ initialStyle }: { initialStyle: string }) {
  const [activeStyle, setActiveStyle] = useState(initialStyle)
  const curricula = CURRICULUM_DETAILS[activeStyle] ?? []

  return (
    <div>
      {/* Style filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {TEACHING_STYLES.map(s => {
          const isActive = activeStyle === s.id
          return (
            <button
              key={s.id}
              onClick={() => setActiveStyle(s.id)}
              style={{
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                background: isActive ? `linear-gradient(135deg, ${s.color}, #ec4899)` : '#fff',
                color: isActive ? '#fff' : '#6b7280',
                border: isActive ? 'none' : '1px solid #e5e7eb',
                boxShadow: isActive ? '0 3px 10px rgba(124,58,237,0.3)' : 'none',
              }}
            >
              {s.emoji} {s.name}
            </button>
          )
        })}
      </div>

      <div style={css.infoBanner}>
        📚 Showing curated options for <strong>{TEACHING_STYLES.find(s => s.id === activeStyle)?.name}</strong>.
        Always research before purchasing — curriculum fit is personal.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {curricula.map(item => (
          <div key={item.name} style={{
            background: '#fff', borderRadius: 14, padding: '16px 18px',
            border: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'flex-start', gap: 14,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{item.name}</span>
                <span style={{
                  background: item.type === 'free' ? '#fef9c3' : '#ede9fe',
                  color: item.type === 'free' ? '#78350f' : '#7c3aed',
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                }}>
                  {item.type === 'free' ? '✓ Free' : 'Paid'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'none',
                border: '1.5px solid #7c3aed',
                borderRadius: 8, padding: '7px 14px',
                fontSize: 12, fontWeight: 700, color: '#7c3aed',
                cursor: 'pointer', flexShrink: 0,
                textDecoration: 'none', display: 'inline-block',
                whiteSpace: 'nowrap',
              }}
            >
              Visit site →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Compliance Tab ───────────────────────────────────────────────────────────

function ComplianceTab() {
  return (
    <div>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '18px 20px',
        border: '1px solid #e5e7eb', marginBottom: 14,
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
          What is homeschool compliance?
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: 0 }}>
          Every state has different laws governing homeschooling — some require almost nothing, others
          require annual filings, testing, and portfolio reviews. Compliance means meeting your state's
          specific requirements each year. HomeschoolReady tracks all of this automatically once your
          state is set up.
        </p>
      </div>

      {COMPLIANCE_TERMS.map(item => (
        <div key={item.term} style={{
          background: '#fff', borderRadius: 14, padding: '15px 18px',
          border: '1px solid #e5e7eb', marginBottom: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 5 }}>{item.term}</div>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{item.def}</p>
        </div>
      ))}

      <div style={css.infoBanner}>
        💡 HomeschoolReady is not a legal advisor. Always verify requirements at{' '}
        <a
          href="https://hslda.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#7c3aed', fontWeight: 700 }}
        >
          HSLDA.org
        </a>{' '}
        or your state's Department of Education.
      </div>
    </div>
  )
}

// ─── Resources Content ────────────────────────────────────────────────────────

function ResourcesContent() {
  const router = useRouter()
  useAppHeader({ title: '💡 Resources', backHref: '/dashboard' })
  const [activeTab, setActiveTab] = useState<'styles' | 'curriculum' | 'compliance'>('styles')
  const [curriculumStyle, setCurriculumStyle] = useState('charlotte')
  const [userStyle, setUserStyle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { orgId } = await getOrganizationId(user.id)
      if (orgId) {
        // Try to pull teaching style from org settings
        const { data: orgSettings } = await supabase
          .from('organization_settings')
          .select('teaching_style')
          .eq('organization_id', orgId)
          .maybeSingle()

        if (orgSettings?.teaching_style) {
          const styleId = orgSettings.teaching_style.toLowerCase().replace(/\s+/g, '')
          // Map to our known ids
          const matched = TEACHING_STYLES.find(
            s => s.id === styleId || s.name.toLowerCase() === orgSettings.teaching_style.toLowerCase()
          )
          if (matched) {
            setUserStyle(matched.id)
            setCurriculumStyle(matched.id)
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const TABS = [
    { id: 'styles' as const,     icon: '🎨', label: 'Teaching Styles'   },
    { id: 'curriculum' as const, icon: '📚', label: 'Curriculum'         },
    { id: 'compliance' as const, icon: '✅', label: 'Compliance Basics'  },
  ]

  const handleViewCurriculum = (styleId: string) => {
    setCurriculumStyle(styleId)
    setActiveTab('curriculum')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff' }}>
        <div style={{ color: '#7c3aed', fontWeight: 700, fontSize: 16 }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 40%, #fce7f3 100%)', fontFamily: 'var(--font-dm-sans), sans-serif' }}>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Page title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e1060', margin: 0 }}>Your Homeschool Library</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Teaching styles, curriculum guides, and compliance basics.</p>
          </div>
          <button
            onClick={() => router.push('/materials')}
            style={{
              background: G.full, border: 'none',
              borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700,
              padding: '9px 18px', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
            }}
          >
            🗂️ My Materials Library →
          </button>
        </div>

        {/* Tab pills */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 20, cursor: 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
                background: activeTab === tab.id ? G.full : '#fff',
                color: activeTab === tab.id ? '#fff' : '#6b7280',
                border: activeTab === tab.id ? 'none' : '1px solid #e5e7eb',
                boxShadow: activeTab === tab.id ? '0 4px 14px rgba(124,58,237,0.3)' : 'none',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'styles' && (
          <TeachingStylesTab userStyle={userStyle} onViewCurriculum={handleViewCurriculum} />
        )}
        {activeTab === 'curriculum' && (
          <CurriculumTab initialStyle={curriculumStyle} />
        )}
        {activeTab === 'compliance' && (
          <ComplianceTab />
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f5f3ff' }} />}>
        <ResourcesContent />
      </Suspense>
    </AuthGuard>
  )
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  infoBanner: {
    background: '#ede9fe',
    borderRadius: 12,
    padding: '11px 16px',
    marginBottom: 18,
    fontSize: 13,
    color: '#7c3aed',
    lineHeight: 1.5,
  },
  gradientBtn: {
    background: G.full,
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 3px 10px rgba(124,58,237,0.3)',
  },
}