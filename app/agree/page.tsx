'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase'
import { colors, gradients, typography } from '@/src/lib/designTokens'

export default function AgreePage() {
  const router = useRouter()

  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [tosConfirmed, setTosConfirmed] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [userId, setUserId]           = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      // If user has already fully agreed, skip ahead
      const { data: existing } = await supabase
        .from('user_agreements')
        .select('age_confirmed, tos_confirmed')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing?.age_confirmed && existing?.tos_confirmed) {
        router.replace('/onboarding')
        return
      }

      setUserId(user.id)
      setLoading(false)
    }
    init()
  }, [])

  const handleContinue = async () => {
    if (!ageConfirmed || !tosConfirmed || !userId || saving) return
    setSaving(true)
    setError(null)

    const { error: upsertError } = await supabase
      .from('user_agreements')
      .upsert(
        {
          user_id:       userId,
          age_confirmed: true,
          tos_confirmed: true,
          agreed_at:     new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      setError('Something went wrong saving your agreement. Please try again.')
      setSaving(false)
      return
    }

    router.push('/onboarding')
  }

  if (loading) {
    return (
      <div style={css.page}>
        <div style={css.loadingText}>Loading…</div>
      </div>
    )
  }

  const canProceed = ageConfirmed && tosConfirmed

  return (
    <div style={css.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>

      <div style={css.card}>

        {/* Header */}
        <div style={css.cardHeader}>
          <div style={css.logo}>
            <span style={css.logoMain}>Homeschool</span>
            <span style={css.logoAccent}>Ready</span>
          </div>
        </div>

        {/* Body */}
        <div style={css.cardBody}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
            <h1 style={css.heading}>Before you get started</h1>
            <p style={css.subheading}>
              Please confirm the following to continue setting up your account.
            </p>
          </div>

          {/* Checkbox 1 — Age */}
          <div
            onClick={() => setAgeConfirmed(v => !v)}
            style={{ ...css.checkRow, borderColor: ageConfirmed ? colors.purple : colors.gray200, background: ageConfirmed ? colors.purpleFaint : colors.gray50 }}
          >
            <div style={{ ...css.checkbox, background: ageConfirmed ? colors.purple : colors.white, borderColor: ageConfirmed ? colors.purple : colors.gray200 }}>
              {ageConfirmed && <span style={css.checkmark}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <p style={css.checkLabel}>I confirm that I am 18 years of age or older.</p>
              <p style={css.checkSub}>
                HomeschoolReady is designed for adults who are responsible for a child's education.
              </p>
            </div>
          </div>

          {/* Checkbox 2 — ToS */}
          <div
            onClick={() => setTosConfirmed(v => !v)}
            style={{ ...css.checkRow, borderColor: tosConfirmed ? colors.purple : colors.gray200, background: tosConfirmed ? colors.purpleFaint : colors.gray50 }}
          >
            <div style={{ ...css.checkbox, background: tosConfirmed ? colors.purple : colors.white, borderColor: tosConfirmed ? colors.purple : colors.gray200 }}>
              {tosConfirmed && <span style={css.checkmark}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <p style={css.checkLabel}>
                I have read and agree to the HomeschoolReady{' '}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={css.link}
                  onClick={e => e.stopPropagation()}
                >
                  Terms of Service
                </a>
                {' '}and{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={css.link}
                  onClick={e => e.stopPropagation()}
                >
                  Privacy Policy
                </a>.
              </p>
              <p style={css.checkSub}>
                Your agreement is recorded with a timestamp and stored securely.
              </p>
            </div>
          </div>

          {/* Inline error */}
          {error && (
            <div style={css.errorBanner}>
              ⚠️ {error}
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!canProceed || saving}
            style={{
              ...css.continueBtn,
              background:   canProceed ? gradients.header : colors.gray200,
              color:        canProceed ? colors.white      : colors.gray400,
              cursor:       canProceed ? 'pointer'         : 'not-allowed',
              boxShadow:    canProceed ? '0 4px 20px rgba(124,58,237,0.28)' : 'none',
            }}
          >
            {saving ? 'Saving…' : 'Continue →'}
          </button>

          <p style={css.footNote}>
            We never sell or share your personal data.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #ede9fe 0%, #fce7f3 50%, #dbeafe 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: typography.fontFamily,
  },
  loadingText: {
    color: colors.purple,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
  },
  card: {
    background: colors.white,
    borderRadius: 24,
    boxShadow: '0 20px 60px rgba(124,58,237,0.13)',
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  cardHeader: {
    background: gradients.header,
    padding: '18px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 1,
  },
  logoMain: {
    color: colors.white,
    fontWeight: typography.weights.black,
    fontSize: typography.sizes.lg,
    letterSpacing: -0.3,
  },
  logoAccent: {
    color: colors.yellow,
    fontWeight: typography.weights.black,
    fontSize: typography.sizes.lg,
    letterSpacing: -0.3,
  },
  cardBody: {
    padding: '36px 32px 32px',
  },
  heading: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    margin: '0 0 8px',
  },
  subheading: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    margin: 0,
    lineHeight: 1.6,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 14,
    border: '2px solid',
    padding: '16px 18px',
    marginBottom: 12,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    userSelect: 'none',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: '2px solid',
    flexShrink: 0,
    marginTop: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  },
  checkmark: {
    fontSize: 13,
    fontWeight: 800,
    color: colors.white,
    lineHeight: 1,
  },
  checkLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    margin: '0 0 4px',
    lineHeight: 1.5,
  },
  checkSub: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    margin: 0,
    lineHeight: 1.5,
  },
  link: {
    color: colors.purple,
    fontWeight: typography.weights.bold,
    textDecoration: 'none',
  },
  errorBanner: {
    background: '#fef2f2',
    border: `1.5px solid #fca5a5`,
    borderRadius: 10,
    padding: '11px 16px',
    fontSize: typography.sizes.sm,
    color: colors.red,
    fontWeight: typography.weights.semibold,
    marginBottom: 16,
    lineHeight: 1.5,
  },
  continueBtn: {
    width: '100%',
    padding: '14px 0',
    borderRadius: 12,
    border: 'none',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.extrabold,
    fontFamily: typography.fontFamily,
    transition: 'all 0.15s',
    marginBottom: 16,
  },
  footNote: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    margin: 0,
    lineHeight: 1.5,
  },
}
