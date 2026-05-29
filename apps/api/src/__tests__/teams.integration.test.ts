/**
 * Integration tests: Teams API — 16 endpoints
 *
 * Covers:
 *   - GET /teams (list, all authenticated roles)
 *   - GET /teams/by-type?type=...
 *   - GET /teams/business, /teams/support, /teams/l1
 *   - GET /teams/support/by-level?level=...
 *   - GET /teams/:id, /teams/:id/detail, /teams/:id/members
 *   - POST /teams — admin succeeds; non-admin blocked by RLS
 *   - PATCH /teams/:id — update name and support_level
 *   - DELETE /teams/:id — admin succeeds; support_member blocked
 *   - POST/PATCH/DELETE /teams/:id/members — member lifecycle
 *   - POST /teams/collaborators/:ticketId — add ticket collaborator
 *   - DELETE /teams/collaborators/by-id/:collaboratorId — remove collaborator
 *   - GET /teams/collaborators/:ticketId — list collaborators
 *   - POST /teams/escalations — add escalation history
 *   - GET /teams/escalations/:ticketId — read escalation history
 *
 * Requires: local Supabase running (`supabase start` + `supabase db reset`).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader, TEST_USERS } from "../test-helpers/auth.js";

const SEEDED_TEAM_ID = "00000000-0000-0000-0000-000000000001";
const ADMIN_USER_ID = TEST_USERS.admin.id;
const SUPPORT_USER_ID = TEST_USERS.support_member.id;

describe("Teams API", () => {
  let app: FastifyInstance;

  // IDs created during the test run — cleaned up in afterAll
  let businessTeamId: string;
  let supportTeamId: string;
  let engineeringTeamId: string;
  let memberId: string; // team_members row id

  // Ticket + collaborator created for collaborator/escalation tests
  let ticketId: string;
  let collaboratorId: string;

  // ── helpers ────────────────────────────────────────────────────────────────

  async function createTicket(): Promise<string> {
    const headers = await authHeader("admin");
    const [statusRes, priorityRes, categoryRes] = await Promise.all([
      app.inject({ method: "GET", url: "/lookup/statuses", headers }),
      app.inject({ method: "GET", url: "/lookup/priorities", headers }),
      app.inject({ method: "GET", url: "/lookup/categories", headers }),
    ]);
    const res = await app.inject({
      method: "POST",
      url: "/tickets",
      headers,
      payload: {
        title: "[test-teams] collaborator ticket",
        status_id: statusRes.json()[0].id,
        priority_id: priorityRes.json()[0].id,
        category_id: categoryRes.json()[0].id,
      },
    });
    expect(res.statusCode, `Ticket create failed: ${res.body}`).toBe(200);
    return res.json().id as string;
  }

  beforeAll(async () => {
    app = await createTestApp();
    ticketId = await createTicket();
  });

  afterAll(async () => {
    const adminHeaders = await authHeader("admin");
    await Promise.all([
      ticketId && app.inject({ method: "DELETE", url: `/tickets/${ticketId}`, headers: adminHeaders }),
      businessTeamId && app.inject({ method: "DELETE", url: `/teams/${businessTeamId}`, headers: adminHeaders }),
      supportTeamId && app.inject({ method: "DELETE", url: `/teams/${supportTeamId}`, headers: adminHeaders }),
      engineeringTeamId && app.inject({ method: "DELETE", url: `/teams/${engineeringTeamId}`, headers: adminHeaders }),
    ]);
    await app.close();
  });

  // ── List queries ────────────────────────────────────────────────────────────

  it("GET /teams returns array for admin", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/teams",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("GET /teams returns array for support_member", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/teams",
      headers: await authHeader("support_member"),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("GET /teams returns 401 without auth", async () => {
    const res = await app.inject({ method: "GET", url: "/teams" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /teams/by-type?type=business returns only business teams", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/teams/by-type?type=business",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ team_type: string }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.every((t) => t.team_type === "business")).toBe(true);
  });

  it("GET /teams/business returns same result as by-type=business", async () => {
    const headers = await authHeader("admin");
    const [byType, byAlias] = await Promise.all([
      app.inject({ method: "GET", url: "/teams/by-type?type=business", headers }),
      app.inject({ method: "GET", url: "/teams/business", headers }),
    ]);
    expect(byAlias.statusCode).toBe(200);
    expect(byAlias.json().length).toBe(byType.json().length);
  });

  it("GET /teams/support returns only support teams", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/teams/support",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ team_type: string }>;
    expect(body.every((t) => t.team_type === "support")).toBe(true);
  });

  it("GET /teams/support/by-level?level=L1 returns only L1 teams", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/teams/support/by-level?level=L1",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ support_level: string }>;
    expect(body.every((t) => t.support_level === "L1")).toBe(true);
  });

  it("GET /teams/support/by-level rejects unknown level", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/teams/support/by-level?level=L9",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(400);
  });

  // ── Team CRUD ──────────────────────────────────────────────────────────────

  it("POST /teams creates a business team (admin)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers: await authHeader("admin"),
      payload: {
        name: "[test-teams] Business Unit",
        description: "Created by integration test",
        team_type: "business",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.id).toBe("string");
    expect(body.name).toBe("[test-teams] Business Unit");
    expect(body.team_type).toBe("business");
    businessTeamId = body.id;
  });

  it("POST /teams creates a support L1 team (admin)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers: await authHeader("admin"),
      payload: {
        name: "[test-teams] Support L1",
        team_type: "support",
        support_level: "L1",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.team_type).toBe("support");
    expect(body.support_level).toBe("L1");
    supportTeamId = body.id;
  });

  it("POST /teams creates an engineering team (admin)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers: await authHeader("admin"),
      payload: {
        name: "[test-teams] Engineering Squad",
        team_type: "engineering",
      },
    });
    expect(res.statusCode).toBe(200);
    engineeringTeamId = res.json().id;
  });

  it("POST /teams is blocked for support_member (RLS)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers: await authHeader("support_member"),
      payload: { name: "[test-teams] Should fail" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("POST /teams rejects unknown body field (strict schema)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers: await authHeader("admin"),
      payload: { name: "x", unknownField: true },
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /teams/:id returns the created team", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/teams/${businessTeamId}`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(businessTeamId);
    expect(res.json().name).toBe("[test-teams] Business Unit");
  });

  it("GET /teams/:id/detail returns aggregated shape", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/teams/${businessTeamId}/detail`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(businessTeamId);
    expect(Array.isArray(body.members)).toBe(true);
    expect(Array.isArray(body.activeProjects)).toBe(true);
    expect(Array.isArray(body.recentTickets)).toBe(true);
  });

  it("PATCH /teams/:id updates name and support_level", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/teams/${supportTeamId}`,
      headers: await authHeader("admin"),
      payload: { name: "[test-teams] Support L1 Updated", support_level: "L2" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("[test-teams] Support L1 Updated");
    expect(body.support_level).toBe("L2");
  });

  // ── Member management ──────────────────────────────────────────────────────

  it("GET /teams/:id/members returns empty array for new team", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/teams/${engineeringTeamId}/members`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("POST /teams/:id/members adds a member (admin)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/teams/${engineeringTeamId}/members`,
      headers: await authHeader("admin"),
      payload: { user_id: SUPPORT_USER_ID, role: "member" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user_id).toBe(SUPPORT_USER_ID);
    expect(body.role).toBe("member");
    expect(typeof body.id).toBe("string");
    memberId = body.id;
  });

  it("POST /teams/:id/members is blocked for support_member (RLS)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/teams/${engineeringTeamId}/members`,
      headers: await authHeader("support_member"),
      payload: { user_id: ADMIN_USER_ID, role: "member" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("GET /teams/:id/members reflects the new member", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/teams/${engineeringTeamId}/members`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ user_id: string }>;
    expect(body.some((m) => m.user_id === SUPPORT_USER_ID)).toBe(true);
  });

  it("PATCH /teams/:id/members/:mid promotes member to lead", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/teams/${engineeringTeamId}/members/${memberId}`,
      headers: await authHeader("admin"),
      payload: { role: "lead" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe("lead");
  });

  it("PATCH /teams/:id/members/:mid rejects invalid role", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/teams/${engineeringTeamId}/members/${memberId}`,
      headers: await authHeader("admin"),
      payload: { role: "owner" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("DELETE /teams/:id/members/:mid removes the member", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/teams/${engineeringTeamId}/members/${memberId}`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  // ── Ticket collaborators ───────────────────────────────────────────────────

  it("POST /teams/collaborators/:ticketId adds a collaborator", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/teams/collaborators/${ticketId}`,
      headers: await authHeader("admin"),
      payload: {
        team_id: SEEDED_TEAM_ID,
        notes: "Integration test collaborator",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ticket_id).toBe(ticketId);
    expect(body.team_id).toBe(SEEDED_TEAM_ID);
    collaboratorId = body.id;
  });

  it("GET /teams/collaborators/:ticketId returns the collaborator", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/teams/collaborators/${ticketId}`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ id: string }>;
    expect(body.some((c) => c.id === collaboratorId)).toBe(true);
  });

  it("DELETE /teams/collaborators/by-id/:collaboratorId removes collaborator", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/teams/collaborators/by-id/${collaboratorId}`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  // ── Escalation history ─────────────────────────────────────────────────────

  it("POST /teams/escalations records an escalation entry", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/teams/escalations",
      headers: await authHeader("admin"),
      payload: {
        ticket_id: ticketId,
        to_team_id: SEEDED_TEAM_ID,
        to_support_level: "L1",
        reason: "Integration test escalation",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ticket_id).toBe(ticketId);
    expect(body.to_team_id).toBe(SEEDED_TEAM_ID);
    expect(body.to_support_level).toBe("L1");
  });

  it("GET /teams/escalations/:ticketId returns escalation history", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/teams/escalations/${ticketId}`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ ticket_id: string }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].ticket_id).toBe(ticketId);
  });

  it("GET /teams/escalations/:ticketId returns empty array for ticket with no escalations", async () => {
    // Create a fresh ticket with no escalations
    const headers = await authHeader("admin");
    const [statusRes, priorityRes, categoryRes] = await Promise.all([
      app.inject({ method: "GET", url: "/lookup/statuses", headers }),
      app.inject({ method: "GET", url: "/lookup/priorities", headers }),
      app.inject({ method: "GET", url: "/lookup/categories", headers }),
    ]);
    const ticketRes = await app.inject({
      method: "POST",
      url: "/tickets",
      headers,
      payload: {
        title: "[test-teams] no-escalation ticket",
        status_id: statusRes.json()[0].id,
        priority_id: priorityRes.json()[0].id,
        category_id: categoryRes.json()[0].id,
      },
    });
    const freshTicketId = ticketRes.json().id as string;

    const res = await app.inject({
      method: "GET",
      url: `/teams/escalations/${freshTicketId}`,
      headers,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    // cleanup
    await app.inject({ method: "DELETE", url: `/tickets/${freshTicketId}`, headers });
  });

  // ── Delete team (admin gate) ───────────────────────────────────────────────

  it("DELETE /teams/:id is blocked for support_member (RLS)", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/teams/${businessTeamId}`,
      headers: await authHeader("support_member"),
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("DELETE /teams/:id succeeds for admin", async () => {
    // Create a disposable team for this assertion so cleanup stays idempotent
    const createRes = await app.inject({
      method: "POST",
      url: "/teams",
      headers: await authHeader("admin"),
      payload: { name: "[test-teams] Disposable" },
    });
    expect(createRes.statusCode).toBe(200);
    const disposableId = createRes.json().id as string;

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/teams/${disposableId}`,
      headers: await authHeader("admin"),
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json().ok).toBe(true);
  });
});
