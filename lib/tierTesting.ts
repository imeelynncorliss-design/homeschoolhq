// lib/tierTesting.ts
import { supabase } from '@/src/lib/supabase'

export type UserTier = 'FREE' | 'ESSENTIAL' | 'PRO' | 'PREMIUM'

/**
 * PRICING (confirmed March 2026 — aligned with competitive research)
 *
 * FREE:      $0/yr       — 1 student, manual planning, basic compliance
 * ESSENTIAL: $60/yr      — $5/mo  — unlimited students, full compliance, attendance
 * PRO:       $90/yr      — $7.50/mo — + AI generation, co-teachers, calendar sync, transcripts
 * PREMIUM:   $120/yr     — $10/mo — + co-op management, org switcher, priority support
 *
 * Competitive context:
 * - Homeschool Planet: $84.95/yr, single tier, no AI
 * - Syllabird: $60–$90/yr, no AI, no compliance
 * - Homeschool Panda: $79.99/yr, no AI, no compliance
 * HomeschoolReady Pro at $90/yr is justified by unlimited AI generation +
 * state compliance automation — features no competitor offers.
 */

// ── Feature flags ────────────────────────────────────────────────────────────
// Used for runtime feature gating throughout the app.
// Each tier is cumulative — PRO includes all ESSENTIAL features, etc.

export const TIER_FEATURES = {
  FREE: [
    'manual_lessons',
    'basic_calendar',
    'basic_compliance',
  ],
  ESSENTIAL: [
    'manual_lessons',
    'basic_calendar',
    'unlimited_kids',
    'compliance_tracking',
    'attendance_tracking',
    'bulk_scheduler',
    'vacation_planner',
    'progress_checkin',
    'standards_management',
    'compliance_pdf_export',
    'basic_reporting',
  ],
  PRO: [
    'manual_lessons',
    'basic_calendar',
    'unlimited_kids',
    'compliance_tracking',
    'attendance_tracking',
    'bulk_scheduler',
    'vacation_planner',
    'progress_checkin',
    'standards_management',
    'compliance_pdf_export',
    'basic_reporting',
    'ai_lesson_generation',
    'ai_activity_generation',
    'curriculum_import',
    'family_collaboration',
    'google_calendar_sync',
    'transcript_generator',
    'advanced_reporting',
    'schoolhouse_helper_full',
  ],
  PREMIUM: [
    'manual_lessons',
    'basic_calendar',
    'unlimited_kids',
    'compliance_tracking',
    'attendance_tracking',
    'bulk_scheduler',
    'vacation_planner',
    'progress_checkin',
    'standards_management',
    'compliance_pdf_export',
    'basic_reporting',
    'ai_lesson_generation',
    'ai_activity_generation',
    'curriculum_import',
    'family_collaboration',
    'google_calendar_sync',
    'transcript_generator',
    'advanced_reporting',
    'schoolhouse_helper_full',
    'coop_management',
    'org_switcher',
    'priority_support',
  ],
} as const

// ── Tier ordering ─────────────────────────────────────────────────────────────

export const TIER_ORDER: UserTier[] = ['FREE', 'ESSENTIAL', 'PRO', 'PREMIUM']

export const TIER_RANK: Record<UserTier, number> = {
  FREE: 0,
  ESSENTIAL: 1,
  PRO: 2,
  PREMIUM: 3,
}

// ── Tier info — used for upgrade prompts and gating messages ─────────────────

export const TIER_INFO: Record<UserTier, { name: string; priceYearly: string; priceMonthly: string }> = {
  FREE:      { name: 'Free',      priceYearly: '$0',     priceMonthly: '$0' },
  ESSENTIAL: { name: 'Essential', priceYearly: '$60/yr', priceMonthly: '$5/mo' },
  PRO:       { name: 'Pro',       priceYearly: '$90/yr', priceMonthly: '$7.50/mo' },
  PREMIUM:   { name: 'Premium',   priceYearly: '$120/yr',priceMonthly: '$10/mo' },
}

// ── AI generation limits ──────────────────────────────────────────────────────

export const AI_LIMITS: Record<UserTier, { lessons: number | 'unlimited'; activities: number | 'unlimited' }> = {
  FREE:      { lessons: 10,          activities: 5 },
  ESSENTIAL: { lessons: 25,          activities: 15 },
  PRO:       { lessons: 'unlimited', activities: 'unlimited' },
  PREMIUM:   { lessons: 'unlimited', activities: 'unlimited' },
}

// ── TIER_DISPLAY — drives the /pricing page UI ────────────────────────────────
// Update prices, labels, and feature bullets here.
// The pricing page renders from this automatically — do not hardcode prices there.

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
    description: 'Get started — no credit card required',
    popular: false,
    ctaText: 'Get Started Free',
    ctaColor: 'bg-gray-600 hover:bg-gray-700',
    features: [
      '1 student',
      'Manual lesson planning',
      'Basic calendar view',
      'Basic compliance tracking',
      'Schoolhouse Helper (basic)',
    ],
  },
  ESSENTIAL: {
    name: 'Essential',
    price: '$60',
    priceYearly: '$60/yr',
    monthlyEquiv: '$5/mo',
    description: 'Unlimited students, full compliance tracking',
    popular: false,
    ctaText: 'Upgrade to Essential',
    ctaColor: 'bg-blue-600 hover:bg-blue-700',
    features: [
      'Unlimited students',
      'Full state compliance tracking',
      'Attendance tracking',
      'Bulk lesson scheduler',
      'Vacation / life happens planner',
      'Progress check-ins',
      'Standards management',
      'PDF compliance export',
    ],
  },
  PRO: {
    name: 'Pro',
    price: '$90',
    priceYearly: '$90/yr',
    monthlyEquiv: '$7.50/mo',
    description: 'AI-powered planning for working parents',
    badge: 'Most Popular',
    popular: true,
    ctaText: 'Upgrade to Pro',
    ctaColor: 'bg-purple-600 hover:bg-purple-700',
    features: [
      'Everything in Essential',
      '✨ Unlimited AI lesson generation',
      '✨ Unlimited AI activity generation',
      '✨ Curriculum import (PDF & image)',
      '👩‍🏫 Co-teacher & family collaboration',
      '📅 Google Calendar sync',
      'Transcript generator',
      'Schoolhouse Helper Copilot (full)',
    ],
  },
  PREMIUM: {
    name: 'Premium',
    price: '$120',
    priceYearly: '$120/yr',
    monthlyEquiv: '$10/mo',
    description: 'For co-ops and multi-family programs',
    popular: false,
    ctaText: 'Upgrade to Premium',
    ctaColor: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
    features: [
      'Everything in Pro',
      '🏫 Co-op class management',
      'Multi-family organization',
      'Organization switcher',
      'Priority support',
    ],
  },
}

// ── PRICING_COMPARISON_ROWS — drives the feature comparison table ─────────────
// Values must be in TIER_ORDER sequence: [FREE, ESSENTIAL, PRO, PREMIUM]
// Use '✓' for included, '–' for not included, or a string for a custom value.

export const PRICING_COMPARISON_ROWS: { name: string; values: string[] }[] = [
  // Students
  { name: 'Students',                    values: ['1',           'Unlimited',  'Unlimited',  'Unlimited'] },
  // AI generation
  { name: 'AI lesson generation',        values: ['10 / mo',     '25 / mo',    'Unlimited',  'Unlimited'] },
  { name: 'AI activity generation',      values: ['5 / mo',      '15 / mo',    'Unlimited',  'Unlimited'] },
  { name: 'Curriculum import (PDF)',      values: ['–',           '–',          '✓',          '✓'] },
  // Planning
  { name: 'Lesson planning & calendar',  values: ['✓',           '✓',          '✓',          '✓'] },
  { name: 'Bulk lesson scheduler',       values: ['–',           '✓',          '✓',          '✓'] },
  { name: 'Vacation planner',            values: ['–',           '✓',          '✓',          '✓'] },
  // Compliance & tracking
  { name: 'State compliance tracking',   values: ['Basic',       '✓',          '✓',          '✓'] },
  { name: 'Attendance tracking',         values: ['–',           '✓',          '✓',          '✓'] },
  { name: 'Progress check-ins',          values: ['–',           '✓',          '✓',          '✓'] },
  { name: 'Standards management',        values: ['–',           '✓',          '✓',          '✓'] },
  { name: 'PDF compliance export',       values: ['–',           '✓',          '✓',          '✓'] },
  // Reporting
  { name: 'Transcript generator',        values: ['–',           '–',          '✓',          '✓'] },
  { name: 'Google Calendar sync',        values: ['–',           '–',          '✓',          '✓'] },
  // Collaboration
  { name: 'Co-teacher collaboration',    values: ['–',           '–',          '✓',          '✓'] },
  { name: 'Co-op class management',      values: ['–',           '–',          '–',          '✓'] },
  { name: 'Organization switcher',       values: ['–',           '–',          '–',          '✓'] },
  // Support
  { name: 'Schoolhouse Helper Copilot',  values: ['Basic',       'Basic',      'Full',       'Full'] },
  { name: 'Priority support',            values: ['–',           '–',          '–',          '✓'] },
]

// ── Helper functions ──────────────────────────────────────────────────────────

export function hasFeature(userTier: UserTier, feature: string): boolean {
  return (TIER_FEATURES[userTier] as readonly string[]).includes(feature)
}

export function meetsMinimumTier(userTier: UserTier, requiredTier: UserTier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier]
}

export function getUpgradeMessage(requiredTier: UserTier): string {
  const info = TIER_INFO[requiredTier]
  return `This feature requires the ${info.name} plan (${info.priceYearly}). Upgrade to unlock.`
}

export async function getUserTier(userId: string): Promise<UserTier> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single()

  if (error || !data) return 'FREE'
  return (data.tier as UserTier) || 'FREE'
}