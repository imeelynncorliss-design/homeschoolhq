'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      }
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) {
      setMessage('Error: ' + error.message)
      console.error('Login error:', error)
    } else {
      setMessage('✅ Check your email for the login link!')
    }
    setLoading(false)
  }

  // Dev bypass handler - sets localStorage flag
  const handleDevBypass = () => {
    localStorage.setItem('dev_mode', 'true')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">HomeschoolHQ</h2>
          <p className="text-gray-600">Sign in to manage your homeschool</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Sending...' : '✨ Send Magic Link'}
          </button>
        </form>

        {/* Dev Mode Button */}
        {process.env.NODE_ENV === 'development' && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleDevBypass}
              className="w-full border-2 border-dashed border-yellow-300 bg-yellow-50 text-yellow-800 py-2 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium"
            >
              🛠️ Dev Mode: Skip to Dashboard
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Development only - uses real UUID
            </p>
          </div>
        )}

        {message && (
          <div className={`text-center text-sm font-medium p-3 rounded-lg ${
            message.includes('Error') 
              ? 'bg-red-50 text-red-800 border border-red-200' 
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}