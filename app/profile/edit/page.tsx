'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import { getOrganizationId } from '@/src/lib/getOrganizationId'

const GRADIENT = 'linear-gradient(135deg, #c4b5fd 0%, #e879f9 18%, #f0abfc 36%, #fbcfe8 54%, #bae6fd 76%, #6ee7b7 100%)'

function EditProfileContent() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [email,    setEmail]    = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [orgName,  setOrgName]  = useState('')
  const [orgId,    setOrgId]    = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const currentEmail = user.email ?? ''
      setEmail(currentEmail)
      setNewEmail(currentEmail)

      const { orgId: id } = await getOrganizationId(user.id)
      if (id) {
        setOrgId(id)
        const { data } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', id)
          .maybeSingle()
        if (data?.name) setOrgName(data.name)
      }

      setLoading(false)
    }
    init()
  }, [])

  const handleSave = async () => {
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      if (newEmail.trim() !== email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: newEmail.trim() })
        if (emailErr) throw new Error(emailErr.message)
      }

      if (orgId) {
        const { error: orgErr } = await supabase
          .from('organizations')
          .update({ name: orgName.trim() })
          .eq('id', orgId)
        if (orgErr) throw new Error(orgErr.message)
      }

      setSuccess(
        newEmail.trim() !== email
          ? 'Changes saved! Check your new email for a confirmation link.'
          : 'Changes saved!'
      )
      setEmail(newEmail.trim())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRADIENT }}>
        <div style={{ color: '#7c3aed', fontWeight: 800, fontSize: 18, fontFamily: "'Nunito', sans-serif" }}>Loading...</div>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid rgba(124,58,237,0.25)',
    borderRadius: 12, fontSize: 15, fontWeight: 600,
    color: '#1a1a2e', background: '#fff',
    fontFamily: "'Nunito', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 800, color: '#4c1d95',
    letterSpacing: 0.6, marginBottom: 6, display: 'block',
  }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", minHeight: '100vh', background: GRADIENT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        input:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
      `}</style>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#1a1a2e' }}>Edit Profile</h1>
        </div>

        {/* Form card */}
        <div style={{
          background: 'rgba(255,255,255,0.88)', borderRadius: 22,
          border: '1.5px solid rgba(124,58,237,0.15)',
          padding: '24px 22px',
          boxShadow: '0 2px 14px rgba(0,0,0,0.08)',
        }}>

          {/* School name */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>SCHOOL NAME</label>
            <input
              style={inputStyle}
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="e.g. Corliss Home Academy"
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>EMAIL</label>
            <input
              style={inputStyle}
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          {newEmail !== email && (
            <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, margin: '6px 0 0', lineHeight: 1.5 }}>
              A confirmation link will be sent to your new email address.
            </p>
          )}

          {/* Feedback */}
          {error && (
            <div style={{
              marginTop: 16, padding: '11px 14px', borderRadius: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
              fontSize: 13, fontWeight: 700, color: '#dc2626',
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              marginTop: 16, padding: '11px 14px', borderRadius: 10,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              fontSize: 13, fontWeight: 700, color: '#15803d',
            }}>
              {success}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', marginTop: 24,
              background: saving ? '#c4b5fd' : 'linear-gradient(135deg, #7c3aed, #ec4899)',
              border: 'none', borderRadius: 14, color: '#fff',
              fontSize: 15, fontWeight: 800, padding: '14px 0',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: "'Nunito', sans-serif",
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
            }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EditProfilePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: GRADIENT }} />}>
        <EditProfileContent />
      </Suspense>
    </AuthGuard>
  )
}
