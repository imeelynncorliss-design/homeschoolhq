# HomeschoolReady — Change Log

Every change is recorded here with **what** changed and **why**. Newest entries at the top.
Claude Code appends an entry after completing each step. Product decisions made before coding are recorded too.

Entry format:

```
## [YYYY-MM-DD] Roadmap item X.Y — Short title
**Status:** Planned | In progress | Done | Deployed
**What changed:** plain-language summary
**Why:** the reason (user feedback, bug, technical risk, compliance)
**Source:** who raised it (Courtney review, Imee, technical finding)
**Files:** list of files touched
**DB migrations:** name or "none"
**Follow-ups:** anything deferred or discovered
```

---

## [2026-09-30] Hotfix — Replaced retired claude-sonnet-4-20250514 model ID
**Status:** Done, awaiting local verification before merge
**What changed:** Replaced the hardcoded model ID `claude-sonnet-4-20250514` with `claude-sonnet-4-6` in three API routes, and added a `CLAUDE_SONNET_MODEL` named constant in `lib/ai.ts` for routes that call the `@anthropic-ai/sdk` client directly, so a future model swap is a one-line change instead of a hunt through each route.
**Why:** `claude-sonnet-4-20250514` was retired 2026-06-15. Curriculum import, assessment generation, and standards activity generation were all failing in production with "model not found" as a result.
**Source:** Imee (urgent, reported production failures)
**Files:** lib/ai.ts, app/api/import-curriculum/route.ts, app/api/generate-assessment/route.ts, app/api/standards/[id]/generate-activity/route.ts
**DB migrations:** none
**Testing:** `tsc --noEmit` shows the same 17 pre-existing errors as before this change (none new) across all four touched files. Not yet verified live — Imee is testing curriculum import locally before this merges to main. Branch: `hotfix/retired-model`.
**Follow-ups:**
- Scout's chat features use `claude-haiku-4-5-20251001` (the default in `lib/ai.ts`'s `getModel()`, used by `/api/adapt-lesson`, `/api/help-chat`, `/api/generate-activity`, `/api/generate-lesson`), which Imee flagged may be retired as soon as 2026-10-15. Not addressed in this hotfix — worth checking on/before that date so Scout doesn't break the same way.
- `app/api/standards/import/route.ts` already used the correct `claude-sonnet-4-6` value via its own local `modelName` const, so it wasn't broken and wasn't touched here. Could be pointed at the new shared `CLAUDE_SONNET_MODEL` constant in a later cleanup pass for consistency.
- Only the three routes reported as broken were fixed. Other AI routes go through `lib/ai.ts`'s `getModel()` (env-var driven, not a hardcoded string), so they weren't part of this retirement issue.

---

## [2026-09-30] Build order — Quick fixes (item 2) before setup (item 1)
**Status:** Decided
**Source:** Imee

**Decision:** Build roadmap item 2 first, then item 1, then item 3. Item numbers stay the same.

**Why:**
- The setup Subjects step (1.4) links to the existing curriculum flow, which has the new-subject bug (2.1). Building setup first would send every new user straight into a known bug.
- Courtney is testing the app now, so the bug fixes help her right away. New-user setup only matters once new users are signing up.
- The fixes are small and low-risk, and they don't need a database migration.
- Both items touch subjects. Merging item 2 before starting item 1 keeps their branches from conflicting.

---

## [2026-09-30] Roadmap restructure — Year-End Package added; compliance corrections
**Status:** Planned
**Source:** Courtney's product review; review of v1 Year-End Review Package (SC sample, generated 2026-09-30); state law research

**What changed in the roadmap:**
- Added item 3, "Compliance accuracy + Year-End Package fixes (Phase A)," and item 8, "Year-End Package: state-driven sections (Phase B)."
- Renumbered the later items. Curriculum rework is now item 6, lesson completion is item 7, and portfolio is item 11.

**Decisions and reasons:**

1. **Split the Year-End Package into two phases.**
   *Why:* Some v1 problems can hurt a family now and are cheap to fix using existing data (Phase A). The new sections need per-subject lesson data that doesn't exist until items 6 and 7 are built (Phase B).

2. **Attendance defaults to monthly totals per student, not a daily list.**
   *Why:* None of the states reviewed require a day-by-day list in the year-end package. States require families to keep attendance records (NY, NC, GA, SC). TN independent homeschools submit attendance records at year end, and SC Option 3 includes attendance in its semiannual progress report. A daily log runs about 7 pages per student at the v1 layout. The calendar grid (1 page) and the full log stay available as optional appendixes.

3. **Remove "Behind pace," "days remaining," and the health score from the package once the year has ended.**
   *Why:* The package goes to evaluators and districts. v1 showed "Needs Attention — Behind Required Pace" and "126 days remaining" for a school year that ended May 31. For a closed year, show final totals and Met / Not met. Pace tracking belongs on the in-app dashboard during the year.

4. **Organize the package by student.**
   *Why:* Evaluations and certifications are per child (PA evaluator certification, FL annual evaluation, VA evidence of progress). v1 grouped attendance by family, and its family total (51 days) conflicted with a student total (54 days).

5. **Add the SC option (1/2/3) to settings.**
   *Why:* SC Code § 59-65-40 (Option 1) requires 4.5 hours per day for 180 days. § 59-65-47 (Option 3) requires 180 days and no hours. v1 applied 810 hours to all SC families.

6. **Remove Ohio's hours and assessment requirements.**
   *Why:* Ohio HB 33 (effective October 2023) eliminated the annual assessment and the hours requirement. Courtney's portfolio notes listed Ohio as a portfolio-review state, which is out of date.

7. **Sections are state-driven, but the parent decides.**
   *Why:* States differ widely. For example, PA and FL require a reading log by name, SC/NY/GA require progress reporting, and PA requires test results in grades 3, 5, and 8. Turning sections on by state reduces work, and letting the parent turn them off respects families who know what their evaluator wants.

8. **State rules must cite a source.**
   *Why:* Compliance rules become outdated (as Ohio shows). Recording the source for each rule makes future audits quick. HomeschoolReady is not legal advice, and the state-by-state rules should be verified by counsel or state associations.

**Sources:** SC Code Title 59 Ch. 65 (scstatehouse.gov); FL Stat. 1002.41 (flsenate.gov); 8 NYCRR 100.10 (Cornell LII); TN Code § 49-6-3050 (Justia); HSLDA state guides (PA, NY, GA, NC, OH); MACHE (MD); HEAV (VA).

---

## [2026-09-28] Roadmap item 1 — Product decisions for setup refactor
**Status:** Planned
**Source:** Courtney's product review; Imee

**Decisions and reasons:**

1. **Replace forced onboarding with in-dashboard setup.**
   *Why:* Courtney found the app too restrictive, especially for NC. Every required step before a user sees value costs signups.

2. **Remove the beta NDA.**
   *Why:* It is no longer needed now that the beta is closed. It added friction with no ongoing purpose. Existing NDA data is kept in the database, not deleted.

3. **Keep State as a setup step. It was not in the original list.**
   *Why:* The compliance engine can only lighten requirements for NC if it knows the family is in NC. Without a state, the app either shows every requirement or none.

4. **Teaching style is optional, and included only if something uses it.**
   *Why:* A question whose answer changes nothing makes setup longer with no benefit to the parent.

5. **Store the student's birth month and year, not a fixed age or full birth date.**
   *Why:* Age calculates automatically, which supports Courtney's request for auto-updating age. It also keeps less child data, which is consistent with our COPPA posture. Confirm with counsel.

6. **The Subjects step links to the existing curriculum flow. It does not change it.**
   *Why:* The curriculum rework (roadmap item 6) is a separate, larger build. Setup shouldn't wait on it.

7. **Completion is based on actual data, not stored "done" flags.**
   *Why:* Flags can fall out of sync with reality. Checking the data means existing users are automatically treated as set up.

8. **The 18+ gate and terms acceptance at signup are unchanged.**
   *Why:* They are part of our COPPA posture and are separate from onboarding.

9. **Use "Student" in the UI, not "Learner."**
   *Why:* Courtney's notes used both terms. One consistent word avoids confusion, and "Student" matches her proposed bottom menu (Dashboard, Students, Curriculum, Records, More). The database table stays `kids`, so no schema change is needed.
