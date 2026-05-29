/**
 * Integration tests: Companies (CRM) — migration 037
 *
 * Covers:
 *   - GET /companies (list)
 *   - POST /companies — admin succeeds, non-admin gets 403
 *   - GET /companies/:id/detail (aggregation)
 *   - PATCH /companies/:id/health → writes company_health_history row
 *   - Contact CRUD (POST / PATCH / DELETE /companies/:id/contacts)
 *   - GET /lookup/company-health-statuses
 *   - Ticket created with company_id round-trips through GET /tickets/:id
 *
 * Requires: local Supabase running with seed data (supabase start + supabase db reset).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

describe("Companies CRM", () => {
  let app: FastifyInstance;
  let createdCompanyId: string;
  let createdContactId: string;
  let createdTicketId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    const adminHeaders = await authHeader("admin");
    await Promise.all([
      createdTicketId &&
        app.inject({ method: "DELETE", url: `/tickets/${createdTicketId}`, headers: adminHeaders }),
      createdCompanyId &&
        app.inject({ method: "DELETE", url: `/companies/${createdCompanyId}`, headers: adminHeaders }),
    ]);
    await app.close();
  });

  // ── Lookup ──────────────────────────────────────────────────────────────────

  it("GET /lookup/company-health-statuses returns 5 statuses", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/lookup/company-health-statuses",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(5);
    expect(body.every((s: any) => typeof s.level === "number")).toBe(true);
  });

  // ── List ────────────────────────────────────────────────────────────────────

  it("GET /companies returns array", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/companies",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("GET /companies is forbidden for client role (RLS)", async () => {
    const clientHeaders = await authHeader("client");
    const res = await app.inject({
      method: "GET",
      url: "/companies",
      headers: clientHeaders,
    });
    // RLS returns empty, not a 403 — but no company rows should be visible
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  // ── Create ──────────────────────────────────────────────────────────────────

  it("POST /companies succeeds for admin", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/companies",
      headers: adminHeaders,
      payload: {
        name: "[test] Integration Corp",
        industry: "Testing",
        website: "https://test.example.com",
        health_note: "Freshly created for integration test",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.id).toBe("string");
    expect(body.name).toBe("[test] Integration Corp");
    expect(body.health_status_id).toBe(3); // default neutral
    createdCompanyId = body.id;
  });

  it("POST /companies returns 403-equivalent for non-admin (RLS insert check)", async () => {
    const supportHeaders = await authHeader("support_member");
    const res = await app.inject({
      method: "POST",
      url: "/companies",
      headers: supportHeaders,
      payload: { name: "[test] Unauthorized Company" },
    });
    // RLS insert policy requires admin; Supabase returns a 403 or 422 from the
    // underlying PostgREST restriction — the error handler surfaces it as ≥400.
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  // ── Detail aggregation ──────────────────────────────────────────────────────

  it("GET /companies/:id/detail returns aggregated shape", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/companies/${createdCompanyId}/detail`,
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(createdCompanyId);
    expect(Array.isArray(body.contacts)).toBe(true);
    expect(Array.isArray(body.healthHistory)).toBe(true);
    expect(Array.isArray(body.openTickets)).toBe(true);
    expect(Array.isArray(body.closedTickets)).toBe(true);
    expect(Array.isArray(body.projects)).toBe(true);
    expect(typeof body.stats?.contactCount).toBe("number");
  });

  // ── Health update → history written by trigger ──────────────────────────────

  it("PATCH /companies/:id/health changes health and writes a history row", async () => {
    const adminHeaders = await authHeader("admin");

    // Change to "at_risk" (id 2)
    const patchRes = await app.inject({
      method: "PATCH",
      url: `/companies/${createdCompanyId}/health`,
      headers: adminHeaders,
      payload: { health_status_id: 2, health_note: "Integration test health change" },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().health_status_id).toBe(2);

    // Fetch detail — history should now contain one entry
    const detailRes = await app.inject({
      method: "GET",
      url: `/companies/${createdCompanyId}/detail`,
      headers: adminHeaders,
    });
    expect(detailRes.statusCode).toBe(200);
    const detail = detailRes.json();
    expect(detail.healthHistory.length).toBeGreaterThanOrEqual(1);
    expect(detail.healthHistory[0].to_status_id).toBe(2);
    expect(detail.healthHistory[0].note).toBe("Integration test health change");
  });

  // ── Contacts CRUD ───────────────────────────────────────────────────────────

  it("POST /companies/:id/contacts adds a contact", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: `/companies/${createdCompanyId}/contacts`,
      headers: adminHeaders,
      payload: {
        full_name: "Test Contact",
        email: "test-contact@integrationcorp.test",
        title: "QA Engineer",
        is_primary: true,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.full_name).toBe("Test Contact");
    expect(body.is_primary).toBe(true);
    createdContactId = body.id;
  });

  it("PATCH /companies/:id/contacts/:cid updates a contact", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "PATCH",
      url: `/companies/${createdCompanyId}/contacts/${createdContactId}`,
      headers: adminHeaders,
      payload: { title: "Senior QA Engineer" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe("Senior QA Engineer");
  });

  it("DELETE /companies/:id/contacts/:cid removes a contact", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "DELETE",
      url: `/companies/${createdCompanyId}/contacts/${createdContactId}`,
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  // ── Ticket with company_id round-trips ──────────────────────────────────────

  it("Ticket created with company_id is returned via GET /tickets/:id", async () => {
    const adminHeaders = await authHeader("admin");

    // Fetch valid lookup IDs
    const [statusRes, priorityRes, categoryRes] = await Promise.all([
      app.inject({ method: "GET", url: "/lookup/statuses", headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/priorities", headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/categories", headers: adminHeaders }),
    ]);
    const statusId: number = statusRes.json()[0].id;
    const priorityId: number = priorityRes.json()[0].id;
    const categoryId: number = categoryRes.json()[0].id;

    const ticketRes = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: adminHeaders,
      payload: {
        title: "[test] Ticket with company_id",
        status_id: statusId,
        priority_id: priorityId,
        category_id: categoryId,
        company_id: createdCompanyId,
      },
    });
    expect(ticketRes.statusCode).toBe(200);
    createdTicketId = ticketRes.json().id;

    const getRes = await app.inject({
      method: "GET",
      url: `/tickets/${createdTicketId}`,
      headers: adminHeaders,
    });
    expect(getRes.statusCode).toBe(200);
    const ticket = getRes.json();
    // company_id on the row
    expect(ticket.company_id).toBe(createdCompanyId);
    // joined company relation
    expect(ticket.company?.id).toBe(createdCompanyId);
    expect(typeof ticket.company?.name).toBe("string");
  });
});
