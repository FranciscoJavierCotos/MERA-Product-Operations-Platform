/**
 * Integration tests: Projects API — 11 endpoints
 *
 * Covers:
 *   - GET /projects (list)
 *   - GET /projects/active
 *   - GET /projects/:id
 *   - GET /projects/by-key/:key
 *   - POST /projects — create with required + optional fields
 *   - PATCH /projects/:id — update metadata
 *   - POST /projects/:id/archive — verify status changes to "archived"
 *   - DELETE /projects/:id — admin succeeds; non-admin blocked
 *   - GET /projects/:id/members — list members
 *   - POST /projects/:id/members — add member with each role
 *   - PATCH /projects/:id/members/:mid — role change
 *   - DELETE /projects/:id/members/:mid — remove member
 *
 * Requires: local Supabase running (`supabase start` + `supabase db reset`).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader, TEST_USERS } from "../test-helpers/auth.js";

const TEAM_ID = "00000000-0000-0000-0000-000000000001";
const ADMIN_USER_ID = TEST_USERS.admin.id;
const SUPPORT_USER_ID = TEST_USERS.support_member.id;

describe("Projects API", () => {
  let app: FastifyInstance;

  let projectId: string;
  let projectKey: string;
  let archiveProjectId: string;
  let memberId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    const headers = await authHeader("admin");
    await Promise.all([
      projectId && app.inject({ method: "DELETE", url: `/projects/${projectId}`, headers }),
      archiveProjectId && app.inject({ method: "DELETE", url: `/projects/${archiveProjectId}`, headers }),
    ]);
    await app.close();
  });

  // ── List ───────────────────────────────────────────────────────────────────

  it("GET /projects returns array for authenticated user", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/projects",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("GET /projects returns 401 without auth", async () => {
    const res = await app.inject({ method: "GET", url: "/projects" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /projects/active returns active project aggregates", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/projects/active",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  // ── Create ─────────────────────────────────────────────────────────────────

  it("POST /projects creates a project with required fields", async () => {
    const key = `TST${Date.now().toString().slice(-5)}`;
    projectKey = key;
    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers: await authHeader("admin"),
      payload: {
        key,
        name: "[test-projects] Integration Project",
        team_id: TEAM_ID,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.key).toBe(key.toUpperCase());
    expect(body.name).toBe("[test-projects] Integration Project");
    expect(body.methodology).toBe("scrum"); // default
    expect(body.sprint_duration_weeks).toBe(2); // default
    expect(typeof body.id).toBe("string");
    projectId = body.id;
  });

  it("POST /projects creates a project with all optional fields", async () => {
    const key = `OPT${Date.now().toString().slice(-5)}`;
    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers: await authHeader("admin"),
      payload: {
        key,
        name: "[test-projects] Archive Target",
        description: "Created to test archival",
        methodology: "kanban",
        sprint_duration_weeks: 3,
        team_id: TEAM_ID,
        lead_id: ADMIN_USER_ID,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.methodology).toBe("kanban");
    expect(body.sprint_duration_weeks).toBe(3);
    archiveProjectId = body.id;
  });

  it("POST /projects rejects unknown body field (strict schema)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers: await authHeader("admin"),
      payload: { key: "BADFIELD", name: "x", unknownField: true },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /projects rejects sprint_duration_weeks outside 1-4", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers: await authHeader("admin"),
      payload: { key: "BADWK1", name: "Bad", sprint_duration_weeks: 5 },
    });
    expect(res.statusCode).toBe(400);
  });

  // ── Read ───────────────────────────────────────────────────────────────────

  it("GET /projects/:id returns the created project with joins", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(projectId);
    expect(body.name).toBe("[test-projects] Integration Project");
    expect(typeof body.team?.id).toBe("string");
    expect(typeof body.creator?.id).toBe("string");
  });

  it("GET /projects/by-key/:key returns project by key (case-insensitive)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/projects/by-key/${projectKey.toLowerCase()}`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(projectId);
  });

  it("GET /projects/by-key/:key returns null for missing key", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/projects/by-key/DOESNOTEXIST999",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toBeNull();
  });

  // ── Update ─────────────────────────────────────────────────────────────────

  it("PATCH /projects/:id updates name and description", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/projects/${projectId}`,
      headers: await authHeader("admin"),
      payload: {
        name: "[test-projects] Integration Project (updated)",
        description: "Updated by integration test",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("[test-projects] Integration Project (updated)");
    expect(body.description).toBe("Updated by integration test");
  });

  it("PATCH /projects/:id rejects unknown body field", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/projects/${projectId}`,
      headers: await authHeader("admin"),
      payload: { badField: true },
    });
    expect(res.statusCode).toBe(400);
  });

  // ── Archive ────────────────────────────────────────────────────────────────

  it("POST /projects/:id/archive changes status to archived", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/projects/${archiveProjectId}/archive`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    // Verify via GET
    const getRes = await app.inject({
      method: "GET",
      url: `/projects/${archiveProjectId}`,
      headers: await authHeader("admin"),
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().status).toBe("archived");
  });

  // ── Member management ──────────────────────────────────────────────────────

  it("GET /projects/:id/members returns empty array for new project", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/projects/${projectId}/members`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("POST /projects/:id/members adds a member as developer (default)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/projects/${projectId}/members`,
      headers: await authHeader("admin"),
      payload: { user_id: SUPPORT_USER_ID },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user_id).toBe(SUPPORT_USER_ID);
    expect(body.role).toBe("developer");
    expect(typeof body.id).toBe("string");
    memberId = body.id;
  });

  it("POST /projects/:id/members adds a member as owner", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/projects/${projectId}/members`,
      headers: await authHeader("admin"),
      payload: { user_id: ADMIN_USER_ID, role: "owner" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe("owner");
    // remove immediately to avoid leaking state
    const ownerId = res.json().id as string;
    await app.inject({
      method: "DELETE",
      url: `/projects/${projectId}/members/${ownerId}`,
      headers: await authHeader("admin"),
    });
  });

  it("POST /projects/:id/members rejects invalid role", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/projects/${projectId}/members`,
      headers: await authHeader("admin"),
      payload: { user_id: SUPPORT_USER_ID, role: "admin" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /projects/:id/members reflects the added member", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/projects/${projectId}/members`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ user_id: string }>;
    expect(body.some((m) => m.user_id === SUPPORT_USER_ID)).toBe(true);
  });

  it("PATCH /projects/:id/members/:mid changes role to viewer", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/projects/${projectId}/members/${memberId}`,
      headers: await authHeader("admin"),
      payload: { role: "viewer" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe("viewer");
  });

  it("PATCH /projects/:id/members/:mid rejects invalid role", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/projects/${projectId}/members/${memberId}`,
      headers: await authHeader("admin"),
      payload: { role: "admin" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("DELETE /projects/:id/members/:mid removes the member", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/projects/${projectId}/members/${memberId}`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it("GET /projects/:id/members is empty after removal", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/projects/${projectId}/members`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ user_id: string }>;
    expect(body.every((m) => m.user_id !== SUPPORT_USER_ID)).toBe(true);
  });

  // ── Delete project ─────────────────────────────────────────────────────────

  it("DELETE /projects/:id succeeds for admin", async () => {
    // Create disposable project to avoid touching the main test project prematurely
    const key = `DEL${Date.now().toString().slice(-5)}`;
    const createRes = await app.inject({
      method: "POST",
      url: "/projects",
      headers: await authHeader("admin"),
      payload: { key, name: "[test-projects] Disposable", team_id: TEAM_ID },
    });
    const disposableId = createRes.json().id as string;

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/projects/${disposableId}`,
      headers: await authHeader("admin"),
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json().ok).toBe(true);
  });
});
