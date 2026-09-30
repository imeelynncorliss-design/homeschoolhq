# HomeschoolReady — Product Roadmap (Fall 2026)

**Sources:** Courtney's product review (Sept 2026), the v1 Year-End Review Package review (Sept 30, 2026), and technical review.

**Guiding principle:** The app is too restrictive for low-regulation states like NC. Users should get value right away and add detail at their own pace. Strict compliance features stay available for the states that need them, driven by the family's selected state.

**This file is context only.** Work happens one item at a time, from its own prompt. Do not build ahead. Decisions and their reasons are recorded in `CHANGELOG.md`.

**Terminology (decided 2026-09-28):** The UI says "Student" everywhere, never "Learner." The database table stays `kids`, so the UI word is independent of the schema.

---

## Sequence at a glance

| # | Item | Depends on | Status |
|---|---|---|---|
| 1 | Setup replaces forced onboarding | 2 | Next |
| 2 | Quick fixes from Courtney's testing | — | **Current** (built first) |
| 3 | Compliance accuracy + Year-End Package fixes (Phase A) | — | Planned |
| 4 | Navigation | — | Planned |
| 5 | Dashboard / Command Center rework | 4 | Planned |
| 6 | Curriculum rework: sequential queue + cadence | 2 | Planned |
| 7 | Lesson completion + mastery logging | 6 | Planned |
| 8 | Year-End Package: state-driven sections (Phase B) | 3, 7 | Planned |
| 9 | Scout progress insights | 7 | Planned |
| 10 | School year rollover | 6, 7 | Planned |
| 11 | Portfolio work samples | 7; feeds 8 | Planned |
| 12 | Supply Scout + Weekly Prep Check | 6 | Planned |

Target: items 3 and 8 need to be finished before May 2027, when families start preparing year-end packages.

---

## 1. Setup replaces forced onboarding
Users land on the dashboard right away. A dismissible checklist card guides setup: school name, state, students, subjects, and teaching style only if something uses it. The beta NDA is removed.

*Why first:* Forced onboarding is where new users drop off. Every later feature is useless if people never get into the app.

## 2. Quick fixes (bugs from Courtney's testing) ← CURRENT, built before item 1
- A newly added subject doesn't show up when adding curriculum.
- In a student's view, the "From Curriculum" option under Add Lesson jumps to a different student instead of staying on the current one.
- The Scout button covers the top-right corner on mobile.
- Allow multiple photo uploads when adding curriculum.

*Why second:* These are small and cheap, and they rebuild trust with beta users. Fixing the subject bug also clears the way for the curriculum rework.

## 3. Compliance accuracy + Year-End Package fixes (Phase A)
Fix what the app gets wrong today, using data that already exists. No new tracking is needed.

**Compliance rules**
- **Ohio:** HB 33 (effective October 2023) removed the annual assessment and hours requirements. Remove any Ohio hours target or assessment requirement from the compliance rules.
- **South Carolina:** Add the family's SC option (1, 2, or 3) to settings.
  - Option 1: 180 days at 4.5 hours per day.
  - Option 3: 180 days, with no hours requirement.
  - v1 shows 810 hours for every SC family, which is only correct for Option 1.
- **All states:** Audit each state rule against its source. For each state, record whether the state counts days, hours, both, or neither, and cite the source for each.

**Package fixes**
- **Per student:** Organize the package by student, not by family. Evaluations and certifications are per child.
- **Totals mismatch:** The family total says 51 days, but one student shows 54. Find and fix the cause.
- **Closed years:** Once the school year's end date has passed, show final totals and **Met / Not met**. Remove "Behind pace," "days remaining," and the health score from the package. A family should never hand an official a document saying they're behind.
- **Hours only where they count:** Show hours only when the state counts hours.
- **Subjects:** "Subjects covered: 0" is shown even when hours are logged. Fix it.
- **Grade labels:** "Grade 8th Grade" and "Grade 3rd" should read "Grade 8" and "Grade 3."
- **Cover title:** The title should match the state's process, such as "Evaluator Review" for PA and "Annual Evaluation" for FL. Don't use "Certified Portfolio Review" everywhere.
- **Attendance:** Show monthly day totals per student by default. The parent can add either a one-page calendar grid per student or the full daily log as an appendix. At the v1 layout, a full daily log runs about 7 pages per student.
- **Parent attestation:** Add a signature block.

*Why third:* v1 can produce documents that hurt families: "Behind pace" language on a closed year, and the wrong hours target for most SC families. The fixes are small and don't depend on the curriculum rework.

## 4. Navigation
Bottom menu: Dashboard, Students, Curriculum, Records, More.

*Why here:* Every screen after this hangs off the navigation, so set the structure before redesigning screens.

## 5. Dashboard / Command Center rework
A student filter runs across the top (All Kids / Emma / Kai). Blocks: Today's Agenda, Quick Log (attendance, reading log, activities), Scout Insights, Reading Logs, Records.

*Depends on:* 4. Today's Agenda gets much richer after 6.

## 6. Curriculum rework: sequential queue + cadence
- Lessons are stored in order (`sequence_order`) and are never tied to specific dates.
- A cadence rule per subject (for example, "Math: Mon–Thu") decides which days a subject appears.
- "Next Up" is the next incomplete lesson. This removes the need for a "skip lesson" feature.
- Two ways to add curriculum:
  - Scan a table of contents, for books with named chapters.
  - Enter a name and lesson count, for books with only numbered lessons or open-and-go curricula.
- After any table-of-contents scan, show an editable review screen.
- Each subject gets a curriculum setting, including "Mark book complete," which archives the book to the correct school year.

*Why:* Tying lessons to dates is the most common reason parents abandon homeschool planning apps. When one lesson slips, every future date is wrong.

## 7. Lesson completion + mastery logging
The parent taps Complete, chooses Nailed it / Needs practice / Struggled, and can optionally name the concept. That one tap:
- logs attendance
- adds to the subject's hours
- moves the queue forward

Minutes are stored per subject and marked core or non-core, so any state's rules (days or hours) can be calculated from the same data.

*Depends on:* 6.
*Also unlocks:* the activity log and hours-by-subject sections of the Year-End Package (item 8).

## 8. Year-End Package: state-driven sections (Phase B)
Parents choose which sections to include. Sections the family's state requires are turned on by default, and the parent can turn any of them off.

| Section | Required or expected in | Data source |
|---|---|---|
| Cover page + per-student summary | All | Existing |
| Hours by subject | NY, PA, SC Option 1, GA, TN | Item 7 |
| Activity / lesson log by subject | PA, FL (the "log"), SC (plan book) | Item 7 |
| Reading log with titles | PA, FL (required by name) | Reading log |
| Progress, grade, or narrative per subject | SC, NY, GA | New field per subject per term |
| Standardized test results | PA (grades 3, 5, 8), NY, VA, GA, NC | New: test name, date, scores |
| Evaluator certification page (blank, for signing) | PA, FL, VA, NY | Template |
| Curriculum / materials list | NY, MD | Item 6 |
| Work samples | PA, FL, MD, SC | Item 11 when ready; existing samples until then |
| Attendance appendix (calendar grid or daily log) | Optional everywhere | Existing |
| Parent attestation | All | Item 3 |

*Depends on:* 3 for the per-student structure and state rules, and 7 for the subject data.
*Why:* Courtney identified the end-of-year package as the biggest pain point for families in strict states. PA and FL name the reading log and activity log specifically, and v1 has neither.

## 9. Scout progress insights
- Scout flags a concept only when it's marked Struggled twice or more within 7 days, or when the parent asks for help.
- Insights appear as small cards that can be dismissed, never as pop-ups.
- Scout can generate a lesson and either add it to a day or save it to the queue.
- Scout reads the current curriculum but keeps context from past years.

*Depends on:* 7, which supplies the mastery data.

## 10. School year rollover
- Ages update automatically from each student's birth month and year.
- After the parent's school-year end date, a wizard offers to:
  - promote each child's grade
  - lock the old year in Records
  - keep, change, or drop the curriculum for each subject

*Depends on:* 6 (archiving curriculum) and 7 (the records being preserved).
*Note:* The year-end package should be generated from the locked year.

## 11. Portfolio work samples
- The parent can snap a work sample when marking a lesson complete, tagged by stage: beginning, mid-year, or mastery.
- Records gets a curation view.
- Curated samples feed the Year-End Package (item 8).

*Technical requirement:* Compress images in the browser before upload: max 1600px wide, about 75–80% quality. This controls storage costs and keeps PDF sizes manageable.
*Depends on:* 7.

## 12. Supply Scout + Weekly Prep Check
Each subject gets a supply list, and there's a weekly prep screen. Alerts go out as one weekly digest at a time the parent chooses, never as separate daily pushes.

*Depends on:* 6, since supplies attach to upcoming lessons.
