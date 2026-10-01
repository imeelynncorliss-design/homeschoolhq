/**
 * Shared fallback school-year range, used whenever no `school_year_settings`
 * row exists yet for an org. Always computed from today's date — never a
 * hardcoded year (see the stale-default bug logged against the old
 * app/onboarding/page.tsx in the 2026-09-30 changelog entry, item 1.1).
 *
 * Unifies what were two slightly different inline fallbacks
 * (hooks/useSubjectCoverage.ts: Aug 1-May 31; app/compliance/page.tsx:
 * Aug 1-Jun 30) onto the Aug 1-May 31 convention already documented in
 * src/hooks/useComplianceHours.ts and useComplianceHealthScore.ts.
 */
export interface FallbackSchoolYear {
  startDate: string
  endDate: string
}

export function getFallbackSchoolYear(today: Date = new Date()): FallbackSchoolYear {
  const year = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1
  return {
    startDate: `${year}-08-01`,
    endDate: `${year + 1}-05-31`,
  }
}
