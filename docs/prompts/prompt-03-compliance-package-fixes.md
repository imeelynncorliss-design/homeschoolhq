# Claude Code Prompt — Roadmap Item 3: Compliance Accuracy + Year-End Package Fixes (Phase A)

## Before you start

1. Read `docs/ROADMAP.md`. **Only item 3 is in scope.** Item 8 (Phase B: new package sections) is context only. Do not build it, but don't make choices that block it.
2. Read `docs/CHANGELOG.md`, especially the 2026-09-30 entry. The decisions and reasons are recorded there. Follow them.
3. After each step, add an entry to `docs/CHANGELOG.md` with **what** changed and **why**. Then stop and wait for my approval.

## Context

The Year-End Review Package is a PDF generated with `react-pdf`. Parents give it to evaluators, districts, or accountability associations. A v1 sample (SC, 5 students) had these problems:
- It said "Behind Required Pace" and "126 days remaining" on a school year that had already ended.
- It applied 810 hours to an SC family. That is only correct for SC Option 1.
- Its family total (51 days) conflicted with one student's total (54 days).
- It showed "Subjects covered: 0" even though hours were logged.
- It printed grade labels like "Grade 8th Grade."
- The attendance log was grouped by family and listed every day.

**Conventions:**
- Supabase import path: `@/src/lib/supabase`
- Tables use `id, organization_id, user_id, created_at, updated_at`, with row-level security (RLS) through `organization_id` + `user_organizations`
- The table is `kids`, but the UI says "Student"

**Do not touch:** the in-app dashboard's pace tracking (in-year "behind pace" warnings are fine inside the app), the curriculum flow, navigation, or anything in roadmap items 4–12.

Work on branch `feature/compliance-package-fixes`, and commit after each step.

---

## Step 3.0 — Investigate and plan (no code)

Use plan mode and report:
1. Where the compliance rules live (a config file, a table, or hardcoded values) and how each state's days and hours targets are defined.
2. The current rules for **OH** and **SC**, exactly as written in the code.
3. Every file involved in generating the package: data queries, calculations, and the react-pdf components.
4. How attendance is stored: per student or per family, and per day or per subject.
5. **The cause of the totals mismatch.** Explain why the family total (51 days) can be lower than one student's total (54 days).
6. Why "Subjects covered" shows 0 when hours are logged.
7. Where grade labels are formatted.
8. Whether a reading log, test results, or a per-subject progress field already exist in the database. Report only. Those features are Phase B.

Then propose the implementation for steps 3.1–3.4. Log the findings as "3.0 — Investigation."

## Step 3.1 — Compliance rule corrections

- **Ohio:** Remove any hours target and any assessment requirement. HB 33, effective October 2023, eliminated both.
- **South Carolina:** Add an SC option setting (Option 1, 2, or 3) to the organization. Include a migration. Existing SC organizations default to **Option 3**, and the parent can change it in settings.
  - Option 1: 180 days and 4.5 hours per day (SC Code § 59-65-40).
  - Option 2: follows SCAIHS requirements. Treat it as days only unless the codebase already defines something else, and flag it.
  - Option 3: 180 days and no hours (§ 59-65-47).
- **All states:** Add a `source` field (a URL or citation) and a `requirement_type` (`days`, `hours`, `days_or_hours`, `both`, `none`) to each state rule. Wherever a source isn't known, fill it with `TODO`, and list every TODO in the change log so I can have them verified.
- Do not change any other state's numbers in this step. List anything that looks wrong as a follow-up.

*Why:* v1 applied an Option 1 hours target to every SC family, and Ohio's rules have been out of date since 2023. Citing a source for each rule makes future audits quick.

## Step 3.2 — Fix data accuracy

- Fix the totals mismatch found in 3.0 #5. Every total in the package must be calculable from per-student data.
- Fix "Subjects covered" (3.0 #6).
- Format grades as "Grade 3," "Grade 8," and "Kindergarten."

*Why:* A package with totals that contradict each other undermines the parent's credibility with an evaluator.

## Step 3.3 — Restructure the package

**Structure:**
1. Cover page. The title depends on the state:
   - PA: "Evaluator Review Package"
   - FL: "Annual Evaluation Package"
   - All others: "Year-End Homeschool Record"

   Include the school name, school year, state (and the SC option if the state is SC), the students, and the date generated.
2. **One section per student**, each containing:
   - Summary: grade, days completed, and hours **only if the state's `requirement_type` includes hours**.
   - For a **closed year** (today is after the school-year end date), show final totals with **Met** or **Not met** for each requirement.
   - For an **open year**, show "In progress: X of Y days." Never show "Behind," "Needs attention," "days remaining," or percentage health scores in the PDF.
   - Attendance: day totals for each month, in a compact table.
3. Work samples (existing behavior, grouped by student).
4. **Parent attestation:** "I attest that the information in this record is accurate to the best of my knowledge." Include a signature line, printed name, and date.
5. Disclaimer (keep the existing one).

**Remove from the PDF:** the family-level health score, "Behind pace" labels, and "days remaining."

*Why:* Evaluations are per child, and this document goes to officials. Pace warnings belong in the app, not in a record submitted after the year ends.

## Step 3.4 — Attendance options + section chooser

Add a generation screen before the PDF is built:
- Attendance detail:
  - **Monthly totals** (default)
  - **One-page calendar grid per student**, with each attended day shaded
  - **Full daily log** as an appendix
- A checkbox for each student, so the parent can generate a package for one child or several.
- Build the section list as data, not hardcoded, so Phase B can add sections (reading log, test results, evaluator page, and others) without restructuring.

*Why:* None of the states reviewed require a day-by-day list in the package. A full daily log runs about 7 pages per student. Parents whose evaluator asks for more detail can still include it.

## Step 3.5 — Verify

- Generate packages for:
  - SC Option 1
  - SC Option 3
  - OH (no hours or assessment shown)
  - PA (evaluator title)
  - NC
- Test with a closed year (Met / Not met) and an open year (In progress, with no "Behind" language anywhere in the PDF).
- Test with 5 students: per-student totals are correct, and no family total contradicts a student total.
- Test each attendance option: monthly, calendar grid, and daily log. Report the page count for each.
- Build and type-check must both pass.
- Final change log entry: all files changed, all migrations, the list of state rules still marked `TODO`, and follow-ups.

## Working rules

- Do one step at a time. Stop after each one and wait for me.
- Never delete data or drop columns.
- Ask before adding any npm dependency.
- Stay in scope. Log anything else you notice as a follow-up.
