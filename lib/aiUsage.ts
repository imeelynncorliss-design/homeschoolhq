import { createClient } from '@supabase/supabase-js'
import { AI_LIMITS, TIER_INFO, TIER_ORDER, type UserTier } from './tierTesting'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Server-safe tier lookup — uses service-role client, no localStorage */
async function getUserTier(userId: string): Promise<UserTier> {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.tier as UserTier) || 'FREE'
}

type UsageType = 'lessons' | 'activities' | 'scout'

/** Returns the first day of the current month as a date string, e.g. "2026-03-01" */
function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

/** Returns the next tier above the given one, or null if already at top. */
function nextTier(tier: UserTier): UserTier | null {
  const idx = TIER_ORDER.indexOf(tier)
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null
}

/**
 * Checks whether a user is within their monthly AI limit for the given type.
 * If allowed, atomically increments their counter.
 *
 * Returns { allowed: true } or { allowed: false, error: string }
 */
export async function checkAndIncrementUsage(
  userId: string,
  type: UsageType
): Promise<{ allowed: boolean; error?: string }> {
  const tier = await getUserTier(userId)
  const limit = AI_LIMITS[tier][type]

  // PRO / PREMIUM — unlimited, skip DB entirely
  if (limit === 'unlimited') return { allowed: true }

  const month = currentMonth()
  const col = type === 'lessons' ? 'lessons' : type === 'activities' ? 'activities' : 'scout_queries'

  // Fetch current month's usage (may not exist yet)
  const { data } = await supabase
    .from('ai_usage')
    .select(col)
    .eq('user_id', userId)
    .eq('usage_month', month)
    .maybeSingle()

  const current: number = (data as Record<string, number> | null)?.[col] ?? 0

  if (current >= (limit as number)) {
    const tierName = TIER_INFO[tier].name
    const upgrade = nextTier(tier)
    const upgradeMsg = upgrade
      ? ` Upgrade to ${TIER_INFO[upgrade].name} to get more.`
      : ''
    return {
      allowed: false,
      error: `You've reached your ${limit} ${type} limit for this month on the ${tierName} plan.${upgradeMsg}`,
    }
  }

  // Upsert with incremented count
  await supabase.from('ai_usage').upsert(
    { user_id: userId, usage_month: month, [col]: current + 1 },
    { onConflict: 'user_id,usage_month' }
  )

  return { allowed: true }
}
