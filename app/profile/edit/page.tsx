'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import { getOrganizationId } from '@/src/lib/getOrganizationId'
import { useAppHeader } from '@/components/layout/AppHeader'
import { colors } from '@/src/lib/designTokens'

function EditProfileContent() {
  const router   = useRouter()
  const supabase = createClient()
  useAppHeader({ title: 'Edit Profile', backHref: '/profile' })

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

        await supabase
          .from('organization_settings')
          .upsert({ organization_id: orgId, school_name: orgName.trim() }, { onConflict: 'organization_id' })
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
      <div style={{ minHeight: '100vh', background: colors.pageBackground, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e9d5ff', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid rgba(124,58,237,0.25)',
    borderRadius: 12, fontSize: 15, fontWeight: 600,
    color: '#1a1a2e', background: '#fafafa',
    fontFamily: "'Nunito', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 800, color: '#6b7280',
    letterSpacing: 0.8, marginBottom: 6, display: 'block',
    textTransform: 'uppercase',
  }

  return (
    <div className="hr-page" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <style>{`input:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }`}</style>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 0' }}>

        <h1 className="hr-h1" style={{ fontSize: 24, margin: '0 0 20px' }}>Edit Profile</h1>

        {/* Form card */}
        <div className="hr-card" style={{ padding: '24px 22px', marginBottom: 20 }}>

          {/* School name */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>School Name</label>
            <input
              style={inputStyle}
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="e.g. Corliss Home Academy"
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Email</label>
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

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button
              onClick={() => router.push('/profile')}
              style={{
                flex: 1, background: 'rgba(0,0,0,0.06)', border: 'none',
                borderRadius: 12, color: '#374151', fontSize: 15, fontWeight: 700,
                padding: '14px 0', cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
              }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2,
                background: saving ? '#c4b5fd' : '#7c3aed',
                border: 'none', borderRadius: 12, color: '#fff',
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
    </div>
  )
}

export default function EditProfilePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#3d3a52' }} />}>
        <EditProfileContent />
      </Suspense>
    </AuthGuard>
  )
}
