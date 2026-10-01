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

## [2026-10-01] Roadmap item 1.2 — Remove onboarding gate and the NDA; item 1.3 batch 1 (5 of 21 pages)
**Status:** In progress. Branch `feature/setup-1.2-1.3` off `main`. Steps 1.2 and 1.3 ship together per the prompt — not merged yet, and not browser-tested yet. Stopping here for Imee's review per the batch-of-5 instruction.

**1.2 — Onboarding gate and NDA removed**
**What changed:**
- `middleware.ts`: removed the `/onboarding` auth-protection block and the matcher entries for it (the page now redirects on its own, authenticated or not). The rule that sent a logged-in visitor at `/login` or `/signup` to `/onboarding` now sends them to `/dashboard`.
- `app/onboarding/page.tsx`: replaced the 2,798-line wizard with a one-line server redirect to `/dashboard`, so old bookmarks/links still resolve. **The pre-1.2 version is recoverable at commit `ca3c043e21416ce0e1f2c75be5841c9e7cef2c42`** (last commit that touched the file).
- `app/signup/page.tsx`: the no-invite-code, session-already-live branch routed to `/onboarding` after `ensureOrganizationForUser`; now routes to `/agree` when `source === 'created'` (brand-new user, same age/ToS gate as login) and `/dashboard` otherwise — matches `app/login/page.tsx`'s existing logic, which needed no change.
- `app/agree/page.tsx`: removed the NDA checkbox and the `ndaConfirmed` state/`beta_nda_confirmed` write and read. The "already agreed" skip-ahead check now only requires `age_confirmed`/`tos_confirmed`, and both that check and `handleContinue` now route to `/dashboard` instead of `/onboarding`. **`beta_nda_confirmed` column is untouched** — just no longer written or checked.
- `app/auth/callback/route.ts` needed no change — it already routed `source: 'created'` to `/agree` and everything else to `/dashboard`, never through `/onboarding`.
**Why:** Roadmap item 1 — forced onboarding is where new users drop off, and the beta NDA has no ongoing purpose now that the beta is closed (existing NDA data kept, per the 2026-09-28 decision).
**Source:** `docs/prompts/prompt-01-setup.md` Step 1.2.
**Files:** `middleware.ts`, `app/onboarding/page.tsx`, `app/signup/page.tsx`, `app/agree/page.tsx`.
**DB migrations:** none. No columns dropped.

**1.3 — Shared `useOrganizationId()` hook + empty states, batch 1 of 21 pages**
**What changed:**
- New `src/hooks/useOrganizationId.ts`: replaces every page's old `getOrganizationId()` → `router.push('/onboarding')`-if-missing boilerplate. States: `loading`, `ready` (`{ organizationId, isCoTeacher, userId }`), `pending_invite`, `error` (with a `retry()`). Fast path is the same direct read every page already did (`getOrganizationId`); only when that comes back empty does it fall back to the idempotent `ensureOrganizationForUser` RPC (the same one login/signup use) — this is what self-heals a page opened without going through login (e.g. a resumed session on a direct deep link) and is how a stale pending invite gets surfaced here instead of a second org getting created out from under it.
- New `components/OrganizationStateScreen.tsx`: shared full-page screens for the hook's three non-`ready` states (`OrganizationLoadingScreen`, `OrganizationPendingInviteScreen` with a link to `/pending-invite`, `OrganizationErrorScreen` with a **Try again** button wired to the hook's `retry()`), so all 21 pages render the same thing instead of each inventing its own.
- Wired into 5 pages: `app/dashboard/page.tsx`, `app/attendance/page.tsx`, `app/standards-setup/page.tsx`, `app/assessments/page.tsx`, `app/calendar/connect/page.tsx`. Each page's own pre-existing guard logic was preserved exactly (dashboard's and attendance's `family_collaborators`-first checks, assessments' admin-only co-teacher redirect) — the hook only replaces the final "no org found" fallback that used to hard-redirect to `/onboarding`.
**Why:** Once the gate is gone, any page reached before an org exists (or mid-race, or via a pending invite) would otherwise crash or render blank. Step 1.3 explicitly calls for a shared hook with these four states on all 21 pages, in batches of 5.
**Source:** `docs/prompts/prompt-01-setup.md` Step 1.3; Imee's batch-of-5 instruction for this pass.
**Files:** `src/hooks/useOrganizationId.ts` (new), `components/OrganizationStateScreen.tsx` (new), `app/dashboard/page.tsx`, `app/attendance/page.tsx`, `app/standards-setup/page.tsx`, `app/assessments/page.tsx`, `app/calendar/connect/page.tsx`.
**DB migrations:** none.

**Also in this pass — unified the two fallback school-year ranges (carried over from the 1.1 follow-ups):**
**What changed:** New `src/lib/schoolYear.ts` exports `getFallbackSchoolYear(today?)`, always computed from the date passed in (defaults to `new Date()`) — never a hardcoded year. `hooks/useSubjectCoverage.ts`'s `getFallbackSchoolYear()` and `app/compliance/page.tsx`'s inline fallback (which used Aug 1-Jun 30, the odd one out) both now call it, settling on the Aug 1-May 31 convention already documented in `src/hooks/useComplianceHours.ts` and `useComplianceHealthScore.ts`.
**Why:** The 1.1 changelog entry flagged these two independent inline fallbacks and asked that unifying them compute the year from today's date rather than ever hardcoding one (the bug that had been found in the now-deleted `app/onboarding/page.tsx`, which is moot now that that file is gone).
**Files:** `src/lib/schoolYear.ts` (new), `hooks/useSubjectCoverage.ts`, `app/compliance/page.tsx`.
**DB migrations:** none.

**Testing so far:** `tsc --noEmit` holds at the documented 17 pre-existing errors (none new, confirmed none fall in any file touched here). `next build` completes clean, `/onboarding` still resolves as a redirect. Smoke-tested (`curl`, no auth) that `/attendance`, `/standards-setup`, `/assessments`, `/calendar/connect` return 200 and `/dashboard`/`/onboarding` redirect (307) rather than 500 against the running local dev server. **Not yet browser-tested** — stopping here per the batch-of-5 instruction for Imee to review and browser-test before the next 5 pages.
**Follow-ups:**
- For a user resolved only through the hook's RPC fallback (not the fast read) — notably every co-teacher/aide, since their membership lives in `family_collaborators`, which the fast path never checks — `ensure_organization_for_user` now runs on every one of these pages' loads, not just at login. It's idempotent and cheap (an advisory lock plus indexed lookups), but it's a new RPC round-trip on every page view for that whole user class. Worth a follow-up pass once all 21 pages are converted, to short-circuit via a cached/shared result instead of each page's hook instance re-resolving independently.
- `dashboard/page.tsx`'s and `attendance/page.tsx`'s pending-invite/error screens are gated on `!isCollaborator`/`!organizationId` so a collaborator whose own branch already succeeded can't get bounced by an unrelated hook hiccup — but in the brief window before either resolves, a true hook error could still flash the error screen for a collaborator. Edge case, not fixed here.
- 16 of 21 pages remain: `app/progress/page.tsx`, `app/curriculum/import/page.tsx`, `app/mastery/page.tsx`, `app/transcript/page.tsx`, `app/daily-log/page.tsx`, `app/compliance/page.tsx`, `app/vacation/page.tsx`, `app/subjects/page.tsx`, `app/bulk-schedule/page.tsx`, `app/lessons/page.tsx`, `app/field-trips/page.tsx`, `app/supply-scout/page.tsx`, `app/teacher/assessments/page.tsx`, `app/reading-log/page.tsx`, `app/school-year/page.tsx`, `app/standards/page.tsx`, `app/tools/page.tsx`.

---

## [2026-10-01] Hotfix — Invite signup: unauthenticated email-confirmation endpoint, and redeem-before-session bug
**Status:** Browser-tested by Imee (invite-code signup → confirm → sign in → `/teaching-schedule` as `co_teacher`, no placeholder org created, invite code cleared from metadata and sessionStorage; `confirm-user` endpoint confirmed gone, returns 404). Merged `hotfix/invite-signup` into `main`.

**1. Security fix: removed `POST /api/invites/confirm-user`**
**What changed:** Deleted `app/api/invites/confirm-user/route.ts` and its one call site in `app/signup/page.tsx`. The route took a raw `userId` in the request body and called `supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true })` using the service-role key, with no authentication, authorization, or ownership check of any kind.
**Why:** Any unauthenticated caller could POST an arbitrary `userId` and have that user's email force-confirmed. This directly undermines the `email_confirmed_at is not null` check added to `ensure_organization_for_user` in item 1.1, whose entire purpose was to stop an unconfirmed signup from riding along on another email's pending invite before address ownership is verified — this endpoint let an attacker fake that verification for any account. Found during review ahead of starting item 1.2.
**Source:** Technical finding (pre-1.2 review, Imee requested a hotfix pass).
**Files:** `app/api/invites/confirm-user/route.ts` (deleted), `app/signup/page.tsx`.
**DB migrations:** none.

**2. Bug fix: invite redemption attempted before a session exists**
**What changed:** `app/signup/page.tsx` called `redeemInvite()` immediately after `signUp()` on the invite-code path, even when Supabase requires email confirmation and no session exists yet — the `family_collaborators` insert then silently fails under RLS (`auth.uid()` is null). Fixed by:
- Passing the invite code into `signUp({ options: { data: { invite_code } } })` so it lands in `user_metadata` (survives the confirmation link being opened on a different device/browser), plus a `sessionStorage` same-tab fallback (`src/lib/pendingInviteCode.ts`).
- Only redeeming inline at signup when `data.session` is already live (email confirmations disabled for the project).
- `app/auth/callback/route.ts`: when a confirmed user carries a stored `invite_code`, redirect straight to `/pending-invite` instead of calling `ensure_organization_for_user` first.
- `app/login/page.tsx`: same check on password sign-in, for a user who confirmed by email and is logging in fresh with no live session from signup.
- `app/pending-invite/page.tsx`: if the RPC's own email-based match doesn't find a pending invite, falls back to redeeming the stored code directly. This also fixes **code-only invites** (`collaborator_invites.email = ''`), which the RPC's email match can never find since it compares against the empty string — previously these would silently get a placeholder org created instead of being redeemed. On a failed redemption (expired/revoked/already used), shows a friendly screen with "Try a different code" (→ `/join`) and "Start my own homeschool instead", rather than a dead-end error page. The invite code is cleared from both metadata and sessionStorage after any successful redemption.
**Why:** Co-teacher/aide signups with email confirmation enabled were silently failing to join the inviting family's account; code-only invites (no email specified at creation) were unredeemable from the signup flow entirely.
**Source:** Imee, hotfix request ahead of 1.2.
**Files:** `app/signup/page.tsx`, `app/auth/callback/route.ts`, `app/login/page.tsx`, `app/pending-invite/page.tsx`, `src/lib/pendingInviteCode.ts` (new).
**DB migrations:** none.

**2b. Ordering fix on `/pending-invite` (caught before browser testing):** the first version of the fix above still called `ensure_organization_for_user()` before checking for a stored invite code. For a code-only invite (no email match) the RPC would create a placeholder org first, then the code would get redeemed — leaving the user with both their own org and a collaborator membership. Fixed by checking `getStoredInviteCode()` first and redeeming directly, skipping the RPC call entirely when a code is present; the RPC only runs as a fallback when there's no stored code. A redemption failure of "You are already a member of this family account." is now treated as success (clears the code, routes to `/teaching-schedule`) rather than shown as an error.
**Files:** `app/pending-invite/page.tsx`.

**3. Checked: `app/join/page.tsx`**
**What changed:** No change. It already reads the live session via `supabase.auth.getUser()` immediately before calling `redeemInvite()`, so there's no redeem-before-session gap there — confirmed during this review.
**Files:** none.

**4. UI fix: bottom nav showing on `/pending-invite`**
**What changed:** Added `/pending-invite` to `NO_HEADER_ROUTES` in `components/AppShell.tsx`, which controls both the app header and `BottomNav` together (same mechanism already used for `/agree`, `/onboarding`, `/join`).
**Why:** Follow-up noted during 1.1 testing — the bottom nav shouldn't appear on this intermediate decision screen.
**Source:** 1.1 test pass (Imee).
**Files:** `components/AppShell.tsx`.
**DB migrations:** none.

**Follow-ups:**
- Pre-existing, not blocking: `redeemInvite()` step 5 (marking `collaborator_invites.status = 'accepted'`) is silently blocked by RLS when run as the invitee, so redeemed invites stay stuck at `status = 'pending'` even though the `family_collaborators` row was created successfully (see `+setup2`, `+setup3`). Proposed fix for later: a `SECURITY DEFINER` `accept_invite(code)` RPC that does the membership insert and status update in one transaction, the same pattern as `ensure_organization_for_user`.

---

## [2026-09-30] Roadmap item 1.1 — Create the org at first login
**Status:** Verified by Imee. Migration live on production; code committed on `feature/setup-refactor`, not yet merged to `main`.
**Testing (Imee, 2026-09-30) — all passed:**
- Existing owner: one org, unchanged; 3 parallel `ensure_organization_for_user` RPC calls all returned `existing_owner` (confirms the advisory lock holds under real concurrency, not just in theory). Anon RPC call refused with `42501`, confirming the `EXECUTE` grant restriction.
- New signup: exactly one `"My Homeschool"` placeholder org created at first sign-in, later renamed in place by onboarding's own school-name step; no duplicate.
- Invited co-teacher (normal signup, confirmed email, no invite checkbox): no org created, `/pending-invite` showed both choices, "Accept" created a `family_collaborators` row (`co_teacher`) in the inviting org and routed to `/teaching-schedule`; the RPC now returns `collaborator` for that user on subsequent calls.

1.1 is verified. Four issues surfaced during this testing pass, logged as follow-ups below (none fixed in this step — flagged for 1.2/1.3 or a dedicated fix per severity).
**What changed:**
1. **New migration** `supabase/migrations/20260930000000_ensure_organization_for_user.sql` adds a Postgres function `ensure_organization_for_user(p_placeholder_name, p_referral_source, p_force_create)` that idempotently creates an organization + `user_organizations` row for the calling user, or returns their existing membership, without ever creating a duplicate:
   - Checks, in order: an existing `user_organizations` row (`existing_owner`) → an existing `family_collaborators` row (`collaborator`) → a pending, unexpired `collaborator_invites` row matching the caller's **confirmed** email (`pending_invite`, unless `p_force_create` is true) → otherwise creates a new org (`created`).
   - Takes a per-user `pg_advisory_xact_lock` so concurrent calls for the same brand-new user (e.g. login and the auth callback firing close together) can't create two orgs. No unique constraint added to `user_organizations.user_id`, since a user can legitimately hold more than one membership row.
   - Identity (`auth.uid()`, `auth.jwt() ->> 'email'`) is derived from the caller's own session inside the function — no `user_id`/`email` parameters accepted, so a caller can never act on another user's behalf. `SECURITY DEFINER` with `SET search_path = public`; `EXECUTE` revoked from `PUBLIC` and from `anon`, granted only to `authenticated`.
   - The pending-invite email match additionally requires `auth.users.email_confirmed_at is not null` — an unconfirmed signup using someone else's email can't ride along on that person's invite before address ownership is actually verified.
2. **New client wrapper** `src/lib/ensureOrganization.ts` — `ensureOrganizationForUser(supabase, options?)` calls the RPC and returns a typed `{ organizationId, source, inviteOrganizationId?, inviteOrganizationName?, inviteCode? }`.
3. **New page** `app/pending-invite/page.tsx` — shown when the RPC returns `pending_invite`. Offers two explicit choices: "Accept invite to {org name}" (calls the existing `redeemInvite()` from `src/lib/invites.ts` using the invite code the RPC already matched) or "Start my own homeschool instead" (re-calls the RPC with `forceCreate: true`). Revoked/expired invites are already excluded by the function's `status = 'pending' AND expires_at > now()` filter, so they never reach this screen.
4. **Call sites wired in**, preserving today's downstream behavior (age/ToS gate via `/agree`, onboarding, co-teacher routing to `/teaching-schedule`) and only changing *where* the org gets created:
   - `app/login/page.tsx` — replaces the old read-only "check owned org, then check membership, else `/agree`" logic with one `ensureOrganizationForUser` call; `source: 'created'` still routes to `/agree` (brand-new user, unchanged gate), anything else routes to `/dashboard`, `pending_invite` routes to `/pending-invite`.
   - `app/signup/page.tsx` — the no-invite-code, session-already-live branch now calls `ensureOrganizationForUser` before redirecting (catches the case where this email actually has a pending invite waiting, even though the "I have an invite code" box wasn't checked — a real gap that existed before this change).
   - `app/auth/callback/route.ts` — covers the email-confirmation-required path (where no session exists yet at signup time). Only runs the RPC when no explicit `?next=` was requested (so password-reset-style redirects through this same route are untouched).
5. **`handleStateConfirmed` in `app/onboarding/page.tsx`:** no change — already gated on `if (!orgId)`, so it stays a no-op once the org already exists by the time a user reaches it.

**Why:** Roadmap item 1 requires an org to exist before the onboarding gate can be removed (Step 1.2), without breaking RLS or creating duplicate/orphaned orgs for invited co-teachers. Decisions and conditions below came out of plan review before any code was written.

**Important correction to the Step 1.0 investigation:** `app/auth/callback/route.ts` and `src/app/auth/callback/route.ts` are two different files (confirmed via `diff`), and likewise `app/join/page.tsx` / `src/app/join/page.tsx`. Only the root `app/` versions are actually served — confirmed via `.next/server/app-paths-manifest.json`, which maps `/auth/callback/route` and `/join/page` to the `app/` copies. The Step 1.0 investigation subagent had read the `src/app/` versions and reported their (different, dead) logic. This code targets the live `app/` files; the `src/app/auth/callback/route.ts` and `src/app/join/page.tsx` duplicates are dead code, left untouched (follow-up below). Also correcting Step 1.0's "no `/legal/beta-nda` route exists" note — it does exist (`app/legal/beta-nda/page.tsx`); confirmed via `next build`'s route listing.

**Decisions from plan review (binding):**
- Org creation is one atomic Postgres function with an advisory lock, not a client-side select-then-insert — login and the auth callback can race for the same new user.
- The function must check `family_collaborators` and `collaborator_invites` before creating an org, so an invited co-teacher/aide never gets a spurious second org.
- Identity comes from `auth.uid()`/`auth.jwt()` inside the function, never from caller-supplied parameters; `EXECUTE` is restricted to `authenticated` only (not `anon`, not `PUBLIC`).
- The pending-invite email match only applies once the email is confirmed (`email_confirmed_at is not null`), to prevent an unconfirmed signup from riding along on someone else's invite.
- The pending-invite screen must offer both "accept" and "start my own," never pick one automatically; revoked/expired invites are ignored.
- **Deploy order is binding:** this migration must be applied to the production Supabase database and confirmed **before** any code calling the RPC is merged to `main`. Merging the code first would break every login/signup (RPC not found).

**Source:** `docs/prompts/prompt-01-setup.md` Step 1.1; Imee (plan review — invite-awareness, atomic/race-safe creation, SECURITY DEFINER identity + grants, two-choice pending-invite screen, email-confirmation requirement, anon revoke, deploy order)
**Files:** `supabase/migrations/20260930000000_ensure_organization_for_user.sql` (new), `src/lib/ensureOrganization.ts` (new), `app/pending-invite/page.tsx` (new), `app/login/page.tsx`, `app/signup/page.tsx`, `app/auth/callback/route.ts`
**DB migrations:** `ensure_organization_for_user` function — **applied to production 2026-09-30, confirmed via Supabase SQL editor (grants: `authenticated`/`postgres`/`service_role` only).**
**Build/type-check:** `tsc --noEmit` holds at the same 17 pre-existing errors (none in files touched here). `next build` completes clean, including the new `/pending-invite` route.
**Follow-ups:**
- **HIGH — invite-code signup fails in production (found 2026-09-30):** in `app/signup/page.tsx`, the "I have an invite code" path calls `redeemInvite()` immediately after `supabase.auth.signUp()`, but when email confirmation is required there's no session yet at that point, and RLS blocks the `family_collaborators` insert for an unauthenticated caller. The co-teacher gets a created auth account but no membership row, and sees "the invite code failed" even though the code was valid. **Not fixed in this step.** Fix direction: defer `redeemInvite()` until the user's first signed-in session — either in `app/auth/callback/route.ts` (mirroring how org creation was deferred there for the no-invite-code path in this same step) or at first login — rather than at the moment of the `signUp()` call.
- `src/app/auth/callback/route.ts` and `src/app/join/page.tsx` are dead duplicates of the live `app/` versions (same route paths, different/stale content in the callback's case) — confusing to anyone editing auth code, not fixed here since removing files needs explicit approval; flagging for a cleanup pass.
- An open (not email-specific) `collaborator_invites` row (`email = ''`) is never auto-detected by this change — only invites created for a specific email can match a logging-in user. This matches today's intent (an open invite isn't "for" anyone specific yet) but is worth knowing: open-code invites still only work through the existing manual `/join` or signup-checkbox code entry.
- **Bug found during 1.1 testing (Imee):** `app/onboarding/page.tsx:826-827` hardcodes the default school-year dates to `'2025-08-01'`/`'2026-05-31'` instead of computing them from today's date. Every new signup since roughly August 2026 has gotten last year's school-year range as its starting default (parents can still edit it during onboarding, so this isn't silently permanent, but the default shown is wrong for anyone who doesn't change it). Not fixed now — this exact page is replaced by a redirect in Step 1.2 — but two things carry forward from it:
  - **Data-fix check for Step 1.2/1.5:** before/when removing `app/onboarding/page.tsx`, query `school_year_settings` for rows with `school_year_start = '2025-08-01' AND school_year_end = '2026-05-31'` created after roughly August 2026, to see how many real accounts are carrying the stale default and whether a one-time data correction (not a silent backfill guess — confirm with Imee first) is warranted.
  - **Step 1.3 fix:** when unifying `hooks/useSubjectCoverage.ts`'s `getFallbackSchoolYear()` and `app/compliance/page.tsx`'s inline fallback into one shared util (per the approved plan), compute the year from today's date the way `getFallbackSchoolYear()` already does — never hardcode a year, so this bug can't recur in the unified version.
- **`/pending-invite` shows the bottom nav (found 2026-09-30):** `components/AppShell.tsx:10-21`'s `NO_HEADER_ROUTES` list (which already excludes `/login`, `/agree`, `/onboarding`, `/join`, etc.) doesn't include `/pending-invite`, so `BottomNav` renders on that page and a user can tap away to Dashboard/Students/etc. without ever making the accept/start-own-homeschool choice — leaving them in limbo with no org and an unresolved pending invite. Not fixed in this step; needs `/pending-invite` added to `NO_HEADER_ROUTES`.
- The old onboarding wizard (`app/onboarding/page.tsx`) has no sign-out or exit control — a user who starts it has no way back out short of closing the tab. Not fixed here since the whole page is replaced by a redirect in Step 1.2 anyway; noting only so it isn't mistaken for a gap in `/pending-invite` or the new call sites.
- Steps 1.2–1.4 still ahead: the gate itself, the NDA, the 21 pages' empty states, and the setup checklist card are all unchanged by this step.

---

## [2026-09-30] Roadmap item 1.0 — Investigation and plan for setup refactor
**Status:** Done (investigation + plan only, no code changed). Plan approved by Imee; implementation proceeds one step at a time (1.1, then 1.2+1.3 together, then 1.4), each stopped for approval.
**Source:** `docs/prompts/prompt-01-setup.md` Step 1.0; Imee (plan review, three rounds of revisions)

**What changed:** No code. Branch `feature/setup-refactor` created from `main`. Full investigation of the current onboarding flow, plus a plan for Steps 1.1–1.4, refined through three rounds of review.

**Investigation findings:**
1. **Onboarding flow files:** `app/onboarding/page.tsx` (2,798-line monolith, steps 0–6) is the only real flow. `app/onboarding/standards/page.tsx` and `components/OnboardingTour.tsx` are orphaned — not linked from anywhere, left untouched.
2. **Redirects to `/onboarding`:** `middleware.ts` (two places), `app/login/page.tsx:66`, `app/signup/page.tsx:127`, `src/app/auth/callback/route.ts:94`, `app/agree/page.tsx` (two places), plus **21 feature pages** that hard-redirect whenever `orgId` is missing (`app/dashboard/page.tsx`, `app/attendance/page.tsx`, `app/standards-setup/page.tsx`, `app/assessments/page.tsx`, `app/calendar/connect/page.tsx`, `app/progress/page.tsx`, `app/curriculum/import/page.tsx`, `app/mastery/page.tsx`, `app/transcript/page.tsx`, `app/daily-log/page.tsx`, `app/compliance/page.tsx`, `app/vacation/page.tsx`, `app/subjects/page.tsx`, `app/bulk-schedule/page.tsx`, `app/lessons/page.tsx`, `app/field-trips/page.tsx`, `app/supply-scout/page.tsx`, `app/teacher/assessments/page.tsx`, `app/reading-log/page.tsx`, `app/school-year/page.tsx`, `app/standards/page.tsx`, `app/tools/page.tsx`).
3. **Org/`user_organizations` creation:** only happens in `handleStateConfirmed` (`app/onboarding/page.tsx:1055-1129`), already guarded by `if (!orgId)` — already a no-op when an org exists.
4. **NDA:** lives entirely in `app/agree/page.tsx` (`beta_nda_confirmed` on `user_agreements`), a separate page from onboarding's own age/ToS-only step-0 gate.
5. **Pages assuming org/kid/subject/state exist:** the real fragility is the 21-page hard-redirect pattern above, not missing null-guards — array access elsewhere is already defensively guarded (`app/parents-corner/page.tsx` already shows the right pattern: empty-state message instead of crash).
6. **Fields onboarding collects → destination:** org name/state/compliance/school year/teaching style → `organizations` / `user_compliance_settings` / `school_year_settings`; kids info → `kids`; subjects → `subjects`; derived `homeschool_style` → `user_profiles`. Curriculum-choice step 3 is never persisted today.
7. **Teaching style IS used elsewhere:** `user_profiles.homeschool_style` (derived from `organizations.teaching_style`) directly shapes Scout's system prompt (`app/api/help-chat/route.ts`) and lesson/activity generation (`generate-activity`, `generate-lesson`) — kept in setup per the prompt's own conditional.
8. **`kids` age/birthdate:** today stores a plain `age` integer and `grade` string — no birthdate columns exist anywhere in the schema or migrations.
9. **Two separate kid-edit surfaces found** (same "feature in two places" pattern as item 2): `components/KidProfileForm.tsx` (used from `app/profile/page.tsx`) and `components/EditChildModal.tsx` (used from `app/dashboard/page.tsx`) — the latter has no age field at all today.
10. **Invite/collaboration system** (investigated after Imee's review): two separate, non-syncing membership systems. Owner/admin membership is `user_organizations`. Co-teacher/aide membership is `family_collaborators` (accepted) / `collaborator_invites` (pending, keyed by email + an 8-char code, via `src/lib/invites.ts`'s `redeemInvite()`, `app/signup/page.tsx`'s invite checkbox, and `src/app/join/page.tsx`). A user who joins via invite never gets a `user_organizations` row — critical for the org-creation design below.
11. **`school_year_settings` / `user_compliance_settings`** (investigated after Imee's review): onboarding writes both today via `handleSchoolYearConfirmed`/`handleComplianceConfirmed`. Every current reader already degrades gracefully on a missing row (`.maybeSingle()` + defaults, mostly `?? 180` days) — no reader crashes. Two independent hardcoded fallback school-year ranges already exist (`hooks/useSubjectCoverage.ts`'s Aug 1–May 31 vs. `app/compliance/page.tsx`'s inline Aug 1–Jun 30) — worth unifying, not a new gap.

**Decisions made during plan review:**
- **`kids.birth_month`/`kids.birth_year` (new columns) replace the plan to keep the stored `age` field for new entries.** *Why:* the setup prompt calls for calculated, never-stored age; the existing `age` column can't support that. No backfill from the old `age` value — never guess a birth date. Conditions: (1) every kid create/edit surface (`KidProfileForm`, `EditChildModal`, not just the new setup step) must write the new fields; (2) rows with no birth month/year keep showing the stored `age`, with a gentle non-blocking nudge to add it — never computed or guessed.
- **Org creation moves into a single Postgres function, `ensure_organization_for_user`,** taking a per-user `pg_advisory_xact_lock` rather than a client-side select-then-insert. *Why:* login and the OAuth callback route can fire concurrently for the same new user; select-then-insert is not race-safe. No unique constraint added to `user_organizations.user_id`, since a user can legitimately belong to more than one org.
- **The function checks `user_organizations`, then `family_collaborators`, then pending `collaborator_invites` (by email, `status='pending' AND expires_at > now()`) before ever creating an org**, and derives identity from `auth.uid()`/`auth.jwt()` internally rather than accepting `user_id`/`email` parameters — `SECURITY DEFINER`, `SET search_path = public`, `EXECUTE` revoked from `PUBLIC` and granted only to `authenticated`. *Why:* prevents a spurious second org for an invited co-teacher/aide, and prevents a caller from ever passing someone else's identity.
- **Pending-invite case shows two explicit choices** — "Accept invite to {org name}" and "Start my own homeschool instead" (the latter re-calls the function with a new `p_force_create` flag) — rather than silently doing either. Revoked/expired invites are already excluded by the `status`/`expires_at` filter.
- **Migration deploy order is binding:** the `ensure_organization_for_user` migration must be applied to production and confirmed *before* any code calling the RPC is merged to `main` — merging the code first would break all login/signup. This applies to the Step 1.4 migration (`setup_dismissed_at`, `birth_month`/`birth_year`) the same way.
- **"School year" is not a required checklist step** in 1.4 — not in the prompt's four-step completion table, and existing stateless fallbacks already cover every reader without a persisted row. Gets a low-key link in the persistent "Finish setup" area instead, alongside teaching style.
- **`app/onboarding/page.tsx` will be replaced in place with a redirect, not copied to a new file** — recovered via git history if Step 1.4 needs to lift any of its quiz/form logic. The commit hash will be recorded when Step 1.2 ships.

**Files:** none changed (investigation only)
**DB migrations:** none yet (planned: `ensure_organization_for_user` function in 1.1; `organizations.setup_dismissed_at` + `kids.birth_month`/`birth_year` in 1.4)
**Follow-ups (not in scope for item 1, logged for later):**
- `app/onboarding/standards/page.tsx` and `components/OnboardingTour.tsx` are orphaned/unlinked dead code.
- `components/SetpupBanner.tsx` and `components/SetupWizard.tsx` are unused, dead code referencing `kids` columns that don't exist (`date_of_birth`, `grade_level`, `subjects` array).
- `app/dashboard/page.tsx:1457` queries `school_year_settings.state/required_days/required_months` — none of these columns exist; this query is already broken independent of this work.
- No `/legal/beta-nda` route exists in-app; `/agree`'s NDA checkbox links out to it.
- A normal sign-up with an invited email but no invite code still gets no special treatment today (falls through to ordinary org creation) — the new pending-invite screen only helps at login/signup time going forward, not a full auto-detect-and-redeem flow.

---

## [2026-09-30] Roadmap item 2.5 — Verify: Item 2 Done
**Status:** Done
**What changed:** No code. Final verification pass for roadmap item 2 (quick fixes from Courtney's testing).
**Why:** Step 2.5 of the quick-fixes prompt calls for re-testing each bug against its repro steps before closing out the item. Imee browser-tested all four fixes in the `CurriculumImporter` pop-up at 390px, including 2.1's subject list, 2.2's correct-student behavior, 2.3's Scout positioning/overlay behavior, and 2.4's multi-photo upload — size-limit and PDF-vs-images checks included — and confirmed all pass.
**Source:** Imee (browser testing, 390px, CurriculumImporter pop-up)
**Result:** All four bugs fixed and verified:
- **2.1** — New subjects appear immediately in both curriculum-import surfaces (`app/curriculum/import/page.tsx` and `components/CurriculumImporter.tsx`), merged from the `subjects` and `lessons` tables, trimmed and deduped case-insensitively.
- **2.2** — "From Curriculum" opens for the student the parent was actually viewing, with the subject preselected when opened from a subject's card, confirmed across both entry points (`/lessons` direct, and via the Subjects page deep link).
- **2.3** — Scout defaults to bottom-right on mobile, clear of the bottom nav and the device safe area, resized to 56px (Material FAB standard) on mobile, and now hides entirely whenever a modal or bottom sheet (Add Subject, lesson-choice sheet, CurriculumImporter) is open instead of floating above it.
- **2.4** — Multiple photos upload in one pass with reorder/remove, HEIC conversion, 1600px/0.8-quality compression, a 10-image cap, and a 4 MB total-size gate for Vercel's request limit — verified working correctly including the size-limit and PDF-vs-images exclusivity checks, and the live MB summary correctly updates after removing a photo.
**Build/type-check:** `tsc --noEmit` holds at the same 17 pre-existing errors throughout all of item 2 (none introduced by this work). `next build` completes clean.
**Files touched across item 2 (2.0–2.5):** app/curriculum/import/page.tsx, app/api/import-curriculum/route.ts, app/subjects/page.tsx, app/lessons/page.tsx, components/CurriculumImporter.tsx, components/layout/AppHeader.tsx, components/AppShell.tsx, src/utils/compressImage.ts (new), docs/CHANGELOG.md
**DB migrations:** none
**Follow-ups carried forward (not fixed, logged for later):**
- `components/LessonViewModal.tsx` uploads photos via `heic2any` directly with no compression — should switch to the shared `compressImage` utility.
- `app/curriculum/import/page.tsx`'s full-page kid selector and the Dashboard's "Use curriculum" entry point don't carry kid context the way the Subjects → Lessons deep link now does.
- The Scout desktop clearance (32px override) likely still overlaps the always-rendered bottom nav on desktop widths — only mobile clearance was fixed in this item.
- The "© 2026 HomeschoolReady, LLC" footer text in `components/BottomNav.tsx` renders on top of the nav bar itself on mobile.
- `useScoutOverlay` is wired into the specific overlays reported (Add Subject, lesson-choice sheet, CurriculumImporter) but not swept across every modal in the app.
- `next.config.ts` has `typescript.ignoreBuildErrors: true`; 17 pre-existing `tsc` errors remain in the repo, unrelated to item 2, not fixed.

**Roadmap item 2 (Quick fixes from Courtney's testing): Done.**

---

## [2026-09-30] Browser-testing round 2 — CurriculumImporter parity, Scout overlays, size summary, a11y
**Status:** Done, pending browser re-test
**What changed:**
1. **2.1/2.4 parity gap found during browser testing:** `components/CurriculumImporter.tsx` — the modal used by Subjects → Add Lesson → From Curriculum — still had the old lessons-only subject query and a single-file input with no HEIC support, no compression, and no PDF/image mutual exclusion. It's a separate component from `app/curriculum/import/page.tsx`, so the earlier 2.1 and 2.4 fixes never reached it. Brought it to parity: same subjects-table + lessons-table merge (trimmed, case-insensitive dedupe), same multi-image upload with reorderable/removable thumbnails, one-PDF-XOR-images rule, 10-image cap, 4 MB total-size gate, and HEIC/1600px-longest-edge/0.8-quality compression via the shared `src/utils/compressImage.ts`, with upload over `XMLHttpRequest` for a real progress bar.
2. **Subject preselection:** Added an `initialSubject` prop to `CurriculumImporter`. `app/subjects/page.tsx`'s "From curriculum" button now carries the subject that was already on screen (`addLessonSubject`, set whenever the sheet opens from a subject's card) as a `subject` query param through `/lessons`, which threads it into `<CurriculumImporter initialSubject=.../>`. The in-page "From curriculum" button on `/lessons` itself resets this to `undefined` so a stale subject from an earlier deep link can't leak into an unrelated open.
3. **2.3: Scout over modals/sheets.** Scout had no way to know a modal or bottom sheet was open, so it floated above the Add Subject URL field and the "Generate with Scout" choice-sheet option. Added `useScoutOverlay(active)` in `components/layout/AppHeader.tsx` — a shared counter (not a boolean) so multiple overlays can be open at once without one closing prematurely revealing Scout. The FAB now hides entirely (rather than just dropping z-index) while `overlayCount > 0`. Wired into `app/subjects/page.tsx`'s Add Subject sheet and lesson-choice sheet, and into `CurriculumImporter` itself (always active while mounted).
4. **2.3: gap above bottom nav.** The bottom nav is 113px tall including its copyright line, and Scout's mobile clearance (112px) meant it was touching it. Raised to 113 + 10px gap = **123px**, and recalculated `AppShell.tsx`'s content padding (179px mobile) and the nudge bubble's offset (191px) to match.
5. **2.4: stale size summary.** The "X MB → Y MB" compression summary used a running accumulator that only ever grew, so removing a photo didn't reduce it — same bug existed in both `app/curriculum/import/page.tsx` and the newly-fixed `CurriculumImporter.tsx`. Replaced with an `imageSourceSizes` array kept in lockstep with `images` (add/remove/reorder all touch both arrays in the same operation), so the summary and the 4 MB upload gate both recompute live from current state in every case.
6. **Minor:** added `aria-label`s to the up/down/remove buttons on image thumbnails in both files.
**Why:** Found during browser testing — Scout covering the Add Subject field and the Generate-with-Scout option, the FAB touching the bottom nav, the stale MB summary after removing a photo, and (found while investigating) that the From-Curriculum modal reached from Subjects never got the 2.1/2.4 fixes because it's a different component than the standalone import page.
**Source:** Imee (browser testing)
**Files:** components/CurriculumImporter.tsx, components/layout/AppHeader.tsx, components/AppShell.tsx, app/subjects/page.tsx, app/lessons/page.tsx, app/curriculum/import/page.tsx
**DB migrations:** none
**Testing:** `tsc --noEmit` still shows the same 17 pre-existing errors (none new). `next build` completes clean (exit 0). Smoke-tested `/subjects`, `/lessons`, `/curriculum/import` (200) against the running local dev server. Not yet re-verified in a real browser — stopping here per Imee's request so it can be browser-tested again.
**Follow-ups:**
- `useScoutOverlay` is now a reusable hook but is only wired into the specific overlays reported (Add Subject sheet, lesson-choice sheet, CurriculumImporter). Other modals/sheets across the app (e.g., Material modal, LessonViewModal, various ChoiceSheets) don't call it yet and could still sit under/behind Scout. Not swept broadly — out of scope for this pass; worth revisiting if Scout is reported covering something else.
- The desktop Scout clearance (32px, from the existing `@media (min-width: 768px)` override) and the bottom-nav overlap on desktop noted in the 2.3 entry are still unaddressed — this pass only touched mobile clearance values.

---

## [2026-09-30] Hotfix — Replaced retired claude-sonnet-4-20250514 model ID
**Status:** Done, merged to main
**What changed:** Replaced the hardcoded model ID `claude-sonnet-4-20250514` with `claude-sonnet-4-6` in three API routes, and added a `CLAUDE_SONNET_MODEL` named constant in `lib/ai.ts` for routes that call the `@anthropic-ai/sdk` client directly, so a future model swap is a one-line change instead of a hunt through each route.
**Why:** `claude-sonnet-4-20250514` was retired 2026-06-15. Curriculum import, assessment generation, and standards activity generation were all failing in production with "model not found" as a result.
**Source:** Imee (urgent, reported production failures)
**Files:** lib/ai.ts, app/api/import-curriculum/route.ts, app/api/generate-assessment/route.ts, app/api/standards/[id]/generate-activity/route.ts
**DB migrations:** none
**Testing:** `tsc --noEmit` shows the same 17 pre-existing errors as before this change (none new) across all four touched files. Verified locally by Imee, then merged from `hotfix/retired-model` to `main` and pushed.
**Follow-ups:**
- Scout's chat features use `claude-haiku-4-5-20251001` (the default in `lib/ai.ts`'s `getModel()`, used by `/api/adapt-lesson`, `/api/help-chat`, `/api/generate-activity`, `/api/generate-lesson`), which Imee flagged may be retired as soon as 2026-10-15. Not addressed in this hotfix — worth checking on/before that date so Scout doesn't break the same way.
- `app/api/standards/import/route.ts` already used the correct `claude-sonnet-4-6` value via its own local `modelName` const, so it wasn't broken and wasn't touched here. Could be pointed at the new shared `CLAUDE_SONNET_MODEL` constant in a later cleanup pass for consistency.
- Only the three routes reported as broken were fixed. Other AI routes go through `lib/ai.ts`'s `getModel()` (env-var driven, not a hardcoded string), so they weren't part of this retirement issue.

---

## [2026-09-30] Roadmap item 2.4 — Multiple photo uploads for Add Curriculum
**Status:** Done (pending manual verification per Step 2.5)
**What changed:**
- The curriculum upload input now accepts multiple images at once (`multiple` on the file input), or one PDF — not both together. Camera capture (`capture="environment"`) is still available on mobile; tapping "Add More Photos" again lets a parent take several photos one at a time, each appended to the set.
- Selected images show as reorderable thumbnails (up/down buttons, since drag-and-drop reordering isn't reliable across touch devices and adding a drag library wasn't worth a new dependency for this) with a remove button per image. A caption reminds the parent that page order matters.
- New shared utility `src/utils/compressImage.ts`: converts HEIC/HEIF to JPEG via the already-installed `heic2any`, then resizes so the **longest edge** is capped at 1600px (not just width) and re-encodes as JPEG at 0.8 quality, using the browser's canvas — no new npm dependency. Exports `compressImage` and `isHeicFile`. Written generically so the portfolio work-samples feature (roadmap item 11, which has the same 1600px/75-80% compression requirement) can reuse it later.
- A hard cap of 10 images, with a clear message if the parent goes over it.
- A blocking banner if the total selected/compressed file size exceeds **4 MB**, since Vercel's request body limit is 4.5 MB — the parent must remove an image before extracting.
- Upload now runs over `XMLHttpRequest` instead of `fetch` so a real progress bar can be shown (`upload.onprogress`), since `fetch` has no native upload-progress event.
- `app/api/import-curriculum/route.ts` now reads a `files` field that can carry one or more entries (a `file` singular field is still accepted for backward compatibility). Multiple images are sent to Claude together, in the exact order selected, as a single table-of-contents extraction request — the prompt explicitly tells the model they're one continuous ToC and not to duplicate lessons across page boundaries. PDFs are unchanged and still capped at one per request.
**Why:** A table of contents spanning 3-4 pages previously forced parents to run the whole import flow once per page, which is tedious and easy to abandon partway through. Compression keeps both the upload under Vercel's request limit and long-term storage costs down (this is also a standing roadmap requirement, item 11).
**Source:** Courtney review; docs/prompts/prompt-02-quick-fixes.md; Imee (compression approach, size-limit adjustments)
**Files:** app/curriculum/import/page.tsx, app/api/import-curriculum/route.ts, src/utils/compressImage.ts (new)
**DB migrations:** none
**Dependencies:** none added — compression is done in-house with canvas + the existing `heic2any`, per Imee's direction.
**Testing:** Type-checked clean, app builds, and `/curriculum/import` returns 200 against the running local dev server. Did **not** get a live browser walkthrough (upload 4 photos, reorder, remove one, confirm order/compression, before/after sizes) — this environment has no browser-automation tool and the page requires an authenticated session. This is the core verification Step 2.5 calls for; flagging it to do by hand before treating 2.4 as fully confirmed.
**Follow-ups:**
- `components/LessonViewModal.tsx` also uploads photos and converts HEIC via `heic2any` directly, with no compression. Not changed now (out of scope for this step) — logged to switch it to the shared `compressImage` utility later, so lesson-attached photos get the same size benefits.
- Reordering uses up/down buttons, not drag-and-drop, to avoid adding a drag library and to stay reliable on touch. If this feels clunky with many pages, consider a drag reorder in a later pass.

---

## [2026-09-30] Roadmap item 2.3 — Scout FAB moved to bottom-right on mobile
**Status:** Done
**What changed:** The Scout floating button's default position changed from top-right (`top: 64, right: 12`) to bottom-right, using `bottom: calc(env(safe-area-inset-bottom, 0px) + 112px)`. The nudge bubble that appears next to the FAB is repositioned the same way (`+204px` clearance) so it still anchors above the button instead of floating near the top of the screen. Drag-to-reposition is untouched — once a user drags the FAB, it switches to the existing top/right coordinate system computed from the drag gesture, same as before.
**Why:** On mobile, Scout defaulted to the top-right corner and sat above the header's control cluster at a much higher z-index (9994 vs. 100), covering those controls — the reported bug. While investigating, found the app already renders a real 7-item bottom nav globally (`components/BottomNav.tsx`, via `AppShell.tsx`), not just item 4's future placeholder — its content is roughly 91-96px tall plus safe-area padding. The 112px clearance was sized to clear that real nav (not just a hypothetical 64px bar) with a comfortable margin, so Scout also won't need to move again once item 4 ships its (likely shorter, 5-item) nav.
**Source:** Courtney review; docs/prompts/prompt-02-quick-fixes.md
**Files:** components/layout/AppHeader.tsx
**DB migrations:** none
**Testing:** Verified via code/math (component heights, padding, font sizes read directly from `BottomNav.tsx`) rather than a live visual check at 375px/390px — this environment has no browser-automation tool available, and the app's pages require an authenticated session, so I couldn't screenshot the actual viewport. Confirmed the app builds and the affected routes (`/subjects`, `/lessons`) still return 200 against the already-running local dev server after the change (no runtime crash). Recommend a manual visual pass at 375px/390px before considering this fully verified — flagging for Step 2.5.
**Follow-ups:**
- Noticed `components/BottomNav.tsx` has no desktop-hide rule and renders at all viewport widths, but the existing desktop-only CSS override (`@media (min-width: 768px) { .scout-fab { bottom: 32px !important } }`, left untouched here since it's outside mobile scope) would put Scout only 32px above viewport bottom on desktop too — likely overlapping that same bottom nav there. Not fixed now (out of scope: mobile-only bug, "don't touch navigation").
- `components/ProductTour.tsx` has a `bottom: 110, right: 24` welcome-tour bubble that may sit near Scout's new position during onboarding. Appears to be a separate, occasional overlay (onboarding tour, related to future item 1) rather than a persistent control, so left unchanged, but noting in case it needs coordinating with Scout's new position later.
- The "© 2026 HomeschoolReady, LLC" footer text inside `components/BottomNav.tsx` renders on top of the bottom nav bar itself on mobile (it's the nav's own internal copyright line, not a separate element, but it reads as overlapping/cramped against the nav). Noted per Imee's request — not fixed, logging only.

### [2026-09-30] Roadmap item 2.3 follow-up — Bottom padding for Scout + 56px mobile FAB, from visual check at 390px
**Status:** Done
**What changed:**
1. `components/AppShell.tsx` now wraps `{children}` in a `.app-shell-content` container with `padding-bottom: 168px` (mobile) / `112px` (desktop, `min-width: 768px`) — Scout's own bottom clearance plus its diameter at each breakpoint (112+56 mobile, 32+80 desktop). Applied once in the shared layout, not per page.
2. `components/layout/AppHeader.tsx`: Scout's FAB is now 56px diameter on mobile (`max-width: 767px`, Material-standard FAB size; was 80px), with its icon scaled to 38px to match. Desktop keeps 80px. The notification dot is unchanged and stays visible at the smaller size (well within the circle at `top:4, right:4` on a 56px button).
**Why:** Visual check at 390px (Imee) found Scout cleared the bottom nav after the first 2.3 fix, but still covered part of the last Quick Log card ("Add Lesson") at the bottom of the dashboard, since nothing reserved scroll room for Scout's own footprint. Centralizing the padding in the shared layout (rather than each page's own `paddingBottom`, which already vary — 88 in Subjects/Lessons, 20 in Dashboard) avoids having to hunt down and patch every page individually, and keeps future pages correct by default.
**Source:** Imee (390px visual check)
**Files:** components/AppShell.tsx, components/layout/AppHeader.tsx
**DB migrations:** none
**Risk note:** `AppShell.tsx` wraps every header-bearing page's content in a new `<div>` for the first time. This is low-risk (the div adds no layout behavior besides `padding-bottom`), but since it touches the shared layout for the whole app, it's worth a broader visual pass across a few different pages (not just Dashboard) before considering this fully verified — I could not do a live visual check myself (no browser-automation tool in this environment, pages require authentication). Confirmed the app still builds and `/subjects` and `/lessons` return 200 against the running local dev server after the change.
**Follow-ups:** none new beyond the footer/desktop-overlap/ProductTour items logged above.

---

## [2026-09-30] Roadmap item 2.2 — "From Curriculum" opens for the correct student
**Status:** Done
**What changed:** Subjects page's "From curriculum" button now navigates to `/lessons?kidId=<activeKidId>&openImporter=1` instead of a bare `/lessons`. The Lessons page reads `kidId` on load, sets it as the active kid, and opens the existing `CurriculumImporter` modal directly for that kid (which already shows "Import Curriculum for {childName}" so the parent can confirm), then clears the query string via `router.replace` so a later `loadData()` call (after the import finishes) doesn't reopen the importer.
**Why:** Subjects → Add Lesson → From Curriculum previously dropped all kid context on navigation. `/lessons` defaulted its active kid to the first row from `kids` ordered by `created_at DESC` — i.e., whichever kid was created most recently — not the kid the parent was viewing. With 2+ kids this silently opened the wrong child's curriculum import, and logging a lesson to the wrong child would corrupt that child's records and compliance totals.
**Source:** Courtney review; docs/prompts/prompt-02-quick-fixes.md
**Files:** app/subjects/page.tsx, app/lessons/page.tsx
**DB migrations:** none
**Tweak:** The "From curriculum" button only appends `kidId`/`openImporter` when `activeKidId` is set; if there's no active kid it falls back to the original plain `/lessons` navigation instead of building a URL with an undefined kid id.
**Follow-ups:** Checked whether this flow ever passes through the separate full-page `app/curriculum/import/page.tsx` (which also defaults its kid selector to `kidsArr[0]`) — it does not; that page is only reached from the Dashboard's own "Add a Lesson → Use curriculum" choice (`app/dashboard/page.tsx`), which is a different, all-kids entry point with a visible kid dropdown the parent can change, and the dashboard is out of scope for item 2. Logging as a follow-up for a future item: if that dashboard flow is meant to carry kid context, apply the same query-param approach there.

---

## [2026-09-30] Roadmap item 2.1 — New subjects now appear in Add Curriculum
**Status:** Done
**What changed:** The Add Curriculum subject dropdown now queries the `subjects` table (organization-scoped) and merges it with the existing lesson-derived subject list, deduplicated, instead of relying on lessons alone. Merged names are trimmed and deduped case-insensitively, keeping the first spelling found — subjects-table entries are listed first, so that spelling wins over a differently-cased match from a lesson.
**Why:** A newly added subject has no lessons yet, so the lessons-only query never surfaced it. Merging both sources means new subjects appear immediately, and subjects that only exist on older lessons (with no `subjects` row) still show up too. Trim/case-insensitive dedupe avoids showing the same subject twice (e.g., "Math" from `subjects` and "math " from an old lesson).
**Source:** Courtney review; docs/prompts/prompt-02-quick-fixes.md
**Files:** app/curriculum/import/page.tsx
**DB migrations:** none
**Follow-ups:** `next.config.ts` has `typescript.ignoreBuildErrors: true`, so `next build` passes despite existing type errors. `npx tsc --noEmit` currently reports **17 pre-existing errors** across the repo, unrelated to this change (none in `app/curriculum/import/page.tsx`). Not fixed and config not changed — logged for visibility only.

---

## [2026-09-30] Roadmap item 2.0 — Investigation of Courtney's 4 quick-fix bugs
**Status:** Done (investigation only, no code changed)
**Source:** Courtney's testing; docs/prompts/prompt-02-quick-fixes.md

**What changed:** No code. Investigated root cause of each of the 4 bugs in item 2.

**Findings:**
1. **New subject missing from Add Curriculum list** — `app/curriculum/import/page.tsx` builds its subject dropdown from distinct `subject` values on the `lessons` table (plus a hardcoded canonical list), never from the `subjects` table where new subjects are actually inserted (`app/subjects/page.tsx`). A subject with no lessons yet is invisible. Not a caching issue — a query-source mismatch. Fix: query `subjects` table directly. Risk: low.
2. **"From Curriculum" jumps to wrong student** — Subjects page navigates to `/lessons` with no kid identifier (no route param, no query string). `/lessons` self-initializes `activeKidId` from the first kid returned by `created_at DESC`, so it lands on whichever kid was created most recently, not the kid the parent was viewing. Fix: pass kid id via query param, read it on `/lessons` mount, show student name for confirmation. Risk: low-medium.
3. **Scout FAB covers top-right controls on mobile** — Scout button defaults to `position: fixed; top: 64; right: 12` at `zIndex: 9994`; it's only moved to bottom-right by a `@media (min-width: 768px)` override, so mobile keeps the top-right default and sits above the header controls (`zIndex: 100`). Fix: make bottom-right (respecting `env(safe-area-inset-bottom)`) the default/mobile position. Risk: low.
4. **Only single photo upload for curriculum import** — Single-file assumption runs end-to-end: `file` state is a single `File`, input has no `multiple`, `handleExtract` sends one file, and `app/api/import-curriculum/route.ts` reads exactly one `file` field. Fix requires converting to an array with reorderable thumbnails, client-side compression (max 1600px/75-80% quality), a 10-image cap, and an API route change to accept and forward multiple images in order. Risk: medium — highest-risk item; needs a decision on whether to add `browser-image-compression` as a new npm dependency or write an in-house canvas-based compressor.

**Why:** Step 2.0 of the quick-fixes prompt requires finding root cause and proposed fix/risk for each bug before any code changes, per working rules (stay in scope, ask before adding a dependency).

**Files:** none changed (investigation only)
**DB migrations:** none
**Follow-ups:** Need decision from Imee before Step 2.4: add `browser-image-compression` npm package, or write compression in-house?

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
