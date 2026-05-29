# Task 001 — Mid-Year Schedule Support: Codebase Inspection

**Branch:** sandbox/altair  
**Date:** 2026-05-22  
**Status:** Inspection only — no code changed

---

## What I Inspected

| Area | Files |
|---|---|
| Curriculum import UI | `components/CurriculumImporter.tsx` |
| Import API route | `app/api/import-curriculum/route.ts` |
| Tools page (entry point) | `app/tools/page.tsx` |
| Bulk scheduler UI | `components/BulkLessonScheduler.tsx` |
| Bulk schedule page | `app/bulk-schedule/page.tsx` |
| Planning auto-complete | `app/api/planning/auto-complete/route.ts` |
| Planning hook | `lib/usePlanningAutoComplete.ts` |
| Database schema | `src/types/database.ts` (lessons table, ~line 1922) |
| Help/Scout chat | `app/api/help-chat/route.ts` |

---

## What I Found

### Full Flow: Curriculum Upload → Schedule

1. **Entry point** — User opens Tools page, selects a child from a dropdown, and clicks "Import Curriculum." This opens `CurriculumImporter` as a modal.

2. **Upload step** — User chooses between file upload (PDF/JPEG/PNG) or manual text entry. If a file, it is converted to base64 in the browser and POSTed to `/api/import-curriculum`. No file is stored persistently — the raw bytes are discarded after parsing.

3. **AI parsing** — The import route calls `claude-sonnet-4-20250514` (hardcoded, not the shared `getModel()` helper) with a prompt that asks Claude to extract every lesson from the table of contents and return a JSON array. Each item has `title`, `description`, and optional `duration`. The route strips markdown fences and validates the JSON before returning it.

4. **Preview step** — `CurriculumImporter` displays the extracted lessons as a checklist. The user can individually toggle lessons, override per-lesson durations, and optionally set a start date and which days of the week to schedule on.

5. **Import** — On confirm, the component filters to only the checked lessons, deduplicates against lessons already in the database for that child/subject, and does a Supabase insert. Each lesson row gets: `kid_id`, `user_id`, `organization_id`, `subject`, `title`, `description`, `duration_minutes`, `status: 'not_started'`, `planning_period_id`, and optionally `lesson_date` (if the user turned on the start-date option).

6. **Post-import** — `triggerAutoComplete()` is called to mark the `import_curriculum` planning task done. The user is redirected to `/lessons`.

7. **Later scheduling** — Lessons without a `lesson_date` appear in the Bulk Scheduler (`/bulk-schedule`). The user picks a start date, a mode (one lesson per day sequentially, or N lessons per school day spread across a week), and applies dates in batch. Weekends are skipped in weekly mode.

### What the database currently has

The `lessons` table columns that matter here:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `title` | text | From AI extraction |
| `description` | text | From AI extraction |
| `lesson_date` | date | Nullable — null = unscheduled |
| `status` | text | `'not_started'`, etc. |
| `completed` | bool | Separate from status |
| `duration_minutes` | int | Calculated from user input |
| `kid_id` | uuid | FK → kids |
| `subject` | text | From form |
| `planning_period_id` | uuid | Links to school year period |

**Not present:** `lesson_number`, `sequence_position`, `curriculum_import_id`, `skipped`, `unit`, `chapter`. There is no way to trace a lesson back to its position in the original TOC, or flag it as intentionally skipped.

### What the current system can and cannot do

| | Supported today |
|---|---|
| Extract all lessons from a TOC | ✅ |
| Let user uncheck individual lessons before import | ✅ |
| Assign sequential dates from a chosen start date | ✅ |
| Specify "start at lesson 20, skip lessons 1–19" in one step | ❌ |
| Mark skipped lessons as completed/past | ❌ |
| Store which lesson number something is in the curriculum | ❌ |
| Link a lesson back to the curriculum import it came from | ❌ |

The user *can* manually scroll through the 60-lesson preview and uncheck the first 19 — but there is no shortcut, no input field, and no concept of "prior" vs "upcoming" in the flow.

---

## Recommended Insertion Point

The right place is **inside `CurriculumImporter`, between the upload/extract step and the preview step** — a new "Where are you starting?" screen (Step 1.5).

Why here? At this point the AI has returned the full lesson list in order, the user hasn't touched anything yet, and inserting the question before the preview lets us pre-configure the checkboxes and handle prior lessons automatically rather than making the user manually uncheck rows.

The screen would ask two things:
1. **Which lesson is your starting point?** (Number input, or let them pick from the list)
2. **What should we do with the lessons before that?** (Radio choice — see UX options below)

After answering, the preview step opens with prior lessons already handled per their choice, and the date fields pre-populated with the start date they gave.

---

## Data Available at That Point

When "Where are you starting?" would run, the app already has:

- `extractedLessons` — the full ordered array from the AI, indexed 0–N. Titles include lesson numbers if the TOC had them (e.g., "Lesson 19: The Civil War").
- `kid` — the selected child's full profile (grade, learning style, etc.)
- `subject` — chosen before upload
- `organizationId`, `userId` — from session
- `useStartDate` / `startDate` / `scheduleDays` — already in component state (the existing date fields)

What is NOT yet available at this point:
- No DB row IDs (lessons haven't been saved yet)
- No existing lesson data for this child/subject (deduplication runs later)
- The AI does not return sequence numbers — position is only implicit from array index

---

## What New Fields / State May Be Needed

### Component state (CurriculumImporter)

```
startingLessonIndex: number        // 0-based index into extractedLessons; default 0
priorLessonAction: 'skip' | 'complete' | 'past' | 'manual'
startDate: string                  // already exists, but must be required when startingLessonIndex > 0
```

### Database — lessons table

A lightweight migration would cover most needs:

| New column | Type | Purpose |
|---|---|---|
| `curriculum_import_id` | uuid (nullable FK) | Links lesson back to its source import, so the bulk scheduler can filter by "lessons from this curriculum" |
| `curriculum_sequence` | int (nullable) | The lesson's position in the original TOC (1-based). Enables sorting, filtering, and the "start at N" UI to work without parsing the title. |
| `skipped` | bool (nullable, default false) | Distinguishes "intentionally not scheduled" from "not scheduled yet." |

The `curriculum_imports` table likely already exists (referenced in CurriculumImporter around line 358) and would not need changes.

---

## Recommended UX Options for Prior Lessons

When a user sets "start at Lesson 20," they need to tell us what to do with Lessons 1–19. Four options to offer:

**Option A — Skip / don't schedule**  
Prior lessons are imported with `lesson_date: null` and `skipped: true`. They appear nowhere on the calendar or schedule view. They exist in the DB so the parent can go back and assign them if they want. Recommended default for mid-year joiners.

**Option B — Mark as completed**  
Prior lessons are imported with `status: 'completed'` and `completed: true`. They show up in Records/Progress as done work, which is honest (the family did cover them, just not tracked here). Good for parents who want accurate progress reports from day one.

**Option C — Add as past lessons (backdated)**  
Prior lessons get dates assigned backwards from the start date. If starting May 5 with 19 prior lessons and 5 school days per week, lessons 1–19 would get dates going back roughly 4 weeks. Accurate for record-keeping but makes assumptions about their actual schedule.

**Option D — Decide lesson by lesson**  
No auto-handling — the preview step shows all lessons, prior ones are highlighted or grouped separately, and the parent manually checks/unchecks. This is the most flexible but the most work. Could be offered as "I'll decide" alongside the three auto options.

**Recommendation:** Default to Option A (skip) with Option B (mark completed) as the runner-up. Surface C and D as advanced options. Most mid-year parents want a clean slate going forward, not a reconstructed history.

---

## Implementation Plan for the Next Task

### Step 1 — Database migration
- Add `curriculum_sequence` (int, nullable) to `lessons`
- Add `curriculum_import_id` (uuid, nullable FK → curriculum_imports) to `lessons`
- Add `skipped` (bool, nullable, default false) to `lessons`
- Update `src/types/database.ts` to match

### Step 2 — API route (`/api/import-curriculum`)
- No changes needed — parsing logic stays the same

### Step 3 — CurriculumImporter component
- Add state: `startingLessonIndex`, `priorLessonAction`
- Add Step 1.5 UI between extract and preview:
  - Number input "Start at lesson #" (or dropdown from lesson list)
  - Radio group for prior lesson handling
  - Show a summary: "Lessons 1–19 will be marked as [action]. Lesson 20 will be scheduled starting [date]."
- In the preview step, visually separate prior vs. upcoming lessons
- In `importLessons()`, split the insert into two batches: prior lessons with appropriate status/skipped/date, and upcoming lessons with sequential dates from start date
- Populate `curriculum_sequence` from array index (+1) on all inserts
- Populate `curriculum_import_id` from the curriculum_imports insert result

### Step 4 — Bulk Scheduler (optional enhancement)
- Add a filter: "Show only lessons from [curriculum import]"
- Respect `curriculum_sequence` for sort order when building date assignments

### Step 5 — Lessons list / calendar
- Filter out `skipped: true` lessons from schedule and calendar views by default
- Add a "Show skipped lessons" toggle in the lessons list for parents who want to see them

---

## Risks / Blockers / Questions

**1. AI doesn't return lesson numbers reliably.**  
The extraction prompt asks Claude to "include lesson numbers if present" but treats them as part of the title string, not a structured field. If a TOC says "Chapter 4, Lesson 3: Fractions," that comes back as the title. Position in the array is the only reliable sequence indicator. The "start at lesson #" input should let the user either type a number (matched against array index) or pick from a rendered list of titles.

**2. The `curriculum_imports` table needs verification.**  
The inspection found a reference to it in CurriculumImporter but the table was not confirmed in `database.ts` types. Before adding a FK, confirm the table exists and has a PK column.

**3. Backdating (Option C) makes schedule assumptions.**  
We don't know the family's actual school days for the past weeks. Using `scheduleDays` from the current form is a guess. Flag this clearly in the UI if Option C is offered.

**4. Deduplication runs after the new step.**  
The existing dupe-check (lessons with the same title/kid/subject already in DB) happens in `importLessons()`. This is fine — it just means if a parent imports the same curriculum twice, the new step doesn't bypass deduplication.

**5. Planning period auto-complete thresholds.**  
The `plan_first_month` task requires ≥20 lessons in the first month of the planning period. If a mid-year import only schedules 5 remaining lessons in the current month, this task will never auto-complete. Consider whether the threshold check needs to be aware of starting-lesson context.

**6. Hardcoded model in import route.**  
`/api/import-curriculum/route.ts` uses `claude-sonnet-4-20250514` directly, bypassing the shared `getModel()` helper. This is intentional (vision capability required for image parsing) but worth noting — if the provider is ever switched, this route won't follow.

---

## Whether I Changed Code

**No code was changed.** This document is the only output of this task. All findings are based on read-only inspection of the codebase on branch `sandbox/altair`.
