/**
 * Integration tests: Ticket CRUD + filter combinations
 *
 * Covers the primary user journey for support agents:
 *   - POST /tickets            create a ticket
 *   - GET  /tickets/:id        read a single ticket
 *   - PATCH /tickets/:id       update title, description, priority, category, assigned_to
 *   - DELETE /tickets/:id      remove a ticket (admin)
 *   - GET  /tickets            list with each filter dimension applied
 *
 * Filter matrix exercised against GET /tickets:
 *   status_id, priority_id, category_id, assigned_to, created_from + created_to,
 *   plus a combined filter to verify they AND together.
 *
 * The suite seeds two "needle" tickets with distinct attributes so each filter
 * narrows the result set to the expected one. We don't assume an empty database —
 * we only assert that the right ticket IS or IS NOT present in the response.
 *
 * Requires: local Supabase running with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader, TEST_USERS } from "../test-helpers/auth.js";

interface TicketStub {
  id: string;
  title: string;
  status_id: number;
  priority_id: number;
  category_id: number;
  assigned_to: string | null;
  description: string | null;
  created_at: string;
}

interface LookupRow {
  id: number;
  name: string;
  is_final?: boolean;
}

describe("Tickets CRUD + filter combinations", () => {
  let app: FastifyInstance;

  // Lookup IDs — resolved once, reused across all tests
  let statusOpenId: number;
  let statusAltId: number;       // a different non-final status for filter narrowing
  let priorityLowId: number;
  let priorityHighId: number;
  let categoryAId: number;
  let categoryBId: number;

  // Two needle tickets with distinct attributes
  let ticketAId: string;
  let ticketBId: string;

  const createdTicketIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    const adminHeaders = await authHeader("admin");

    const [statusRes, priorityRes, categoryRes] = await Promise.all([
      app.inject({ method: "GET", url: "/lookup/statuses",   headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/priorities", headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/categories", headers: adminHeaders }),
    ]);

    const statuses   = statusRes.json()   as LookupRow[];
    const priorities = priorityRes.json() as LookupRow[];
    const categories = categoryRes.json() as LookupRow[];

    const openStatuses = statuses.filter((s) => !s.is_final);
    if (openStatuses.length < 2 || priorities.length < 2 || categories.length < 2) {
      throw new Error(
        "Need at least 2 open statuses, 2 priorities, and 2 categories in the seed",
      );
    }

    statusOpenId   = openStatuses[0]!.id;
    statusAltId    = openStatuses[1]!.id;
    priorityLowId  = priorities[0]!.id;
    priorityHighId = priorities[1]!.id;
    categoryAId    = categories[0]!.id;
    categoryBId    = categories[1]!.id;

    // Ticket A — statusOpen, priorityLow,  categoryA, assigned to support_member
    const aRes = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: adminHeaders,
      payload: {
        title: "[test-crud] Needle A — low priority, category A",
        description: "Descriptive body for ticket A",
        status_id:   statusOpenId,
        priority_id: priorityLowId,
        category_id: categoryAId,
        assigned_to: TEST_USERS.support_member.id,
      },
    });
    expect(aRes.statusCode, `Ticket A create failed: ${aRes.body}`).toBe(200);
    ticketAId = aRes.json().id;
    createdTicketIds.push(ticketAId);

    // Ticket B — statusAlt, priorityHigh, categoryB, assigned to admin
    const bRes = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: adminHeaders,
      payload: {
        title: "[test-crud] Needle B — high priority, category B",
        description: "Descriptive body for ticket B",
        status_id:   statusAltId,
        priority_id: priorityHighId,
        category_id: categoryBId,
        assigned_to: TEST_USERS.admin.id,
      },
    });
    expect(bRes.statusCode, `Ticket B create failed: ${bRes.body}`).toBe(200);
    ticketBId = bRes.json().id;
    createdTicketIds.push(ticketBId);
  });

  afterAll(async () => {
    const adminHeaders = await authHeader("admin");
    await Promise.all(
      createdTicketIds.map((id) =>
        app.inject({ method: "DELETE", url: `/tickets/${id}`, headers: adminHeaders }),
      ),
    );
    await app.close();
  });

  // ── Create ────────────────────────────────────────────────────────────────

  it("POST /tickets returns the new ticket with an id and ticket_number", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: adminHeaders,
      payload: {
        title: "[test-crud] Throwaway create test",
        status_id:   statusOpenId,
        priority_id: priorityLowId,
        category_id: categoryAId,
      },
    });
    expect(res.statusCode).toBe(200);
    const created = res.json();
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof created.ticket_number).toBe("number");
    expect(created.ticket_number).toBeGreaterThan(0);
    createdTicketIds.push(created.id);
  });

  it("POST /tickets rejects empty title with 400", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: adminHeaders,
      payload: {
        title: "",
        status_id:   statusOpenId,
        priority_id: priorityLowId,
        category_id: categoryAId,
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it("POST /tickets rejects missing required field with 400", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: adminHeaders,
      payload: {
        title: "[test-crud] Missing fields",
        // priority_id and category_id missing
        status_id: statusOpenId,
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  // ── Read ──────────────────────────────────────────────────────────────────

  it("GET /tickets/:id returns the seeded ticket A with all key fields", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/tickets/${ticketAId}`,
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const t = res.json() as TicketStub;
    expect(t.id).toBe(ticketAId);
    expect(t.status_id).toBe(statusOpenId);
    expect(t.priority_id).toBe(priorityLowId);
    expect(t.category_id).toBe(categoryAId);
    expect(t.assigned_to).toBe(TEST_USERS.support_member.id);
  });

  it("GET /tickets/:id with unknown id returns null (RLS-hidden or absent)", async () => {
    const adminHeaders = await authHeader("admin");
    const fakeUuid = "00000000-0000-0000-0000-000000000999";
    const res = await app.inject({
      method: "GET",
      url: `/tickets/${fakeUuid}`,
      headers: adminHeaders,
    });
    // service uses .maybeSingle() → returns null when no row
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.json()).toBeNull();
    }
  });

  // ── Update ────────────────────────────────────────────────────────────────

  it("PATCH /tickets/:id updates the title", async () => {
    const adminHeaders = await authHeader("admin");
    const newTitle = "[test-crud] Needle A — updated title";
    const res = await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketAId}`,
      headers: adminHeaders,
      payload: { title: newTitle },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe(newTitle);
  });

  it("PATCH /tickets/:id can change priority + category in one call", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketAId}`,
      headers: adminHeaders,
      payload: { priority_id: priorityHighId, category_id: categoryBId },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().priority_id).toBe(priorityHighId);
    expect(res.json().category_id).toBe(categoryBId);

    // Restore — keeps the "needle A" fixture consistent for later filter tests
    await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketAId}`,
      headers: adminHeaders,
      payload: { priority_id: priorityLowId, category_id: categoryAId },
    });
  });

  it("PATCH /tickets/:id with non-uuid id returns 400", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "PATCH",
      url: "/tickets/not-a-uuid",
      headers: adminHeaders,
      payload: { title: "x" },
    });
    expect(res.statusCode).toBe(400);
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  it("DELETE /tickets/:id removes the row (verified via subsequent GET)", async () => {
    // Create a throwaway ticket just for deletion verification
    const adminHeaders = await authHeader("admin");
    const created = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: adminHeaders,
      payload: {
        title: "[test-crud] Throwaway delete target",
        status_id:   statusOpenId,
        priority_id: priorityLowId,
        category_id: categoryAId,
      },
    });
    const id: string = created.json().id;

    const del = await app.inject({
      method: "DELETE",
      url: `/tickets/${id}`,
      headers: adminHeaders,
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().success).toBe(true);

    const after = await app.inject({
      method: "GET",
      url: `/tickets/${id}`,
      headers: adminHeaders,
    });
    // Either explicit 404 or null body (maybeSingle)
    const gone = after.statusCode === 404 || after.json() === null;
    expect(gone, `Expected ticket ${id} to be gone after DELETE`).toBe(true);
  });

  // ── Filter combinations ───────────────────────────────────────────────────

  it("GET /tickets?status_id=… returns only tickets with that status", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/tickets?status_id=${statusAltId}`,
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const tickets = res.json() as TicketStub[];
    expect(tickets.every((t) => t.status_id === statusAltId)).toBe(true);
    expect(tickets.map((t) => t.id)).toContain(ticketBId);
    expect(tickets.map((t) => t.id)).not.toContain(ticketAId);
  });

  it("GET /tickets?priority_id=… filters by priority", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/tickets?priority_id=${priorityHighId}`,
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const tickets = res.json() as TicketStub[];
    expect(tickets.every((t) => t.priority_id === priorityHighId)).toBe(true);
    expect(tickets.map((t) => t.id)).toContain(ticketBId);
    expect(tickets.map((t) => t.id)).not.toContain(ticketAId);
  });

  it("GET /tickets?assigned_to=… filters by assignee", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/tickets?assigned_to=${TEST_USERS.support_member.id}`,
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const tickets = res.json() as TicketStub[];
    expect(
      tickets.every((t) => t.assigned_to === TEST_USERS.support_member.id),
    ).toBe(true);
    expect(tickets.map((t) => t.id)).toContain(ticketAId);
    expect(tickets.map((t) => t.id)).not.toContain(ticketBId);
  });

  it("GET /tickets/paginated combines multiple filters with AND semantics", async () => {
    // Use /paginated route — it implements the full filter set (category_id,
    // created_from/to, etc). GET /tickets only honours status, priority,
    // assigned_to per the service implementation.
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/tickets/paginated?status_id=${statusOpenId}&priority_id=${priorityLowId}&category_id=${categoryAId}`,
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: TicketStub[]; totalCount: number };
    // Every row must satisfy all three predicates
    for (const t of body.data) {
      expect(t.status_id).toBe(statusOpenId);
      expect(t.priority_id).toBe(priorityLowId);
      expect(t.category_id).toBe(categoryAId);
    }
    expect(body.data.map((t) => t.id)).toContain(ticketAId);
    expect(body.data.map((t) => t.id)).not.toContain(ticketBId);
  });

  it("GET /tickets/paginated?created_from=&created_to= scopes to date range", async () => {
    const adminHeaders = await authHeader("admin");
    // Both needle tickets were created today (during beforeAll). Use today's
    // calendar date as the range so both fall inside.
    const today = new Date().toISOString().slice(0, 10);
    const res = await app.inject({
      method: "GET",
      url: `/tickets/paginated?created_from=${today}&created_to=${today}`,
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: TicketStub[]; totalCount: number };
    const ids = body.data.map((t) => t.id);
    // Both seeded needle tickets should be inside today's range
    expect(ids).toContain(ticketAId);
    expect(ids).toContain(ticketBId);
  });

  it("GET /tickets/paginated with a past date range returns 0 matches", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/tickets/paginated?created_from=1970-01-01&created_to=1970-12-31`,
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: TicketStub[]; totalCount: number };
    expect(body.data.length).toBe(0);
  });
});
