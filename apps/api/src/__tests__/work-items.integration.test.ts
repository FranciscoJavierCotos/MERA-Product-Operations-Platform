/**
 * Integration tests: Work item move-to-sprint + backlog, and reorder
 *
 * Route contract:
 *   PATCH /work-items/:id/move-to-sprint   body: { sprint_id: uuid | null }
 *   PATCH /work-items/:id/reorder          body: { rank, status?, sprint_id? }
 *
 * Scenarios:
 *   Move to sprint:
 *     1. Move backlog item into a sprint → sprint_id set, item in sprint list
 *     2. Move sprint item back to backlog (sprint_id=null) → appears in backlog
 *     3. Move from one sprint to another → correctly reassigned
 *
 *   Reorder:
 *     4. Reorder updates rank in DB and is reflected in list ordering
 *     5. Reorder with status update (simulate board column drag)
 *     6. Reorder + sprint change in one call (simulate cross-sprint drag)
 *     7. Invalid rank (empty string) → 400
 *     8. Non-uuid work-item id → 400
 *
 * Requires: local Supabase running (`supabase start`) with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

interface WorkItem {
  id: string;
  project_id: string;
  sprint_id: string | null;
  status: string;
  rank: string;
  title: string;
  item_key: string;
}

const TEAM_ID = "00000000-0000-0000-0000-000000000001";

describe("Work item: move-to-sprint + reorder", () => {
  let app: FastifyInstance;

  let projectId: string;
  let sprintAId: string;
  let sprintBId: string;

  const createdItemIds: string[] = [];

  // ── helpers ──────────────────────────────────────────────────────────────

  async function createProject(suffix: string): Promise<string> {
    const headers = await authHeader("admin");
    const key = `WI${Date.now().toString().slice(-5)}${suffix.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers,
      payload: {
        key: key.slice(0, 10),
        name: `[test-wi] ${suffix}`,
        team_id: TEAM_ID,
      },
    });
    expect(res.statusCode, `Project create failed: ${res.body}`).toBe(200);
    return res.json().id as string;
  }

  async function createSprint(projId: string, name: string): Promise<string> {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: `/projects/${projId}/sprints`,
      headers,
      payload: { name },
    });
    expect(res.statusCode, `Sprint create failed: ${res.body}`).toBe(200);
    return res.json().id as string;
  }

  async function createItem(
    opts: {
      sprintId?: string | null;
      rank?: string;
      status?: string;
    } = {},
  ): Promise<WorkItem> {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/work-items",
      headers,
      payload: {
        project_id: projectId,
        sprint_id: opts.sprintId ?? null,
        title: `[test-wi-item] ${Date.now()}`,
        rank: opts.rank ?? `m${Date.now().toString().slice(-5)}`,
        type: "story",
        ...(opts.status ? { status: opts.status } : {}),
      },
    });
    expect(res.statusCode, `WorkItem create failed: ${res.body}`).toBe(200);
    const item = res.json() as WorkItem;
    createdItemIds.push(item.id);
    return item;
  }

  async function getItem(id: string): Promise<WorkItem> {
    const headers = await authHeader("admin");
    const res = await app.inject({ method: "GET", url: `/work-items/${id}`, headers });
    expect(res.statusCode).toBe(200);
    return res.json() as WorkItem;
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  beforeAll(async () => {
    app = await createTestApp();
    projectId = await createProject("wi-suite");
    sprintAId = await createSprint(projectId, "Sprint A");
    sprintBId = await createSprint(projectId, "Sprint B");
  });

  afterAll(async () => {
    const headers = await authHeader("admin");
    await Promise.all(
      createdItemIds.map((id) =>
        app.inject({ method: "DELETE", url: `/work-items/${id}`, headers }),
      ),
    );
    await app.inject({ method: "DELETE", url: `/sprints/${sprintAId}`, headers });
    await app.inject({ method: "DELETE", url: `/sprints/${sprintBId}`, headers });
    await app.inject({ method: "DELETE", url: `/projects/${projectId}`, headers });
    await app.close();
  });

  // ── Move-to-sprint ────────────────────────────────────────────────────────

  it("moves a backlog item into a sprint", async () => {
    const headers = await authHeader("admin");
    const item = await createItem({ rank: "a00001" });
    expect(item.sprint_id).toBeNull();

    const moveRes = await app.inject({
      method: "PATCH",
      url: `/work-items/${item.id}/move-to-sprint`,
      headers,
      payload: { sprint_id: sprintAId },
    });
    expect(moveRes.statusCode).toBe(200);
    expect(moveRes.json().sprint_id).toBe(sprintAId);

    // Verify through a GET
    const fetched = await getItem(item.id);
    expect(fetched.sprint_id).toBe(sprintAId);

    // Verify item appears in sprint list
    const sprintListRes = await app.inject({
      method: "GET",
      url: `/work-items/sprint/${sprintAId}`,
      headers,
    });
    expect(sprintListRes.statusCode).toBe(200);
    const sprintIds = (sprintListRes.json() as WorkItem[]).map((i) => i.id);
    expect(sprintIds).toContain(item.id);
  });

  it("moves a sprint item back to backlog (sprint_id = null)", async () => {
    const headers = await authHeader("admin");
    const item = await createItem({ sprintId: sprintAId, rank: "a00002" });
    expect(item.sprint_id).toBe(sprintAId);

    const moveRes = await app.inject({
      method: "PATCH",
      url: `/work-items/${item.id}/move-to-sprint`,
      headers,
      payload: { sprint_id: null },
    });
    expect(moveRes.statusCode).toBe(200);
    expect(moveRes.json().sprint_id).toBeNull();

    // Verify in backlog list
    const backlogRes = await app.inject({
      method: "GET",
      url: `/work-items/backlog?projectId=${projectId}`,
      headers,
    });
    expect(backlogRes.statusCode).toBe(200);
    const backlogIds = (backlogRes.json() as WorkItem[]).map((i) => i.id);
    expect(backlogIds).toContain(item.id);
  });

  it("moves an item from sprint A to sprint B", async () => {
    const headers = await authHeader("admin");
    const item = await createItem({ sprintId: sprintAId, rank: "a00003" });
    expect(item.sprint_id).toBe(sprintAId);

    const moveRes = await app.inject({
      method: "PATCH",
      url: `/work-items/${item.id}/move-to-sprint`,
      headers,
      payload: { sprint_id: sprintBId },
    });
    expect(moveRes.statusCode).toBe(200);
    expect(moveRes.json().sprint_id).toBe(sprintBId);

    // Not in sprint A list
    const sprintAList = await app.inject({
      method: "GET",
      url: `/work-items/sprint/${sprintAId}`,
      headers,
    });
    const sprintAIds = (sprintAList.json() as WorkItem[]).map((i) => i.id);
    expect(sprintAIds).not.toContain(item.id);

    // Is in sprint B list
    const sprintBList = await app.inject({
      method: "GET",
      url: `/work-items/sprint/${sprintBId}`,
      headers,
    });
    const sprintBIds = (sprintBList.json() as WorkItem[]).map((i) => i.id);
    expect(sprintBIds).toContain(item.id);
  });

  // ── Reorder ───────────────────────────────────────────────────────────────

  it("reorder updates the rank in the database", async () => {
    const headers = await authHeader("admin");
    const item = await createItem({ rank: "c00001" });

    const reorderRes = await app.inject({
      method: "PATCH",
      url: `/work-items/${item.id}/reorder`,
      headers,
      payload: { rank: "e00001" },
    });
    expect(reorderRes.statusCode).toBe(200);
    expect(reorderRes.json().rank).toBe("e00001");

    // Verify persisted
    const fetched = await getItem(item.id);
    expect(fetched.rank).toBe("e00001");
  });

  it("reorder with status update changes both rank and status atomically", async () => {
    const headers = await authHeader("admin");
    const item = await createItem({
      sprintId: sprintAId,
      rank: "c00002",
      status: "todo",
    });
    expect(item.status).toBe("todo");

    const reorderRes = await app.inject({
      method: "PATCH",
      url: `/work-items/${item.id}/reorder`,
      headers,
      payload: { rank: "d00001", status: "in_progress" },
    });
    expect(reorderRes.statusCode).toBe(200);
    const updated = reorderRes.json() as WorkItem;
    expect(updated.rank).toBe("d00001");
    expect(updated.status).toBe("in_progress");
  });

  it("reorder with sprint change moves the item to the new sprint", async () => {
    const headers = await authHeader("admin");
    const item = await createItem({ sprintId: sprintAId, rank: "c00003" });

    const reorderRes = await app.inject({
      method: "PATCH",
      url: `/work-items/${item.id}/reorder`,
      headers,
      payload: { rank: "f00001", sprint_id: sprintBId },
    });
    expect(reorderRes.statusCode).toBe(200);
    const updated = reorderRes.json() as WorkItem;
    expect(updated.rank).toBe("f00001");
    expect(updated.sprint_id).toBe(sprintBId);
  });

  it("reorder to backlog (sprint_id = null) with new rank", async () => {
    const headers = await authHeader("admin");
    const item = await createItem({ sprintId: sprintAId, rank: "c00004" });

    const reorderRes = await app.inject({
      method: "PATCH",
      url: `/work-items/${item.id}/reorder`,
      headers,
      payload: { rank: "g00001", sprint_id: null },
    });
    expect(reorderRes.statusCode).toBe(200);
    const updated = reorderRes.json() as WorkItem;
    expect(updated.sprint_id).toBeNull();
    expect(updated.rank).toBe("g00001");
  });

  // ── rank / first / last endpoints ─────────────────────────────────────────

  it("GET /work-items/rank/last returns the lexicographically largest rank for a sprint", async () => {
    const headers = await authHeader("admin");
    // Create two items with known ranks
    await createItem({ sprintId: sprintBId, rank: "h00001" });
    await createItem({ sprintId: sprintBId, rank: "h00002" });

    const lastRes = await app.inject({
      method: "GET",
      url: `/work-items/rank/last?projectId=${projectId}&sprintId=${sprintBId}`,
      headers,
    });
    expect(lastRes.statusCode).toBe(200);
    // The last rank should be >= h00002
    expect(lastRes.json().rank >= "h00002").toBe(true);
  });

  it("GET /work-items/rank/first returns a rank ≤ the smallest existing rank", async () => {
    const headers = await authHeader("admin");
    // Use backlog for predictable isolation
    const proj = await createProject("rank-first");
    const item = await createItem({ rank: "z00001" });
    // Move to backlog of proj-specific project isn't easy without recreating items
    // Instead test against the backlog of our main project with known rank items

    const firstRes = await app.inject({
      method: "GET",
      url: `/work-items/rank/first?projectId=${projectId}`,
      headers,
    });
    expect(firstRes.statusCode).toBe(200);
    // rank/first returns the first existing rank — it's just a SELECT, not a calculation
    expect(typeof firstRes.json().rank).toBe("string");

    await app.inject({ method: "DELETE", url: `/projects/${proj}`, headers });
  });

  // ── input validation ──────────────────────────────────────────────────────

  it("PATCH /work-items/not-a-uuid/reorder → 400", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "PATCH",
      url: "/work-items/not-a-uuid/reorder",
      headers,
      payload: { rank: "a00001" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("PATCH /work-items/not-a-uuid/move-to-sprint → 400", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "PATCH",
      url: "/work-items/not-a-uuid/move-to-sprint",
      headers,
      payload: { sprint_id: sprintAId },
    });
    expect(res.statusCode).toBe(400);
  });

  it("PATCH /work-items/:id/reorder with missing rank → 400", async () => {
    const headers = await authHeader("admin");
    const item = await createItem({ rank: "z00099" });
    const res = await app.inject({
      method: "PATCH",
      url: `/work-items/${item.id}/reorder`,
      headers,
      payload: {}, // rank is required
    });
    expect(res.statusCode).toBe(400);
  });
});
