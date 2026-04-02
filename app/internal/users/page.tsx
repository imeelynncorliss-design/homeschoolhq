'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase'

type UserTier = 'FREE' | 'ESSENTIAL' | 'PRO' | 'PREMIUM'
type ConfirmAction = { type: 'deactivate' | 'reactivate' | 'delete' | 'grant_admin' | 'revoke_admin'; user: any }

const ADMIN_EMAILS = [
  'imeelynn.corliss@gmail.com',
  'courtneyditrich@gmail.com',
  'corlissimo@gmail.com',
  'bcunningham1117@gmail.com',
]

const TIER_COLORS: Record<string, string> = {
  PREMIUM:   'bg-purple-100 text-purple-800',
  PRO:       'bg-blue-100 text-blue-800',
  ESSENTIAL: 'bg-green-100 text-green-800',
  FREE:      'bg-gray-200 text-gray-700',
}

function Check({ ok }: { ok: boolean }) {
  return ok
    ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold">✓</span>
    : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">—</span>
}

function fmt(dateStr: string | null) {
  if (!dateStr) return <span className="text-gray-300">—</span>
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function UserManagementPage() {
  const [users, setUsers]             = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [isAdmin, setIsAdmin]         = useState(false)
  const [saving, setSaving]           = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [addEmail, setAddEmail]       = useState('')
  const [addTier, setAddTier]         = useState<UserTier>('PRO')
  const [addError, setAddError]       = useState<string | null>(null)
  const [addSaving, setAddSaving]     = useState(false)
  const [addSuccess, setAddSuccess]   = useState<string | null>(null)
  const [confirm, setConfirm]         = useState<ConfirmAction | null>(null)
  const [actionSaving, setActionSaving] = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { checkAdminAccess() }, [])

  async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    if (!ADMIN_EMAILS.includes(user.email ?? '')) { router.push('/dashboard'); return }
    setIsAdmin(true)
    loadUsers()
  }

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      setUsers(json.users ?? [])
    } catch (e) {
      console.error('Error loading users:', e)
    } finally {
      setLoading(false)
    }
  }

  async function addTester() {
    if (!addEmail.trim()) return
    setAddSaving(true)
    setAddError(null)
    setAddSuccess(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail.trim(), tier: addTier }),
      })
      const json = await res.json()
      if (!res.ok) { setAddError(json.error ?? 'Failed'); return }
      setUsers(prev => {
        const exists = prev.find(u => u.user_id === json.user.user_id)
        if (exists) return prev.map(u => u.user_id === json.user.user_id ? { ...u, tier: addTier } : u)
        return [{ ...json.user, first_name: '', created_at: new Date().toISOString(), last_sign_in_at: null, age_confirmed: false, tos_confirmed: false, beta_nda_confirmed: false, is_banned: false }, ...prev]
      })
      setAddSuccess(`✓ ${addEmail.trim()} granted ${addTier} access`)
      setAddEmail('')
    } finally {
      setAddSaving(false)
    }
  }

  async function updateTier(user_id: string, newTier: UserTier) {
    setSaving(user_id)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, tier: newTier }),
      })
      if (!res.ok) throw new Error('Failed')
      setUsers(prev => prev.map(u => u.user_id === user_id ? { ...u, tier: newTier } : u))
    } catch {
      alert('❌ Failed to update tier')
    } finally {
      setSaving(null)
    }
  }

  async function executeConfirm() {
    if (!confirm) return
    setActionSaving(true)
    try {
      if (confirm.type === 'delete') {
        const res = await fetch('/api/admin/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: confirm.user.user_id }),
        })
        if (!res.ok) { const j = await res.json(); alert(j.error ?? 'Delete failed'); return }
        setUsers(prev => prev.filter(u => u.user_id !== confirm.user.user_id))
      } else {
        const action = confirm.type
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: confirm.user.user_id, action }),
        })
        if (!res.ok) { const j = await res.json(); alert(j.error ?? 'Action failed'); return }
        setUsers(prev => prev.map(u => {
          if (u.user_id !== confirm.user.user_id) return u
          if (action === 'grant_admin' || action === 'revoke_admin') return { ...u, is_admin: action === 'grant_admin' }
          return { ...u, is_banned: action === 'deactivate' }
        }))
      }
      setConfirm(null)
    } finally {
      setActionSaving(false)
    }
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.first_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (!isAdmin || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-500 font-semibold">
        {loading ? 'Loading users…' : 'Checking permissions…'}
      </div>
    </div>
  )

  const proCount  = users.filter(u => u.tier === 'PRO' || u.tier === 'PREMIUM').length
  const freeCount = users.filter(u => u.tier === 'FREE').length
  const allBoxes  = users.filter(u => u.age_confirmed && u.tos_confirmed && u.beta_nda_confirmed).length
  const banned    = users.filter(u => u.is_banned).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1280px] mx-auto">

        {/* Confirm modal */}
        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
              {confirm.type === 'delete' ? (
                <>
                  <div className="text-lg font-black text-gray-900 mb-1">Delete this user?</div>
                  <p className="text-sm text-gray-500 mb-1">
                    <span className="font-semibold text-gray-800">{confirm.user.email}</span>
                  </p>
                  <p className="text-sm text-red-600 font-medium mb-5">
                    This permanently removes their account and all data. It cannot be undone.
                  </p>
                </>
              ) : confirm.type === 'grant_admin' ? (
                <>
                  <div className="text-lg font-black text-gray-900 mb-1">Make this user an Admin?</div>
                  <p className="text-sm text-gray-500 mb-1">
                    <span className="font-semibold text-gray-800">{confirm.user.email}</span>
                  </p>
                  <p className="text-sm text-gray-500 mb-5">
                    They'll gain full access to this admin dashboard and can manage all users.
                  </p>
                </>
              ) : confirm.type === 'revoke_admin' ? (
                <>
                  <div className="text-lg font-black text-gray-900 mb-1">Remove admin access?</div>
                  <p className="text-sm text-gray-500 mb-1">
                    <span className="font-semibold text-gray-800">{confirm.user.email}</span>
                  </p>
                  <p className="text-sm text-gray-500 mb-5">
                    They'll lose access to this dashboard immediately.
                  </p>
                </>
              ) : confirm.type === 'deactivate' ? (
                <>
                  <div className="text-lg font-black text-gray-900 mb-1">Deactivate this user?</div>
                  <p className="text-sm text-gray-500 mb-1">
                    <span className="font-semibold text-gray-800">{confirm.user.email}</span>
                  </p>
                  <p className="text-sm text-gray-500 mb-5">
                    They won't be able to log in. Their data is preserved and you can reactivate them at any time.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-lg font-black text-gray-900 mb-1">Reactivate this user?</div>
                  <p className="text-sm text-gray-500 mb-1">
                    <span className="font-semibold text-gray-800">{confirm.user.email}</span>
                  </p>
                  <p className="text-sm text-gray-500 mb-5">
                    They'll be able to log in again immediately.
                  </p>
                </>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeConfirm}
                  disabled={actionSaving}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 ${
                    confirm.type === 'delete'       ? 'bg-red-600 hover:bg-red-700'
                    : confirm.type === 'deactivate' ? 'bg-amber-500 hover:bg-amber-600'
                    : confirm.type === 'grant_admin'? 'bg-indigo-600 hover:bg-indigo-700'
                    : confirm.type === 'revoke_admin'? 'bg-gray-600 hover:bg-gray-700'
                    : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {actionSaving ? 'Working…'
                    : confirm.type === 'delete'        ? 'Yes, Delete'
                    : confirm.type === 'deactivate'    ? 'Deactivate'
                    : confirm.type === 'grant_admin'   ? 'Make Admin'
                    : confirm.type === 'revoke_admin'  ? 'Remove Admin'
                    : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 mb-1">Beta User Dashboard</h1>
          <p className="text-gray-500 text-sm">HomeschoolReady admin view — visible to Imee, Courtney & Brittany only</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total Users',    value: users.length, color: 'text-gray-900' },
            { label: 'Pro / Premium',  value: proCount,     color: 'text-blue-700' },
            { label: 'Free',           value: freeCount,    color: 'text-gray-500' },
            { label: 'All 3 Boxes ✓',  value: allBoxes,     color: 'text-green-700' },
            { label: 'Deactivated',    value: banned,       color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs font-semibold text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Grant Access */}
        <div className="mb-6 bg-white rounded-xl border border-indigo-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-3">Grant Access</h2>
          <div className="flex gap-3 items-start flex-wrap">
            <input
              type="email"
              placeholder="tester@email.com"
              value={addEmail}
              onChange={e => { setAddEmail(e.target.value); setAddError(null); setAddSuccess(null) }}
              onKeyDown={e => e.key === 'Enter' && addTester()}
              className="flex-1 min-w-[220px] px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
            />
            <select
              value={addTier}
              onChange={e => setAddTier(e.target.value as UserTier)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="FREE">Free</option>
              <option value="ESSENTIAL">Essential</option>
              <option value="PRO">Pro</option>
              <option value="PREMIUM">Premium</option>
            </select>
            <button
              onClick={addTester}
              disabled={addSaving || !addEmail.trim()}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addSaving ? 'Adding…' : 'Grant Access'}
            </button>
          </div>
          {addError   && <p className="mt-2 text-sm text-red-600 font-medium">{addError}</p>}
          {addSuccess && <p className="mt-2 text-sm text-green-600 font-medium">{addSuccess}</p>}
          <p className="mt-2 text-xs text-gray-400">User must have already created an account.</p>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
        />

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tier</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Last Login</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">18+</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">ToS</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">NDA</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Change Tier</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-gray-400 text-sm">
                    {search ? 'No users match that search.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filtered.map(user => {
                  const isAdminUser = ADMIN_EMAILS.includes(user.email)
                  return (
                    <tr key={user.user_id} className={`hover:bg-gray-50 ${user.is_banned ? 'opacity-60 bg-amber-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {user.first_name || <span className="text-gray-400 italic font-normal">—</span>}
                        {isAdminUser && (
                          <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">ADMIN</span>
                        )}
                        {user.is_banned && (
                          <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">DEACTIVATED</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIER_COLORS[user.tier] ?? TIER_COLORS.FREE}`}>
                          {user.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(user.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(user.last_sign_in_at)}</td>
                      <td className="px-4 py-3 text-center"><Check ok={user.age_confirmed} /></td>
                      <td className="px-4 py-3 text-center"><Check ok={user.tos_confirmed} /></td>
                      <td className="px-4 py-3 text-center"><Check ok={user.beta_nda_confirmed} /></td>
                      <td className="px-4 py-3">
                        <select
                          value={user.tier}
                          disabled={saving === user.user_id || user.is_banned}
                          onChange={e => updateTier(user.user_id, e.target.value as UserTier)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="FREE">Free</option>
                          <option value="ESSENTIAL">Essential</option>
                          <option value="PRO">Pro</option>
                          <option value="PREMIUM">Premium</option>
                        </select>
                        {saving === user.user_id && (
                          <span className="ml-2 text-xs text-indigo-500 font-semibold">Saving…</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {/* Admin toggle — hide for hardcoded admins */}
                          {!ADMIN_EMAILS.includes(user.email) && (
                            user.is_admin ? (
                              <button
                                onClick={() => setConfirm({ type: 'revoke_admin', user })}
                                title="Remove admin"
                                className="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                              >
                                👑 Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirm({ type: 'grant_admin', user })}
                                title="Make admin"
                                className="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-500 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                              >
                                Make Admin
                              </button>
                            )
                          )}
                          {/* Deactivate / Reactivate / Delete — hide for all admins */}
                          {!user.is_admin && (
                            <>
                              {user.is_banned ? (
                                <button
                                  onClick={() => setConfirm({ type: 'reactivate', user })}
                                  className="px-2.5 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                >
                                  Reactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirm({ type: 'deactivate', user })}
                                  className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                                >
                                  Deactivate
                                </button>
                              )}
                              <button
                                onClick={() => setConfirm({ type: 'delete', user })}
                                className="px-2.5 py-1 text-xs font-bold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-400 text-center">
          {filtered.length} of {users.length} users shown
        </p>

      </div>
    </div>
  )
}
