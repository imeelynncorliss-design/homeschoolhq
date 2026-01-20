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
        // Check for dev mode flag (set from login page)
        if (process.env.NODE_ENV === 'development' && 
            typeof window !== 'undefined' && 
            localStorage.getItem('dev_mode') === 'true') {
          console.warn(`🛠️ Dev Mode Active on: ${pathname}`)
          setUser({ 
            id: 'd52497c0-42a9-49b7-ba3b-849bffa27fc4', // Your real org_id
            email: 'dev@homeschoolhq.com' 
          })
        } else {
          // No user and not in dev mode? Redirect to login
          router.push('/')
        }
      } else {
        setUser(supabaseUser)
      }
      setLoading(false)
    }

    checkUser()
  }, [router, pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const isDevMode = process.env.NODE_ENV === 'development' && 
                    typeof window !== 'undefined' && 
                    localStorage.getItem('dev_mode') === 'true'

  return (
    <>
      {/* Universal Dev Mode Banner */}
      {isDevMode && (
        <div className="bg-yellow-100 border-b-2 border-yellow-500 p-3 flex justify-between items-center sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            <p className="font-bold text-yellow-800">
              DEV MODE ACTIVE
              <span className="ml-2 text-xs font-normal text-yellow-700">
                Using real org_id without authentication
              </span>
            </p>
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('dev_mode')
                router.push('/')
              }
            }}
            className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300 text-sm font-medium transition-colors"
          >
            Exit Dev Mode
          </button>
        </div>
      )}
      {children}
    </>
  )
}