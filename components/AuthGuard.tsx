'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      
      if (!supabaseUser) {
        // 🛠️ Check for Localhost Bypass
        if (window.location.hostname === 'localhost') {
          console.warn(`🛠️ Dev Bypass Active on: ${pathname}`)
          setUser({ id: 'dev-user', email: 'dev@example.com' })
        } else {
          // No user and not on localhost? Kick to login
          router.push('/')
        }
      } else {
        setUser(supabaseUser)
      }
      setLoading(false)
    }

    checkUser()
  }, [router, pathname])

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <>
      {/* Universal Dev Banner */}
      {user?.id === 'dev-user' && (
        <div className="bg-yellow-100 border-b border-yellow-500 p-2 text-center text-xs font-bold text-yellow-800">
          ⚠️ DEV BYPASS ACTIVE (Localhost Only)
        </div>
      )}
      {children}
    </>
  )
}