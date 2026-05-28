# Build-Lane Hardening Handoff — 2026-05-28

## Summary
Local HomeschoolReady build lane is now green. Fixed multiple Next 16 build/prerender blockers caused by Supabase/Resend/Anthropic clients being initialized at module import time or during static prerender.

## Branch note
User confirmed GitHub SBX branch is `sandbox/altair`. Current local checkout reported `main...origin/main`; no push/merge/deploy performed.

## Files touched
- `app/api/assessments/route.ts`
- `app/api/assessments/[id]/route.ts`
- `app/api/assessments/[id]/standards/route.ts`
- `app/api/calendar/connections/[id]/route.ts`
- `app/api/invites/confirm-user/route.ts`
- `app/api/lessons/route.ts`
- `app/api/lessons/[id]/standards/route.ts`
- `app/api/planning/auto-complete/route.ts`
- `app/api/standards/route.ts`
- `app/api/standards/[id]/route.ts`
- `app/api/standards/[id]/generate-activity/route.ts`
- `app/api/standards/clone-template/route.ts`
- `app/api/standards/import/route.ts`
- `app/api/standards/templates/route.ts`
- `app/assessments/page.tsx`
- `components/StandardsPicker.tsx`
- `lib/aiUsage.ts`
- `lib/utils-standards.ts`
- `src/lib/invites.ts`
- `src/lib/resend.ts`
- `src/lib/supabase.ts`
- `src/lib/supabase/client.ts`
- `CODE_WRITER_PROTOCOL.md`
- `QA_RELEASE_CHECKLIST.md`
- `POLARIS_QA_CHARTER.md`

## Verification
Command run:

```sh
npm run build
```

Result: PASS, exit code 0.

Build completed all 92 static pages and route optimization.

## Remaining warnings
- Next.js 16 warning: `middleware` file convention is deprecated; use `proxy` instead.
- Microsoft OAuth credentials not configured; Outlook integration disabled.

## Safety constraints followed
- No deploy.
- No push.
- No merge.
- No migrations.
- No production data.
- No real family/child data.
- No secrets printed.

## Risks / follow-up
- Current local checkout is `main`, not `sandbox/altair`; branch alignment is needed before moving this patch toward SBX.
- Lazy/proxy Supabase browser client pattern should be reviewed by Polaris/Andromeda to ensure runtime behavior remains correct.
- Next warning about middleware/proxy should be backlog item after build baseline is stable.
