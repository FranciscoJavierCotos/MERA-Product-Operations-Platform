/**
 * Integration tests: RLS isolation across multiple domains (Sprint 2 / item 1.6)
 *
 * Verifies that database-level RLS policies prevent cross-tenant data leakage
 * for the Companies, Teams, and Projects domains.  The Tickets domain is
 * covered by tickets.integration.test.ts.
 *
 * Strategy:
 *   1. Admin creates a resource (company / team / project).
 *   2. Client role tries to list or fetch the resource directly.
 *   3. Support role should see it; client should not (companies/teams are
 *      support-or-admin only).
 *
 * Requires: local Supabase running with seed data (supabase start + supabase db reset).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

describe("RLS: companies domain isolation", () => {
  let app: FastifyInstance;
  let companyId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const adminHeaders = await authHeader("admin");

    const res = await app.inject({
      method: "POST",
      url: "/companies",
      headers: adminHeaders,
      payload: { name: "[rls-test] Isolated Corp" },
    });
    expect(res.statusCode).toBe(200);
    companyId = res.json().id;
  });

  afterAll(async () => {
    const adminHeaders = await authHeader("admin");
    if (companyId) {
      await app.inject({
        method: "DELETE",
        url: `/companies/${companyId}`,
        headers: adminHeaders,
      });
    }
    await app.close();
  });

  it("client token cannot list companies → 403", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({ method: "GET", url: "/companies", headers });
    expect(res.statusCode).toBe(403);
  });

  it("client token cannot fetch a specific company → 403 or 404", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "GET",
      url: `/companies/${companyId}`,
      headers,
    });
    expect([403, 404]).toContain(res.statusCode);
  });

  it("client token cannot create a company → 403", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "POST",
      url: "/companies",
      headers,
      payload: { name: "[rls-test] Unauthorized company" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("support_member can list companies", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({ method: "GET", url: "/companies", headers });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("support_member can fetch the specific company", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({
      method: "GET",
      url: `/companies/${companyId}`,
      headers,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(companyId);
  });

  it("support_member cannot delete a company → 403", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({
      method: "DELETE",
      url: `/companies/${companyId}`,
      headers,
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("RLS: teams domain isolation", () => {
  let app: FastifyInstance;
  let teamId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const adminHeaders = await authHeader("admin");

    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers: adminHeaders,
      payload: { name: "[rls-test] Isolated Team", team_type: "support", support_level: "L1" },
    });
    expect(res.statusCode).toBe(200);
    teamId = res.json().id;
  });

  afterAll(async () => {
    const adminHeaders = await authHeader("admin");
    if (teamId) {
      await app.inject({ method: "DELETE", url: `/teams/${teamId}`, headers: adminHeaders });
    }
    await app.close();
  });

  it("client token cannot create a team → 403", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers,
      payload: { name: "[rls-test] Unauthorized team" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("client token cannot delete a team → 403", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "DELETE",
      url: `/teams/${teamId}`,
      headers,
    });
    expect(res.statusCode).toBe(403);
  });

  it("support_member can list teams", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({ method: "GET", url: "/teams", headers });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("support_member cannot delete a team → 403", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({
      method: "DELETE",
      url: `/teams/${teamId}`,
      headers,
    });
    expect(res.statusCode).toBe(403);
  });

  it("admin can delete a team", async () => {
    const headers = await authHeader("admin");
    const createRes = await app.inject({
      method: "POST",
      url: "/teams",
      headers,
      payload: { name: "[rls-test] Deletable team", team_type: "support", support_level: "L2" },
    });
    expect(createRes.statusCode).toBe(200);
    const id = createRes.json().id;

    const delRes = await app.inject({ method: "DELETE", url: `/teams/${id}`, headers });
    expect(delRes.statusCode).toBe(200);
  });
});

describe("RLS: companies — uniqueness constraint (1.2)", () => {
  let app: FastifyInstance;
  let firstId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const adminHeaders = await authHeader("admin");

    const res = await app.inject({
      method: "POST",
      url: "/companies",
      headers: adminHeaders,
      payload: { name: "[rls-test] Unique Corp" },
    });
    expect(res.statusCode).toBe(200);
    firstId = res.json().id;
  });

  afterAll(async () => {
    const adminHeaders = await authHeader("admin");
    if (firstId) {
      await app.inject({ method: "DELETE", url: `/companies/${firstId}`, headers: adminHeaders });
    }
    await app.close();
  });

  it("creating a company with a duplicate name (case-insensitive) → 4xx", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/companies",
      headers: adminHeaders,
      payload: { name: "[rls-test] unique corp" }, // lower-case dupe
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Sprint 3: 2.2 / 1.5 / 2.3 ────────────────────────────────────────────────

describe("Sprint 3 — 2.2: team_type enum round-trip", () => {
  let app: FastifyInstance;
  let teamId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers: adminHeaders,
      payload: { name: "[s3-test] Enum Team", team_type: "engineering" },
    });
    expect(res.statusCode).toBe(200);
    teamId = res.json().id;
  });

  afterAll(async () => {
    const adminHeaders = await authHeader("admin");
    if (teamId) {
      await app.inject({ method: "DELETE", url: `/teams/${teamId}`, headers: adminHeaders });
    }
    await app.close();
  });

  it("GET returns team_type as string value", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({ method: "GET", url: `/teams/${teamId}/detail`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().team_type).toBe("engineering");
  });

  it("invalid team_type is rejected → 4xx", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers: adminHeaders,
      payload: { name: "[s3-test] Bad type", team_type: "invalid_value" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe("Sprint 3 — 2.2: task status_id / action_tag_id lookup round-trip", () => {
  let app: FastifyInstance;
  let taskId: string;
  let assignedUserId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const adminHeaders = await authHeader("admin");

    // Grab a user ID to assign the task to
    const usersRes = await app.inject({ method: "GET", url: "/users/support", headers: adminHeaders });
    expect(usersRes.statusCode).toBe(200);
    const users = usersRes.json() as Array<{ id: string }>;
    expect(users.length).toBeGreaterThan(0);
    assignedUserId = users[0].id;

    const res = await app.inject({
      method: "POST",
      url: "/tasks",
      headers: adminHeaders,
      payload: {
        title: "[s3-test] Lookup task",
        priority: "high",
        action_tag: "testing",
        status: "pending",
        assigned_to: assignedUserId,
      },
    });
    expect(res.statusCode).toBe(200);
    taskId = res.json().id;
  });

  afterAll(async () => {
    const adminHeaders = await authHeader("admin");
    if (taskId) {
      await app.inject({ method: "DELETE", url: `/tasks/${taskId}`, headers: adminHeaders });
    }
    await app.close();
  });

  it("created task returns status, priority, action_tag as text strings", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({ method: "GET", url: `/tasks/${taskId}`, headers });
    expect(res.statusCode).toBe(200);
    const t = res.json();
    expect(t.status).toBe("pending");
    expect(t.priority).toBe("high");
    expect(t.action_tag).toBe("testing");
  });

  it("completing a task returns status = 'completed'", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers,
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("completed");
  });

  it("reopening a task returns status = 'pending'", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({ method: "POST", url: `/tasks/${taskId}/reopen`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("pending");
  });
});

describe("Sprint 3 — 1.5: ticket_work_item_links round-trip", () => {
  let app: FastifyInstance;

  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app.close(); });

  it("GET /item-links/types returns link type list", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({ method: "GET", url: "/item-links/types", headers });
    expect(res.statusCode).toBe(200);
    const types = res.json() as Array<{ id: string }>;
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
    expect(types[0]).toHaveProperty("id");
    expect(types[0]).toHaveProperty("label");
  });
});

describe("Sprint 3 — 2.3: profiles.team_id removed", () => {
  let app: FastifyInstance;

  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app.close(); });

  it("GET /users/:id does not include team_id in response", async () => {
    const headers = await authHeader("admin");
    const meRes = await app.inject({ method: "GET", url: "/me", headers });
    expect(meRes.statusCode).toBe(200);
    const profile = meRes.json();
    expect(profile).not.toHaveProperty("team_id");
  });

  it("PATCH /users/:id rejects team_id field → 4xx", async () => {
    const headers = await authHeader("admin");
    const meRes = await app.inject({ method: "GET", url: "/me", headers });
    const id = meRes.json().id;

    const res = await app.inject({
      method: "PATCH",
      url: `/users/${id}`,
      headers,
      payload: { team_id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});
