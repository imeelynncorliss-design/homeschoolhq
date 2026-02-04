'use client'

import { useState, useEffect } from 'react'
import { getTierForTesting, setTierForTesting, type UserTier, TIER_INFO } from '@/lib/tierTesting'

export default function DevTierToggle() {
  const [currentTier, setCurrentTier] = useState<UserTier>('FREE')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setCurrentTier(getTierForTesting())
  }, [])

  const tiers: UserTier[] = ['FREE', 'ESSENTIAL', 'PRO', 'PREMIUM']
  
  const tierColors: Record<UserTier, string> = {
    FREE: 'bg-gray-500',
    ESSENTIAL: 'bg-blue-500',
    PRO: 'bg-purple-500',
    PREMIUM: 'bg-gradient-to-r from-purple-500 to-pink-500'
  }

  const tierEmojis: Record<UserTier, string> = {
    FREE: '🆓',
    ESSENTIAL: '📚',
    PRO: '⚡',
    PREMIUM: '👑'
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 ${tierColors[currentTier]} text-white rounded-lg shadow-lg font-bold text-sm flex items-center gap-2 transition-transform hover:scale-105`}
      >
        <span>{tierEmojis[currentTier]}</span>
        <span>DEV: {currentTier}</span>
      </button>
      
      {isOpen && (
        <div className="absolute bottom-14 right-0 bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden min-w-[280px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3">
            <p className="text-xs text-gray-300 font-bold uppercase tracking-wider">
              🔧 Development Mode
            </p>
            <p className="text-white font-black text-sm mt-1">
              Tier Switcher
            </p>
          </div>

          {/* Tier Options */}
          <div className="p-3 space-y-2">
            {tiers.map(tier => {
              const info = TIER_INFO[tier]
              const isActive = currentTier === tier
              
              return (
                <button
                  key={tier}
                  onClick={() => {
                    setTierForTesting(tier)
                    setCurrentTier(tier)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md transform scale-105'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{tierEmojis[tier]}</span>
                      <span className="font-black text-sm">{info.name}</span>
                      {isActive && (
                        <span className="text-xs">✓</span>
                      )}
                    </div>
                    <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                      {info.priceYearly}
                    </span>
                  </div>
                  
                  {tier === 'PRO' && (
                    <div className="text-[10px] font-medium opacity-90">
                      🎯 Default for testing compliance
                    </div>
                  )}
                  
                  {tier === 'ESSENTIAL' && (
                    <div className="text-[10px] font-medium opacity-90">
                      ✓ Compliance tracking enabled
                    </div>
                  )}
                  
                  {tier === 'FREE' && (
                    <div className="text-[10px] font-medium opacity-90">
                      ⚠️ Basic compliance only
                    </div>
                  )}
                  
                  {tier === 'PREMIUM' && (
                    <div className="text-[10px] font-medium opacity-90">
                      👑 Full access to everything
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
            <p className="text-[10px] text-gray-500 italic">
              ⚠️ Changes take effect after page reload
            </p>
          </div>
        </div>
      )}
    </div>
  )
}