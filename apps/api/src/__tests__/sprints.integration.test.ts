/**
 * Integration tests: Sprint state machine
 *
 * Sprint status lifecycle: planned → active → completed
 *
 * DB constraints that affect transitions:
 *   - `sprint_status` enum limits values to ('planned','active','completed')
 *   - Partial UNIQUE INDEX `uniq_sprints_one_active_per_project` on
 *     (project_id) WHERE status = 'active' — only one active sprint per
 *     project at a time.
 *
 * Scenarios covered:
 *   1. POST /sprints/:id/start  — planned → active
 *   2. GET /projects/:id/sprints/active — returns the active sprint
 *   3. POST /sprints/:id/complete — active → completed; non-done items
 *      return to backlog (sprint_id = NULL)
 *   4. Starting a second sprint while one is already active → 500 (DB
 *      unique index violation)
 *   5. Listing sprints for a project reflects status changes
 *   6. Delete sprint moves its items back to backlog automatically
 *
 * Requires: local Supabase running (`supabase start`) with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader, TEST_USERS } from "../test-helpers/auth.js";

interface Sprint {
  id: string;
  project_id: string;
  name: string;
  status: "planned" | "active" | "completed";
  start_date: string | null;
  end_date: string | null;
}

interface WorkItem {
  id: string;
  sprint_id: string | null;
  status: string;
  title: string;
  rank: string;
}

const TEAM_ID = "00000000-0000-0000-0000-000000000001"; // seeded default team

describe("Sprint state machine", () => {
  let app: FastifyInstance;

  // Resources created during the suite — cleaned up in afterAll
  let projectId: string;
  const createdSprintIds: string[] = [];
  const createdWorkItemIds: string[] = [];

  /**
   * Create a project scoped to the default team so the admin user
   * (who is in that team) passes pm_can_write_project RLS.
   */
  async function createProject(suffix: string): Promise<string> {
    const headers = await authHeader("admin");
    const key = `TST${Date.now().toString().slice(-6)}${suffix.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers,
      payload: {
        key: key.slice(0, 10),
        name: `[test-sprint] ${suffix}`,
        team_id: TEAM_ID,
      },
    });
    expect(res.statusCode, `Project create failed: ${res.body}`).toBe(200);
    return res.json().id as string;
  }

  async function createSprint(
    projId: string,
    name: string,
    headers: Record<string, string>,
  ): Promise<Sprint> {
    const res = await app.inject({
      method: "POST",
      url: `/projects/${projId}/sprints`,
      headers,
      payload: { name },
    });
    expect(res.statusCode, `Sprint create failed: ${res.body}`).toBe(200);
    const sprint = res.json() as Sprint;
    createdSprintIds.push(sprint.id);
    return sprint;
  }

  async function createWorkItem(
    projId: string,
    opts: { sprintId?: string; status?: string; rank?: string },
    headers: Record<string, string>,
  ): Promise<WorkItem> {
    const res = await app.inject({
      method: "POST",
      url: "/work-items",
      headers,
      payload: {
        project_id: projId,
        sprint_id: opts.sprintId ?? null,
        title: `[test-wi] ${Date.now()}`,
        rank: opts.rank ?? "m00000",
        type: "story",
        ...(opts.status ? { status: opts.status } : {}),
      },
    });
    expect(res.statusCode, `WorkItem create failed: ${res.body}`).toBe(200);
    const item = res.json() as WorkItem;
    createdWorkItemIds.push(item.id);
    return item;
  }

  beforeAll(async () => {
    app = await createTestApp();
    const headers = await authHeader("admin");
    projectId = await createProject("suite");

    // Verify the project is visible before any sprint tests run
    const listRes = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
      headers,
    });
    expect(listRes.statusCode).toBe(200);
  });

  afterAll(async () => {
    const headers = await authHeader("admin");
    // Work items first (sprints cascades items back to backlog, not delete them)
    await Promise.all(
      createdWorkItemIds.map((id) =>
        app.inject({ method: "DELETE", url: `/work-items/${id}`, headers }),
      ),
    );
    // Sprints
    await Promise.all(
      createdSprintIds.map((id) =>
        app.inject({ method: "DELETE", url: `/sprints/${id}`, headers }),
      ),
    );
    // Project
    if (projectId) {
      await app.inject({ method: "DELETE", url: `/projects/${projectId}`, headers });
    }
    await app.close();
  });

  // ── 1. Start sprint: planned → active ─────────────────────────────────────

  it("POST /sprints/:id/start transitions a planned sprint to active", async () => {
    const headers = await authHeader("admin");
    const sprint = await createSprint(projectId, "Sprint 1", headers);
    expect(sprint.status).toBe("planned");

    const startRes = await app.inject({
      method: "POST",
      url: `/sprints/${sprint.id}/start`,
      headers,
    });
    expect(startRes.statusCode).toBe(200);
    const updated = startRes.json() as Sprint;
    expect(updated.status).toBe("active");
    expect(updated.id).toBe(sprint.id);
  });

  // ── 2. Active sprint reflected in /sprints/active ─────────────────────────

  it("GET /projects/:id/sprints/active returns the started sprint", async () => {
    const headers = await authHeader("admin");
    // Create + start a new sprint (the previous test may have already started one
    // so use a second project to avoid the unique-index conflict)
    const proj2 = await createProject("active-check");
    const sprint = await createSprint(proj2, "Active Sprint", headers);

    await app.inject({
      method: "POST",
      url: `/sprints/${sprint.id}/start`,
      headers,
    });

    const activeRes = await app.inject({
      method: "GET",
      url: `/projects/${proj2}/sprints/active`,
      headers,
    });
    expect(activeRes.statusCode).toBe(200);
    const active = activeRes.json() as Sprint | null;
    expect(active).not.toBeNull();
    expect(active!.id).toBe(sprint.id);
    expect(active!.status).toBe("active");

    // Clean up project 2
    await app.inject({ method: "DELETE", url: `/sprints/${sprint.id}`, headers });
    await app.inject({ method: "DELETE", url: `/projects/${proj2}`, headers });
  });

  // ── 3. Complete sprint: active → completed, non-done items → backlog ──────

  it("POST /sprints/:id/complete transitions to completed and returns non-done items to backlog", async () => {
    const headers = await authHeader("admin");
    const proj = await createProject("complete");
    const sprint = await createSprint(proj, "Sprint to Complete", headers);

    // Start the sprint
    await app.inject({ method: "POST", url: `/sprints/${sprint.id}/start`, headers });

    // Create two items in the sprint: one 'done', one 'in_progress'
    const doneItem = await createWorkItem(
      proj,
      { sprintId: sprint.id, status: "done", rank: "a00000" },
      headers,
    );
    const inProgressItem = await createWorkItem(
      proj,
      { sprintId: sprint.id, status: "in_progress", rank: "b00000" },
      headers,
    );

    // Complete the sprint
    const completeRes = await app.inject({
      method: "POST",
      url: `/sprints/${sprint.id}/complete`,
      headers,
    });
    expect(completeRes.statusCode).toBe(200);
    const completed = completeRes.json() as Sprint;
    expect(completed.status).toBe("completed");

    // Verify: non-done item is now in backlog (sprint_id = null)
    const inProgressGet = await app.inject({
      method: "GET",
      url: `/work-items/${inProgressItem.id}`,
      headers,
    });
    expect(inProgressGet.statusCode).toBe(200);
    expect(inProgressGet.json().sprint_id).toBeNull();

    // Verify: done item is still assigned to the (now completed) sprint
    const doneGet = await app.inject({
      method: "GET",
      url: `/work-items/${doneItem.id}`,
      headers,
    });
    expect(doneGet.statusCode).toBe(200);
    expect(doneGet.json().sprint_id).toBe(sprint.id);

    // Verify backlog for the project includes the non-done item
    const backlogRes = await app.inject({
      method: "GET",
      url: `/work-items/backlog?projectId=${proj}`,
      headers,
    });
    expect(backlogRes.statusCode).toBe(200);
    const backlogIds = (backlogRes.json() as WorkItem[]).map((i) => i.id);
    expect(backlogIds).toContain(inProgressItem.id);

    // Clean up
    await app.inject({ method: "DELETE", url: `/work-items/${doneItem.id}`, headers });
    await app.inject({ method: "DELETE", url: `/work-items/${inProgressItem.id}`, headers });
    await app.inject({ method: "DELETE", url: `/sprints/${sprint.id}`, headers });
    await app.inject({ method: "DELETE", url: `/projects/${proj}`, headers });
  });

  // ── 4. Illegal transition: two active sprints in same project ─────────────

  it("starting a second sprint while one is already active returns an error", async () => {
    const headers = await authHeader("admin");
    const proj = await createProject("two-active");

    const sprint1 = await createSprint(proj, "First Sprint", headers);
    const sprint2 = await createSprint(proj, "Second Sprint", headers);

    // Start first sprint — should succeed
    const start1 = await app.inject({
      method: "POST",
      url: `/sprints/${sprint1.id}/start`,
      headers,
    });
    expect(start1.statusCode).toBe(200);

    // Start second sprint — must fail (unique index: only one active per project)
    const start2 = await app.inject({
      method: "POST",
      url: `/sprints/${sprint2.id}/start`,
      headers,
    });
    // The DB unique index returns a Postgres error — the API propagates it as 5xx
    expect(start2.statusCode).toBeGreaterThanOrEqual(400);

    // Verify sprint2 is still planned
    const sprint2Get = await app.inject({
      method: "GET",
      url: `/sprints/${sprint2.id}`,
      headers,
    });
    expect(sprint2Get.json().status).toBe("planned");

    // Clean up
    await app.inject({ method: "DELETE", url: `/sprints/${sprint1.id}`, headers });
    await app.inject({ method: "DELETE", url: `/sprints/${sprint2.id}`, headers });
    await app.inject({ method: "DELETE", url: `/projects/${proj}`, headers });
  });

  // ── 5. Listing sprints reflects status changes ────────────────────────────

  it("GET /projects/:id/sprints lists sprints with correct statuses after start + complete", async () => {
    const headers = await authHeader("admin");
    const proj = await createProject("list-check");

    const sprint = await createSprint(proj, "List Sprint", headers);

    // Initially planned
    let listRes = await app.inject({
      method: "GET",
      url: `/projects/${proj}/sprints`,
      headers,
    });
    expect(listRes.statusCode).toBe(200);
    let sprintRow = (listRes.json() as Sprint[]).find((s) => s.id === sprint.id);
    expect(sprintRow?.status).toBe("planned");

    // After start
    await app.inject({ method: "POST", url: `/sprints/${sprint.id}/start`, headers });
    listRes = await app.inject({
      method: "GET",
      url: `/projects/${proj}/sprints`,
      headers,
    });
    sprintRow = (listRes.json() as Sprint[]).find((s) => s.id === sprint.id);
    expect(sprintRow?.status).toBe("active");

    // After complete
    await app.inject({ method: "POST", url: `/sprints/${sprint.id}/complete`, headers });
    listRes = await app.inject({
      method: "GET",
      url: `/projects/${proj}/sprints`,
      headers,
    });
    sprintRow = (listRes.json() as Sprint[]).find((s) => s.id === sprint.id);
    expect(sprintRow?.status).toBe("completed");

    // Clean up
    await app.inject({ method: "DELETE", url: `/sprints/${sprint.id}`, headers });
    await app.inject({ method: "DELETE", url: `/projects/${proj}`, headers });
  });

  // ── 6. Delete sprint returns items to backlog ─────────────────────────────

  it("DELETE /sprints/:id moves all items back to backlog before deletion", async () => {
    const headers = await authHeader("admin");
    const proj = await createProject("delete-sprint");
    const sprint = await createSprint(proj, "Sprint to Delete", headers);

    // Attach a work item to the sprint
    const item = await createWorkItem(
      proj,
      { sprintId: sprint.id, rank: "a00000" },
      headers,
    );

    // Delete the sprint
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/sprints/${sprint.id}`,
      headers,
    });
    expect(deleteRes.statusCode).toBe(200);

    // Item should now be in backlog
    const itemGet = await app.inject({
      method: "GET",
      url: `/work-items/${item.id}`,
      headers,
    });
    expect(itemGet.statusCode).toBe(200);
    expect(itemGet.json().sprint_id).toBeNull();

    // Clean up
    await app.inject({ method: "DELETE", url: `/work-items/${item.id}`, headers });
    await app.inject({ method: "DELETE", url: `/projects/${proj}`, headers });
    // Sprint is already deleted — remove from tracking array to avoid double-delete
    const idx = createdSprintIds.indexOf(sprint.id);
    if (idx !== -1) createdSprintIds.splice(idx, 1);
  });

  // ── 7. Non-uuid sprint id returns 400 ────────────────────────────────────

  it("POST /sprints/not-a-uuid/start → 400", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/sprints/not-a-uuid/start",
      headers,
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /sprints/not-a-uuid/complete → 400", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/sprints/not-a-uuid/complete",
      headers,
    });
    expect(res.statusCode).toBe(400);
  });
});
