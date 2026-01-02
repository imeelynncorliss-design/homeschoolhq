// lib/tierTesting.ts
// Centralized tier testing utility

export type TierType = 'FREE' | 'PREMIUM' | 'FAMILY'

export const getTierForTesting = (): TierType => {
  // Check if we're in browser (not server-side)
  if (typeof window === 'undefined') return 'FREE'
  
  // Check localStorage for testing override
  const testingTier = localStorage.getItem('testing_tier') as TierType
  if (testingTier) {
    return testingTier
  }
  
  // Default to Family for testing
  return 'FAMILY'
}

export const setTierForTesting = (tier: TierType) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('testing_tier', tier)
    window.location.reload()
  }
}

export const clearTierTesting = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('testing_tier')
    window.location.reload()
  }
}