# Grading MVP brief — lessons vs projects vs assessments

Date: 2026-06-03
Branch/context: `sandbox/altair`
Status: Product/implementation brief before code

## Source feedback

Beta tester feedback surfaced by Imee:

> grade tracking. Maybe ways to grade lessons, vs projects, vs tests?

## Product decision

Use a parent-first hybrid grading model.

HomeschoolReady should not make every daily lesson feel like school-style grading. The default experience should stay light: completion, notes, proficiency/check-in, and evidence. Formal scores and letter grades should be optional and appear where they naturally help: assessments, projects, high-school courses, transcripts.

## Current app reality

The app already has pieces of the grading model:

### Lessons

Existing surface:
- `components/LessonViewModal.tsx`
- `lesson_checkins`

Current model:
- Lesson status: not started / in progress / completed
- Parent check-in proficiency:
  - Needs Support
  - Progressing
  - Got It
- Parent notes
- Portfolio/work sample uploads
- Optional linked learning goals

Product interpretation:
- Lessons should default to completion + check-in, not grades.
- This is the right model for younger grades and daily homeschool workflows.

### Assessments/tests

Existing surface:
- `components/AssessmentTaking.tsx`
- `app/actions/assessments.ts`
- `assessment_results`

Current model:
- Auto score percentage when questions are machine-gradable
- Manual parent grading for short-answer/project-style responses
- Parent comments
- Needs manual grading queue

Product interpretation:
- Tests/assessments should support optional percentage score.
- Parent language should make scores feel optional recordkeeping evidence, not required school compliance.

### Projects

Existing surface:
- `components/AssessmentTaking.tsx` project assessment mode

Current model:
- Project selection can be graded manually with quick labels:
  - Excellent = 100%
  - Good = 85%
  - Needs Work = 70%
  - Incomplete = 50%
- Optional parent comments

Product interpretation:
- Projects need a different grading feel from tests.
- The current implementation is functional but too grade/percentage-forward.
- Better MVP language would frame project evaluation as rubric-style evidence, while still saving a percentage when needed.

### Courses/transcripts

Existing surfaces:
- `components/CourseManager.tsx`
- `components/GradeBook.tsx`
- `app/transcript/page.tsx`

Current model:
- Course final percentage
- Letter grade
- GPA calculations
- Course credits

Product interpretation:
- Course grades are the right place for formal grades.
- High school users need this for transcripts.
- Course grades can remain manual/finalized for MVP rather than auto-derived from every lesson.

### Progress Evidence

Existing surface:
- `app/assessments/page.tsx` now titled Progress Evidence

Current model:
- Aggregates assessments, daily logs, and lesson check-ins
- Shows optional scores when present
- Shows notes/progress evidence

Product interpretation:
- Progress Evidence should become the unifying parent-facing recordkeeping layer.
- It should explain that evidence can be a note, check-in, project, assessment, score, or work sample.

## Recommended MVP behavior

### 1. Lessons

Default label: Lesson check-in

Fields/actions:
- Status: Planned / In Progress / Completed
- Understanding check-in: Needs Support / Progressing / Got It
- Parent note
- Optional work sample upload
- Optional linked learning goals

Do not add percentage grading to normal lesson completion in MVP.

Reason:
- Keeps homeschool daily use lightweight.
- Avoids making parents feel they need to grade every lesson.
- Uses existing `lesson_checkins` instead of schema changes.

### 2. Projects

Default label: Project review

Fields/actions:
- Parent rating / rubric-style label:
  - Excellent
  - Good
  - Needs more work
  - Incomplete
- Optional score field for families who want a percentage
- Parent note
- Optional work sample upload later

Near-term code change:
- Soften the project grading copy in `AssessmentTaking.tsx`.
- Keep saving the score to `assessment_results.auto_score` for now.
- Change copy from “Grade This Project” to “Review This Project”.
- Explain: “Use a quick rating, or enter a score if you need one for records.”

No new database table required.

### 3. Tests/assessments

Default label: Assessment score

Fields/actions:
- Auto score where possible
- Manual grade for short answer
- Parent comments
- Optional linked learning goals

Near-term code change:
- Keep existing score behavior.
- Change copy to emphasize optional score/evidence.
- Avoid implying every assessment is mandatory or school-style.

### 4. Courses/high school

Default label: Final course grade

Fields/actions:
- Final percentage
- Letter grade
- Credits
- GPA/transcript

Near-term code change:
- No schema change.
- Make Grade Book copy clearer: course grades can be parent-entered/finalized, not automatically forced from every lesson.
- Keep assessment averages as context only.

## Recommended first implementation slice

Safe SBX code pass, no database migration:

1. Add a short explanatory card to Progress Evidence or Grade Book:
   - Lessons = check-ins, not required grades
   - Projects = review/rubric + optional score
   - Assessments = optional score
   - Courses = final transcript grade

2. Update Project grading copy in `AssessmentTaking.tsx`:
   - “Grade This Project” → “Review This Project”
   - “select a grade” → “choose a rating or enter a score if you need one”
   - “Needs Work” → “Needs More Work”

3. Update regular assessment manual grading copy:
   - “Grade This Assessment” → “Review This Assessment”
   - “final grade” → “final score” or “optional score”

4. Update `GradeBook.tsx` copy:
   - “Finalize course grades based on performance” → “Set final course grades for transcripts. Assessment averages can help, but you stay in control.”
   - Rename `Avg` column to `Assessment Avg` or `Score Avg`.

5. Optional but useful: add a small “How grading works” help note near Records/Progress Evidence or High School.

## What not to do in this slice

- Do not add lesson percentage grades.
- Do not auto-calculate course grades from all lessons yet.
- Do not create a new grading table yet.
- Do not require grades to complete lessons.
- Do not merge to main without Imee approval.

## Later roadmap

Future after UX validation:
- Add project rubric fields beyond one quick rating.
- Add optional work-sample attachment directly inside project review.
- Let families choose whether course grades are manual, assessment-weighted, project-weighted, or custom.
- Add transcript-safe grade calculation settings for high school.
- Consider a future `progress_evidence` or `grade_entries` table only once reporting/export requirements are clearer.

## Recommendation

Proceed with the safe copy/UX slice first.

This directly answers the beta tester’s question without destabilizing schema or overwhelming parents. It makes the current system legible:

- Lessons: progress/check-in
- Projects: review/rubric + optional score
- Tests: score/manual grading
- Courses: final transcript grade
