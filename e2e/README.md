# E2E Tests — Playwright

End-to-end browser tests for MERA Product Operations.

## Prerequisites

```bash
# 1. Local Supabase stack with seed data
supabase start
supabase db reset        # applies schema + seed.sql (creates 3 test users)

# 2. Configure both apps to point to local Supabase
#    apps/web/.env.local  → NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
#    apps/api/.env.local  → SUPABASE_URL=http://localhost:54321

# 3. Start both apps
pnpm dev                 # web :3000, api :8080

# 4. Install browser binaries (one-off)
pnpm exec playwright install chromium
```

## Running

```bash
# All E2E tests
pnpm test:e2e

# Headed (watch the browser)
pnpm test:e2e:headed

# Interactive UI
pnpm test:e2e:ui

# Debug a single test
pnpm test:e2e:debug e2e/tests/ticket-lifecycle.spec.ts
```

## Test files

| File | What it tests |
|------|--------------|
| `auth.setup.ts` | Saves auth cookies for each role (runs before other tests) |
| `ticket-lifecycle.spec.ts` | Support agent: create ticket → resolve with resolution |
| `client-isolation.spec.ts` | Client role: own tickets only, no internal comments |

## Test data

Tests create their own data via API calls in `beforeAll` and delete it in
`afterAll`. Each test title includes a timestamp to avoid collisions.

Auth state (cookies) is written to `e2e/.auth/` on first run — these files
are gitignored and regenerated automatically by `auth.setup.ts`.

## Env vars

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Web app URL |
| `API_URL` | `http://localhost:8080` | Fastify API URL |
| `SUPABASE_URL` | `http://localhost:54321` | Local Supabase |
| `SUPABASE_ANON_KEY` | Local default | From `supabase status` |
