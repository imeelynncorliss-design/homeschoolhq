# HomeschoolReady — Claude Code instructions

## Roadmap and change tracking
- Before starting any work, read `docs/ROADMAP.md` and `docs/CHANGELOG.md`.
- `docs/ROADMAP.md` replaces older planning docs in this folder (for example `ProductBacklog.md` and `8week Sprint`). If they conflict, follow the roadmap.
- Work on one roadmap item at a time, from its prompt in `docs/prompts/`. Do not build ahead.
- After every step, add an entry to `docs/CHANGELOG.md` (newest at the top) with what changed and why.
- Stop after each step and wait for approval before starting the next.

## Conventions
- Stack: Next.js, Supabase, Anthropic API, deployed on Vercel.
- Supabase import path: `@/src/lib/supabase` (not `@/lib/supabase`).
- Tables use `id, organization_id, user_id, created_at, updated_at`. Row-level security goes through `organization_id` + `user_organizations`.
- The database table is `kids`. The UI always says "Student," never "Learner."
- Scout (the AI assistant) is parent-facing only. Children never log in.

## Guardrails
- Never delete data or drop columns or tables without explicit approval.
- Ask before adding any npm dependency.
- Stay in scope. Log anything else you notice as a follow-up in the change log.
