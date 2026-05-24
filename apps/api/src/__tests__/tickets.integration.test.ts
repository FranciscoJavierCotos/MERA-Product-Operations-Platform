/**
 * Integration tests: RLS ticket isolation
 *
 * Verifies that the `tickets_read` RLS policy correctly restricts visibility:
 *   - Support/admin see ALL tickets
 *   - Clients see ONLY tickets they created or are assigned to
 *   - A client cannot read another user's tickets
 *
 * The test uses the admin user to create a "foreign" ticket, then asserts
 * that the client token cannot see it — which is the practical equivalent of
 * "client A cannot read client B's tickets" with the seeded test users.
 *
 * Requires: local Supabase running with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader, TEST_USERS } from "../test-helpers/auth.js";

// Minimal ticket type for assertion purposes
interface TicketStub {
  id: string;
  created_by: string;
  assigned_to: string | null;
}

describe("RLS: client ticket isolation", () => {
  let app: FastifyInstance;

  // IDs resolved from the live DB at test startup
  let adminTicketId: string;
  let clientTicketId: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Fetch valid lookup IDs so ticket creation succeeds
    const adminHeaders = await authHeader("admin");
    const [statusRes, priorityRes, categoryRes] = await Promise.all([
      app.inject({ method: "GET", url: "/lookup/statuses", headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/priorities", headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/categories", headers: adminHeaders }),
    ]);

    const statusId: number = statusRes.json()[0].id;
    const priorityId: number = priorityRes.json()[0].id;
    const categoryId: number = categoryRes.json()[0].id;

    // Admin creates a ticket — client must NOT be able to see this
    const adminTicketRes = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: adminHeaders,
      payload: {
        title: "[test] Admin-owned ticket — RLS isolation",
        status_id: statusId,
        priority_id: priorityId,
        category_id: categoryId,
      },
    });
    expect(adminTicketRes.statusCode).toBe(200);
    adminTicketId = adminTicketRes.json().id;

    // Client creates their own ticket — they must be able to see this one
    const clientHeaders = await authHeader("client");
    const clientTicketRes = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: clientHeaders,
      payload: {
        title: "[test] Client-owned ticket — RLS isolation",
        status_id: statusId,
        priority_id: priorityId,
        category_id: categoryId,
      },
    });
    expect(clientTicketRes.statusCode).toBe(200);
    clientTicketId = clientTicketRes.json().id;
  });

  afterAll(async () => {
    // Delete both test tickets as admin (cascades to comments, tasks, history)
    const adminHeaders = await authHeader("admin");
    await Promise.all([
      adminTicketId &&
        app.inject({ method: "DELETE", url: `/tickets/${adminTicketId}`, headers: adminHeaders }),
      clientTicketId &&
        app.inject({ method: "DELETE", url: `/tickets/${clientTicketId}`, headers: adminHeaders }),
    ]);
    await app.close();
  });

  // ── Client isolation ───────────────────────────────────────────────────────

  it("client token does NOT see tickets created by other users", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({ method: "GET", url: "/tickets", headers });

    expect(res.statusCode).toBe(200);
    const ids = (res.json() as TicketStub[]).map((t) => t.id);
    expect(ids).not.toContain(adminTicketId);
  });

  it("client token DOES see tickets they created", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({ method: "GET", url: "/tickets", headers });

    expect(res.statusCode).toBe(200);
    const ids = (res.json() as TicketStub[]).map((t) => t.id);
    expect(ids).toContain(clientTicketId);
  });

  it("every ticket returned to a client is owned by or assigned to that client", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({ method: "GET", url: "/tickets", headers });

    expect(res.statusCode).toBe(200);
    const tickets = res.json() as TicketStub[];
    const clientId = TEST_USERS.client.id;

    for (const ticket of tickets) {
      const isOwner =
        ticket.created_by === clientId || ticket.assigned_to === clientId;
      expect(
        isOwner,
        `Ticket ${ticket.id} (created_by=${ticket.created_by}, assigned_to=${ticket.assigned_to}) leaked to client ${clientId}`,
      ).toBe(true);
    }
  });

  it("client cannot read a specific ticket created by another user → 404 or empty", async () => {
    const headers = await authHeader("client");
    // GET /tickets/:id returns null (204/empty) or 404 when RLS hides the row
    const res = await app.inject({
      method: "GET",
      url: `/tickets/${adminTicketId}`,
      headers,
    });
    // Either the row is not found (404) or the service returns null (which Fastify
    // serialises as null/empty — we just confirm it's not 200 with data)
    const isBlocked =
      res.statusCode === 404 ||
      res.statusCode === 403 ||
      res.json() === null;
    expect(
      isBlocked,
      `Expected client to be blocked from GET /tickets/${adminTicketId}, got ${res.statusCode}: ${res.body}`,
    ).toBe(true);
  });

  // ── Admin full visibility ─────────────────────────────────────────────────

  it("admin token sees both the admin ticket and the client ticket", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({ method: "GET", url: "/tickets", headers });

    expect(res.statusCode).toBe(200);
    const ids = (res.json() as TicketStub[]).map((t) => t.id);
    expect(ids).toContain(adminTicketId);
    expect(ids).toContain(clientTicketId);
  });

  it("support_member token sees both test tickets (not limited to own)", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({ method: "GET", url: "/tickets", headers });

    expect(res.statusCode).toBe(200);
    const ids = (res.json() as TicketStub[]).map((t) => t.id);
    expect(ids).toContain(adminTicketId);
    expect(ids).toContain(clientTicketId);
  });
});
