/**
 * Integration tests: Resolution enforcement on final status
 *
 * Verifies that PATCH /tickets/:id correctly enforces the business rule:
 * "A ticket cannot be moved to a final status without a non-empty resolution."
 *
 * Enforcement is implemented by a BEFORE trigger on the tickets table
 * (tickets_enforce_resolution_on_final_status, migration 023). The trigger
 * raises a PostgreSQL check_violation (code 23514), which the error handler
 * maps to HTTP 422 with error: "constraint_violation".
 *
 * Final statuses: resolved (id=5), closed (id=6) — is_final=true in
 * ticket_statuses. The test resolves the ID dynamically so new statuses
 * added later are picked up automatically.
 *
 * Requires: local Supabase running (`supabase start`) with seed data applied.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

interface StatusRow {
  id: number;
  name: string;
  is_final: boolean;
}

describe("Resolution enforcement on final status", () => {
  let app: FastifyInstance;
  let openStatusId: number;
  let finalStatusId: number;
  let priorityId: number;
  let categoryId: number;

  // All tickets created during this suite — deleted in afterAll.
  const createdTicketIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const adminHeaders = await authHeader("admin");
    const [statusRes, priorityRes, categoryRes] = await Promise.all([
      app.inject({ method: "GET", url: "/lookup/statuses",    headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/priorities",  headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/categories",  headers: adminHeaders }),
    ]);

    const statuses = statusRes.json() as StatusRow[];
    const openStatus  = statuses.find((s) => !s.is_final);
    const finalStatus = statuses.find((s) => s.is_final);
    if (!openStatus || !finalStatus) {
      throw new Error("Expected at least one open and one final status in ticket_statuses");
    }

    openStatusId  = openStatus.id;
    finalStatusId = finalStatus.id;
    priorityId    = (priorityRes.json() as Array<{ id: number }>)[0].id;
    categoryId    = (categoryRes.json() as Array<{ id: number }>)[0].id;
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

  /** Helper: create a fresh open ticket and track it for cleanup. */
  async function createTicket(): Promise<string> {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: adminHeaders,
      payload: {
        title: "[test-resolution] Resolution enforcement test ticket",
        status_id:   openStatusId,
        priority_id: priorityId,
        category_id: categoryId,
      },
    });
    expect(res.statusCode, `Ticket creation failed: ${res.body}`).toBe(200);
    const id: string = res.json().id;
    createdTicketIds.push(id);
    return id;
  }

  // ── Missing / null / empty resolution ─────────────────────────────────────

  it("PATCH with final status_id and no resolution field → 422 constraint_violation", async () => {
    const adminHeaders = await authHeader("admin");
    const ticketId = await createTicket();

    const res = await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: { status_id: finalStatusId },  // resolution omitted entirely
    });

    expect(
      res.statusCode,
      `Expected 422, got ${res.statusCode}: ${res.body}`,
    ).toBe(422);
    expect(res.json().error).toBe("constraint_violation");
  });

  it("PATCH with final status_id and null resolution → 422", async () => {
    const adminHeaders = await authHeader("admin");
    const ticketId = await createTicket();

    const res = await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: { status_id: finalStatusId, resolution: null },
    });

    expect(res.statusCode, `Expected 422, got ${res.statusCode}: ${res.body}`).toBe(422);
    expect(res.json().error).toBe("constraint_violation");
  });

  it("PATCH with final status_id and empty paragraph HTML → 422", async () => {
    // Tiptap emits <p></p> for an empty document — strip_html_to_plain returns NULL
    const adminHeaders = await authHeader("admin");
    const ticketId = await createTicket();

    const res = await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: { status_id: finalStatusId, resolution: "<p></p>" },
    });

    expect(res.statusCode, `Expected 422, got ${res.statusCode}: ${res.body}`).toBe(422);
    expect(res.json().error).toBe("constraint_violation");
  });

  it("PATCH with final status_id and whitespace-only HTML → 422", async () => {
    // <p>   </p> strips to '' which is also rejected
    const adminHeaders = await authHeader("admin");
    const ticketId = await createTicket();

    const res = await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: { status_id: finalStatusId, resolution: "<p>   </p>" },
    });

    expect(res.statusCode, `Expected 422, got ${res.statusCode}: ${res.body}`).toBe(422);
  });

  // ── Valid resolution ───────────────────────────────────────────────────────

  it("PATCH with final status_id and a valid non-empty resolution → 200", async () => {
    const adminHeaders = await authHeader("admin");
    const ticketId = await createTicket();

    const res = await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: {
        status_id: finalStatusId,
        resolution: "<p>Fixed by updating the configuration settings.</p>",
      },
    });

    expect(res.statusCode, `Expected 200, got ${res.statusCode}: ${res.body}`).toBe(200);
    expect(res.json().status_id).toBe(finalStatusId);
  });

  it("resolved ticket retains the exact resolution HTML on GET", async () => {
    const adminHeaders = await authHeader("admin");
    const ticketId = await createTicket();
    const resolutionHtml = "<p>Resolved by applying patch <strong>v2.1</strong>.</p>";

    await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: { status_id: finalStatusId, resolution: resolutionHtml },
    });

    const getRes = await app.inject({
      method: "GET",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
    });

    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().resolution).toBe(resolutionHtml);
    expect(getRes.json().status_id).toBe(finalStatusId);
  });

  it("resolution-only PATCH (no status change) on open ticket is accepted → 200", async () => {
    // Setting resolution without changing status should always succeed
    const adminHeaders = await authHeader("admin");
    const ticketId = await createTicket();

    const res = await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: { resolution: "<p>Draft resolution saved for later.</p>" },
    });

    expect(res.statusCode, `Expected 200, got ${res.statusCode}: ${res.body}`).toBe(200);
  });
});
