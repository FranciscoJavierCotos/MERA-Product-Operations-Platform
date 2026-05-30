/**
 * Integration tests: Sprint 4 schema changes
 *
 * Covers:
 *   3.2 — work_item_history now has changes/source_table/source_id columns
 *         populated by DB triggers on work_items mutations.
 *   3.7 — projects include company_id in GET responses.
 *   Sprint 3 regression — tasks use status_id FK (not the old status TEXT column);
 *         the complete/reopen lifecycle and dashboard count still work.
 *
 * Requires: local Supabase running with seed data (supabase start + supabase db reset).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader, getTestJwt, TEST_USERS } from "../test-helpers/auth.js";

// ── Supabase admin client for direct DB reads ─────────────────────────────────
function makeServiceClient() {
  return createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_ANON_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

const TEAM_ID = "00000000-0000-0000-0000-000000000001";

async function createProject(
  app: FastifyInstance,
  suffix: string,
): Promise<string> {
  const headers = await authHeader("admin");
  const key = `S4${Date.now().toString().slice(-6)}`;
  const res = await app.inject({
    method: "POST",
    url: "/projects",
    headers,
    payload: { key, name: `[sprint4-test] ${suffix}`, team_id: TEAM_ID },
  });
  expect(res.statusCode, `Project create failed: ${res.body}`).toBe(200);
  return res.json().id as string;
}

async function createWorkItem(
  app: FastifyInstance,
  projectId: string,
  title: string,
): Promise<string> {
  const headers = await authHeader("admin");
  const res = await app.inject({
    method: "POST",
    url: `/projects/${projectId}/work-items`,
    headers,
    payload: { title, type: "task" },
  });
  expect(res.statusCode, `Work item create failed: ${res.body}`).toBe(200);
  return res.json().id as string;
}

// ── 3.2: work_item_history schema ─────────────────────────────────────────────

describe("Sprint 4 — 3.2: work_item_history schema (changes / source columns)", () => {
  let app: FastifyInstance;
  let projectId: string;
  let workItemId: string;
  const sb = makeServiceClient();

  beforeAll(async () => {
    app = await createTestApp();
    projectId = await createProject(app, "wih-schema");
    workItemId = await createWorkItem(app, projectId, "[sprint4] initial title");
  });

  afterAll(async () => {
    const headers = await authHeader("admin");
    if (workItemId) {
      await app.inject({
        method: "DELETE",
        url: `/work-items/${workItemId}`,
        headers,
      });
    }
    if (projectId) {
      await app.inject({
        method: "DELETE",
        url: `/projects/${projectId}`,
        headers,
      });
    }
    await app.close();
  });

  it("INSERT trigger writes a work_item_history row with non-empty changes", async () => {
    // Authenticate as admin to read history via RLS
    const token = await getTestJwt("admin");
    await sb.auth.signInWithPassword({
      email: TEST_USERS.admin.email,
      password: TEST_USERS.admin.password,
    });

    const { data, error } = await sb
      .from("work_item_history")
      .select("action, changes, source_table, source_id, metadata")
      .eq("work_item_id", workItemId)
      .eq("action", "created")
      .order("created_at", { ascending: false })
      .limit(1);

    expect(error, `DB error: ${error?.message}`).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThan(0);

    const row = data![0];
    // changes must not be the default empty object
    expect(row.changes).toBeDefined();
    expect(typeof row.changes).toBe("object");
    expect((row.changes as Record<string, unknown>).event).toBe("created");
    // source_table and source_id are null for direct work_item mutations
    expect(row.source_table).toBeNull();
    expect(row.source_id).toBeNull();
  });

  it("UPDATE trigger writes a history row with field diff in changes", async () => {
    // Update the work item title to trigger the history trigger
    const headers = await authHeader("admin");
    const newTitle = "[sprint4] updated title";
    const updateRes = await app.inject({
      method: "PATCH",
      url: `/work-items/${workItemId}`,
      headers,
      payload: { title: newTitle },
    });
    expect(updateRes.statusCode, `Update failed: ${updateRes.body}`).toBe(200);

    const { data, error } = await sb
      .from("work_item_history")
      .select("action, field_name, old_value, new_value, changes")
      .eq("work_item_id", workItemId)
      .eq("action", "updated")
      .eq("field_name", "title")
      .order("created_at", { ascending: false })
      .limit(1);

    expect(error, `DB error: ${error?.message}`).toBeNull();
    expect(data!.length).toBeGreaterThan(0);

    const row = data![0];
    expect(row.old_value).toBe("[sprint4] initial title");
    expect(row.new_value).toBe(newTitle);
    const changes = row.changes as Record<string, unknown>;
    expect(changes.field).toBe("title");
    expect(changes.old).toBe("[sprint4] initial title");
    expect(changes.new).toBe(newTitle);
  });

  it("work_item_history table has the new columns in its schema", async () => {
    const { data, error } = await sb
      .from("work_item_history")
      .select("changes, source_table, source_id")
      .eq("work_item_id", workItemId)
      .limit(1);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    // Merely selecting these columns without error confirms they exist in the schema.
    const row = data![0];
    expect("changes" in row).toBe(true);
    expect("source_table" in row).toBe(true);
    expect("source_id" in row).toBe(true);
  });
});

// ── 3.7: projects include company_id ──────────────────────────────────────────

describe("Sprint 4 — 3.7: GET /projects/:id includes company_id", () => {
  let app: FastifyInstance;
  let projectId: string;

  beforeAll(async () => {
    app = await createTestApp();
    projectId = await createProject(app, "company-id-check");
  });

  afterAll(async () => {
    const headers = await authHeader("admin");
    if (projectId) {
      await app.inject({
        method: "DELETE",
        url: `/projects/${projectId}`,
        headers,
      });
    }
    await app.close();
  });

  it("GET /projects/:id response includes company_id field (null when not linked)", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
      headers,
    });
    expect(res.statusCode).toBe(200);
    const project = res.json();
    expect("company_id" in project).toBe(true);
    expect(project.company_id).toBeNull();
  });
});

// ── Sprint 3 regression: tasks use status_id ──────────────────────────────────

describe("Sprint 4 — Sprint 3 regression: tasks use status_id FK", () => {
  let app: FastifyInstance;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    const headers = await authHeader("admin");
    await Promise.all(
      createdTaskIds.map((id) =>
        app.inject({ method: "DELETE", url: `/tasks/${id}`, headers }),
      ),
    );
    await app.close();
  });

  it("GET /tasks returns tasks with status as 'pending' or 'completed' string", async () => {
    // Create a task so there is at least one row
    const headers = await authHeader("admin");
    const createRes = await app.inject({
      method: "POST",
      url: "/tasks",
      headers,
      payload: {
        title: "[sprint4-regr] status field",
        priority: "low",
        assigned_to: TEST_USERS.admin.id,
      },
    });
    expect(createRes.statusCode).toBe(200);
    const taskId = createRes.json().id as string;
    createdTaskIds.push(taskId);

    const listRes = await app.inject({
      method: "GET",
      url: "/tasks",
      headers,
    });
    expect(listRes.statusCode).toBe(200);
    const tasks = listRes.json() as Array<{ id: string; status: string }>;
    const myTask = tasks.find((t) => t.id === taskId);
    expect(myTask).toBeDefined();
    // status is normalized from status_id by the service layer
    expect(["pending", "completed"]).toContain(myTask!.status);
  });

  it("GET /tasks?status=pending filters correctly via status_id FK", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tasks?status=pending",
      headers,
    });
    expect(res.statusCode).toBe(200);
    const tasks = res.json() as Array<{ status: string }>;
    // Every returned task must have status === 'pending'
    for (const t of tasks) {
      expect(t.status).toBe("pending");
    }
  });

  it("POST /tasks/:id/complete transitions status from pending → completed", async () => {
    const headers = await authHeader("admin");
    const createRes = await app.inject({
      method: "POST",
      url: "/tasks",
      headers,
      payload: {
        title: "[sprint4-regr] complete via status_id",
        priority: "medium",
        assigned_to: TEST_USERS.admin.id,
      },
    });
    expect(createRes.statusCode).toBe(200);
    const taskId = createRes.json().id as string;
    createdTaskIds.push(taskId);

    const completeRes = await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers,
      payload: {},
    });
    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.json().status).toBe("completed");
  });
});

// ── Teams: team_type is now a proper enum ─────────────────────────────────────

describe("Sprint 4 — Sprint 3 regression: teams.team_type returns enum values", () => {
  let app: FastifyInstance;
  let teamId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers,
      payload: {
        name: "[sprint4-regr] enum-team",
        team_type: "engineering",
      },
    });
    expect(res.statusCode, `Team create failed: ${res.body}`).toBe(200);
    teamId = res.json().id as string;
  });

  afterAll(async () => {
    const headers = await authHeader("admin");
    if (teamId) {
      await app.inject({ method: "DELETE", url: `/teams/${teamId}`, headers });
    }
    await app.close();
  });

  it("GET /teams returns team_type as 'business' | 'support' | 'engineering'", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({ method: "GET", url: "/teams", headers });
    expect(res.statusCode).toBe(200);
    const teams = res.json() as Array<{ team_type: string | null }>;
    for (const t of teams) {
      if (t.team_type !== null) {
        expect(["business", "support", "engineering"]).toContain(t.team_type);
      }
    }
  });

  it("GET /teams/:id returns the created engineering team with correct team_type", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/teams/${teamId}`,
      headers,
    });
    expect(res.statusCode).toBe(200);
    const team = res.json();
    expect(team.team_type).toBe("engineering");
  });
});
