// components/DevTierToggle.tsx
'use client'

import { useState, useEffect } from 'react'
import { getTierForTesting, setTierForTesting, clearTierTesting, TierType } from '@/lib/tierTesting'
import { supabase } from '@/lib/supabase'

export default function DevTierToggle() {
  const [showMenu, setShowMenu] = useState(false)
  const [currentTier, setCurrentTier] = useState<TierType>('FREE')
  const [userEmail, setUserEmail] = useState<string>('') 

  useEffect(() => {
    setCurrentTier(getTierForTesting())
    loadUser() 
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      setUserEmail(user.email)
    }
  }

  const allowedEmails = [
    'imeelynn.corliss@gmail.com',  // REPLACE WITH YOUR ACTUAL EMAIL
    // Add more emails if needed
  ]

  if (!allowedEmails.includes(userEmail)) {
    return null  // Hide toggle for everyone else
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!showMenu ? (
        <button
          onClick={() => setShowMenu(true)}
          className="bg-yellow-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-yellow-600 font-semibold"
          title="Developer Tier Testing"
        >
          🔧 DEV
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-2xl p-4 border-2 border-yellow-500 min-w-[200px]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900">🔧 Tier Testing</h3>
            <button
              onClick={() => setShowMenu(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="text-xs text-gray-600 mb-2">
            Current: <span className="font-bold text-gray-900">{currentTier}</span>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => setTierForTesting('FREE')}
              className={`w-full px-3 py-2 rounded text-left text-sm ${
                currentTier === 'FREE'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              🔓 FREE
              <div className="text-xs opacity-75">1 child, manual only</div>
            </button>
            
            <button
              onClick={() => setTierForTesting('PREMIUM')}
              className={`w-full px-3 py-2 rounded text-left text-sm ${
                currentTier === 'PREMIUM'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-900 hover:bg-blue-200'
              }`}
            >
              ⭐ PREMIUM
              <div className="text-xs opacity-75">AI, unlimited kids, admin</div>
            </button>
            
            <button
              onClick={() => setTierForTesting('FAMILY')}
              className={`w-full px-3 py-2 rounded text-left text-sm ${
                currentTier === 'FAMILY'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-900 hover:bg-purple-200'
              }`}
            >
              👨‍👩‍👧 FAMILY
              <div className="text-xs opacity-75">Premium + social features</div>
            </button>
          </div>
          
          <button
            onClick={clearTierTesting}
            className="w-full mt-3 px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            Clear & Reset
          </button>
        </div>
      )}
    </div>
  )
}