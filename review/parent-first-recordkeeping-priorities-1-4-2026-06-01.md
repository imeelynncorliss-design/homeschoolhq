# Parent-first recordkeeping roadmap — priorities 1–4

Approved by Imee: 2026-06-01

## Priority 1 — Product direction lock

HomeschoolReady soft launch should present as parent-first homeschool recordkeeping, not standards-first school software.

Default product promise:
- Capture learning as it happens.
- Keep proof organized.
- Be ready for compliance questions.
- Build portfolios and transcripts without extra admin burden.

Implementation principle:
- Standards remain useful background infrastructure.
- Standards/goals should be optional visible metadata, not the default daily workflow.
- Scores/grades should remain available where they are genuinely useful, especially high school transcripts, but not required at the lesson/activity level.

## Priority 2 — Grading/standards surface inventory

### Keep visible
- Attendance and hours tracking: core compliance evidence.
- Portfolio/work samples: core parent-facing proof.
- Transcript/course-grade path: important for high school.
- Compliance dashboard/reporting: core differentiator.
- Daily notes/lesson completion: parent-friendly progress evidence.

### Rename or simplify
- `app/assessments/page.tsx`
  - Current framing: assessments, standards tracking, scores.
  - Parent-first framing: progress evidence, optional scores, optional learning-goal links.
- `components/AssessmentStandardsManager.tsx`
  - Current framing: manage educational standards.
  - Parent-first framing: link learning goals / coverage notes.
- `app/standards-setup/page.tsx`
  - Current framing: import standards once, tag lessons, track coverage.
  - Parent-first framing: optional learning-goal library for families who want coverage documentation.
- `app/tools/page.tsx`
  - Current framing: Standards Setup card.
  - Parent-first framing: Learning Goals / optional coverage tracking.
- README core feature list
  - Current framing: Standards Tracking.
  - Parent-first framing: optional learning goals / coverage metadata.

### Hide behind advanced setting later
- Full standards library management.
- Standards coverage dashboards.
- Alignment strength (`primary`, `supporting`, `related`) unless the user opts into advanced/teacher-style tools.
- Manual standard imports as a prominent setup action.

### Defer to future teacher/umbrella-school lane
- Robust mastery dashboards.
- Rubric/proficiency analytics.
- Teacher-grade standards workflows.
- Cohort/class-level standards reporting.

## Priority 3 — Unified progress evidence model draft

A unified progress evidence record should support the parent workflow first, while preserving advanced metadata for later.

Proposed conceptual model:

```ts
type ProgressEvidence = {
  id: string
  organization_id: string
  kid_id: string
  lesson_id?: string | null
  course_id?: string | null
  evidence_date: string
  evidence_type: 'completion' | 'note' | 'artifact' | 'score' | 'portfolio_item' | 'attendance_link' | 'assessment'
  status?: 'planned' | 'started' | 'completed' | 'reviewed' | null
  title?: string | null
  parent_note?: string | null
  artifact_url?: string | null
  artifact_type?: 'photo' | 'file' | 'link' | 'text' | null
  subject?: string | null
  minutes_or_hours?: number | null
  optional_score?: number | null
  optional_letter_grade?: string | null
  optional_proficiency?: 'not_yet' | 'developing' | 'secure' | 'advanced' | null
  linked_goal_ids?: string[]
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

Near-term implementation approach:
- Do not force a migration yet.
- Use this as the organizing model for UX and copy decisions.
- Map existing tables into this model:
  - `daily_attendance` → attendance evidence
  - `lessons` completion/notes → completion evidence
  - `assessment_results` → optional score evidence
  - `assessment_standards` + `user_standards` → optional linked goals
  - portfolio records/work samples → artifact evidence
  - `courses` → high-school transcript/course-grade lane

## Priority 4 — UX language and workflow changes

First safe code pass should update language, not schema:
- Replace default visible language that implies school-style grading/standards are required.
- Keep standards imports available, but label them as optional learning-goal coverage.
- Change assessment page hints toward progress evidence.
- Keep score displays where data exists, but frame scores as optional.

Suggested copy direction:
- “Assessments” → “Progress Evidence” where appropriate.
- “Standards Tracking” → “Learning Goals” or “Coverage Notes.”
- “+ Add Standards” → “+ Link Learning Goals.”
- “Score” → “Optional Score.”
- “Track assessments & manage standards” → “Track progress evidence & learning goals.”

## First implementation pass

Completed scope should include:
1. Documentation of this direction and surface inventory.
2. Safe UI copy changes on the standards/assessment entry points.
3. README positioning update.
4. No database migration until the UX model is validated.

## Not in this pass

- No schema migration.
- No destructive removal of standards tables or assessment tables.
- No advanced state-aware compliance rules beyond existing surfaces.
- No teacher/umbrella-school dashboard work.
