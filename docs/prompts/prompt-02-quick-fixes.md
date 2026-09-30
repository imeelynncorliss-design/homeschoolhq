# Claude Code Prompt — Roadmap Item 2: Quick Fixes from Courtney's Testing

## Before you start

1. Read `docs/ROADMAP.md`. **Only item 2 is in scope.** Item 6 (curriculum rework) will rebuild the curriculum flow later. Fix these bugs in the **current** flow, and don't redesign anything.
2. Read `docs/CHANGELOG.md` for recent decisions.
3. Each fix is a separate step. After each one, add an entry to `docs/CHANGELOG.md` with **what** changed and **why**, then stop and wait for my approval.

## Context

- Next.js + Supabase, deployed on Vercel.
- Supabase import path: `@/src/lib/supabase`
- The table is `kids`, but the UI says "Student."
- These bugs were found by Courtney during hands-on testing.

**Do not touch:** navigation, the dashboard layout, the curriculum data model, or anything in roadmap items 3–12. If you notice other problems, log them as follow-ups.

Work on branch `fix/quick-fixes`, and commit after each step. Each fix can be deployed on its own.

---

## Step 2.0 — Investigate (no code)

For each bug below, find the cause and report:
- the files involved
- the root cause, not just the symptom
- the proposed fix and how risky it is

Log the findings as "2.0 — Investigation." Wait for my approval.

## Step 2.1 — A new subject doesn't appear when adding curriculum

**Steps to reproduce:**
1. Add a new subject.
2. Go to add curriculum.
3. The new subject is missing from the subject list.

**Likely causes to check:**
- stale cached data (React Query or SWR cache, or a Next.js route cache that isn't revalidated)
- a list fetched once and never refreshed
- a filter that excludes new subjects, such as subjects with no curriculum yet or a wrong `kid_id` / `organization_id`

**Fix:** New subjects appear right away, without a page refresh.

*Why:* A parent who adds a subject and can't find it assumes the save failed. The subject list also feeds the curriculum rework (item 6), so it needs to be reliable.

## Step 2.2 — "From Curriculum" jumps to the wrong student

**Steps to reproduce:**
1. Open Kai.
2. Go to Subjects, then Add Lesson, then "From Curriculum."
3. The app shows Emma's lessons instead of Kai's. Courtney had to select Kai again and repeat the steps.

**Likely causes to check:**
- the selected student ID is not passed along in the route or query parameter
- it defaults to the first student in the list
- it reads stale state from a global store

**Fix:** "From Curriculum" always opens for the student the parent was working on. The student ID travels through the whole flow, and the student's name shows on the screen so the parent can confirm.

*Why:* Families with more than one child hit this every day. Logging a lesson to the wrong child would also corrupt that child's records and compliance totals.

## Step 2.3 — The Scout button covers content on mobile

**Problem:** On mobile, the floating Scout button covers the controls in the top-right corner.

**Fix:**
- Move Scout to the bottom-right, above any bottom navigation and clear of the device's safe area (use `env(safe-area-inset-bottom)`).
- Make sure it never covers buttons, form fields, or the setup card from item 1 (once it exists; item 2 is being built first, so re-check Scout's position during item 1's Step 1.5).
- Test at 375px and 390px widths.

*Why:* A button that covers controls blocks the parent's work, and fixing it is a small change.

**Note:** Item 4 will add a bottom menu. Position Scout so it clears a bottom bar about 64px tall, so it won't need to move again.

## Step 2.4 — Allow multiple photo uploads when adding curriculum

**Problem:** Parents can upload only one photo at a time. A table of contents often spans several pages.

**Fix:**
- Allow selecting multiple images at once (`<input type="file" accept="image/*" multiple>`). Keep the option to take a photo with the camera on mobile.
- Show thumbnails before upload, with the option to remove any image and to reorder them. The order matters because the pages are read in sequence.
- Upload the images in order and show progress.
- Set a sensible limit, such as 10 images, and show a clear message if the parent goes over it.
- **Compress each image in the browser before upload:** max 1600px wide, about 75–80% quality. This is a roadmap requirement (see item 11). If this needs a new npm package, such as `browser-image-compression`, **ask me before adding it.**
- If the images are sent to AI extraction, send the pages together in order so the extraction treats them as one table of contents.

*Why:* A table of contents that spans 3–4 pages forces parents to repeat the upload several times, which is tedious and makes lessons easy to lose. Compression keeps storage costs down.

## Step 2.5 — Verify

- Re-test each bug using the reproduction steps above. Each one should now be fixed.
- For 2.2, test with at least 3 students.
- For 2.3, test at 375px and 390px, on the dashboard, the forms, and the curriculum screens.
- For 2.4, upload 4 photos, reorder them, remove one, and confirm the order is kept and the files are compressed. Report the size before and after compression.
- Build and type-check must both pass.
- Final change log entry: all files changed and any follow-ups.

## Working rules

- Do one step at a time. Stop after each one and wait for me.
- Never delete data or drop columns.
- Ask before adding any npm dependency.
- Stay in scope. Log anything else you notice as a follow-up.
