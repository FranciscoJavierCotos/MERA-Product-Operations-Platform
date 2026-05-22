Ready for review
Select text to add comments on the plan
Scrum Project Management — MVP
Context
The Support Ticket Management System is a mature support-ops platform (tickets, tasks, SLAs, AI knowledge base, audit history, RBAC). To position the product against business buyers who want a single operational platform for both support and product development, the next strategic step is adding project management. This MVP introduces a Scrum module — projects, sprints, work items, a sprint board — running parallel to the existing ticket system. Same auth, same teams, same RBAC, same DB conventions. Tickets remain untouched.

Decisions locked in:

Methodology: Scrum first; data model allows future Kanban/Waterfall (methodology enum on projects)
Architecture: Projects parallel to tickets, separate work_items table (not reusing tasks)
Scope: Schema + Sprint Board view (backlog + active sprint with drag-to-status). No burndown/Gantt/analytics yet.
Data Model — migration supabase/migrations/026_create_projects_scrum.sql
Enums
project_methodology — 'scrum' | 'kanban' | 'waterfall'
project_status — 'active' | 'archived'
sprint_status — 'planned' | 'active' | 'completed'
work_item_type — 'epic' | 'story' | 'task' | 'bug'
work_item_status — 'todo' | 'in_progress' | 'in_review' | 'done' (new — ticket statuses carry SLA/resolution semantics we don't want here)
Tables
projects — id, key (uppercase 2–10 chars, unique, e.g. MOB), name, description, methodology, status, team_id → teams, lead_id → profiles, next_item_number int default 1 (atomic per-project counter), created_by, created_at, updated_at.
sprints — id, project_id (cascade), name, goal, start_date, end_date, status, created_at. Partial unique index on (project_id) WHERE status='active' to enforce one active sprint.
work_items — id, project_id, sprint_id (nullable; null = backlog), item_key (e.g. MOB-42, unique), type, title, description, status, priority_id smallint → ticket_priorities (reuse the lookup — same color/UX), story_points smallint, assigned_to, reporter_id, parent_id → work_items (epic→story, no tree UI in MVP), rank text (fractional indexing), created_at, updated_at. Indexes: (project_id, sprint_id, status, rank), (assigned_to), (parent_id).
work_item_comments — mirrors ticket_comments shape (separate table; polymorphic comments deferred).
work_item_history — mirrors the existing ticket history pattern; written by a BEFORE/AFTER UPDATE trigger, never from app code (matches the convention in supabase/migrations/ 013–018).
Functions / triggers
generate_item_key(project_id) — UPDATE projects SET next_item_number = next_item_number + 1 RETURNING key || '-' || (next_item_number - 1). Called from a BEFORE INSERT trigger on work_items when item_key IS NULL. Atomic under default isolation.
work_item_history_trigger — duplicates the proven ticket history pattern (≈40 lines of SQL); fields: actor, field_changed, old_value, new_value.
RLS
Modeled on existing ticket policies in earlier migrations:

projects: select if team_id matches caller's team OR caller is admin / support_lead. Mutate: admin or project lead_id.
sprints / work_items / comments / history: access flows through project_id → projects.team_id. Clients (role = client) get no access (product work is internal).
TypeScript Types
Regenerate types/database.types.ts via npx supabase gen types typescript after applying the migration.
New entity files: types/project.types.ts, types/sprint.types.ts, types/work-item.types.ts — define Project, ProjectListItem, Sprint, SprintWithCounts, WorkItem, WorkItemWithRelations, BoardColumn.
Queries Layer
All under lib/supabase/queries/ matching the shape of existing tickets.ts / tasks.ts (typed SupabaseClient<Database>, named SELECT constants, no inline .from() outside this layer):

lib/supabase/queries/projects.ts — listProjects, getProjectByKey, createProject, updateProject, archiveProject.
lib/supabase/queries/sprints.ts — listProjectSprints, getActiveSprint, createSprint, startSprint, completeSprint (moves unfinished items back to backlog: UPDATE work_items SET sprint_id = NULL WHERE sprint_id = $1 AND status != 'done').
lib/supabase/queries/work-items.ts — listBacklog, listSprintBoard (grouped by status), getWorkItem, createWorkItem, updateWorkItem, moveToSprint, reorderItem(itemId, beforeRank, afterRank).
lib/supabase/queries/work-item-comments.ts — listComments, createComment.
Validation (Zod)
lib/validations/project.ts, lib/validations/sprint.ts, lib/validations/work-item.ts — title 1–200, story_points int ≤ 100, key uppercase 2–10, sprint end_date > start_date.

Routes & Pages
Under app/(dashboard)/ — the layout already enforces auth.

app/(dashboard)/projects/page.tsx — Server Component, fetches listProjects, renders card grid.
app/(dashboard)/projects/new/page.tsx — server shell + client project-form.tsx.
app/(dashboard)/projects/[key]/layout.tsx — fetches project by key, provides header + tabs: Board | Backlog | Sprints | Settings. Conditional empty-state tabs (Kanban/Gantt) when methodology !== 'scrum'.
app/(dashboard)/projects/[key]/page.tsx — default Sprint Board view (backlog drawer + active sprint with Todo / In Progress / In Review / Done columns).
app/(dashboard)/projects/[key]/backlog/page.tsx — full backlog with inline create.
app/(dashboard)/projects/[key]/sprints/page.tsx — sprint list with Start / Complete actions.
app/(dashboard)/projects/[key]/settings/page.tsx — edit/archive.
Work item detail: dialog opened from board, deep-linkable via ?item=MOB-42 (avoids parallel routes complexity for MVP). Full page deferred.
Next.js 16 specifics: params and searchParams are Promises — await them in server components. Use Server Actions for create/update; call revalidatePath. For drag-drop reordering (high-frequency), use a TanStack Query mutation hitting a Route Handler to avoid full route revalidation per drag.

Components
New folders:

components/projects/ — project-card.tsx, project-form.tsx, project-header.tsx (key chip + tabs).
components/sprints/ — sprint-card.tsx, sprint-form.tsx, sprint-status-badge.tsx.
components/work-items/ — work-item-card.tsx, work-item-form.tsx, work-item-detail-dialog.tsx, sprint-board.tsx, backlog-list.tsx, work-item-type-badge.tsx, work-item-status-badge.tsx (new, NOT reused — see below).
Reuse (verified):

components/ui/ primitives — badge, dialog, dropdown-menu, button, card, etc.
components/shared/user-avatar.tsx — works as-is.
components/shared/assigned-user-dropdown.tsx — likely reusable if it accepts callback props; verify before reuse.
components/tickets/rich-text-editor.tsx — reuse for descriptions/comments.
DO NOT reuse (verified):

components/shared/priority-badge-dropdown.tsx — hardcoded to tickets (calls updateTicket() internally). Build a thin work-item variant; reuse the visual Badge + color_class pattern.
Ticket status dropdowns — ticket-status-aware. Build work-item-status-badge.tsx mirroring the API.
Ticket comment-form/item — copy + parameterize (extract to shared components/comments/ later if a third commentable entity appears).
Drag-and-drop: add @dnd-kit/core + @dnd-kit/sortable (~10KB, headless, a11y, actively maintained, React 19 compatible). react-beautiful-dnd is deprecated — do not use.

Rank strategy: fractional indexing — new item between neighbors gets a string midway lexicographically (e.g., 'n' between 'm' and 'o'). Use the fractional-indexing npm package (~1KB). Avoids float precision and integer rebalancing.

Navigation
Edit components/layout/sidebar.tsx to insert between My Tickets and My Tasks:

{ name: "Projects", href: "/projects", icon: FolderKanban },
(FolderKanban already in lucide-react.)

Explicitly Deferred
Burndown/velocity charts, sprint reports, Gantt, Kanban WIP limits, epic hierarchy UI, AI features on work items, attachments (comments only), realtime, notifications, work item full-page route, custom per-project workflows, time tracking on items, swimlanes, bulk edit, client portal access.

Highest-Risk Decisions (resolved)
Risk Decision Why
Item key generation under concurrent inserts next_item_number column + BEFORE INSERT trigger doing UPDATE … RETURNING Atomic, simpler than per-row sequences
Board ordering Fractional indexing (lexicographic string ranks) No precision/rebalance death-spiral
Polymorphic vs separate comments Separate work_item_comments Polymorphic FKs have no referential integrity in Postgres; complicates RLS
Reuse ticket_statuses vs new enum New work_item_status enum Ticket statuses carry SLA/resolution semantics that don't apply
History audit Duplicate the trigger pattern from tickets Universal audit table would centralize unrelated RLS — fragile
Critical Files
supabase/migrations/026_create_projects_scrum.sql (new)
lib/supabase/queries/projects.ts, sprints.ts, work-items.ts, work-item-comments.ts (new)
lib/validations/project.ts, sprint.ts, work-item.ts (new)
types/database.types.ts (regenerate), types/project.types.ts, types/sprint.types.ts, types/work-item.types.ts (new)
app/(dashboard)/projects/\*\* (new tree)
components/projects/, components/sprints/, components/work-items/ (new folders)
components/layout/sidebar.tsx (1-line edit)
package.json — add @dnd-kit/core, @dnd-kit/sortable, fractional-indexing
Verification (manual E2E)
Apply migration 026 locally; confirm no get_advisors warnings.
Regenerate database.types.ts; npx tsc --noEmit clean; npm run lint clean.
As admin: /projects/new → create project Mobile App key MOB.
/projects/MOB/backlog → create 5 work items (story/bug/task mix). Confirm keys MOB-1…MOB-5.
/projects/MOB/sprints → create Sprint 1, set dates, start it. Confirm partial index blocks a second active sprint.
Drag 3 items from backlog into active sprint. Refresh — order persists.
Drag an item across status columns (Todo → In Progress → Done). Open dialog via ?item=MOB-3 — confirm history rows captured status changes.
Add a comment; reload; persistence + author avatar render correctly.
As support_member outside the project's team: /projects/MOB is forbidden (RLS enforced).
Complete the sprint — unfinished items return to backlog with sprint_id = NULL.
