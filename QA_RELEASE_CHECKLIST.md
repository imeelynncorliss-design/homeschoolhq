# HomeschoolReady QA + Release Checklist

## Roles
- Altair: code writer
- QA agent: independent tester before Andromeda review
- Andromeda: review, coordination, release-readiness check
- Imee: staging/prod approval

## Required gates

### 1. Local build gate
- [ ] `npm ci` completed or dependencies already clean
- [ ] `npm run build` passes
- [ ] Warnings documented
- [ ] No module-level env client initialization introduced

### 2. Code review gate
- [ ] Summary provided
- [ ] Files touched listed
- [ ] Safety constraints confirmed
- [ ] No secrets exposed
- [ ] No production data used
- [ ] No migrations unless approved

### 3. QA gate
QA should test using synthetic/test data only.

- [ ] Primary happy path tested
- [ ] At least one error/edge case tested
- [ ] Screenshot/log/evidence captured where useful
- [ ] Regression risk noted
- [ ] QA recommendation: pass / fail / blocked

### 4. SBX gate
Before merging into or deploying to SBX:
- [ ] Branch based on current SBX
- [ ] Build passes on branch
- [ ] QA pass or explicitly accepted risk
- [ ] Env variables are SBX/local safe
- [ ] No billing path active unless expected

### 5. Production gate
Production movement requires explicit Imee approval.

- [ ] SBX reviewed
- [ ] Production env impact understood
- [ ] DB migration reviewed, if any
- [ ] Rollback path identified
- [ ] Imee approval recorded

## QA handoff format

```md
## QA Result
pass / fail / blocked

## What was tested
- item

## Evidence
- file/screenshot/log path

## Issues found
- issue

## Recommendation
Proceed / fix first / needs decision
```
