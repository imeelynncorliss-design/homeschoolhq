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

export default function UserManagementPage() {
  const [users, setUsers]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [saving, setSaving]     = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const router                  = useRouter()
  const supabase                = createClient()

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
    } catch (e) {
      alert('❌ Failed to update tier')
    } finally {
      setSaving(null)
    }
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name.toLowerCase().includes(search.toLowerCase())
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 mb-1">Beta User Management</h1>
          <p className="text-gray-500 text-sm">
            {users.length} total users &nbsp;·&nbsp; {proCount} on Pro/Premium &nbsp;·&nbsp; {freeCount} on Free
          </p>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tier</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Joined</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Change Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                    {search ? 'No users match that search.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filtered.map(user => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-700 text-gray-900">
                      {user.first_name || <span className="text-gray-400 italic">—</span>}
                      {ADMIN_EMAILS.includes(user.email) && (
                        <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">ADMIN</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{user.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIER_COLORS[user.tier] ?? TIER_COLORS.FREE}`}>
                        {user.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
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

      </div>
    </div>
  )
}
