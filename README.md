# Support Ticket Management System

> An opinionated, full-stack support-operations platform — tickets, SLAs, scrum delivery, and an AI knowledge layer — built on Next.js 16, React 19, and Supabase Postgres.

![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?style=flat-square)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5_strict-3178C6?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_RLS-3ECF8E?style=flat-square)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square)
![pgvector](https://img.shields.io/badge/pgvector-RAG-4169E1?style=flat-square)

<p align="center">
  <img src="./ticket-page.jpg" width="1000" />
</p>

---

## 1. Elevator Pitch

Most support teams operate across a fragmented stack: a ticketing tool, a chat thread, a tasks app, a tribal-knowledge wiki, and a project tracker that no one updates. Context lives in five places — none of them authoritative — and SLAs slip while leads spend their day reconstructing what happened.

**This project is a single operational workspace that closes that gap.** It runs the full ticket lifecycle, tracks SLAs at the database layer, links execution work to a Scrum delivery module, and surfaces past resolutions as AI-ranked suggestions when a new ticket comes in. Auth, RBAC, audit history, and realtime collaboration are enforced in Postgres — not bolted on in application code — so the system is correct by construction, not by convention.

> A production-grade reference for what a modern, security-conscious, AI-augmented support-ops product looks like when the database is treated as the source of truth.

---

## 2. Problem & Business Context

Support organizations are the connective tissue between customers, product, and engineering — and they are usually the worst-instrumented function in the company.

| Pain point | Operational cost |
|---|---|
| **No SLA visibility** | Breaches are discovered post-incident; CSAT and renewal risk compound silently |
| **Knowledge evaporates** | The same incident is solved from scratch every quarter; tier-1 escalates work tier-2 has already documented |
| **Unclear ownership** | Tickets bounce between functional, L1, L2, and L3 teams with no audit trail of decisions |
| **Disconnected delivery** | "Customer raised it" tickets and engineering backlogs live in separate tools — root causes never become roadmap items |
| **Compliance gap** | Auditors ask "who changed this status at 2:14am?" and the system has no answer |

The brief I gave myself: build a system where **every state change is auditable, every SLA is computable, and every past resolution is retrievable** — without bolting six SaaS tools together.

---

## 3. Solution & Product Value

A unified workspace structured around four product surfaces:

| Surface | Purpose | Key capability |
|---|---|---|
| **Tickets** | Customer-facing case lifecycle | Status/priority/temperature, CC, support level, functional + support team routing, rich-text resolutions, full audit history |
| **SLAs** | Operational reliability | Per-priority response & resolution policies, automatic pause/resume on status change, dashboard summary widget |
| **Knowledge Center** | Institutional memory | PDF ingestion, automatic chunking + embedding (Gemini 768-dim), governed retrieval surface |
| **Projects (Scrum)** | Engineering delivery | Projects, sprints, work items (epic/story/task/bug), backlog, sprint board — same auth, same teams |

**Cross-cutting AI layer:** when an agent opens a ticket, an *AI Research* panel runs a vector-similarity search across past ticket resolutions *and* uploaded documentation, returning ranked snippets with explicit source attribution. The retrieval policy (similarity threshold, max results, per-source weights, enabled sources) is admin-tunable from the Knowledge settings tab — not hard-coded.

### Why this matters commercially

- **Faster MTTR** — agents start with the answer instead of triaging from scratch.
- **Fewer regressions** — recurring issues bubble up as work items in the project module.
- **Auditable** — every status change, assignment, and resolution is captured by Postgres triggers in an immutable history table.
- **One tool, one bill, one identity model** — replaces the typical Zendesk + Confluence + Jira fragmentation for small-to-mid teams.

---

## 4. Key Features

### Ticketing
- Full lifecycle: open → in progress → pending → resolved → closed (transitions to *final* statuses are validated by a Postgres `BEFORE` trigger that requires a resolution payload)
- Normalized lookups for **status, priority, category, support level, client temperature** — UI labels and colors are data-driven, not hard-coded
- Rich-text descriptions and comments via **Tiptap v3** with code-block syntax highlighting, image uploads to Supabase Storage, and resizable inline images
- **Internal vs. external comments**, per-comment time tracking, and an automatic trigger that rolls comment time into `tickets.time_worked`
- **Realtime collaboration** — comments stream into open ticket pages via a per-ticket Supabase Realtime channel
- **Immutable audit trail** — every mutation writes to `ticket_history` via DB triggers; the application has no write access to history
- **Resizable, sortable, filterable** ticket table with column-width persistence

### SLA System
- 4-tier policy (urgent / high / medium / low) with separate **response** and **resolution** clocks
- SLA is auto-assigned by a `BEFORE INSERT` trigger when a ticket is created
- **Automatic pause/resume** when a ticket sits in a customer-blocked status (e.g. *pending_customer*); paused minutes accumulate so the deadline is honest
- **First-response detection** — the first non-internal comment from a support role marks `responded_at` and stops the response clock
- Status is **computed at read time** from `response_due_at`, `resolution_due_at`, and `total_paused_minutes` — no cron, no drift
- Dashboard widget + per-ticket detail block with 60s client-side refresh

### AI Knowledge Center
- **Two source types** — past ticket resolutions (auto-embedded) and uploaded PDFs (chunked + embedded)
- PDF ingestion pipeline via a Deno edge function: download from Storage → extract with `unpdf` → chunk (~3.2k chars, 400 overlap) → batch-embed with **Gemini `gemini-embedding-001`** (768 dims) → persist to `pgvector`
- **Unified retrieval** — a single `match_knowledge()` RPC ranks across both sources with admin-configured source weights and a similarity threshold
- **Governance** — every retrieval is logged (`kb_retrieval_log`), every admin change is audited (`kb_audit_log`), per-document AI-retrieval toggle, archival, versioning
- **AI Research panel** on the ticket page calls a Server Action that embeds the query (via the `embed-query` edge function), runs the RPC, and returns attributed snippets

### Projects & Scrum
- **Projects** with uppercase keys (`MOB-42` style) and atomic per-project numbering enforced by a `BEFORE INSERT` trigger
- **Sprints** with a partial unique index ensuring **one active sprint per project**
- **Work items** (epic / story / task / bug) with priority reused from the ticket priority lookup (consistent color/UX), story points, parent/child for epic → story, and **fractional-indexing `rank`** for drag-and-drop ordering without re-numbering siblings
- **Sprint board** with drag-and-drop across `todo / in_progress / in_review / done` using `@dnd-kit`
- Mirrors the ticket pattern: separate `work_item_comments`, `work_item_history`, RLS scoped by team, history written only by trigger

### Platform
- **Role-based access**: `admin`, `support_lead`, `support_member`, `client` — enforced by Postgres RLS policies; the UI is a hint, the DB is the wall
- **Auth proxy** (Edge-runtime style middleware) refreshes Supabase sessions on every request and redirects unauthenticated users
- **Unsaved-changes guard** — context + custom hook intercepts navigation when ticket / work-item forms are dirty
- Global search across tickets with normalized lookups joined in a single query

---

## 5. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Browser (React 19)                              │
│  Server Components  │  Client Components  │  TanStack Query  │  Tiptap   │
└────────────┬─────────────────────────┬──────────────────────────┬────────┘
             │ Server Actions          │ Realtime WebSocket       │ Storage
             ▼                         ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       Next.js 16 (App Router)                            │
│   (auth)/login    (dashboard)/ tickets · tasks · projects · knowledge    │
│   Auth proxy (proxy.ts) refreshes Supabase session on every request      │
└────────────┬─────────────────────────┬──────────────────────────┬────────┘
             │ @supabase/ssr           │ @supabase/supabase-js    │
             ▼                         ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          Supabase Platform                               │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐ │
│ │   Postgres 15    │  │ Realtime (WS)    │  │ Storage (S3-compatible)  │ │
│ │ • RLS everywhere │  │ • ticket-comments│  │ • ticket-attachments     │ │
│ │ • Triggers as    │  │   per-ticket ch. │  │ • kb-documents (PDFs)    │ │
│ │   business logic │  │                  │  │                          │ │
│ │ • pgvector       │  │                  │  │                          │ │
│ │ • pg_net → edge  │  │                  │  │                          │ │
│ └────────┬─────────┘  └──────────────────┘  └──────────────────────────┘ │
│          │ pg_net (HTTP from triggers)                                   │
│ ┌────────▼──────────────────────────────────────────────────────────────┐│
│ │ Edge Functions (Deno)                                                 ││
│ │  • embed-resolution   — embeds resolution_plain on ticket close       ││
│ │  • ingest-document    — PDF → text → chunks → embeddings              ││
│ │  • embed-query        — embeds a free-text query for retrieval        ││
│ │       │                                                               ││
│ │       ▼  Google Gemini  models/gemini-embedding-001  (768 dims)       ││
│ └───────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

### Architectural choices and the reasoning

| Decision | Reasoning |
|---|---|
| **Postgres triggers carry the business logic** for history, SLA state, time accumulation, atomic keys, and resolution validation | Application code is replaceable; the database is the contract. Triggers guarantee invariants regardless of which client (web, future API, future mobile) writes |
| **RLS as the security boundary** | Frontend checks are UX only. Stripping the UI must not strip access. Auditable, declarative, lives next to the data |
| **Lookups as data, not enums** | `ticket_statuses`, `_priorities`, `_categories`, `_support_levels`, `_temperatures` are tables with `display_order`, `color_class`, `is_final`. Adding a status is a row insert, not a deploy |
| **`resolution_plain` derived by a `BEFORE` trigger** | Strips HTML once, at write time, so search and embeddings see clean text without UI-layer munging |
| **`pg_net` to fan out to edge functions** | Keeps embeddings async without queue infrastructure. The trigger calls the edge function; the edge function writes back. No app process in the loop |
| **Two parallel domains (tickets vs. projects), shared identity** | Reuses `profiles`, `teams`, RBAC helpers, priority lookup. Avoids cross-domain coupling that would have made either side harder to evolve |
| **Server Components first, Client Components only where stateful** | The ticket page is a server-rendered `page.tsx` that hydrates a `ticket-detail-client.tsx` island. Cheap server data fetches, no waterfall on the client |
| **TanStack Query for client cache, not for fetching everything** | Used where the UX needs optimistic mutation + invalidation (tasks, comments). Server Components own the initial paint |

---

## 6. Technical Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, Server Actions, `bodySizeLimit: 2mb`) | Server Components + Server Actions remove a whole REST layer |
| UI runtime | **React 19** (Actions, transitions, `useTransition` in AI panel) | First-class form/server-action ergonomics |
| Language | **TypeScript 5** strict, `@/*` path alias | No implicit `any`; `database.types.ts` is generated and treated as source of truth |
| Data | **Supabase** — Postgres + Auth + Storage + Realtime + Edge Functions | Single managed surface; standard SQL underneath |
| Vector | **pgvector** (768-dim) + Gemini `gemini-embedding-001` | Embeddings live next to the data, queried by SQL |
| Client cache | **TanStack Query v5** | Used surgically where mutations + optimism matter |
| Forms | **react-hook-form** + **Zod** | Schemas in `lib/validations/` shared between client and server |
| UI primitives | **shadcn/ui** + Radix + Tailwind 3 + `class-variance-authority` | Owned components, no vendor lock |
| Rich text | **Tiptap v3** + **lowlight** | Headless editor; loaded only where needed (~47 KB gzipped) |
| Drag & drop | **@dnd-kit** (`core`, `sortable`, `utilities`) | Used on the sprint board; accessible by default |

---

## 7. System Design Deep-Dives

### 7.1 SLA: status is a function, not a column

Naive SLA systems write `sla_status = 'breached'` and then need a cron job that drifts. Here, the only state stored is:

```
sla_instances ( response_due_at, resolution_due_at, responded_at,
                paused_at, total_paused_minutes )
```

Status is **computed at read time** from those four fields and `NOW()` in `lib/utils/sla.ts:computeSlaDisplayInfo`. Pause/resume are triggers fired on ticket-status transitions: when a ticket enters a *waiting-on-customer* status, `paused_at` is stamped; when it leaves, `total_paused_minutes += now - paused_at` and `paused_at = NULL`. The result: an SLA is never wrong, even if the trigger missed a tick — because the trigger never had to tick.

### 7.2 Resolution + embedding pipeline

```
User closes ticket
  ↓
Client: resolution-dialog.tsx (Zod-validated, required for is_final statuses)
  ↓
Server Action / Supabase update tickets.resolution
  ↓
BEFORE UPDATE trigger: strip HTML → tickets.resolution_plain
  ↓
AFTER UPDATE OF resolution trigger → pg_net → embed-resolution Edge Function
  ↓
Edge fn: SELECT resolution_plain, call Gemini embedContent (768 dims)
  ↓
UPDATE tickets SET resolution_embedding = $vector
  ↓
Available immediately to match_knowledge() RPC for AI Research panel
```

Key detail: the `AFTER` trigger fires on `OF resolution`, **not** `OF resolution_plain`. Column-specific `AFTER` triggers don't see writes done by a `BEFORE` trigger on the same row — discovered the hard way, codified in migration `024_fix_resolution_embedding_trigger.sql`.

### 7.3 Drag-and-drop ordering without re-numbering

`work_items.rank` is a `text` column populated with **fractional indices** (e.g. `"a0"`, `"a0g"`, `"a1"`). Inserting between two items computes a string that sorts between them. No `UPDATE` cascade across siblings on every drag — one row changes per drop.

### 7.4 RLS pattern

Reusable helper functions (`is_admin`, `is_support_or_admin`) live in migration 025 and are reused across the knowledge and projects modules. New tables follow a consistent policy template: `SELECT` to authenticated (often filtered by team), `INSERT/UPDATE` gated by role helpers, `service_role` catch-all so triggers can write.

### 7.5 Audit history without app-code drift

Application code **cannot insert** into `ticket_history` or `work_item_history`. History rows are produced by `AFTER INSERT/UPDATE/DELETE` triggers that diff `OLD` vs `NEW`. This means: a future REST API, a CSV importer, or a SQL-console hotfix all produce the same audit trail as the UI. (Migration 017 adds a dedupe pass; 018 captures task activity against the parent ticket's history.)

---

## 8. Project Structure

```
app/
  (auth)/login/                 # Public routes
  (dashboard)/                  # Authenticated routes (layout enforces auth)
    dashboard/                  # KPIs, recent tickets, SLA widget, upcoming tasks
    tickets/[id]/               # Server page + client island
    tickets/new/  my-tickets/  search/  tasks/
    projects/                   # Project list
    projects/[key]/             # Sprint board (default)
    projects/[key]/backlog/     # Backlog + planning
    projects/[key]/sprints/     # Sprint timeline + edit
    projects/[key]/settings/    # Per-project settings
    knowledge/                  # Documents, resolutions, retrieval settings
  api/work-items/               # Minimal route handlers (work-item subset)

components/
  ui/                           # shadcn primitives (owned, editable)
  shared/                       # Cross-feature: badges, dropdowns, avatars, search
  layout/                       # Navbar, sidebar, navigation guards
  tickets/                      # Ticket page surface (15+ feature components)
  tasks/                        # Task list, form, stats, widgets
  projects/  sprints/  work-items/   # Scrum module

lib/
  supabase/
    client.ts  server.ts        # SSR-aware client factories
    queries/                    # ALL DB access — tickets, tasks, comments,
                                # slas, projects, sprints, work-items,
                                # knowledge, lookup, users, teams, dashboard
  validations/                  # Zod schemas (ticket, task, comment, project,
                                # sprint, work-item, knowledge)
  hooks/                        # use-tasks, use-navigation, use-unsaved-changes
  contexts/                     # unsaved-changes-context
  providers/                    # TanStack Query provider
  utils/                        # cn, date, format, highlight, sla, ticketSort

supabase/
  migrations/                   # 019..028 (current). Append-only, never edit history
  functions/
    embed-resolution/           # Trigger-invoked: resolution → embedding
    ingest-document/            # Trigger-invoked: PDF → chunks → embeddings
    embed-query/                # Invoked from Server Action: query → embedding

types/                          # database.types.ts (generated) + per-entity types
proxy.ts                        # Edge-style auth refresh middleware
```

---

## 9. Application Flow

### Ticket creation → resolution → searchable knowledge

1. Agent fills `app/(dashboard)/tickets/new/page.tsx` — Zod-validated by `ticket.schema.ts`
2. Server-side insert via `lib/supabase/queries/tickets.ts`
3. `BEFORE INSERT` triggers stamp `ticket_number`, assign an `sla_instance` based on priority
4. `AFTER INSERT` writes the first `ticket_history` row
5. Agents collaborate via realtime comments (`ticket-comments-${id}` channel); each comment can carry `time_worked_minutes` which a trigger rolls into `tickets.time_worked`
6. SLA detail block on the page polls every 60s and recomputes status client-side from due-dates
7. To close, agent must supply a resolution (`resolution-dialog.tsx`); `BEFORE UPDATE` trigger validates and refuses transitions to `is_final` statuses without one
8. `BEFORE UPDATE` strips HTML to `resolution_plain`; `AFTER UPDATE OF resolution` fires `pg_net` → `embed-resolution` → vector lives in `resolution_embedding`
9. Next time a ticket is opened, the **AI Research panel** embeds its title+description via `embed-query`, calls `match_knowledge()` over resolutions + KB documents, and returns ranked attributed snippets

### Auth flow

`proxy.ts` runs on every non-static request → refreshes the Supabase session → redirects unauthenticated traffic to `/login`. The dashboard layout double-checks server-side and loads the `profiles` row for role gating. RLS policies enforce the actual boundary.

---

## 10. Installation & Setup

```bash
# 1. Clone & install
git clone <repo-url>
cd "Support Ticket Management System"
npm install                     # Node >= 20

# 2. Environment
cp .env.example .env.local      # set the three values below
#   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...   (server-only)

# 3. Database
npx supabase link --project-ref <ref>
npx supabase db push            # applies supabase/migrations/*.sql in order
npx supabase db seed            # optional dev seed

# 4. Edge functions (only needed for AI features)
npx supabase secrets set GEMINI_API_KEY=<your-key>
npx supabase functions deploy embed-resolution --project-ref <ref>
npx supabase functions deploy embed-query      --project-ref <ref>
npx supabase functions deploy ingest-document  --project-ref <ref>

# 5. Run
npm run dev                     # http://localhost:3000
```

### Scripts

```
npm run dev      # Next.js dev server
npm run build    # Production build
npm run start    # Run production build
npm run lint     # ESLint (Next.js config)
```

---

## 11. Development Workflow

- **Data access only through `lib/supabase/queries/*`** — never call `.from(...)` inline in a component. Enforced by review.
- **Server vs. client Supabase clients are not interchangeable** — `lib/supabase/server.ts` for Server Components and Server Actions; `lib/supabase/client.ts` for Client Components. Mixing them silently breaks auth.
- **Every mutation validates with Zod** before it touches Supabase.
- **Schema changes**: new file under `supabase/migrations/` — never edit a shipped migration. Regenerate `types/database.types.ts` afterwards.
- **Audit history is read-only from app code.** If you find yourself inserting into `*_history`, you're solving the wrong problem — the trigger should be doing it.
- **Bundle discipline** — Tiptap is ~47 KB gzipped; it's only imported where comments/descriptions are edited.
- **Before "done":** `npm run lint` clean, dev server exercised in a browser for UI changes, migration + types updated together for schema changes.

---

## 12. Deployment & Operations

- **Frontend** deploys to any Next.js-compatible host (Vercel as the default target — `proxy.ts` is structured as middleware, edge-runtime-ready).
- **Database, Auth, Storage, Realtime, Edge Functions** all hosted on Supabase.
- **Secrets** for embedding functions (`GEMINI_API_KEY`) are stored in Supabase function secrets, never in the Next.js env.
- **Migration discipline**: append-only files, run via `supabase db push` against staging before prod.
- **Observability**: Supabase logs (queries, edge functions, auth) + internal `kb_audit_log` and `kb_retrieval_log` tables for the AI surface.
- **Storage buckets**: `ticket-attachments` (public read, RLS-gated write), `kb-documents` (private; signed-URL access).

---

## 13. Challenges, Tradeoffs & Lessons

| Challenge | What I did | Tradeoff |
|---|---|---|
| Status enums became a deployment bottleneck | Replaced enums with lookup tables (status, priority, category, support level, temperature) — migration 022 | More joins; lookups can be cached client-side and changes ship as data |
| `AFTER UPDATE OF resolution_plain` never fired | Column-specific `AFTER` triggers don't see writes from `BEFORE` triggers; switched to `OF resolution` and let the `BEFORE` continue to derive `resolution_plain` (migration 024) | Slight name/intent mismatch; documented in the trigger comment |
| SLA correctness with pause/resume | Made status a pure function of stored timestamps + paused minutes — no cron, no recompute job | Read-time cost (negligible at this scale); zero drift |
| Knowledge retrieval governance | Built `kb_retrieval_config` as a singleton row + audit + retrieval logs from day one | More tables; auditors and admins love it |
| Two parallel domains (tickets vs. work items) tempted code reuse via a polymorphic `comments` table | Resisted — kept `work_item_comments` separate, mirroring the ticket shape | Light duplication; each domain stays independently evolvable. Polymorphism deferred until a real third use case |
| Server Actions' 2 MB body cap | Image uploads go directly to Supabase Storage from the client, then the URL is sent through the action | Two-step upload; the action stays small and fast |
| `next-themes`-style global state vs. context | Used a tight `UnsavedChangesProvider` + custom hook for navigation guards instead of pulling in a state library | One more provider; zero added dependencies |

---

## 14. Product Thinking

This project is not "an app that lists tickets." It is a deliberate composition of four product surfaces around one belief: **support data is the most underutilized signal in a software company.**

- **Tickets** capture what customers actually hit.
- **Resolutions** capture how the org actually solved it.
- **Knowledge** turns those resolutions into a corpus that informs the next ticket.
- **Projects** turn the recurring patterns into roadmap items.

The flywheel: every closed ticket makes the next one cheaper to solve, and recurring tickets become engineering work in the same tool, owned by the same teams, under the same RBAC. That is the business impact thesis — not "AI features", but **closing the loop between operations and product**.

---

## 15. Future Roadmap

- [ ] Hybrid retrieval (BM25 + vector) and reranking in `match_knowledge()`
- [ ] @mentions and threaded comment replies
- [ ] Email-in → ticket creation pipeline (parse + classify on ingest)
- [ ] Burndown / velocity / cycle-time analytics for the Scrum module
- [ ] Customer-facing portal scoped to `role = 'client'`
- [ ] Webhook integrations + outbound notifications surface (`integrations` table is already in place)
- [ ] Multi-tenant org boundary (currently single-org)
- [ ] Automated regression of RLS policies in CI against a local Supabase

---

## 16. Why This Project

It's an end-to-end demonstration of:

1. **Systems thinking** — putting invariants in Postgres so they hold regardless of the client; making SLA status a function rather than a column; using fractional indices for ordering.
2. **Product ownership** — the feature set is not random. SLAs, knowledge retrieval, and the Scrum module each map to a specific failure mode of the legacy support stack, and they compose into a flywheel.
3. **Engineering craft** — strict TypeScript end-to-end, generated DB types, Zod schemas shared between layers, lookup tables instead of hard-coded enums, append-only migrations, an audit-by-trigger discipline, careful bundle hygiene.
4. **AI fluency without magic** — vector embeddings, edge functions called from `pg_net`, a governed retrieval surface with logging and per-source weights, retrieval-augmented suggestions wired into the actual workflow rather than as a sidebar gimmick.
5. **Operational maturity** — append-only migrations, immutable history, RLS as the security boundary, secrets out of the app process, observability tables built in.

> Built solo, end to end — schema, server, UI, AI pipeline, and product strategy.
