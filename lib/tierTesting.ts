// lib/tierTesting.ts
import { supabase } from '@/src/lib/supabase'

export type UserTier = 'FREE' | 'ESSENTIAL' | 'PRO' | 'PREMIUM'

/**
 * Feature flags by tier — used for runtime feature gating throughout the app.
 *
 * Pricing Structure:
 * - FREE:      $0        (1 student)
 * - ESSENTIAL: $60/yr    ($5/mo)    — unlimited students, compliance, attendance, scheduling tools
 * - PRO:       $90/yr    ($7.50/mo) — + AI, co-teachers, Google Calendar, transcripts, progress tracking
 * - PREMIUM:   $120/yr   ($10/mo)   — + co-op, multi-family, org switcher, planning mode
 *
 * Competitor reference:
 * - Syllabird ($60/yr): includes vacation planning, bulk scheduling, transcripts — all features at base tier
 * - Homeschool Planet ($84.95/yr): single tier, all features included
 * → We keep vacation_planner + bulk_scheduler at ESSENTIAL to stay competitive at entry price point
 */
export const TIER_FEATURES = {
  FREE: [
    'manual_lessons',
    'basic_calendar',
    'basic_compliance',
    'school_year_config',
    'assessments',
  ],
  ESSENTIAL: [
    'manual_lessons',
    'basic_calendar',
    'basic_compliance',
    'school_year_config',
    'assessments',
    'unlimited_kids',
    'curriculum_import',
    'compliance_tracking',
    'attendance_tracking',
    'basic_reporting',
    'vacation_planner',
    'bulk_scheduler',
  ],
  PRO: [
    'manual_lessons',
    'basic_calendar',
    'basic_compliance',
    'school_year_config',
    'assessments',
    'unlimited_kids',
    'curriculum_import',
    'compliance_tracking',
    'attendance_tracking',
    'basic_reporting',
    'vacation_planner',
    'bulk_scheduler',
    'ai_generation',
    'family_collaboration',
    'work_calendar',
    'advanced_dashboards',
    'advanced_compliance_reports',
    'attendance_automation',
    'subject_coverage',
    'transcript_generator',
    'progress_tracking',
    // TODO: REMOVE BEFORE LAUNCH — Premium features unlocked for internal testing only
    // @ts-ignore
    'coop_management',
    'org_switcher',
    'priority_support',
    'planning_mode',
  ],
  PREMIUM: [
    'manual_lessons',
    'basic_calendar',
    'basic_compliance',
    'school_year_config',
    'assessments',
    'unlimited_kids',
    'curriculum_import',
    'compliance_tracking',
    'attendance_tracking',
    'basic_reporting',
    'vacation_planner',
    'bulk_scheduler',
    'ai_generation',
    'family_collaboration',
    'work_calendar',
    'advanced_dashboards',
    'advanced_compliance_reports',
    'attendance_automation',
    'subject_coverage',
    'transcript_generator',
    'progress_tracking',
    'coop_management',
    'org_switcher',
    'priority_support',
    'planning_mode',
  ]
} as const

/**
 * TIER_DISPLAY — single source of truth for the pricing page UI.
 * Update prices, labels, and feature bullets here only.
 */
export const TIER_DISPLAY: Record<UserTier, {
  name: string
  price: string
  priceYearly: string
  monthlyEquiv: string
  description: string
  badge?: string
  popular: boolean
  ctaText: string
  ctaColor: string
  features: string[]
}> = {
  FREE: {
    name: 'Free',
    price: '$0',
    priceYearly: '$0',
    monthlyEquiv: '',
    description: 'Try out HomeschoolReady',
    popular: false,
    ctaText: 'Get Started Free',
    ctaColor: 'bg-gray-600 hover:bg-gray-700',
    features: [
      '1 student',
      'Manual lesson planning',
      'Basic calendar view',
      'Basic compliance tracking'
    ]
  },
  ESSENTIAL: {
    name: 'Essential',
    price: '$60',
    priceYearly: '$60/yr',
    monthlyEquiv: '$5/mo',
    description: 'Core features for homeschoolers',
    popular: false,
    ctaText: 'Upgrade to Essential',
    ctaColor: 'bg-blue-600 hover:bg-blue-700',
    features: [
      'Unlimited students',
      'Curriculum import (PDF)',
      'Full compliance tracking',
      'Attendance tracking',
      'Vacation planner',
      'Bulk lesson scheduler',
      'Basic reporting'
    ]
  },
  PRO: {
    name: 'Pro',
    price: '$90',
    priceYearly: '$90/yr',
    monthlyEquiv: '$7.50/mo',
    description: 'For busy working parents',
    badge: 'Best for Working Parents',
    popular: true,
    ctaText: 'Upgrade to Pro',
    ctaColor: 'bg-purple-600 hover:bg-purple-700',
    features: [
      'Everything in Essential',
      '✨ AI lesson generation',
      '👩‍🏫 Family collaboration & co-teachers',
      '📅 Google Calendar sync',
      '📈 Progress tracking',
      'Advanced compliance reports',
      'Subject coverage reports',
      'Transcript generator'
    ]
  },
  PREMIUM: {
    name: 'Premium',
    price: '$120',
    priceYearly: '$120/yr',
    monthlyEquiv: '$10/mo',
    description: 'For co-ops & multi-family programs',
    popular: false,
    ctaText: 'Upgrade to Premium',
    ctaColor: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
    features: [
      'Everything in Pro',
      '🎨 Planning mode',
      '🏫 Co-op class management',
      'Multi-family organization',
      'Org switcher',
      'Priority support',
      'Early access to new features'
    ]
  }
}

/**
 * Feature comparison table rows for the pricing page.
 * Values order: [FREE, ESSENTIAL, PRO, PREMIUM]
 */
export const PRICING_COMPARISON_ROWS: { name: string; values: string[] }[] = [
  { name: 'Students',                    values: ['1',  '♾️', '♾️', '♾️'] },
  { name: 'Lesson Planning & Calendar',  values: ['✓',  '✓',  '✓',  '✓' ] },
  { name: 'Basic Compliance Tracking',   values: ['✓',  '–',  '–',  '–' ] },
  { name: 'Curriculum Import (PDF)',      values: ['–',  '✓',  '✓',  '✓' ] },
  { name: 'Full Compliance Tracking',    values: ['–',  '✓',  '✓',  '✓' ] },
  { name: 'Attendance Tracking',         values: ['–',  '✓',  '✓',  '✓' ] },
  { name: 'Vacation Planner',            values: ['–',  '✓',  '✓',  '✓' ] },
  { name: 'Bulk Scheduler',              values: ['–',  '✓',  '✓',  '✓' ] },
  { name: 'Basic Reporting',             values: ['–',  '✓',  '✓',  '✓' ] },
  { name: 'AI Lesson Generation',        values: ['–',  '–',  '✓',  '✓' ] },
  { name: 'Family Collaboration',        values: ['–',  '–',  '✓',  '✓' ] },
  { name: 'Google Calendar Sync',        values: ['–',  '–',  '✓',  '✓' ] },
  { name: 'Progress Tracking',           values: ['–',  '–',  '✓',  '✓' ] },
  { name: 'Advanced Compliance Reports', values: ['–',  '–',  '✓',  '✓' ] },
  { name: 'Subject Coverage Reports',    values: ['–',  '–',  '✓',  '✓' ] },
  { name: 'Transcript Generator',        values: ['–',  '–',  '✓',  '✓' ] },
  { name: 'Planning Mode',               values: ['–',  '–',  '–',  '✓' ] },
  { name: 'Co-op Management',            values: ['–',  '–',  '–',  '✓' ] },
  { name: 'Multi-Family / Org Switcher', values: ['–',  '–',  '–',  '✓' ] },
  { name: 'Priority Support',            values: ['–',  '–',  '–',  '✓' ] },
]

export const TIER_ORDER: UserTier[] = ['FREE', 'ESSENTIAL', 'PRO', 'PREMIUM']

// ─── Runtime feature checking ────────────────────────────────────────────────

export function hasFeature(tier: UserTier, feature: string): boolean {
  return TIER_FEATURES[tier]?.includes(feature as any) ?? false
}

/**
 * Call ONCE at login to cache beta Pro status in localStorage,
 * keeping getTierForTesting() synchronous everywhere else.
 */
export async function syncBetaTier(userId: string) {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('beta_pro_expires_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (profile?.beta_pro_expires_at) {
      localStorage.setItem('beta_pro_expires_at', profile.beta_pro_expires_at)
    } else {
      localStorage.removeItem('beta_pro_expires_at')
    }
  } catch (err) {
    console.warn('Could not sync beta tier:', err)
  }
}

export function getTierForTesting(): UserTier {
  if (typeof window !== 'undefined') {
    const betaExpiry = localStorage.getItem('beta_pro_expires_at')
    if (betaExpiry && new Date(betaExpiry) > new Date()) {
      return 'PRO'
    }
    const saved = localStorage.getItem('dev_tier')
    if (saved && ['FREE', 'ESSENTIAL', 'PRO', 'PREMIUM'].includes(saved)) {
      return saved as UserTier
    }
  }
  return 'PRO'
}

export function setTierForTesting(tier: UserTier) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dev_tier', tier)
    window.location.reload()
  }
}

export function getChildLimit(tier: UserTier): number {
  return tier === 'FREE' ? 1 : 999
}

/**
 * TIER_INFO — kept for backward compatibility with existing upgrade prompts.
 * For pricing page UI, use TIER_DISPLAY instead.
 */
export const TIER_INFO = {
  FREE:      { name: 'Free',      price: '$0',       priceYearly: '$0',      color: 'gray',   description: 'Perfect for trying out HomeschoolReady' },
  ESSENTIAL: { name: 'Essential', price: '$5/mo',    priceYearly: '$60/yr',  color: 'blue',   description: 'Core features for serious homeschoolers' },
  PRO:       { name: 'Pro',       price: '$7.50/mo', priceYearly: '$90/yr',  color: 'purple', badge: 'Best for Working Parents', description: 'AI + compliance + co-teachers for busy working parents' },
  PREMIUM:   { name: 'Premium',   price: '$10/mo',   priceYearly: '$120/yr', color: 'pink',   badge: 'Complete Package', description: 'Everything plus co-op & multi-family management' }
} as const

export function getRequiredTier(feature: string): UserTier | null {
  for (const tier of TIER_ORDER) {
    if ((TIER_FEATURES[tier] as readonly string[]).includes(feature)) return tier
  }
  return null
}

export function getUpgradeMessage(feature: string): string {
  const requiredTier = getRequiredTier(feature)
  if (!requiredTier) return 'This feature is not available.'
  const tierInfo = TIER_INFO[requiredTier]
  return `This feature requires ${tierInfo.name} tier (${tierInfo.priceYearly}). Upgrade to unlock!`
}