'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase'

type UserTier = 'FREE' | 'ESSENTIAL' | 'PRO' | 'PREMIUM'

// UPDATE THESE WITH YOUR ACTUAL ADMIN EMAILS
const ADMIN_EMAILS = [
  'imeelynn.corliss@gmail.com',        // Replace with your email
  'courtneyditrich@gmail.com',           // Replace with Courtney's email
  'corlissimo@gmail.com',
  'bcunningham1117@gmail.com'            // Replace with Brittany's email
]

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  async function checkAdminAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user email is in admin list
      if (!ADMIN_EMAILS.includes(user.email || '')) {
        router.push('/dashboard')
        alert('⛔ Admin access required')
        return
      }

      setIsAdmin(true)
      loadUsers()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/dashboard')
    }
  }

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateTier(userId: string, newTier: UserTier) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ subscription_tier: newTier })
        .eq('id', userId)

      if (error) throw error
      
      alert(`✅ Tier updated to ${newTier}`)
      loadUsers()
    } catch (error) {
      console.error('Error updating tier:', error)
      alert('❌ Failed to update tier')
    }
  }

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Checking permissions...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage subscription tiers for beta testers</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Current Tier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Change Tier
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center" style={{ color: '#111827' }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm" style={{ color: '#111827', fontWeight: '600' }}>
                        {user.email || 'No email'}
                        {ADMIN_EMAILS.includes(user.email) && (
                          <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                            ADMIN
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          user.subscription_tier === 'PREMIUM' ? 'bg-purple-100' :
                          user.subscription_tier === 'PRO' ? 'bg-blue-100' :
                          user.subscription_tier === 'ESSENTIAL' ? 'bg-green-100' :
                          'bg-gray-200'
                        }`} style={{ color: '#111827' }}>
                          {user.subscription_tier || 'FREE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#111827', fontWeight: '600' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.subscription_tier || 'FREE'}
                          onChange={(e) => updateTier(user.id, e.target.value as UserTier)}
                          style={{ 
                            color: '#111827', 
                            fontWeight: '700',
                            backgroundColor: '#ffffff'
                          }}
                          className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-indigo-600 focus:outline-none cursor-pointer"
                        >
                          <option value="FREE">Free</option>
                          <option value="ESSENTIAL">Essential ($60/yr)</option>
                          <option value="PRO">Pro ($99/yr)</option>
                          <option value="PREMIUM">Premium ($149/yr)</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        <div className="mt-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-indigo-600 hover:text-indigo-700 font-bold"
          >
            ← Back to Admin
          </button>
        </div>
      </div>
    </div>
  )
}