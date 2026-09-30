# Claude Code Prompt — Roadmap Item 1: Setup Replaces Forced Onboarding

## Before you start

1. Read `docs/ROADMAP.md` for the big picture. **Only item 1 is in scope.** Items 2–12 are context so the navigation and data model don't block them later. Do not build any of them.
2. Read `docs/CHANGELOG.md`. The product decisions for this item are already recorded there. Follow them.
3. After completing each step below, append an entry to `docs/CHANGELOG.md` using the format at the top of that file. Include **why**, not just what. Then stop and wait for my approval before the next step.

## Context

HomeschoolReady: Next.js + Supabase, deployed on Vercel.

Today, new users must finish a linear onboarding flow at `/onboarding` before they can see the app. Login routes users with no organization to `/onboarding`. The `organizations` and `user_organizations` rows are created inside `handleStateConfirmed` during onboarding.

**Conventions:**
- Supabase import path is `@/src/lib/supabase`
- Tables use `id, organization_id, user_id, created_at, updated_at`
- Row-level security (RLS) works through `organization_id` + `user_organizations`
- The table is `kids`, not `students`
- Scout is parent-facing only
- **UI terminology:** always "Student" in user-facing text, never "Learner." Keep the `kids` table name as is; this is a UI wording rule only. If you find "Learner" in existing UI text that you touch for this step, change it and log it; list other occurrences as a follow-up for roadmap item 3.

**Do not touch:** the 18+ age gate, terms acceptance at signup, the curriculum flow, navigation, the dashboard layout beyond the setup card, or anything else in ROADMAP items 2–12. If you notice problems there, list them in the change log's Follow-ups instead of fixing them.

## Branch and deploy rule

Work on a branch named `feature/setup-refactor`. Commit after each step.

**Steps 1.2 and 1.3 must be deployed together.** If the gate is removed without empty states in place, new users will hit broken pages. Step 1.1 is safe to deploy on its own.

---

## Step 1.0 — Investigate and plan (no code)

Use plan mode. Report:

1. Every file in the current onboarding flow.
2. Every redirect to `/onboarding`, including middleware, the login callback, layouts, and guards.
3. Where and how the org and `user_organizations` rows are created.
4. Where the NDA lives: component, route, any columns or tables, and any access checks.
5. Every page or component that assumes an org, a kid, a state, or a subject exists, and would crash or render blank without one.
6. Each field onboarding collects, and which table and column it writes to.
7. Whether teaching style is read anywhere, for example in Scout prompts.
8. What the `kids` table stores for age or birth date today.

Then propose the implementation for steps 1.1–1.4. Log the findings in the change log as "1.0 — Investigation."

## Step 1.1 — Create the org at first login

- Create the `organizations` and `user_organizations` rows server-side at signup or first login.
- Creation must be **idempotent**: running it twice must never create a duplicate.
- Use a placeholder org name that the setup step will overwrite later.
- Make org creation in `handleStateConfirmed` a no-op when the org already exists.
- If an existing user has no org, create one on login instead of redirecting them.

*Why:* Once the onboarding gate is removed, users reach the dashboard without an org. Every query protected by RLS would then fail.

## Step 1.2 — Remove the onboarding gate and the NDA

- Remove all redirects to `/onboarding`. Login always goes to the dashboard.
- Keep the `/onboarding` route, but make it redirect to the dashboard so old links still work.
- Remove the NDA step and any access checks that depend on it.
- **Do not drop any columns or tables.** List them as follow-ups for a later cleanup.

## Step 1.3 — Empty states

For every item found in 1.0 #5, replace the crash or blank screen with a helpful empty state and a clear action. Examples:
- No kids → "Add your first student"
- No subjects → "Add a subject"
- No state → "Choose your state to see requirements"

This is the highest-risk step. Test every page with a brand-new account that has no data.

## Step 1.4 — Setup checklist card

**Completion is based on data:**

| Step | Complete when |
|---|---|
| School name | org name is set and is not the placeholder |
| State | org has a state |
| Students | at least one `kids` row for the org |
| Subjects | at least one subject for the org |

- Teaching style, if kept, is optional and does not count toward completion.
- Add one stored field, `setup_dismissed_at` (a nullable timestamp). Put it on the org or the user profile, following whichever pattern the codebase already uses. Include a migration.

**Card behavior:**
- Shows on the dashboard when setup is incomplete and not dismissed.
- Text: "Welcome to HomeschoolReady! Let's get your homeschool set up." Show progress, such as "2 of 4 done."
- Steps can be done in any order. Each step shows a checkmark or a Start button.
- "Not now" hides the card for the current session. "Don't show again" sets `setup_dismissed_at`.
- A persistent "Finish setup" link stays available in the settings area for as long as setup is incomplete.
- Mobile-first. The card must not be covered by the Scout button at 375px width.

**Steps (reuse existing forms where possible):**
1. **School name** — helper text: "This is the name you'll use on records and portfolios."
2. **State** — helper text: "We'll only show the requirements that apply to you."
3. **Students** — name, grade, birth month and year, and an "Add another" button. Age is calculated, never stored. If the `kids` table currently stores a full birth date or a fixed age, tell me before changing the schema.
4. **Subjects** — after saving a subject, show an optional "Add curriculum now?" link to the **existing** curriculum flow.
5. **Teaching style** — only if 1.0 #7 found that something uses it. Otherwise leave it out and log why.

## Step 1.5 — Verify

- New user: sign up, land on the dashboard, visit every page with zero data and confirm nothing crashes, then complete the setup steps in a random order and confirm the card disappears.
- Existing fully set-up user: no card appears and nothing else changes.
- Dismiss the card, then find it again through "Finish setup."
- Check everything at 375px width.
- Build and type-check must both pass.
- Final change log entry: all files changed, all migrations, and all follow-ups.

## Working rules

- Do one step at a time. Stop after each one and wait for me.
- Never delete data or drop columns.
- Ask before adding any npm dependency.
- Stay in scope. Log anything else you notice as a follow-up.
