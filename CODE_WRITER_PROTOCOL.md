# HomeschoolReady Code Writer Protocol

Owner model:
- Altair writes code.
- Andromeda reviews, coordinates, and verifies readiness.
- Imee approves staging and production movement.

## Core rule
No feature work moves toward staging or production unless the build lane is clean and the change has a recorded verification path.

## Branch model
Preferred flow:
1. Start from the SBX branch: `sandbox/altair`.
2. Create a task/feature branch from `sandbox/altair`.
3. Altair commits changes to the task branch.
4. QA reviews the task branch.
5. Andromeda reviews the QA evidence and code summary.
6. If clean, merge/PR into SBX.
7. Imee approves any movement beyond SBX.

Avoid direct commits to production/main unless explicitly approved by Imee.

## Task brief requirements
Every code task must include:
- Goal
- User-facing impact
- Files likely involved
- Non-goals
- Safety constraints
- Required tests or verification
- Rollback/undo note if relevant

## Safety constraints
Default constraints unless Imee explicitly approves otherwise:
- No production deploys.
- No production data.
- No real family/child data.
- No migrations.
- No billing/Stripe changes.
- No secret exposure in chat or docs.
- No external sends/emails unless explicitly approved.

## Build-lane requirements
Before feature velocity resumes:
- `npm ci` works from a clean dependency state.
- `npm run build` passes.
- Known warnings are documented.
- Env-dependent clients are not initialized at module import time.

## Code writer handoff format
Altair must hand off with:

```md
## Summary
What changed.

## Files touched
- path

## Verification
- command/test run
- result

## QA notes
What QA should test manually.

## Risks
Known risks or uncertain areas.

## Ready for SBX?
yes/no + reason
```

## Review gate
Andromeda does not approve SBX movement unless:
- Build passes or blocker is explicitly documented.
- QA evidence exists.
- No safety constraints were violated.
- Imee approval is requested for anything beyond SBX.
