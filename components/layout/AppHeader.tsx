'use client'

import {
  useState, useEffect, useContext, createContext,
  useCallback, useRef,
} from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase'
import { gradients } from '@/src/lib/designTokens'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeaderContextValue {
  title: string | null
  backHref: string | null
  setTitle: (t: string | null) => void
  setBackHref: (h: string | null) => void
}

interface UseAppHeaderOptions {
  title?: string
  backHref?: string
}

interface Kid {
  id: string
  displayname: string
  avatar_url: string | null
}

interface StarRatingProps {
  label: string
  value: number
  onChange: (n: number) => void
  disabled: boolean
}

interface FeedbackModalProps {
  onClose: () => void
  userId: string
  orgId: string
}

interface KidAvatarProps {
  kid: Kid
  size?: number
}

interface CopilotPanelProps {
  onClose: () => void
  organizationId?: string
}

interface CopilotMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

type Phase = 'form' | 'submitting' | 'success' | 'error'

// ─── Context ──────────────────────────────────────────────────────────────────

const HeaderCtx = createContext<HeaderContextValue>({
  title: null,
  backHref: null,
  setTitle: () => {},
  setBackHref: () => {},
})

export function AppHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null)
  const [backHref, setBackHref] = useState<string | null>(null)
  return (
    <HeaderCtx.Provider value={{ title, backHref, setTitle, setBackHref }}>
      {children}
    </HeaderCtx.Provider>
  )
}

export function useAppHeader({ title, backHref }: UseAppHeaderOptions = {}) {
  const { setTitle, setBackHref } = useContext(HeaderCtx)
  useEffect(() => {
    if (title !== undefined) setTitle(title)
    if (backHref !== undefined) setBackHref(backHref)
    return () => { setTitle(null); setBackHref(null) }
  }, [title, backHref, setTitle, setBackHref])
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIN_WORDS = 20

function countWords(t: string): number {
  return t.trim() === '' ? 0 : t.trim().split(/\s+/).length
}

const FEATURE_MAP: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/lessons/generate': 'lesson-generator',
  '/lessons': 'lesson-library',
  '/attendance': 'attendance',
  '/assessments': 'assessments',
  '/compliance': 'compliance',
  '/curriculum/import': 'curriculum-import',
  '/co-teachers': 'co-teacher',
  '/calendar': 'work-calendar',
  '/reports': 'reports',
}

function featureKeyFromPath(pathname: string): string | null {
  const keys = Object.keys(FEATURE_MAP).sort((a, b) => b.length - a.length)
  const match = keys.find(k => pathname.startsWith(k))
  return match ? FEATURE_MAP[match] : null
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ label, value, onChange, disabled }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={s.ratingLabel}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            style={{ ...s.star, color: n <= (hovered || value) ? '#f59e0b' : '#d1d5db' }}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
        {value > 0 && <span style={s.ratingWord}>{labels[value]}</span>}
      </div>
    </div>
  )
}

// ─── Feedback Modal ───────────────────────────────────────────────────────────

function FeedbackModal({ onClose, userId, orgId }: FeedbackModalProps) {
  const [ease, setEase] = useState(0)
  const [useful, setUseful] = useState(0)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [errMsg, setErrMsg] = useState('')

  const words = countWords(text)
  const remaining = Math.max(0, MIN_WORDS - words)
  const valid = ease > 0 && useful > 0 && words >= MIN_WORDS

  const handleSubmit = useCallback(async () => {
    if (!valid) return
    setPhase('submitting')
    try {
      let screenshotUrl: string | null = null
      try {
        const html2canvas = (await import('html2canvas')).default
        const canvas = await html2canvas(document.body, {
          useCORS: true,
          scale: 0.75,
          logging: false,
          ignoreElements: (el: Element) => el.id === 'hr-header-root',
        } as any)
        const blob = await new Promise<Blob | null>(res =>
          canvas.toBlob(res, 'image/jpeg', 0.7)
        )
        if (blob) {
          const filePath = `${userId}/${Date.now()}.jpg`
          const { error: upErr } = await supabase.storage
            .from('beta-screenshots')
            .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true })
          if (!upErr) {
            const { data } = supabase.storage
              .from('beta-screenshots')
              .getPublicUrl(filePath)
            screenshotUrl = data?.publicUrl ?? null
          }
        }
      } catch {
        // screenshot is optional
      }

      const { error } = await supabase.from('beta_feedback').upsert(
        {
          user_id: userId,
          organization_id: orgId,
          feature_key: featureKeyFromPath(window.location.pathname),
          page_url: window.location.href,
          screenshot_url: screenshotUrl,
          ease_of_use_rating: ease,
          usefulness_rating: useful,
          feedback_text: text.trim(),
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,feature_key' }
      )

      if (error) throw error
      setPhase('success')
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Something went wrong.')
      setPhase('error')
    }
  }, [valid, ease, useful, text, userId, orgId])

  return (
    <div style={s.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={s.betaBadge}>BETA</span>
            <div>
              <div style={s.modalTitle}>Share Feedback</div>
              <div style={s.modalSub}>
                {typeof window !== 'undefined' ? window.location.pathname : ''}
              </div>
            </div>
          </div>
          <button style={s.modalClose} onClick={onClose}>×</button>
        </div>

        {phase === 'success' ? (
          <div style={s.successBody}>
            <div style={s.successCheck}>✓</div>
            <div style={s.successTitle}>Thank you!</div>
            <p style={s.successText}>Your feedback helps shape HomeschoolReady for every family.</p>
            <button style={s.btnPrimary} onClick={onClose}>Done</button>
          </div>
        ) : (
          <div style={s.modalBody}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <StarRating label="Ease of Use" value={ease} onChange={setEase} disabled={phase === 'submitting'} />
              <StarRating label="Usefulness" value={useful} onChange={setUseful} disabled={phase === 'submitting'} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={s.ratingLabel} htmlFor="fb-text">
                Your thoughts <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                id="fb-text"
                rows={4}
                style={{
                  ...s.textarea,
                  borderColor: words >= MIN_WORDS ? '#10b981' : words > 0 ? '#f59e0b' : '#e5e7eb',
                }}
                placeholder="What worked? What was confusing? What's missing? Be specific!"
                value={text}
                onChange={e => setText(e.target.value)}
                disabled={phase === 'submitting'}
              />
              <div style={{
                fontSize: 11,
                fontFamily: 'monospace',
                textAlign: 'right' as const,
                color: words >= MIN_WORDS ? '#10b981' : words > 0 ? '#f59e0b' : '#9ca3af',
              }}>
                {words >= MIN_WORDS
                  ? `✓ ${words} words — minimum met`
                  : `${remaining} more word${remaining !== 1 ? 's' : ''} needed (min ${MIN_WORDS})`}
              </div>
            </div>

            {phase === 'error' && (
              <div style={s.errBanner}>⚠ {errMsg}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={s.btnGhost} onClick={onClose} disabled={phase === 'submitting'}>
                Cancel
              </button>
              <button
                style={{ ...s.btnPrimary, opacity: valid ? 1 : 0.45, cursor: valid ? 'pointer' : 'not-allowed' }}
                onClick={handleSubmit}
                disabled={!valid || phase === 'submitting'}
              >
                {phase === 'submitting' ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Kid Avatar ───────────────────────────────────────────────────────────────

function KidAvatar({ kid, size = 30 }: KidAvatarProps) {
  return (
    <div
      title={kid.displayname}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: kid.avatar_url ? 'transparent' : '#818cf8',
        border: '2px solid rgba(255,255,255,0.4)',
        overflow: 'hidden', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: size * 0.4,
        color: '#fff', fontWeight: 700, flexShrink: 0, cursor: 'default',
      }}
    >
      {kid.avatar_url
        ? <img src={kid.avatar_url} alt={kid.displayname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (kid.displayname?.[0] || '?').toUpperCase()
      }
    </div>
  )
}

// ─── Copilot Panel ────────────────────────────────────────────────────────────

function CopilotPanel({ onClose, organizationId }: CopilotPanelProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your HomeschoolReady Copilot. I can help you with lesson planning, scheduling, compliance tracking, and more. What can I help you with today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: CopilotMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/help-chat', {// leaving in case we need it https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: text },
          ],
        }),
      })

      const data = await response.json()
      const reply = data.response || 'Sorry, I had trouble responding. Please try again.'

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={cp.overlay} onClick={onClose}>
      <div style={cp.drawer} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={cp.head}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
              src="/schoolhouse-helper.png"
              alt="Copilot"
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={cp.headTitle}>HomeschoolReady Copilot</div>
              <div style={cp.headSub}>Powered by Claude AI</div>
            </div>
          </div>
          <button style={cp.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Messages */}
        <div style={cp.messages}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}>
              <div style={msg.role === 'user' ? cp.userBubble : cp.aiBubble}>
                {msg.content}
              </div>
              <div style={cp.timestamp}>{msg.timestamp}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ ...cp.aiBubble, color: '#9ca3af', letterSpacing: 3 }}>●●●</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={cp.inputRow}>
          <input
            style={cp.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask a question..."
            disabled={loading}
          />
          <button
            style={{ ...cp.sendBtn, opacity: (!input.trim() || loading) ? 0.45 : 1 }}
            onClick={send}
            disabled={!input.trim() || loading}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Header ──────────────────────────────────────────────────────────────

export default function AppHeader() {
  const { title, backHref } = useContext(HeaderCtx)
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [kids, setKids] = useState<Kid[]>([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showCopilot, setShowCopilot] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const betaEnabled = process.env.NEXT_PUBLIC_BETA_FEEDBACK_ENABLED === 'true'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email ?? '')
      setDisplayName(
        (user.user_metadata?.full_name as string) ||
        user.email?.split('@')[0] ||
        'there'
      )

      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (orgData) {
        setOrgId(orgData.organization_id)
        const { data: kidsData } = await supabase
          .from('kids')
          .select('id, displayname, avatar_url')
          .eq('organization_id', orgData.organization_id)
          .order('displayname')
        setKids((kidsData as Kid[]) || [])
      }
    }
    load()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <style>{HEADER_STYLES}</style>
      <header id="hr-header-root" style={s.header}>

        {/* Left */}
        <div style={s.left}>
          <button style={s.logoBtn} onClick={() => router.push('/dashboard')} aria-label="Go to Dashboard">
            <div style={s.logoMark}>H</div>
            <span style={{ display: 'flex', fontFamily: 'system-ui, sans-serif', lineHeight: '1' }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 400, fontSize: 15 }}>Homeschool</span>
              <span style={{ color: '#ffffff', fontWeight: 800, fontSize: 15 }}>Ready</span>
            </span>
          </button>

          {(backHref || title) && (
            <>
              <div style={s.divider} />
              {backHref && (
                <button style={s.backBtn} onClick={() => router.push(backHref)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Dashboard
                </button>
              )}
              {title && <span style={s.pageTitle}>{title}</span>}
            </>
          )}
        </div>

        {/* Center: kids */}
        {kids.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {kids.slice(0, 5).map(k => <KidAvatar key={k.id} kid={k} />)}
            {kids.length > 5 && (
              <div style={s.kidOverflow}>+{kids.length - 5}</div>
            )}
          </div>
        )}

        {/* Right */}
        <div style={s.right}>
          {/* Copilot — always visible for authenticated users */}
          {userId && (
           <button className="hr-btn hr-copilot-btn" onClick={() => setShowCopilot(true)}>
           <img 
             src="/schoolhouse-helper.png" 
             alt="Copilot" 
             style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover' }} 
           />
           <span>Copilot</span>
         </button>
          )}

          {betaEnabled && userId && orgId && (
            <button className="hr-btn hr-feedback-btn" onClick={() => setShowFeedback(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Feedback</span>
            </button>
          )}

          <button className="hr-btn" onClick={() => router.push('/how-to')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
            </svg>
            <span>How To</span>
          </button>

          {userId && (
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button className="hr-btn" onClick={() => setShowUserMenu(v => !v)}>
                <div style={s.userAvatar}>{displayName[0]?.toUpperCase() || '?'}</div>
                <span>{displayName}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {showUserMenu && (
                <div style={s.userMenu}>
                  <div style={s.userMenuEmail}>{email}</div>
                  <button style={s.menuItem} onClick={() => { setShowUserMenu(false); router.push('/settings') }}>
                    Settings
                  </button>
                  <button style={{ ...s.menuItem, color: '#ef4444' }} onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {showFeedback && userId && orgId && (
        <FeedbackModal onClose={() => setShowFeedback(false)} userId={userId} orgId={orgId} />
      )}

      {showCopilot && (
        <CopilotPanel onClose={() => setShowCopilot(false)} organizationId={orgId ?? undefined} />
      )}
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, CSSProperties> = {
  header: {
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', height: 56, gap: 16,
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.1), 0 4px 20px rgba(79,70,229,0.35)',
  },
  left: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  logoBtn: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 },
  logoMark: {
    width: 28, height: 28, borderRadius: 8,
    background: 'rgba(255,255,255,0.95)', color: '#4f46e5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800, flexShrink: 0, fontFamily: 'system-ui, sans-serif',
  },
  divider: { width: 1, height: 20, background: 'rgba(255,255,255,0.25)', flexShrink: 0 },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 100, padding: '4px 10px',
    color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', flexShrink: 0, fontFamily: 'system-ui, sans-serif',
  },
  pageTitle: {
    fontSize: 15, fontWeight: 600, color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  kidOverflow: {
    width: 30, height: 30, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif',
  },
  right: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  userAvatar: {
    width: 22, height: 22, borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
    fontFamily: 'system-ui, sans-serif',
  },
  userMenu: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    background: '#fff', borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)', minWidth: 180,
    border: '1px solid #e5e7eb', overflow: 'hidden', zIndex: 200,
  },
  userMenuEmail: { padding: '10px 14px', fontSize: 11, color: '#6b7280', fontFamily: 'system-ui, sans-serif', borderBottom: '1px solid #f3f4f6' },
  menuItem: {
    display: 'block', width: '100%', padding: '10px 14px',
    background: 'none', border: 'none', textAlign: 'left',
    fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(15,10,40,0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
  },
  betaBadge: { padding: '2px 7px', background: 'rgba(255,255,255,0.9)', color: '#4f46e5', borderRadius: 4, fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', fontFamily: 'system-ui, sans-serif', flexShrink: 0 },
  modalTitle: { fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif' },
  modalSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1, fontFamily: 'monospace' },
  modalClose: { background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 20, width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 },
  modalBody: { padding: 20, display: 'flex', flexDirection: 'column', gap: 18 },
  ratingLabel: { fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'system-ui, sans-serif' },
  ratingWord: { marginLeft: 6, fontSize: 11, color: '#f59e0b', fontWeight: 600, fontFamily: 'system-ui, sans-serif' },
  star: { background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', padding: '0 1px', lineHeight: 1 },
  textarea: { width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, lineHeight: 1.6, color: '#1f2937', fontFamily: 'Georgia, serif', resize: 'vertical', boxSizing: 'border-box', minHeight: 96 },
  errBanner: { padding: '9px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, color: '#dc2626', fontFamily: 'system-ui, sans-serif' },
  btnGhost: { padding: '8px 16px', background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' },
  btnPrimary: { padding: '8px 20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' },
  successBody: { padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' },
  successCheck: { width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 },
  successTitle: { fontSize: 20, fontWeight: 700, color: '#1f2937', fontFamily: 'Georgia, serif' },
  successText: { fontSize: 14, color: '#6b7280', lineHeight: 1.6, maxWidth: 280, margin: 0, fontFamily: 'Georgia, serif' },
}

// ─── Copilot Panel Styles ─────────────────────────────────────────────────────

const cp: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
    zIndex: 200, display: 'flex', justifyContent: 'flex-end',
  },
  drawer: {
    width: 380, maxWidth: '95vw', height: '100vh',
    background: '#fff', display: 'flex', flexDirection: 'column',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
  },
  head: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  avatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
  },
  headTitle: { color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'system-ui, sans-serif' },
  headSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1, fontFamily: 'system-ui, sans-serif' },
  closeBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none',
    borderRadius: 6, color: '#fff', fontSize: 18, cursor: 'pointer', padding: '4px 8px',
  },
  messages: { flex: 1, overflowY: 'auto', padding: '16px 16px 8px' },
  aiBubble: {
    background: '#f3f4f6', borderRadius: '4px 14px 14px 14px',
    padding: '10px 14px', fontSize: 13.5, color: '#111827',
    maxWidth: '85%', lineHeight: 1.5, whiteSpace: 'pre-wrap',
    fontFamily: 'system-ui, sans-serif',
  },
  userBubble: {
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    borderRadius: '14px 4px 14px 14px',
    padding: '10px 14px', fontSize: 13.5, color: '#fff',
    maxWidth: '85%', lineHeight: 1.5, fontFamily: 'system-ui, sans-serif',
  },
  timestamp: { fontSize: 10, color: '#9ca3af', marginTop: 3, marginLeft: 2, marginRight: 2, fontFamily: 'system-ui, sans-serif' },
  inputRow: {
    padding: '12px 16px', borderTop: '1px solid #e5e7eb',
    display: 'flex', gap: 8, alignItems: 'center',
  },
  input: {
    flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '9px 14px', fontSize: 13.5, outline: 'none',
    color: '#111827', fontFamily: 'system-ui, sans-serif',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    border: 'none', color: '#fff', fontSize: 16, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
}

const HEADER_STYLES = `
  .hr-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 12px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 100px;
    color: rgba(255,255,255,0.9);
    font-size: 12px; font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    font-family: system-ui, sans-serif;
  }
  .hr-btn:hover { background: rgba(255,255,255,0.22); color: #fff; }
  .hr-feedback-btn { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.18); }
  .hr-feedback-btn:hover { background: rgba(255,255,255,0.28); }
  .hr-copilot-btn { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.22); font-weight: 700; }
  .hr-copilot-btn:hover { background: rgba(255,255,255,0.32); color: #fff; }
`