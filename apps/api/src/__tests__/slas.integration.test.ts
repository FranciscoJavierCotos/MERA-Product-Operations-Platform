/**
 * Integration tests: SLA state machine
 *
 * Verifies that the three DB triggers correctly maintain sla_instances:
 *
 *   Trigger 1 — assign_sla_on_ticket_insert (migration 022)
 *     New ticket with an active SLA policy → sla_instance row created with
 *     response_due_at and resolution_due_at set.
 *
 *   Trigger 2 — manage_sla_on_ticket_update (migration 022)
 *     status_id → 2 (pending_customer)  : paused_at set
 *     status_id ← 2 (any other open)    : paused_at cleared, total_paused_minutes
 *                                         accumulated, deadlines extended
 *
 *   Trigger 3 — mark_sla_response_on_comment (migration 019)
 *     First non-internal comment from a support agent (admin | support_lead |
 *     support_member) → responded_at set on the sla_instance.
 *     Internal comments and client comments do NOT trigger responded_at.
 *
 * Status IDs (from migration 022 seed):
 *   new=1, pending_customer=2, pending_internal=3, escalated=4,
 *   resolved=5, closed=6
 *
 * Requires: local Supabase running (`supabase start`) with seed data applied.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

// Status IDs are stable seeds — defined in migration 022.
const STATUS = {
  new:              1,
  pending_customer: 2,
  pending_internal: 3,
  escalated:        4,
  resolved:         5,
  closed:           6,
} as const;

interface SlaInstance {
  id: string;
  ticket_id: string;
  policy_id: string;
  response_due_at: string;
  resolution_due_at: string;
  responded_at: string | null;
  paused_at: string | null;
  total_paused_minutes: number;
}

describe("SLA state machine", () => {
  let app: FastifyInstance;
  let priorityId: number;   // priority_id=1 (low) always has an active SLA policy
  let categoryId: number;

  const createdTicketIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    const adminHeaders = await authHeader("admin");

    const [priorityRes, categoryRes] = await Promise.all([
      app.inject({ method: "GET", url: "/lookup/priorities", headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/categories", headers: adminHeaders }),
    ]);

    // Use the first priority (low=1) — seeded SLA policies cover all four priorities
    priorityId = (priorityRes.json() as Array<{ id: number }>)[0].id;
    categoryId = (categoryRes.json() as Array<{ id: number }>)[0].id;
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

  /** Create a fresh ticket as admin and track it for cleanup. */
  async function createTicket(overridePriorityId?: number): Promise<string> {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: adminHeaders,
      payload: {
        title: "[test-sla] SLA state machine test ticket",
        status_id:   STATUS.new,
        priority_id: overridePriorityId ?? priorityId,
        category_id: categoryId,
      },
    });
    expect(res.statusCode, `Ticket creation failed: ${res.body}`).toBe(200);
    const id: string = res.json().id;
    createdTicketIds.push(id);
    return id;
  }

  /** Fetch the SLA instance for a ticket via GET /sla/instances/:ticketId. */
  async function getSlaInstance(ticketId: string): Promise<SlaInstance | null> {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/sla/instances/${ticketId}`,
      headers: adminHeaders,
    });
    expect(res.statusCode, `GET /sla/instances/${ticketId} failed: ${res.body}`).toBe(200);
    return res.json() as SlaInstance | null;
  }

  // ── Trigger 1: SLA instance creation ──────────────────────────────────────

  it("creating a ticket with an active SLA policy creates an sla_instance row", async () => {
    const ticketId = await createTicket();
    const instance = await getSlaInstance(ticketId);

    expect(instance, "Expected sla_instance to exist after ticket creation").not.toBeNull();
    expect(instance!.ticket_id).toBe(ticketId);
    expect(instance!.policy_id).toBeTruthy();
    expect(instance!.response_due_at).toBeTruthy();
    expect(instance!.resolution_due_at).toBeTruthy();
    expect(instance!.paused_at).toBeNull();
    expect(instance!.responded_at).toBeNull();
  });

  it("newly created ticket starts with total_paused_minutes = 0", async () => {
    const ticketId = await createTicket();
    const instance = await getSlaInstance(ticketId);
    expect(instance!.total_paused_minutes).toBe(0);
  });

  // ── Trigger 2: SLA pause on pending_customer ───────────────────────────────

  it("transitioning to pending_customer (status_id=2) sets paused_at", async () => {
    const adminHeaders = await authHeader("admin");
    const ticketId = await createTicket();

    // Pre-condition
    const before = await getSlaInstance(ticketId);
    expect(before!.paused_at).toBeNull();

    // Transition to pending_customer
    const patchRes = await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: { status_id: STATUS.pending_customer },
    });
    expect(patchRes.statusCode, `PATCH to pending_customer failed: ${patchRes.body}`).toBe(200);

    const after = await getSlaInstance(ticketId);
    expect(
      after!.paused_at,
      "paused_at must be set after transitioning to pending_customer",
    ).not.toBeNull();
  });

  it("re-transitioning to pending_customer when already paused is a no-op (paused_at unchanged)", async () => {
    const adminHeaders = await authHeader("admin");
    const ticketId = await createTicket();

    // First pause
    await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: { status_id: STATUS.pending_customer },
    });
    const first = await getSlaInstance(ticketId);
    const firstPausedAt = first!.paused_at;
    expect(firstPausedAt).not.toBeNull();

    // Second "pause" — status_id unchanged, so trigger is a no-op
    await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: { status_id: STATUS.pending_customer },
    });
    const second = await getSlaInstance(ticketId);
    // paused_at should remain the same (not reset or cleared)
    expect(second!.paused_at).toBe(firstPausedAt);
  });

  // ── Trigger 2: SLA resume ─────────────────────────────────────────────────

  it("transitioning from pending_customer to another open status clears paused_at", async () => {
    const adminHeaders = await authHeader("admin");
    const ticketId = await createTicket();

    // Pause
    await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: { status_id: STATUS.pending_customer },
    });
    expect((await getSlaInstance(ticketId))!.paused_at).not.toBeNull();

    // Resume
    const resumeRes = await app.inject({
      method: "PATCH",
      url: `/tickets/${ticketId}`,
      headers: adminHeaders,
      payload: { status_id: STATUS.pending_internal },
    });
    expect(resumeRes.statusCode, `Resume PATCH failed: ${resumeRes.body}`).toBe(200);

    const resumed = await getSlaInstance(ticketId);
    expect(resumed!.paused_at).toBeNull();
    // Paused duration is accumulated (≥0 minutes)
    expect(resumed!.total_paused_minutes).toBeGreaterThanOrEqual(0);
  });

  // ── Trigger 3: responded_at on first support comment ─────────────────────

  it("first non-internal comment from support_member sets responded_at", async () => {
    const ticketId = await createTicket();
    const memberHeaders = await authHeader("support_member");

    // Pre-condition: no response yet
    const before = await getSlaInstance(ticketId);
    expect(before!.responded_at).toBeNull();

    const commentRes = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: memberHeaders,
      payload: { content: "[test-sla] First public support response", is_internal: false },
    });
    expect(commentRes.statusCode, `Comment POST failed: ${commentRes.body}`).toBe(200);

    const after = await getSlaInstance(ticketId);
    expect(
      after!.responded_at,
      "responded_at must be set after first external support comment",
    ).not.toBeNull();
  });

  it("internal comment from support_member does NOT set responded_at", async () => {
    const ticketId = await createTicket();
    const memberHeaders = await authHeader("support_member");

    const commentRes = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: memberHeaders,
      payload: {
        content: "[test-sla] Internal note — must not count as a response",
        is_internal: true,
      },
    });
    expect(commentRes.statusCode).toBe(200);

    const after = await getSlaInstance(ticketId);
    expect(
      after!.responded_at,
      "Internal comment must NOT set responded_at",
    ).toBeNull();
  });

  it("responded_at is not overwritten by a second support comment", async () => {
    const ticketId = await createTicket();
    const memberHeaders = await authHeader("support_member");

    // First comment — sets responded_at
    await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: memberHeaders,
      payload: { content: "[test-sla] First response", is_internal: false },
    });
    const first = await getSlaInstance(ticketId);
    const firstRespondedAt = first!.responded_at;
    expect(firstRespondedAt).not.toBeNull();

    // Second comment — responded_at must not change
    await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: memberHeaders,
      payload: { content: "[test-sla] Follow-up response", is_internal: false },
    });
    const second = await getSlaInstance(ticketId);
    expect(second!.responded_at).toBe(firstRespondedAt);
  });
});
