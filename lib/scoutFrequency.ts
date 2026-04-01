/**
 * Scout frequency recommendations for homeschool subjects.
 * Used in onboarding (step 5) and CurriculumImporter.
 */

// ─── Per-subject defaults ─────────────────────────────────────────────────────

type FrequencyTier = {
  perWeek: number
  label: string   // e.g. "daily" | "3–4× a week"
  reason: string  // Scout's short explanation
}

const SUBJECT_TIERS: Record<string, FrequencyTier> = {
  // Daily practice subjects
  'Math':          { perWeek: 5, label: 'daily',        reason: 'Math builds on itself — daily practice locks in concepts before you move on.' },
  'Language Arts': { perWeek: 5, label: 'daily',        reason: 'Reading and writing improve the most with consistent daily exposure.' },
  'Reading':       { perWeek: 5, label: 'daily',        reason: 'Daily reading is one of the highest-impact habits in any homeschool.' },
  'Writing':       { perWeek: 5, label: 'daily',        reason: 'Daily writing — even just 10 minutes — makes a huge difference over a year.' },
  'Spelling':      { perWeek: 5, label: 'daily',        reason: 'Short daily spelling practice beats long infrequent sessions every time.' },
  'Phonics':       { perWeek: 5, label: 'daily',        reason: 'Early readers need daily phonics repetition to build fluency.' },
  'Grammar':       { perWeek: 4, label: '4× a week',   reason: 'Grammar is best absorbed in short, frequent sessions rather than long ones.' },

  // High frequency
  'Foreign Language': { perWeek: 4, label: '4× a week', reason: 'Language acquisition needs frequent exposure — 4 days/week keeps vocabulary and grammar fresh.' },
  'Spanish':          { perWeek: 4, label: '4× a week', reason: 'Language acquisition needs frequent exposure — 4 days/week keeps vocabulary and grammar fresh.' },
  'Latin':            { perWeek: 3, label: '3× a week', reason: 'Latin is typically taught 3 days/week — enough for steady progress without overwhelm.' },

  // Moderate frequency
  'Science':          { perWeek: 3, label: '2–3× a week', reason: 'Science lessons often need time to sink in — 2–3 days/week with labs or projects works great.' },
  'History':          { perWeek: 3, label: '2–3× a week', reason: 'History is ideal for longer, richer sessions — 2–3 days/week lets you go deep.' },
  'Social Studies':   { perWeek: 3, label: '2–3× a week', reason: 'Social studies fits well at 2–3 days/week alongside history or as a standalone unit.' },
  'Geography':        { perWeek: 2, label: '2× a week',   reason: 'Geography is a great complement subject — 2 days/week fits most schedules.' },
  'Bible':            { perWeek: 3, label: '2–3× a week', reason: 'Most families do Bible or character study 2–3 days/week, often as a morning meeting.' },

  // Light frequency
  'Art':              { perWeek: 2, label: '1–2× a week', reason: 'Art projects take time to complete — once or twice a week gives space to create.' },
  'Music':            { perWeek: 2, label: '1–2× a week', reason: 'Music lessons or appreciation work well at 1–2 days/week, supplemented by instrument practice.' },
  'Physical Education': { perWeek: 3, label: '2–3× a week', reason: 'Most states count PE at 2–3 days/week. Daily movement is great but formal PE can be lighter.' },
  'Health':           { perWeek: 1, label: '1× a week',   reason: 'Health is usually a lighter subject — once a week is plenty for most grade levels.' },
  'Logic':            { perWeek: 2, label: '2× a week',   reason: 'Logic puzzles and critical thinking work well in 2 focused sessions a week.' },
  'Computer Science': { perWeek: 2, label: '2× a week',   reason: 'Coding and computer skills build steadily at 2 days/week.' },
  'Economics':        { perWeek: 2, label: '2× a week',   reason: 'Economics is a great elective at 2 days/week, especially for high schoolers.' },
}

const DEFAULT_TIER: FrequencyTier = {
  perWeek: 2,
  label: '2–3× a week',
  reason: "For elective and specialty subjects, 2–3 days/week is a solid starting point — you can always adjust as you find your rhythm.",
}

// ─── State minimum day context ────────────────────────────────────────────────

// States with required minimum school days (most require ~180)
const STATE_MIN_DAYS: Record<string, number> = {
  NC: 180, FL: 180, GA: 180, VA: 180, PA: 180, NY: 180,
  OH: 182, WA: 180, CO: 172, MA: 180, MI: 180, IL: 176,
}

// States with very low/no requirements
const STATE_FLEXIBLE: string[] = ['TX', 'AK', 'ID', 'IN', 'IL', 'OK', 'MO', 'NJ', 'CT', 'MS']

// ─── Main export ──────────────────────────────────────────────────────────────

export type ScoutFrequencyTip = {
  perWeek: number
  label: string
  reason: string
  stateNote: string | null
}

export function getScoutFrequencyTip(
  subject: string,
  stateCode: string | null,
): ScoutFrequencyTip {
  const tier = SUBJECT_TIERS[subject] ?? DEFAULT_TIER

  let stateNote: string | null = null
  if (stateCode) {
    const minDays = STATE_MIN_DAYS[stateCode]
    const isFlexible = STATE_FLEXIBLE.includes(stateCode)
    if (minDays) {
      const weeksPerYear = 36
      const daysPerWeekNeeded = Math.ceil(minDays / weeksPerYear)
      stateNote = `${stateCode} requires ${minDays} school days/year — schooling ${daysPerWeekNeeded}+ days/week across all subjects keeps you on track.`
    } else if (isFlexible) {
      stateNote = `${stateCode} has no minimum day requirements — you have full flexibility to set your own pace.`
    }
  }

  return { perWeek: tier.perWeek, label: tier.label, reason: tier.reason, stateNote }
}

/**
 * For onboarding where multiple subjects are selected at once.
 * Returns a summary tip that groups subjects by frequency tier.
 */
export function getOnboardingFrequencyTip(
  subjects: string[],
  stateCode: string | null,
): string {
  const daily    = subjects.filter(s => (SUBJECT_TIERS[s]?.perWeek ?? 0) === 5)
  const highFreq = subjects.filter(s => { const p = SUBJECT_TIERS[s]?.perWeek ?? 0; return p === 3 || p === 4 })
  const lowFreq  = subjects.filter(s => (SUBJECT_TIERS[s]?.perWeek ?? 3) <= 2)

  const parts: string[] = []

  if (daily.length > 0) {
    parts.push(`**${daily.join(', ')}** benefit from daily practice`)
  }
  if (highFreq.length > 0) {
    parts.push(`**${highFreq.join(', ')}** work great at 2–4× a week`)
  }
  if (lowFreq.length > 0) {
    parts.push(`**${lowFreq.join(', ')}** fit well at 1–2× a week`)
  }

  let tip = parts.length > 0
    ? `Based on your subjects: ${parts.join('; ')}. The global setting below applies to all — you can fine-tune each subject individually after onboarding.`
    : `The setting below applies to all your subjects — you can adjust each one individually in the Subjects tab after onboarding.`

  if (stateCode) {
    const minDays = STATE_MIN_DAYS[stateCode]
    if (minDays) {
      const daysNeeded = Math.ceil(minDays / 36)
      tip += ` ${stateCode} requires ${minDays} days/year — setting ${daysNeeded}+ days/week keeps you compliant.`
    } else if (STATE_FLEXIBLE.includes(stateCode)) {
      tip += ` ${stateCode} has no minimum requirements, so you're free to choose any pace.`
    }
  }

  return tip
}
