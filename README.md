# MERA — Product Operations Platform

> An open-source, AI-native workspace for product operations teams. Tickets, SLAs, knowledge retrieval, and Scrum delivery — unified in a single system where the database is the source of truth.

![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?style=flat-square)
![Fastify](https://img.shields.io/badge/Fastify-5_API-000000?style=flat-square&logo=fastify)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5_strict-3178C6?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_RLS-3ECF8E?style=flat-square)
![pgvector](https://img.shields.io/badge/pgvector-RAG-4169E1?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)
![AI Adopted](https://img.shields.io/badge/AI-Fully_Adopted-FF6B35?style=flat-square)

![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-unit_+_integration-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?style=flat-square&logo=playwright&logoColor=white)
![Semgrep](https://img.shields.io/badge/Semgrep-OWASP_Top_10-1B2A4E?style=flat-square)
![Gitleaks](https://img.shields.io/badge/Gitleaks-Secret_Scan-FF4F64?style=flat-square)
![pnpm audit](https://img.shields.io/badge/pnpm_audit-fail_on_HIGH%2B-F69220?style=flat-square&logo=pnpm&logoColor=white)

<p align="center">
  <img src="./docs/screenshots/Ad.png" width="960" alt="MERA Dashboard" />
</p>

---

## What is MERA?

MERA is not a ticket tracker. It is a **product operations platform** — a place where customer-facing issues, institutional knowledge, and engineering delivery live in the same system, owned by the same teams, under the same access model.

Most ops teams operate across a fragmented stack: a ticketing tool, a chat thread, a tasks app, a knowledge wiki, and a project tracker that no one updates. Context lives in five places — none authoritative — and SLAs slip while leads spend their day reconstructing what happened.

**MERA closes that gap.** Every closed ticket feeds a searchable knowledge layer. Recurring issues become engineering work items in the same tool. SLAs are computed, not estimated. And when an agent opens a new case, an AI Research panel surfaces the most relevant past resolutions and documentation — automatically, with full source attribution.

> The flywheel: every resolved ticket makes the next one cheaper to solve, and patterns become roadmap items without switching tools.

---

## Core Surfaces

| Surface                 | What it does                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tickets**             | Full lifecycle — status, priority, temperature, SLA, rich-text resolution, realtime comments, immutable audit trail                                          |
| **SLA Engine**          | Per-priority response & resolution policies, auto-assigned on creation, pause/resume on customer-blocked statuses, computed at read time — no cron, no drift |
| **AI Knowledge Center** | Past resolutions + uploaded PDFs chunked and embedded via Gemini. Unified retrieval ranked by similarity, governed by admin-tunable weights and thresholds   |
| **Projects & Scrum**    | Projects, sprints, work items (epic / story / task / bug), drag-and-drop sprint board, backlog planning — same auth, same teams                              |
| **Team Management**     | Business teams, support teams (L1/L2), and engineering squads — managed inline on the `/teams` page (full CRUD). Many-to-many membership with roles, project allocation, and team detail views |

---

## Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <img src="./docs/screenshots/all-tickets.png" alt="All Tickets" />
      <br/><sub><b>Ticket Queue</b> — status, priority, SLA countdown, temperature, team filters</sub>
    </td>
    <td align="center" width="50%">
      <img src="./docs/screenshots/scrum-project.png" alt="Scrum Board" />
      <br/><sub><b>Scrum Board</b> — sprints, epics, stories, bugs, drag-and-drop kanban</sub>
    </td>
  </tr>
</table>

<br/>

<p align="center">
  <img src="./docs/screenshots/ai-knowledge-center.png" width="960" alt="AI Knowledge Center" />
  <br/><sub><b>AI Knowledge Center</b> — every closed ticket auto-indexed as a 768-dim embedding; PDFs chunked and ingested via Gemini edge functions</sub>
</p>

<br/>

<table>
  <tr>
    <td align="center" width="50%">
      <img src="./docs/screenshots/ticket-page.png" alt="Ticket Page" />
      <br/><sub><b>Ticket Page</b> — full ticket context</sub>
    </td>
    <td align="center" width="50%">
      <img src="./docs/screenshots/Dashboard.png" alt="Dashboard" />
      <br/><sub><b>Dashboard</b> — team overview</sub>
    </td>
  </tr>
</table>

---

## AI Adoption — First-Class, Not a Feature

MERA was built AI-first, both as a product and as a project.

**In the product:**

- Every ticket close generates a 768-dim Gemini embedding via an edge function triggered by `pg_net` — no manual step, no queue
- An **AI Research panel** on every ticket embeds the query and runs `match_knowledge()` across ticket resolutions and KB documents in real time
- PDF ingestion pipeline: upload → edge function → `unpdf` extraction → chunking → Gemini batch embedding → `pgvector` — fully automated
- Retrieval is governed: similarity threshold, max results, per-source weights, per-document toggle — all admin-configurable, all audited

**In the codebase:**

- Built end-to-end with Claude Code and GitHub Copilot woven into the development workflow
- AI-assisted development is not hidden or apologized for — it's part of the thesis: this is what modern engineering looks like

```
Ticket closed → BEFORE trigger strips HTML → resolution_plain
             → AFTER trigger fires pg_net → embed-resolution edge fn
             → Gemini gemini-embedding-001 (768 dims)
             → resolution_embedding available to match_knowledge() RPC
             → AI Research panel surfaces it on the next relevant ticket
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Browser (React 19)                        │
│  Server Components  │  Client Components  │  TanStack Query     │
└────────────┬──────────────────────────┬────────────────────────┘
             │ Server Actions           │ apiBrowser.*
             ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 16 (App Router)                      │
│  api.* (server-side)  ────────────────────────────────────────  │
│  Auth only: @supabase/ssr — cookie session, no DB access        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Authorization: Bearer <jwt>
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Fastify 5 API  (apps/api)                     │
│  JWT validation → per-request Supabase client (RLS preserved)   │
│  Routes: tickets · tasks · projects · sprints · knowledge · …  │
│  OpenAPI docs at :8080/docs · Zod validation on every endpoint  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ user-scoped client (auth.uid() intact)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Supabase Platform                         │
│  Postgres 15 + RLS + Triggers │ Storage (S3) │ Auth             │
│  pgvector · pg_net → Edge Functions (Deno)                      │
│    embed-resolution · ingest-document · embed-query             │
│         ↓  Google Gemini  gemini-embedding-001  (768 dims)      │
└─────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

| Decision | Why it matters |
| --- | --- |
| **Owned API layer (Fastify)** — all data access lives in `apps/api`; the web app only holds auth cookies | Supabase becomes an implementation detail. The API can be versioned, rate-limited, tested, and replaced independently. OpenAPI docs come for free |
| **Postgres triggers carry business logic** — history, SLA state, time accumulation, resolution validation | Application code is replaceable; the database is the contract. Invariants hold regardless of which client writes |
| **RLS as the security boundary** | Frontend checks are UX only. The API validates JWTs and scopes clients — but RLS is the final word, auditable and declarative |
| **Lookup tables, not enums** — status, priority, category, temperature are DB rows with color and display order | Adding a status is a row insert, not a deploy |
| **SLA status is a pure function** of stored timestamps — no cron, no recompute | Never wrong, never drifts, zero infrastructure overhead |
| **`pg_net` fans out to edge functions** | Keeps embeddings async without queue infrastructure |
| **Server Components first** — client islands only where stateful | Cheap server data fetches, no waterfall on the client |

---

## Stack

| Layer        | Technology                                                                   |
| ------------ | ---------------------------------------------------------------------------- |
| Frontend     | **Next.js 16** — App Router, Server Actions, Server Components               |
| API          | **Fastify 5** — TypeScript strict, Zod validation, OpenAPI at `/docs`        |
| UI           | **React 19**, **shadcn/ui** + Radix, **Tailwind 3**, **Tiptap v3**           |
| Language     | **TypeScript 5** strict — `database.types.ts` is generated and authoritative |
| Data         | **Supabase** — Postgres + Auth + Storage + Edge Functions                    |
| Vector       | **pgvector** (768-dim) + **Gemini `gemini-embedding-001`**                   |
| Forms        | **react-hook-form** + **Zod**                                                |
| Client cache | **TanStack Query v5** — used surgically for optimistic mutations             |
| DnD          | **@dnd-kit** — accessible drag-and-drop on sprint board                      |

---

## Quick Start

```bash
# 1. Clone & install (pnpm workspaces)
git clone https://github.com/<your-handle>/mera
cd mera && pnpm install        # Node >= 20, pnpm >= 9

# 2. Environment — two apps, two env files
# apps/web/.env.local
#   NEXT_PUBLIC_SUPABASE_URL=
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=
#   API_URL=http://localhost:8080          # server-side
#   NEXT_PUBLIC_API_URL=http://localhost:8080  # client-side

# apps/api/.env.local
#   PORT=8080
#   SUPABASE_URL=
#   SUPABASE_ANON_KEY=
#   CORS_ORIGINS=http://localhost:3000

# 3. Database — push the full schema
npx supabase link --project-ref <ref>
npx supabase db push          # applies all migrations in order
npx supabase db seed          # optional: seed default team + example data

# 4. Configure pg_net for edge function triggers (run once in SQL editor)
# ALTER DATABASE postgres SET app.supabase_url = 'https://<ref>.supabase.co';
# ALTER DATABASE postgres SET app.supabase_anon_key = '<your-anon-key>';

# 5. Edge functions (AI features)
npx supabase secrets set GEMINI_API_KEY=<your-gemini-key>
npx supabase functions deploy embed-resolution --project-ref <ref>
npx supabase functions deploy embed-query      --project-ref <ref>
npx supabase functions deploy ingest-document  --project-ref <ref>

# 6. Run both apps
pnpm dev       # web :3000  ·  API :8080  ·  OpenAPI :8080/docs
```

---

## Testing

MERA ships with a three-tier test strategy. Each tier runs at a different level of the stack and at a different cadence, so the cheap ones gate the slow ones.

| Tier            | Tool         | Where                                                                                  | What it proves                                                                                              | Command                  |
| --------------- | ------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Unit**        | Vitest       | [apps/web/lib/utils/__tests__/](apps/web/lib/utils/__tests__/) · [apps/api/src/unit/](apps/api/src/unit/) | Pure functions behave as specified. Zero network, zero DB. Sub-second.                                       | `pnpm test:unit`         |
| **Integration** | Vitest       | [apps/api/src/__tests__/](apps/api/src/__tests__/)                                     | Each Fastify route boots in-process against a real local Postgres with RLS enabled and the full trigger set. | `pnpm test:integration`  |
| **E2E**         | Playwright   | [e2e/tests/](e2e/tests/)                                                               | Real Chromium against the running stack — auth, ticket lifecycle, sprint board, client isolation, admin.    | `pnpm test:e2e`          |

### What integration tests actually cover

The integration suite is the load-bearing tier — it's the one that catches RLS drift, trigger regressions, and schema mistakes that typechecking can't see. Current coverage:

- **Auth & access control** — JWT validation, role gating, RLS enforcement, security headers
- **Ticket lifecycle** — CRUD, pagination, resolution flow (HTML → plain → embedding trigger), strict schema rejection
- **Tasks** — full lifecycle and aggregate stats
- **Comments** — CRUD, internal-vs-external visibility
- **Projects / sprints / work-items** — Scrum surface end-to-end
- **SLA policies & instances** — pause/resume on customer-blocked statuses
- **Storage** — signed-upload URL minting, bucket isolation
- **Knowledge** — KB CRUD, retrieval config, audit logging

Tests run against a real local Supabase stack started by `supabase start` — no mocks, no stubs. This is the explicit trade-off: slower than unit tests, but the only way to be sure RLS still works after a migration.

### E2E

Playwright covers the journeys that span web + API + DB in a single user flow:

- **Auth guard** — unauthenticated requests redirect; authenticated sessions persist via captured `storageState`
- **Ticket lifecycle** — agent opens a ticket, fills resolution, closes, sees it indexed
- **Client isolation** — `role = 'client'` sees only their own tickets, no internal comments
- **Sprint board** — drag-and-drop reorder persists across reload
- **Admin settings** — admin-only screens gate correctly

E2E uses the three seeded test users (`admin@`, `support@`, `client@test.mera.local`) from [supabase/seed.sql](supabase/seed.sql).

```bash
pnpm test:e2e          # all specs
pnpm test:e2e:headed   # watch the browser drive itself
pnpm test:e2e:ui       # Playwright's interactive runner
pnpm test:e2e:debug    # step-through with inspector
```

See [e2e/README.md](e2e/README.md) for prereqs (a local stack, both dev servers, and `playwright install chromium`).

---

## Continuous Integration

CI runs on every push to `main` / `develop` and on every PR targeting them. The pipeline is defined in a single file — [.github/workflows/test.yml](.github/workflows/test.yml) — and uses Node 22 + pnpm 11.2.2 across all jobs.

| Job              | What it does                                                                                                                                                              | Fails the build on                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Typecheck**    | `tsc --noEmit` for both `apps/web` and `apps/api`                                                                                                                          | Any TS error                                        |
| **Unit**         | Vitest suites in both apps (no Supabase needed)                                                                                                                            | Any failing assertion                               |
| **Audit**        | `pnpm audit --audit-level=high`                                                                                                                                            | Any HIGH or CRITICAL CVE in the dependency tree     |
| **Semgrep**      | SAST against the project-local rules in [.semgrep.yml](.semgrep.yml) — covers OWASP Top 10 for Node/TypeScript (injection, broken access control, crypto, misconfig, …)   | Any ERROR-severity finding                          |
| **Secret Scan**  | Gitleaks with the built-in ruleset + project allowlist [.gitleaks.toml](.gitleaks.toml) — fixtures and seeded dev keys are filtered                                        | Any real leaked credential                          |
| **Integration**  | **Disabled in CI** (`if: false` in [.github/workflows/test.yml](.github/workflows/test.yml)) — boots a real local Supabase stack and runs the Vitest integration suite when enabled. Run locally before merging API/route changes | Any failing route, RLS regression, or trigger drift (when re-enabled) |

```
┌─ Typecheck ─┬─► Unit
              └─► Audit
              (Integration job exists but is gated off with `if: false`)

┌─ Semgrep      (parallel)
└─ Secret Scan  (parallel)
```

**Design notes:**

- **Integration is disabled in CI**: the job is defined but gated with `if: false`. Run `pnpm test:integration` locally against `supabase start` + `supabase db reset` before merging API/route changes. Re-enable by editing the `if:` in [.github/workflows/test.yml](.github/workflows/test.yml).
- **Security jobs are independent**: Semgrep and Gitleaks don't wait for typecheck — a leaked secret should block a merge even if the code doesn't compile.
- **Docker image cache**: the Supabase image set is cached by `supabase/config.toml` hash, cutting ~4–6 minutes per integration run.
- **E2E is not in CI yet**: Playwright currently runs locally only. It's on the roadmap to add a `workflow_dispatch` job once the cold-start cost of booting both Next dev server + Fastify + Supabase in CI is amortized.

### Security posture in CI

Three layers run on every PR, in parallel where possible:

1. **Dependencies** — `pnpm audit` blocks HIGH/CRITICAL CVEs at install time.
2. **Static analysis** — Semgrep enforces a project-local OWASP ruleset for Node/TypeScript. Rules live in [.semgrep.yml](.semgrep.yml) and are version-controlled like any other code.
3. **Secrets** — Gitleaks scans full history (`fetch-depth: 0`) so a secret introduced earlier in the branch is still caught. Fixtures, mocks, and the public Supabase local-stack anon key are explicitly allowlisted via [.gitleaks.toml](.gitleaks.toml) so they don't generate noise.

A passing CI run is the merge contract: typecheck clean, all unit + integration tests green, no HIGH+ deps, no Semgrep ERROR, no secrets.

---

## Contributing

MERA is open to collaboration. If you've stumbled across this project and feel like contributing — whether that's a bug report, a feature idea, a pull request, or just a thought — you're genuinely welcome here.

**Good places to start:**

- Browse open issues for `good first issue` labels
- Try the setup and report friction in the onboarding experience
- Pick anything from the roadmap below that excites you

**Development conventions (short version):**

- **Web → API**: use `api.get/post/...` (server-side) or `apiBrowser.get/post/...` (client-side) — never call Supabase directly from `apps/web`
- **API → DB**: all data access in `apps/api/src/services/`; routes are thin handlers that call services
- Every mutation validates with Zod at the API route level; forms also validate client-side
- Schema changes = new file under `supabase/migrations/` + regenerate `database.types.ts` in both apps
- History tables are read-only from app code — triggers write them
- Before "done": `pnpm --filter web typecheck` + `pnpm --filter api typecheck` + `pnpm test:unit` clean; for API/route changes, add an integration test and run `pnpm test:integration` against a local Supabase; exercise the flow in a browser
- New routes should ship with at least one integration test (happy path + an auth/RLS edge case). User-facing journeys that span both apps deserve an E2E spec

Good software tends to grow from good conversations. Open an issue or reach out.

---

## Roadmap

- [ ] Hybrid retrieval (BM25 + vector) and reranking in `match_knowledge()`
- [ ] @mentions and threaded comment replies
- [ ] Email-in → ticket creation (parse + classify on ingest)
- [ ] Burndown / velocity / cycle-time analytics for Scrum
- [ ] Customer-facing portal (`role = 'client'`)
- [ ] Webhook integrations + outbound notifications (`integrations` table is already in place)
- [ ] Multi-tenant org boundary (currently single-org)
- [ ] Playwright E2E job in CI (currently local-only)
- [ ] Coverage gate (`vitest --coverage`) wired into the unit/integration jobs

---

## License

MIT © 2026 Francisco Javier Cotos — see [LICENSE.md](LICENSE.md)

MERA is a personal project built out of genuine curiosity and a desire to create something useful. It has no affiliation with any company or organization. The code is 100% AI-assisted — developed with Claude Code and GitHub Copilot woven into the workflow throughout. That's not a caveat; it's part of the point.
