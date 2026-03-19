// Maps state abbreviation → regulation level
// Low = minimal requirements, High = most regulated

export type RegLevel = 'low' | 'moderate' | 'high'

const LOW_STATES = new Set([
  'AK','ID','IL','IN','KY','MI','MS','MO','MT','NJ','OK','TX','WY',
])
const HIGH_STATES = new Set([
  'MA','NY','PA','RI',
])

export function getRegLevel(stateAbbr: string | null | undefined): RegLevel | null {
  if (!stateAbbr) return null
  const s = stateAbbr.toUpperCase()
  if (LOW_STATES.has(s))  return 'low'
  if (HIGH_STATES.has(s)) return 'high'
  return 'moderate'
}

export const REG_LABEL: Record<RegLevel, string> = {
  low:      'Low Regulation',
  moderate: 'Moderate Regulation',
  high:     'High Regulation',
}

export const REG_DESC: Record<RegLevel, string> = {
  low:      'Minimal state requirements — you have a lot of freedom in how you structure your homeschool.',
  moderate: 'Some state requirements — a balance of flexibility and record-keeping.',
  high:     'More detailed record-keeping and reporting is required by your state.',
}
