# Local Development

This guide is for running HomeschoolReady locally without exposing production secrets.

## Prerequisites

- Node.js compatible with the version in `package.json`
- npm
- Access to a development Supabase project

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local env file:

   ```bash
   cp .env.local.example .env.local
   ```

3. Fill in `.env.local` using development credentials only.

   Required for basic app usage:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`

   Required for server-side/admin flows:
   - `SUPABASE_SERVICE_ROLE_KEY`

   Optional integrations:
   - AI generation: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY`
   - Email invites: `RESEND_API_KEY`
   - Calendar sync: Google/Microsoft calendar variables

## Run locally

```bash
npm run dev
```

Open <http://localhost:3000>.

## Verification gates

Use the smallest gate that matches the change:

```bash
npm run build
```

Known build warnings at time of writing:
- Next.js warns that the `middleware` file convention is deprecated in favor of `proxy`.
- Outlook calendar integration logs a warning when Microsoft OAuth credentials are not configured.

Lint is available but currently broader than the active change surface:

```bash
npm run lint
```

## Secrets policy

- Do not commit `.env.local`.
- Do not paste production secrets into docs, issues, commits, or chat.
- `.env.local.example` should contain variable names and safe defaults only.
- Use development Supabase/calendar/email credentials for local testing.

## Branching / deployment notes

- Use `sandbox/altair` for approved sandbox work.
- Push to `main` only after explicit approval and a passing build gate.
- Build may dirty `next-env.d.ts`; restore it before committing unless the type reference change is intentional.
