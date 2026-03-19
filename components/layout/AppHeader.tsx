'use client'

import {
  useState, useEffect, useContext, createContext,
  useCallback, useRef,
} from 'react'
import type { ReactNode, CSSProperties, Dispatch, SetStateAction } from 'react'
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

interface CopilotMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface SavedConversation {
  id: string
  title: string | null
  starred: boolean
  last_message_at: string
  messages: CopilotMessage[]
}

interface CopilotPanelProps {
  onClose: () => void
  organizationId?: string
  userId?: string
  userName?: string
  userState?: string | null
  homeschoolStyle?: string | null
  messages: CopilotMessage[]
  setMessages: Dispatch<SetStateAction<CopilotMessage[]>>
  isStarred: boolean
  onStar: () => void
  onNewChat: () => void
  loadHistory: () => Promise<SavedConversation[]>
  onStarConversation: (id: string, currentlyStarred: boolean) => void
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

// ─── Cardinal SVG Icon ────────────────────────────────────────────────────────
// Inline so no image dependency. Swap for <img src="/cardinal.png"> once asset exists.


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

function CopilotPanel({ onClose, organizationId, userId, userName, userState, homeschoolStyle, messages, setMessages, isStarred, onStar, onNewChat, loadHistory, onStarConversation }: CopilotPanelProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<SavedConversation[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [filterStarred, setFilterStarred] = useState(false)
  const [previewConv, setPreviewConv] = useState<SavedConversation | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showHistory])

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
      const response = await fetch('/api/help-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: text },
          ],
          userId,
          userName,
          userState,
          homeschoolStyle,
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

  const handleOpenHistory = async () => {
    setShowHistory(true)
    setPreviewConv(null)
    setHistoryLoading(true)
    const list = await loadHistory()
    setHistoryList(list)
    setHistoryLoading(false)
  }

  const handleStarInPreview = async (conv: SavedConversation) => {
    await onStarConversation(conv.id, conv.starred)
    setPreviewConv(prev => prev ? { ...prev, starred: !prev.starred } : null)
    setHistoryList(prev => prev.map(c => c.id === conv.id ? { ...c, starred: !c.starred } : c))
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })

  const displayedHistory = filterStarred ? historyList.filter(c => c.starred) : historyList

  const renderMessages = (msgs: CopilotMessage[], readOnly = false) => (
    <>
      {msgs.map((msg, i) => (
        <div key={i} style={{
          display: 'flex', flexDirection: 'column',
          alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
          marginBottom: 12,
        }}>
          {msg.role === 'assistant' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0, marginTop: 2 }} />
              <div style={{ ...cp.aiBubble, opacity: readOnly ? 0.85 : 1 }}>{msg.content}</div>
            </div>
          )}
          {msg.role === 'user' && (
            <div style={{ ...cp.userBubble, opacity: readOnly ? 0.85 : 1 }}>{msg.content}</div>
          )}
          <div style={{ ...cp.timestamp, marginLeft: msg.role === 'assistant' ? 33 : 0 }}>
            {msg.timestamp}
          </div>
        </div>
      ))}
    </>
  )

  return (
    <div style={cp.overlay} onClick={onClose}>
      <div style={cp.drawer} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={cp.head}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {showHistory && (
              <button style={cp.headIconBtn} onClick={() => { setShowHistory(false); setPreviewConv(null) }} title="Back to chat">
                ←
              </button>
            )}
            <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <div>
              <div style={cp.headTitle}>
                {showHistory ? (previewConv ? (previewConv.title ?? 'Conversation') : 'Chat History') : 'Scout'}
              </div>
              <div style={cp.headSub}>
                {showHistory
                  ? (previewConv ? formatDate(previewConv.last_message_at) : 'Past conversations')
                  : 'Your HomeschoolReady Co-pilot'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {!showHistory && messages.length > 2 && (
              <button
                style={{ ...cp.headIconBtn, color: isStarred ? '#fbbf24' : 'rgba(255,255,255,0.6)', fontSize: 20, lineHeight: 1 }}
                onClick={onStar}
                title={isStarred ? 'Unstar this chat' : 'Star this chat'}
              >
                {isStarred ? '★' : '☆'}
              </button>
            )}
            {!showHistory && (
              <button style={cp.headIconBtn} onClick={handleOpenHistory} title="Chat history">
                🕐
              </button>
            )}
            <button style={cp.closeBtn} onClick={onClose}>×</button>
          </div>
        </div>

        {/* History view */}
        {showHistory ? (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
            {previewConv ? (
              /* ── Preview a past conversation ── */
              <>
                <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
                  <button style={cp.historyBackBtn} onClick={() => setPreviewConv(null)}>← All chats</button>
                  <button
                    style={{ ...cp.historyBackBtn, color: previewConv.starred ? '#92400e' : '#374151', background: previewConv.starred ? '#fef3c7' : '#f3f4f6', borderColor: previewConv.starred ? '#f59e0b' : '#e5e7eb' }}
                    onClick={() => handleStarInPreview(previewConv)}
                  >
                    {previewConv.starred ? '★ Unstar' : '☆ Star'}
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
                  {renderMessages(previewConv.messages, true)}
                </div>
              </>
            ) : (
              /* ── History list ── */
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                  <button
                    style={{ ...cp.filterTab, ...(filterStarred ? {} : cp.filterTabActive) }}
                    onClick={() => setFilterStarred(false)}
                  >All</button>
                  <button
                    style={{ ...cp.filterTab, ...(filterStarred ? cp.filterTabActive : {}) }}
                    onClick={() => setFilterStarred(true)}
                  >★ Starred</button>
                  <div style={{ flex: 1 }} />
                  <button
                    style={{ ...cp.filterTab, fontSize: 11 }}
                    onClick={() => { onNewChat(); setShowHistory(false) }}
                  >+ New Chat</button>
                </div>

                {historyLoading ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: 32, fontFamily: 'system-ui, sans-serif', fontSize: 13 }}>Loading…</div>
                ) : displayedHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: 32, fontFamily: 'system-ui, sans-serif', fontSize: 13, whiteSpace: 'pre-line' }}>
                    {filterStarred ? 'No starred conversations yet.\nStar a chat using ☆ in the header.' : 'No chat history yet.'}
                  </div>
                ) : (
                  displayedHistory.map(conv => (
                    <div key={conv.id} style={cp.historyRow} onClick={() => setPreviewConv(conv)}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={cp.historyTitle}>{conv.title ?? 'Conversation'}</div>
                        <div style={cp.historyDate}>{formatDate(conv.last_message_at)}</div>
                      </div>
                      <button
                        style={{ ...cp.starBtn, color: conv.starred ? '#fbbf24' : '#d1d5db' }}
                        onClick={e => { e.stopPropagation(); onStarConversation(conv.id, conv.starred); setHistoryList(prev => prev.map(c => c.id === conv.id ? { ...c, starred: !c.starred } : c)) }}
                        title={conv.starred ? 'Unstar' : 'Star'}
                      >
                        {conv.starred ? '★' : '☆'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div style={cp.messages}>
              {renderMessages(messages)}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 12 }}>
                  <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0, marginTop: 2 }} />
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
                placeholder="Ask Scout anything..."
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
            <div style={cp.footer}>Your school, your pace.</div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Back-button label map ────────────────────────────────────────────────────

const BACK_LABELS: Record<string, string> = {
  '/reports':   'Records',
  '/resources': 'Resources',
  '/tools':     'Tools',
  '/profile':   'Profile',
}

// ─── Main Header ──────────────────────────────────────────────────────────────


export default function AppHeader() {
  const { title, backHref } = useContext(HeaderCtx)
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [userState, setUserState] = useState<string | null>(null)
  const [homeschoolStyle, setHomeschoolStyle] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [kids, setKids] = useState<Kid[]>([])
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([])
  const [copilotStarred, setCopilotStarred] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showCopilot, setShowCopilot] = useState(false)
  const conversationIdRef = useRef<string | null>(null)
  const [scoutNudge, setScoutNudge] = useState<string | null>(null)
  const [showScoutBubble, setShowScoutBubble] = useState(false)
  const [scoutDot, setScoutDot] = useState(false)
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const betaEnabled = process.env.NEXT_PUBLIC_BETA_FEEDBACK_ENABLED === 'true'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email ?? '')

      const { data: profileRows } = await supabase
        .from('user_profiles')
        .select('first_name, homeschool_style')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      const profileData = (profileRows ?? []).find((r: any) => r.homeschool_style != null) ?? profileRows?.[0] ?? null

      // Prefer stored first name; fall back to first word of Google display name; never use email
      const storedFirst = (profileData as any)?.first_name as string | null | undefined
      const googleFull  = user.user_metadata?.full_name as string | undefined
      const googleFirst = googleFull && !googleFull.includes('@') ? googleFull.split(' ')[0] : null
      const name = storedFirst || googleFirst || 'there'
      setDisplayName(name)
      setHomeschoolStyle((profileData as any)?.homeschool_style ?? null)
      setCopilotMessages([{
        role: 'assistant',
        content: `Hi ${name}! I'm Scout, your HomeschoolReady co-pilot 🐦 I'm here to keep you on course — lesson planning, scheduling, compliance, and whatever else comes up. What can I help you with today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])

      // Check org owner path first
      const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('id, state')
        .eq('user_id', user.id)
        .maybeSingle()

      if (ownedOrg) {
        setOrgId(ownedOrg.id)
        if (ownedOrg.state) setUserState(ownedOrg.state)
        const { data: kidsData } = await supabase
          .from('kids')
          .select('id, displayname, avatar_url')
          .eq('organization_id', ownedOrg.id)
          .order('displayname')
        setKids((kidsData as Kid[]) || [])
        return
      }

      // Co-teacher / aide path
      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (orgData) {
        setOrgId(orgData.organization_id)
        const { data: orgInfo } = await supabase
          .from('organizations')
          .select('state')
          .eq('id', orgData.organization_id)
          .maybeSingle()
        if (orgInfo?.state) setUserState(orgInfo.state)
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
    const handler = () => setShowCopilot(true)
    window.addEventListener('open-scout-copilot', handler)
    return () => window.removeEventListener('open-scout-copilot', handler)
  }, [])

  // Scout proactive nudge
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message as string
      if (!msg) return
      setScoutNudge(msg)
      setScoutDot(true)
      // Auto-pop once per session
      if (!sessionStorage.getItem('scout_nudge_shown')) {
        sessionStorage.setItem('scout_nudge_shown', '1')
        bubbleTimerRef.current = setTimeout(() => {
          setShowScoutBubble(true)
          bubbleTimerRef.current = setTimeout(() => setShowScoutBubble(false), 7000)
        }, 1800)
      }
    }
    window.addEventListener('scout-nudge', handler)
    return () => {
      window.removeEventListener('scout-nudge', handler)
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
    }
  }, [])

  // Auto-save conversation to DB after each AI response
  useEffect(() => {
    if (!userId || copilotMessages.length < 3) return
    const lastMsg = copilotMessages[copilotMessages.length - 1]
    if (lastMsg.role !== 'assistant') return

    const title = copilotMessages.find(m => m.role === 'user')?.content.slice(0, 60) ?? 'Conversation'
    const save = async () => {
      const id = conversationIdRef.current
      if (id) {
        await supabase.from('scout_conversations').update({
          messages: copilotMessages as unknown as Record<string, unknown>[],
          last_message_at: new Date().toISOString(),
          title,
        }).eq('id', id)
      } else {
        const { data } = await supabase.from('scout_conversations').insert({
          user_id: userId,
          organization_id: orgId,
          messages: copilotMessages as unknown as Record<string, unknown>[],
          title,
          starred: false,
        }).select('id').single()
        if (data?.id) conversationIdRef.current = data.id
      }
    }
    save()
  }, [copilotMessages, userId, orgId])

  const handleStar = async () => {
    if (!conversationIdRef.current) return
    const newStarred = !copilotStarred
    setCopilotStarred(newStarred)
    await supabase.from('scout_conversations').update({ starred: newStarred }).eq('id', conversationIdRef.current)
  }

  const handleNewChat = () => {
    conversationIdRef.current = null
    setCopilotStarred(false)
    setCopilotMessages([{
      role: 'assistant',
      content: `Hi ${displayName}! I'm Scout, your HomeschoolReady co-pilot 🐦 What can I help you with today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }])
  }

  const handleLoadHistory = async (): Promise<SavedConversation[]> => {
    if (!userId) return []
    const { data } = await supabase
      .from('scout_conversations')
      .select('id, title, starred, last_message_at, messages')
      .eq('user_id', userId)
      .order('starred', { ascending: false })
      .order('last_message_at', { ascending: false })
      .limit(25)
    return (data ?? []) as SavedConversation[]
  }

  const handleStarConversation = async (id: string, currentlyStarred: boolean) => {
    await supabase.from('scout_conversations').update({ starred: !currentlyStarred }).eq('id', id)
    if (id === conversationIdRef.current) setCopilotStarred(!currentlyStarred)
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
                  <span className="hr-back-label">{BACK_LABELS[backHref] ?? 'Back'}</span>
                </button>
              )}
              {title && <span style={s.pageTitle}>{title}</span>}
            </>
          )}
        </div>


        {/* Right */}
        <div style={s.right}>

          {/* Desktop-only: Feedback */}
          {betaEnabled && userId && orgId && (
            <button className="hr-btn hr-feedback-btn hr-desktop-only" onClick={() => setShowFeedback(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Feedback</span>
            </button>
          )}

          {/* Scout proactive button */}
          {userId && scoutNudge && (
            <button
              onClick={() => { setShowScoutBubble(v => !v); setScoutDot(false) }}
              style={{
                position: 'relative', background: 'none', border: 'none',
                padding: 4, cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Scout says…"
            >
              <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              {scoutDot && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#f59e0b', border: '2px solid #7c3aed',
                  animation: 'scout-dot-pulse 1.8s ease-in-out infinite',
                }} />
              )}
            </button>
          )}

        </div>
      </header>

      {/* Scout nudge bubble */}
      {scoutNudge && showScoutBubble && (
        <div style={{
          position: 'fixed', top: 64, right: 16, zIndex: 9995,
          width: 290, fontFamily: "'Nunito', sans-serif",
          animation: 'scout-bubble-in 0.3s ease forwards',
        }}>
          {/* Tail pointing up-right */}
          <div style={{
            width: 0, height: 0, borderStyle: 'solid',
            borderWidth: '0 0 10px 10px',
            borderColor: 'transparent transparent #fff transparent',
            marginLeft: 'auto', marginRight: 18, marginBottom: -1,
          }} />
          <div style={{
            background: '#fff', borderRadius: 18,
            boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(124,58,237,0.12)',
            border: '1.5px solid rgba(124,58,237,0.15)',
            overflow: 'hidden',
          }}>
            {/* Header strip */}
            <div style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                <div style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>Scout</div>
              </div>
              <button
                onClick={() => setShowScoutBubble(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer', padding: '2px 6px', fontWeight: 700 }}
              >✕</button>
            </div>
            {/* Message */}
            <div style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: '0 0 14px', fontWeight: 600 }}>
                {scoutNudge}
              </p>
              <button
                onClick={() => { setShowScoutBubble(false); setShowCopilot(true) }}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                Chat with Scout →
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedback && userId && orgId && (
        <FeedbackModal onClose={() => setShowFeedback(false)} userId={userId} orgId={orgId} />
      )}

      {showCopilot && (
        <CopilotPanel
          onClose={() => setShowCopilot(false)}
          organizationId={orgId ?? undefined}
          userId={userId ?? undefined}
          userName={displayName || undefined}
          userState={userState}
          homeschoolStyle={homeschoolStyle}
          messages={copilotMessages}
          setMessages={setCopilotMessages}
          isStarred={copilotStarred}
          onStar={handleStar}
          onNewChat={handleNewChat}
          loadHistory={handleLoadHistory}
          onStarConversation={handleStarConversation}
        />
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
    border: '1px solid #e5e7eb', overflow: 'hidden', zIndex: 1000,
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
    background: 'linear-gradient(135deg, #B01C1C 0%, #D92B2B 60%, #c0392b 100%)',
    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  avatarWrap: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    border: '2px solid rgba(255,255,255,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  inlineAvatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: '#fef2f2', border: '1.5px solid #fca5a5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  headTitle: { color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: 'system-ui, sans-serif' },
  headSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1, fontFamily: 'system-ui, sans-serif' },
  closeBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none',
    borderRadius: 6, color: '#fff', fontSize: 18, cursor: 'pointer', padding: '4px 8px',
  },
  messages: { flex: 1, overflowY: 'auto', padding: '16px 16px 8px', background: '#fafafa' },
  aiBubble: {
    background: '#fff', borderRadius: '4px 14px 14px 14px',
    padding: '10px 14px', fontSize: 13.5, color: '#111827',
    maxWidth: '85%', lineHeight: 1.5, whiteSpace: 'pre-wrap',
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid #f3f4f6',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  userBubble: {
    background: 'linear-gradient(135deg, #C62020, #D92B2B)',
    borderRadius: '14px 4px 14px 14px',
    padding: '10px 14px', fontSize: 13.5, color: '#fff',
    maxWidth: '85%', lineHeight: 1.5, fontFamily: 'system-ui, sans-serif',
  },
  timestamp: { fontSize: 10, color: '#9ca3af', marginTop: 3, marginLeft: 2, marginRight: 2, fontFamily: 'system-ui, sans-serif' },
  inputRow: {
    padding: '12px 16px', borderTop: '1px solid #e5e7eb',
    display: 'flex', gap: 8, alignItems: 'center', background: '#fff',
  },
  input: {
    flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '9px 14px', fontSize: 13.5, outline: 'none',
    color: '#111827', fontFamily: 'system-ui, sans-serif', background: '#fafafa',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'linear-gradient(135deg, #C62020, #D92B2B)',
    border: 'none', color: '#fff', fontSize: 16, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  footer: {
    textAlign: 'center', fontSize: 10, color: '#d1d5db',
    padding: '6px 16px 10px', background: '#fff', fontFamily: 'system-ui, sans-serif',
  },
  headIconBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none',
    borderRadius: 6, color: 'rgba(255,255,255,0.85)', fontSize: 16,
    cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
  },
  historyRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 14px', borderRadius: 10,
    border: '1px solid #e5e7eb', background: '#fff',
    marginBottom: 8, cursor: 'pointer',
  },
  historyTitle: {
    fontSize: 13, fontWeight: 600, color: '#111827',
    fontFamily: 'system-ui, sans-serif',
    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
  },
  historyDate: { fontSize: 11, color: '#9ca3af', marginTop: 2, fontFamily: 'system-ui, sans-serif' },
  historyBackBtn: {
    padding: '6px 12px', borderRadius: 100,
    background: '#f3f4f6', border: '1px solid #e5e7eb',
    fontSize: 12, fontWeight: 600, color: '#374151',
    cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
  },
  filterTab: {
    padding: '5px 12px', borderRadius: 100,
    background: '#f3f4f6', border: '1px solid #e5e7eb',
    fontSize: 12, fontWeight: 600, color: '#6b7280',
    cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
  },
  filterTabActive: {
    background: 'linear-gradient(135deg, #B01C1C, #D92B2B)',
    borderColor: 'transparent', color: '#fff',
  },
  starBtn: {
    background: 'none', border: 'none', fontSize: 20,
    cursor: 'pointer', padding: '2px 4px', flexShrink: 0, lineHeight: 1,
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
  .hr-copilot-btn { border-color: rgba(255,200,200,0.5); background: rgba(255,255,255,0.22); font-weight: 700; }
  .hr-copilot-btn:hover { background: rgba(255,255,255,0.32); color: #fff; }
  .hr-nav-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 11px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 100px;
    color: rgba(255,255,255,0.65);
    font-size: 12px; font-weight: 600;
    cursor: pointer; white-space: nowrap;
    font-family: system-ui, sans-serif;
    transition: all 0.15s;
  }
  .hr-nav-btn:hover { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.9); }
  .hr-nav-active {
    background: rgba(255,255,255,0.95) !important;
    border-color: transparent !important;
    color: #4f46e5 !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    padding: 6px 14px !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  /* Responsive visibility helpers */
  .hr-desktop-only { display: flex !important; }
  .hr-mobile-only  { display: none  !important; }

  @media (max-width: 640px) {
    .hr-desktop-only { display: none  !important; }
    .hr-mobile-only  { display: flex  !important; }
    .hr-back-label { display: none; }
    .hr-copilot-label { display: none; }
    .hr-btn { padding: 5px 8px; }
  }

  @keyframes scout-dot-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.7; }
  }
  @keyframes scout-bubble-in {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`