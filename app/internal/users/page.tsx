'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase'

type UserTier = 'FREE' | 'ESSENTIAL' | 'PRO' | 'PREMIUM'

const ADMIN_EMAILS = [
  'imeelynn.corliss@gmail.com',
  'courtneyditrich@gmail.com',
  'corlissimo@gmail.com',
  'bcunningham1117@gmail.com',
]

const TIER_COLORS: Record<string, string> = {
  PREMIUM:  'bg-purple-100 text-purple-800',
  PRO:      'bg-blue-100 text-blue-800',
  ESSENTIAL:'bg-green-100 text-green-800',
  FREE:     'bg-gray-200 text-gray-700',
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
  const [users, setUsers]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [saving, setSaving]         = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [addEmail, setAddEmail]     = useState('')
  const [addTier, setAddTier]       = useState<UserTier>('PRO')
  const [addError, setAddError]     = useState<string | null>(null)
  const [addSaving, setAddSaving]   = useState(false)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)
  const router  = useRouter()
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
        return [{ ...json.user, first_name: '', created_at: new Date().toISOString(), last_sign_in_at: null, age_confirmed: false, tos_confirmed: false, beta_nda_confirmed: false }, ...prev]
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

  const proCount     = users.filter(u => u.tier === 'PRO' || u.tier === 'PREMIUM').length
  const freeCount    = users.filter(u => u.tier === 'FREE').length
  const ndaCount     = users.filter(u => u.beta_nda_confirmed).length
  const allBoxes     = users.filter(u => u.age_confirmed && u.tos_confirmed && u.beta_nda_confirmed).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 mb-1">Beta User Dashboard</h1>
          <p className="text-gray-500 text-sm">HomeschoolReady admin view — visible to Imee, Courtney & Brittany only</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users',       value: users.length,  color: 'text-gray-900' },
            { label: 'Pro / Premium',     value: proCount,      color: 'text-blue-700' },
            { label: 'Free',              value: freeCount,     color: 'text-gray-500' },
            { label: 'All 3 Boxes ✓',     value: allBoxes,      color: 'text-green-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs font-semibold text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add Tester */}
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
          <p className="mt-2 text-xs text-gray-400">User must have already created an account. If not signed up yet, add them once they do.</p>
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
          <table className="w-full min-w-[900px]">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-gray-400 text-sm">
                    {search ? 'No users match that search.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filtered.map(user => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {user.first_name || <span className="text-gray-400 italic font-normal">—</span>}
                      {ADMIN_EMAILS.includes(user.email) && (
                        <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">ADMIN</span>
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
                        disabled={saving === user.user_id}
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
                  </tr>
                ))
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
