# Altair Implementation Brief — Calendar-first Attendance Cleanup

Date: 2026-05-31
Branch: `sandbox/altair`
Priority: HomeschoolReady attendance cleanup
Risk posture: low-to-moderate UI/IA cleanup; no database migration first

## Approved direction

Imee approved focusing attendance cleanup on the UX gap already identified:

> Past planned lesson days missing attendance should be manageable from a calendar-style view, not only via Suggested School Days.

This work should make Attendance feel calendar-first and parent-friendly, while keeping confirmed attendance records as the source of truth.

## Product principle

Attendance is the parent record. Lessons are optional evidence/suggestions.

Do not make lesson-derived suggestions feel like compliance debt. Do not treat attendance without lessons as inherently wrong.

## Current evidence

Prior SBX QA already passed:
- Calendar showed a missing-attendance badge for a fake past lesson day.
- Clicking the day opened day context.
- Marking attendance removed the Missing badge after save.
- Calendar date alignment passed.
- Day Details modal clipping/scrolling passed.

Remaining cleanup is IA/UX polish, not persistence.

## Target files

Primary:
- `components/AttendanceTracker.tsx`
- `components/CalendarView.tsx`
- `components/DayDetails.tsx`

Secondary if needed:
- `components/ReconciliationPanel.tsx`
- `components/CalendarFilters.tsx`

## Acceptance criteria

1. Attendance overview defaults to Calendar View when safe.
2. Calendar is the primary cleanup surface for missing attendance.
3. Past planned lesson days without attendance show a clear but non-alarming amber badge/dot.
4. Clicking the day opens an attendance-first Day Details panel.
5. Parent can mark attendance from that day context.
6. After save, the day loses Missing status and shows recorded attendance.
7. Suggested School Days is secondary/helpful, not the dominant required cleanup queue.
8. Language is gentle: `Needs attendance` / `Review attendance`, not error-style.
9. Attendance without lessons is not treated as a default problem.
10. No database changes in this first cleanup pass.

## Proposed implementation steps

### Step 1 — Default to Calendar View

In `AttendanceTracker.tsx`, change initial `viewMode` from `list` to `calendar` if no known regression appears.

### Step 2 — Reframe Suggested School Days

Where Suggested School Days appears, change copy to optional review language:
- `Review Suggestions`
- `Lessons found without attendance`
- `Use these to create attendance records if they count as school days.`

Avoid language implying the parent must resolve every item.

### Step 3 — Calendar copy polish

In `CalendarView.tsx`:
- Keep amber visual indicator.
- Prefer label `Needs attendance` or compact `Needs att.` over `Missing` if layout allows.
- Legend should say `Needs attendance`.

### Step 4 — Day Details attendance-first polish

In `DayDetails.tsx`, for `missingAttendance`:
- Put the attendance prompt above lesson details, already mostly true.
- Use gentle copy:
  - `This day has planned lessons but no attendance record yet.`
  - `If this counted as a school day, add attendance now.`
- Keep suggested full/half day and hours.

### Step 5 — QA checklist

Manual SBX/local QA:
1. Create or use a past planned lesson day with no attendance.
2. Open Attendance.
3. Confirm Calendar View is default.
4. Confirm day has amber needs-attendance indicator.
5. Click day.
6. Confirm Day Details prompt is visible and attendance-first.
7. Mark attendance.
8. Confirm calendar indicator disappears and hours/status appear.
9. Create or use an attendance-only day with no lessons.
10. Confirm it is valid and not shown as a problem by default.

## Hard boundaries

- Do not push to main.
- Do not create migrations.
- Do not alter RLS or production data.
- Do not make broad refactors.
- Avoid changing persistence logic unless required by QA.

## Recommended verification gate

- `npm run build`
- Restore generated artifacts like `next-env.d.ts` if build dirties them.
- Report known warnings separately.
