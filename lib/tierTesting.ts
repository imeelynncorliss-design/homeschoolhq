// lib/tierTesting.ts
export type UserTier = 'FREE' | 'ESSENTIAL' | 'PRO' | 'PREMIUM'

/**
 * Feature flags by tier
 * 
 * Pricing Structure:
 * - FREE: $0 (1 student)
 * - ESSENTIAL: $60/yr (unlimited students, compliance)
 * - PRO: $99/yr (+ work calendar, AI, advanced compliance)
 * - PREMIUM: $149/yr (+ social features)
 */
export const TIER_FEATURES = {
  FREE: [
    'manual_lessons',
    'basic_calendar',
    'basic_compliance' // Basic compliance tracking for free tier
  ],
  ESSENTIAL: [
    'manual_lessons',
    'basic_calendar',
    'unlimited_kids',
    'curriculum_import',
    'compliance_tracking', // Full compliance tracking
    'basic_reporting'
  ],
  PRO: [
    'manual_lessons',
    'basic_calendar',
    'unlimited_kids',
    'curriculum_import',
    'compliance_tracking',
    'basic_reporting',
    'work_calendar', // KEY PRO FEATURE
    'ai_generation', // Moved to PRO
    'advanced_dashboards',
    'advanced_compliance_reports',
    'attendance_automation'
  ],
  PREMIUM: [
    'manual_lessons',
    'basic_calendar',
    'unlimited_kids',
    'curriculum_import',
    'compliance_tracking',
    'basic_reporting',
    'work_calendar',
    'ai_generation',
    'advanced_dashboards',
    'advanced_compliance_reports',
    'attendance_automation',
    'social_hub', // KEY PREMIUM FEATURE
    'coop_management',
    'family_collaboration'
  ]
} as const

/**
 * Check if a tier has access to a specific feature
 */
export function hasFeature(tier: UserTier, feature: string): boolean {
  return TIER_FEATURES[tier]?.includes(feature as any) ?? false
}

/**
 * Get the current tier for testing/development
 * Stored in localStorage, defaults to PRO for development
 */
export function getTierForTesting(): UserTier {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('dev_tier')
    if (saved && ['FREE', 'ESSENTIAL', 'PRO', 'PREMIUM'].includes(saved)) {
      return saved as UserTier
    }
  }
  return 'PRO' // Default to PRO for testing compliance features
}

/**
 * Set the tier for testing/development
 */
export function setTierForTesting(tier: UserTier) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dev_tier', tier)
    window.location.reload()
  }
}

/**
 * Get the maximum number of children allowed for a tier
 */
export function getChildLimit(tier: UserTier): number {
  return tier === 'FREE' ? 1 : 999 // Unlimited for paid tiers
}

/**
 * Tier display information for UI
 */
export const TIER_INFO = {
  FREE: { 
    name: 'Free', 
    price: '$0',
    priceYearly: '$0',
    color: 'gray',
    description: 'Perfect for trying out HomeschoolHQ'
  },
  ESSENTIAL: { 
    name: 'Essential', 
    price: '$5/mo',
    priceYearly: '$60/yr',
    color: 'blue',
    description: 'Core features for serious homeschoolers'
  },
  PRO: { 
    name: 'Pro', 
    price: '$8.25/mo',
    priceYearly: '$99/yr',
    color: 'purple',
    badge: 'Best for Working Parents',
    description: 'Full automation for busy working parents'
  },
  PREMIUM: { 
    name: 'Premium', 
    price: '$12.42/mo',
    priceYearly: '$149/yr',
    color: 'pink',
    badge: 'Complete Package',
    description: 'Everything plus social & collaboration'
  }
} as const

/**
 * Get the recommended upgrade tier for a feature
 */
export function getRequiredTier(feature: string): UserTier | null {
  for (const [tier, features] of Object.entries(TIER_FEATURES)) {
    if (features.includes(feature as any)) {
      return tier as UserTier
    }
  }
  return null
}

/**
 * Get upgrade message for a feature
 */
export function getUpgradeMessage(feature: string): string {
  const requiredTier = getRequiredTier(feature)
  if (!requiredTier) return 'This feature is not available.'
  
  const tierInfo = TIER_INFO[requiredTier]
  return `This feature requires ${tierInfo.name} tier (${tierInfo.priceYearly}). Upgrade to unlock!`
}