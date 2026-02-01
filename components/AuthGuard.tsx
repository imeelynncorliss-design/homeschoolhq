'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      
      if (!supabaseUser && process.env.NODE_ENV === 'development') {
        // Dev mode: use your actual org ID for local testing
        console.warn(`🛠️ Dev Mode Active on: ${pathname}`)
        setUser({ 
          id: 'd52497c0-42a9-49b7-ba3b-849bffa27fc4', // Your real organization ID
          email: 'dev@homeschoolhq.com' 
        })
      } else if (supabaseUser) {
        setUser(supabaseUser)
      } else {
        // No user and NOT in dev mode → redirect to login
        router.push('/')
      }
      setLoading(false)
    }

    getUser()
  }, [router, pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}