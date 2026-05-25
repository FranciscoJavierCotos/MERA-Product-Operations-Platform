/**
 * Integration tests: SLA Policy CRUD + correct policy applied to new tickets
 *
 * Two complementary areas:
 *
 *  A. SLA policy CRUD (admin-only writes)
 *     GET    /sla/policies        — any authenticated user (RLS: read = all authenticated)
 *     POST   /sla/policies        — admin only (RLS: write = is_admin)
 *     PATCH  /sla/policies/:id    — admin only
 *     DELETE /sla/policies/:id    — admin only
 *
 *  B. Correct policy applied to new tickets
 *     The DB trigger `assign_sla_on_ticket_insert` (migration 022) selects
 *     `WHERE is_active = true AND priority_id = NEW.priority_id` and writes
 *     the response_due_at / resolution_due_at accordingly.
 *
 *     Tests verify:
 *       1. A ticket created with priority_id X gets an sla_instance row whose
 *          response_due_at / resolution_due_at matches the currently active
 *          policy for that priority.
 *       2. After patching the policy to a known response_time_minutes value,
 *          a new ticket's response_due_at is approximately now() +
 *          response_time_minutes minutes (within a 2-minute clock drift window).
 *       3. Setting a policy to is_active=false prevents an sla_instance from
 *          being created for that priority.
 *
 * Schema invariants:
 *   - `sla_policies.priority_id` has a UNIQUE constraint (one policy per
 *     priority). Tests use priority_id=4 (urgent) so that low/medium/high
 *     policies seeded by migration 019 → 022 remain untouched and the
 *     existing SLA state-machine tests keep passing.
 *   - The test suite saves + restores the original urgent policy around each
 *     mutating group so the local DB is left in the same state it started.
 *
 * RLS (migration 001):
 *   sla_policies_read_authenticated : SELECT → any authenticated
 *   sla_policies_admin_write        : ALL    → is_admin(uid)
 *
 * Requires: local Supabase running (`supabase start`) with seed data applied.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SlaPolicy {
  id: string;
  name: string;
  priority_id: number;
  response_time_minutes: number;
  resolution_time_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Constants (from seed / migration 022)
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_URGENT_ID = 4;   // urgent — used for all mutating tests
const STATUS_NEW_ID      = 1;   // new ticket status

// ─────────────────────────────────────────────────────────────────────────────
// A. SLA policy CRUD
// ─────────────────────────────────────────────────────────────────────────────

describe("SLA policy CRUD", () => {
  let app: FastifyInstance;

  /** The seeded urgent policy — saved before any mutation, restored in afterAll. */
  let originalUrgentPolicy: SlaPolicy;

  /** ID of a policy created during the create/delete tests. */
  let newPolicyId: string | null = null;

  const createdTicketIds: string[] = [];

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async function getPolicies(): Promise<SlaPolicy[]> {
    const headers = await authHeader("admin");
    const res = await app.inject({ method: "GET", url: "/sla/policies", headers });
    expect(res.statusCode).toBe(200);
    return res.json() as SlaPolicy[];
  }

  async function getUrgentPolicy(): Promise<SlaPolicy | undefined> {
    const policies = await getPolicies();
    return policies.find((p) => p.priority_id === PRIORITY_URGENT_ID);
  }

  async function restoreUrgentPolicy(): Promise<void> {
    if (!originalUrgentPolicy) return;
    const headers = await authHeader("admin");

    // Delete any current urgent policy first (might have been re-created with different id)
    const current = await getUrgentPolicy();
    if (current && current.id !== originalUrgentPolicy.id) {
      await app.inject({
        method: "DELETE",
        url: `/sla/policies/${current.id}`,
        headers,
      });
    }
    if (!current) {
      // Re-create the original
      await app.inject({
        method: "POST",
        url: "/sla/policies",
        headers,
        payload: {
          name: originalUrgentPolicy.name,
          priority_id: originalUrgentPolicy.priority_id,
          response_time_minutes: originalUrgentPolicy.response_time_minutes,
          resolution_time_minutes: originalUrgentPolicy.resolution_time_minutes,
          is_active: originalUrgentPolicy.is_active,
        },
      });
    } else {
      // Patch back to original values
      await app.inject({
        method: "PATCH",
        url: `/sla/policies/${current.id}`,
        headers,
        payload: {
          name: originalUrgentPolicy.name,
          response_time_minutes: originalUrgentPolicy.response_time_minutes,
          resolution_time_minutes: originalUrgentPolicy.resolution_time_minutes,
          is_active: originalUrgentPolicy.is_active,
        },
      });
    }
  }

  // ── Setup / teardown ────────────────────────────────────────────────────────

  beforeAll(async () => {
    app = await createTestApp();

    // Capture the original urgent policy before any mutations
    const adminHeaders = await authHeader("admin");
    const listRes = await app.inject({
      method: "GET",
      url: "/sla/policies",
      headers: adminHeaders,
    });
    expect(listRes.statusCode, "Could not load SLA policies for test setup").toBe(200);
    const policies = listRes.json() as SlaPolicy[];
    const urgent = policies.find((p) => p.priority_id === PRIORITY_URGENT_ID);
    expect(urgent, "Seeded urgent SLA policy (priority_id=4) must exist").toBeTruthy();
    originalUrgentPolicy = urgent!;
  });

  afterAll(async () => {
    const adminHeaders = await authHeader("admin");

    // Clean up any tickets created during testing
    await Promise.all(
      createdTicketIds.map((id) =>
        app.inject({ method: "DELETE", url: `/tickets/${id}`, headers: adminHeaders }),
      ),
    );

    // Restore original urgent policy
    await restoreUrgentPolicy();

    await app.close();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // A1. Reading policies — any authenticated user
  // ──────────────────────────────────────────────────────────────────────────

  describe("GET /sla/policies — any authenticated user can read", () => {
    it("admin receives an array with at least the 4 seeded policies", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({ method: "GET", url: "/sla/policies", headers });
      expect(res.statusCode).toBe(200);
      const list = res.json() as SlaPolicy[];
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(4);
    });

    it("support_member can read policies → 200", async () => {
      const headers = await authHeader("support_member");
      const res = await app.inject({ method: "GET", url: "/sla/policies", headers });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });

    it("client can read policies → 200 (read policy = all authenticated)", async () => {
      const headers = await authHeader("client");
      const res = await app.inject({ method: "GET", url: "/sla/policies", headers });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });

    it("GET /sla/policy-targets returns a map keyed by priority_id", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({ method: "GET", url: "/sla/policy-targets", headers });
      expect(res.statusCode).toBe(200);
      const targets = res.json() as Record<string, { response_time_minutes: number; resolution_time_minutes: number }>;
      // Seeded policies cover all 4 priorities
      expect(Object.keys(targets).length).toBeGreaterThanOrEqual(4);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // A2. Admin writes: PATCH
  // ──────────────────────────────────────────────────────────────────────────

  describe("PATCH /sla/policies/:id — admin only", () => {
    it("admin can update the urgent policy name → 200 with updated fields", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "PATCH",
        url: `/sla/policies/${originalUrgentPolicy.id}`,
        headers,
        payload: { name: "[test-sla-policy] Updated urgent name" },
      });
      expect(res.statusCode, `PATCH failed: ${res.body}`).toBe(200);
      const updated = res.json() as SlaPolicy;
      expect(updated.name).toBe("[test-sla-policy] Updated urgent name");
      expect(updated.id).toBe(originalUrgentPolicy.id);
    });

    it("patched name is reflected in GET /sla/policies", async () => {
      const policies = await getPolicies();
      const urgent = policies.find((p) => p.id === originalUrgentPolicy.id);
      expect(urgent?.name).toBe("[test-sla-policy] Updated urgent name");
    });

    it("admin can revert the name back → 200", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "PATCH",
        url: `/sla/policies/${originalUrgentPolicy.id}`,
        headers,
        payload: { name: originalUrgentPolicy.name },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe(originalUrgentPolicy.name);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // A3. Admin writes: DELETE + CREATE cycle
  // ──────────────────────────────────────────────────────────────────────────

  describe("DELETE + POST /sla/policies — admin only", () => {
    it("admin deletes the urgent policy → {ok: true}", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "DELETE",
        url: `/sla/policies/${originalUrgentPolicy.id}`,
        headers,
      });
      expect(res.statusCode, `DELETE failed: ${res.body}`).toBe(200);
      expect(res.json()).toMatchObject({ ok: true });
    });

    it("deleted policy is no longer in GET /sla/policies", async () => {
      const policies = await getPolicies();
      expect(policies.some((p) => p.id === originalUrgentPolicy.id)).toBe(false);
    });

    it("admin creates a new policy for the urgent priority → 200 with id", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "POST",
        url: "/sla/policies",
        headers,
        payload: {
          name: "[test-sla-policy] Re-created urgent policy",
          priority_id: PRIORITY_URGENT_ID,
          response_time_minutes: 90,
          resolution_time_minutes: 360,
          is_active: true,
        },
      });
      expect(res.statusCode, `POST /sla/policies failed: ${res.body}`).toBe(200);
      const policy = res.json() as SlaPolicy;
      expect(policy.id).toBeTruthy();
      expect(policy.priority_id).toBe(PRIORITY_URGENT_ID);
      newPolicyId = policy.id;
    });

    it("newly created policy appears in GET /sla/policies", async () => {
      expect(newPolicyId).toBeTruthy();
      const policies = await getPolicies();
      expect(policies.some((p) => p.id === newPolicyId)).toBe(true);
    });

    it("admin deletes the newly created policy → {ok: true}", async () => {
      expect(newPolicyId).toBeTruthy();
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "DELETE",
        url: `/sla/policies/${newPolicyId}`,
        headers,
      });
      expect(res.statusCode).toBe(200);
      newPolicyId = null;
    });

    it("afterAll restores the seeded urgent policy (setup check)", async () => {
      // This test just validates that restoreUrgentPolicy() is idempotent —
      // call it now so the remaining test groups see the original policy.
      await restoreUrgentPolicy();
      const urgentPolicy = await getUrgentPolicy();
      expect(urgentPolicy).toBeTruthy();
      expect(urgentPolicy!.is_active).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // A4. Non-admin write attempts — RLS must block
  // ──────────────────────────────────────────────────────────────────────────

  describe("Non-admin cannot mutate SLA policies (RLS: is_admin only)", () => {
    it("support_member POST /sla/policies → 5xx (RLS blocks INSERT)", async () => {
      const headers = await authHeader("support_member");
      const res = await app.inject({
        method: "POST",
        url: "/sla/policies",
        headers,
        payload: {
          name: "[test] Should not be created",
          priority_id: PRIORITY_URGENT_ID,
          response_time_minutes: 60,
          resolution_time_minutes: 240,
          is_active: false,
        },
      });
      expect(
        res.statusCode,
        `Expected RLS to block support_member INSERT: ${res.body}`,
      ).toBeGreaterThanOrEqual(400);
    });

    it("client POST /sla/policies → 5xx (RLS blocks INSERT)", async () => {
      const headers = await authHeader("client");
      const res = await app.inject({
        method: "POST",
        url: "/sla/policies",
        headers,
        payload: {
          name: "[test] Should not be created by client",
          priority_id: PRIORITY_URGENT_ID,
          response_time_minutes: 60,
          resolution_time_minutes: 240,
          is_active: false,
        },
      });
      expect(
        res.statusCode,
        `Expected RLS to block client INSERT: ${res.body}`,
      ).toBeGreaterThanOrEqual(400);
    });

    it("support_member PATCH /sla/policies/:id → 5xx (RLS blocks UPDATE)", async () => {
      const urgentPolicy = await getUrgentPolicy();
      expect(urgentPolicy, "Urgent policy must exist for this test").toBeTruthy();

      const headers = await authHeader("support_member");
      const res = await app.inject({
        method: "PATCH",
        url: `/sla/policies/${urgentPolicy!.id}`,
        headers,
        payload: { name: "[test] Unauthorized update" },
      });
      expect(
        res.statusCode,
        `Expected RLS to block support_member UPDATE: ${res.body}`,
      ).toBeGreaterThanOrEqual(400);
    });

    it("support_member DELETE /sla/policies/:id → 5xx (RLS blocks DELETE)", async () => {
      const urgentPolicy = await getUrgentPolicy();
      expect(urgentPolicy, "Urgent policy must exist for this test").toBeTruthy();

      const headers = await authHeader("support_member");
      const res = await app.inject({
        method: "DELETE",
        url: `/sla/policies/${urgentPolicy!.id}`,
        headers,
      });
      expect(
        res.statusCode,
        `Expected RLS to block support_member DELETE: ${res.body}`,
      ).toBeGreaterThanOrEqual(400);

      // Verify the policy still exists (was not actually deleted)
      const still = await getUrgentPolicy();
      expect(still).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. Correct policy applied to new tickets
// ─────────────────────────────────────────────────────────────────────────────

describe("SLA: correct policy applied to new tickets", () => {
  let app: FastifyInstance;

  let categoryId: number;
  let originalUrgentPolicy: SlaPolicy;

  const createdTicketIds: string[] = [];

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async function createTicket(priorityId: number): Promise<string> {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/tickets",
      headers,
      payload: {
        title: "[test-sla-policy] Correct policy test ticket",
        status_id: STATUS_NEW_ID,
        priority_id: priorityId,
        category_id: categoryId,
      },
    });
    expect(res.statusCode, `Ticket creation failed: ${res.body}`).toBe(200);
    const id: string = res.json().id;
    createdTicketIds.push(id);
    return id;
  }

  async function getSlaInstance(ticketId: string): Promise<SlaInstance | null> {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/sla/instances/${ticketId}`,
      headers,
    });
    expect(res.statusCode, `GET sla/instances/${ticketId} failed: ${res.body}`).toBe(200);
    return res.json() as SlaInstance | null;
  }

  async function getPolicies(): Promise<SlaPolicy[]> {
    const headers = await authHeader("admin");
    const res = await app.inject({ method: "GET", url: "/sla/policies", headers });
    return res.json() as SlaPolicy[];
  }

  async function getUrgentPolicy(): Promise<SlaPolicy | undefined> {
    const policies = await getPolicies();
    return policies.find((p) => p.priority_id === PRIORITY_URGENT_ID);
  }

  async function restoreUrgentPolicy(): Promise<void> {
    if (!originalUrgentPolicy) return;
    const headers = await authHeader("admin");

    const current = await getUrgentPolicy();
    if (!current) {
      await app.inject({
        method: "POST",
        url: "/sla/policies",
        headers,
        payload: {
          name: originalUrgentPolicy.name,
          priority_id: originalUrgentPolicy.priority_id,
          response_time_minutes: originalUrgentPolicy.response_time_minutes,
          resolution_time_minutes: originalUrgentPolicy.resolution_time_minutes,
          is_active: originalUrgentPolicy.is_active,
        },
      });
    } else {
      await app.inject({
        method: "PATCH",
        url: `/sla/policies/${current.id}`,
        headers,
        payload: {
          name: originalUrgentPolicy.name,
          response_time_minutes: originalUrgentPolicy.response_time_minutes,
          resolution_time_minutes: originalUrgentPolicy.resolution_time_minutes,
          is_active: originalUrgentPolicy.is_active,
        },
      });
    }
  }

  // ── Setup / teardown ────────────────────────────────────────────────────────

  beforeAll(async () => {
    app = await createTestApp();
    const adminHeaders = await authHeader("admin");

    // Resolve category ID
    const catRes = await app.inject({
      method: "GET",
      url: "/lookup/categories",
      headers: adminHeaders,
    });
    expect(catRes.statusCode).toBe(200);
    categoryId = (catRes.json() as Array<{ id: number }>)[0].id;

    // Save original urgent policy
    const policies = (
      await app.inject({ method: "GET", url: "/sla/policies", headers: adminHeaders })
    ).json() as SlaPolicy[];
    const urgent = policies.find((p) => p.priority_id === PRIORITY_URGENT_ID);
    expect(urgent, "Seeded urgent SLA policy must exist").toBeTruthy();
    originalUrgentPolicy = urgent!;
  });

  afterAll(async () => {
    const adminHeaders = await authHeader("admin");

    // Clean up tickets
    await Promise.all(
      createdTicketIds.map((id) =>
        app.inject({ method: "DELETE", url: `/tickets/${id}`, headers: adminHeaders }),
      ),
    );

    // Restore original urgent policy
    await restoreUrgentPolicy();

    await app.close();
  });

  // ── B1. New ticket → correct policy assigned ─────────────────────────────

  it("new urgent ticket has an sla_instance matching the urgent policy", async () => {
    const ticketId = await createTicket(PRIORITY_URGENT_ID);
    const instance = await getSlaInstance(ticketId);

    expect(instance, "Expected sla_instance to exist for urgent ticket").not.toBeNull();
    expect(instance!.policy_id).toBe(originalUrgentPolicy.id);
    expect(instance!.response_due_at).toBeTruthy();
    expect(instance!.resolution_due_at).toBeTruthy();
  });

  it("response_due_at ≈ now() + original urgent response_time_minutes (±2 min window)", async () => {
    const ticketId = await createTicket(PRIORITY_URGENT_ID);
    const tBefore = Date.now();
    const instance = await getSlaInstance(ticketId);

    expect(instance).not.toBeNull();
    const responseDue = new Date(instance!.response_due_at).getTime();
    const expectedMin =
      tBefore + (originalUrgentPolicy.response_time_minutes - 2) * 60_000;
    const expectedMax =
      Date.now() + (originalUrgentPolicy.response_time_minutes + 2) * 60_000;

    expect(responseDue).toBeGreaterThan(expectedMin);
    expect(responseDue).toBeLessThan(expectedMax);
  });

  // ── B2. Updated policy times → new tickets pick up the change ────────────

  it("after patching urgent response time to 500 min, new ticket reflects updated deadline", async () => {
    const urgentPolicy = await getUrgentPolicy();
    expect(urgentPolicy).toBeTruthy();

    const PATCHED_RESPONSE_MIN = 500;
    const PATCHED_RESOLUTION_MIN = 1000;
    const adminHeaders = await authHeader("admin");

    // Patch the policy
    const patchRes = await app.inject({
      method: "PATCH",
      url: `/sla/policies/${urgentPolicy!.id}`,
      headers: adminHeaders,
      payload: {
        response_time_minutes: PATCHED_RESPONSE_MIN,
        resolution_time_minutes: PATCHED_RESOLUTION_MIN,
      },
    });
    expect(patchRes.statusCode, `PATCH policy failed: ${patchRes.body}`).toBe(200);

    // Create a ticket now — trigger should use the updated times
    const tBefore = Date.now();
    const ticketId = await createTicket(PRIORITY_URGENT_ID);
    const instance = await getSlaInstance(ticketId);

    expect(instance).not.toBeNull();

    // response_due_at should be approximately now() + 500 min
    const responseDue = new Date(instance!.response_due_at).getTime();
    const expectedMin = tBefore + (PATCHED_RESPONSE_MIN - 2) * 60_000;
    const expectedMax = Date.now() + (PATCHED_RESPONSE_MIN + 2) * 60_000;
    expect(responseDue, "response_due_at should reflect patched 500-min window").toBeGreaterThan(expectedMin);
    expect(responseDue).toBeLessThan(expectedMax);

    // resolution_due_at ≈ now() + 1000 min
    const resolutionDue = new Date(instance!.resolution_due_at).getTime();
    const resExpectedMin = tBefore + (PATCHED_RESOLUTION_MIN - 2) * 60_000;
    const resExpectedMax = Date.now() + (PATCHED_RESOLUTION_MIN + 2) * 60_000;
    expect(resolutionDue).toBeGreaterThan(resExpectedMin);
    expect(resolutionDue).toBeLessThan(resExpectedMax);

    // Restore policy for the next test
    await restoreUrgentPolicy();
  });

  // ── B3. Inactive policy → no SLA instance created ────────────────────────

  it("deactivating the urgent policy → new urgent ticket gets no sla_instance", async () => {
    const urgentPolicy = await getUrgentPolicy();
    expect(urgentPolicy).toBeTruthy();
    const adminHeaders = await authHeader("admin");

    // Deactivate
    const deactivateRes = await app.inject({
      method: "PATCH",
      url: `/sla/policies/${urgentPolicy!.id}`,
      headers: adminHeaders,
      payload: { is_active: false },
    });
    expect(deactivateRes.statusCode, `Deactivate PATCH failed: ${deactivateRes.body}`).toBe(200);

    // Create a ticket — trigger should find no active policy for urgent
    const ticketId = await createTicket(PRIORITY_URGENT_ID);
    const instance = await getSlaInstance(ticketId);

    expect(instance, "No sla_instance should be created when policy is inactive").toBeNull();

    // Re-activate for subsequent tests
    await app.inject({
      method: "PATCH",
      url: `/sla/policies/${urgentPolicy!.id}`,
      headers: adminHeaders,
      payload: { is_active: true },
    });
  });

  // ── B4. Policies for other priorities remain unaffected ──────────────────

  it("low-priority ticket (priority_id=1) still gets its own sla_instance unaffected by urgent changes", async () => {
    const adminHeaders = await authHeader("admin");
    const policies = (
      await app.inject({ method: "GET", url: "/sla/policies", headers: adminHeaders })
    ).json() as SlaPolicy[];
    const lowPolicy = policies.find((p) => p.priority_id === 1);
    expect(lowPolicy, "Seeded low SLA policy must exist").toBeTruthy();

    // Create a low-priority ticket
    const ticketId = await createTicket(1);
    const instance = await getSlaInstance(ticketId);

    expect(instance).not.toBeNull();
    // The policy assigned must match the low policy (not urgent)
    expect(instance!.policy_id).toBe(lowPolicy!.id);
  });

  // ── B5. PATCH then re-create (full CREATE/DELETE) affects trigger correctly ─

  it("a freshly created (POST) policy governs new tickets for that priority", async () => {
    const urgentPolicy = await getUrgentPolicy();
    expect(urgentPolicy).toBeTruthy();
    const adminHeaders = await authHeader("admin");

    // Delete the existing urgent policy
    await app.inject({
      method: "DELETE",
      url: `/sla/policies/${urgentPolicy!.id}`,
      headers: adminHeaders,
    });

    // Re-create with known times
    const NEW_RESPONSE = 111;
    const NEW_RESOLUTION = 222;
    const createRes = await app.inject({
      method: "POST",
      url: "/sla/policies",
      headers: adminHeaders,
      payload: {
        name: "[test-sla-policy] Replacement urgent",
        priority_id: PRIORITY_URGENT_ID,
        response_time_minutes: NEW_RESPONSE,
        resolution_time_minutes: NEW_RESOLUTION,
        is_active: true,
      },
    });
    expect(createRes.statusCode, `POST /sla/policies failed: ${createRes.body}`).toBe(200);
    const newPolicy = createRes.json() as SlaPolicy;

    // Create a ticket with the new policy in place
    const tBefore = Date.now();
    const ticketId = await createTicket(PRIORITY_URGENT_ID);
    const instance = await getSlaInstance(ticketId);

    expect(instance).not.toBeNull();
    expect(instance!.policy_id).toBe(newPolicy.id);

    const responseDue = new Date(instance!.response_due_at).getTime();
    const expectedMin = tBefore + (NEW_RESPONSE - 2) * 60_000;
    const expectedMax = Date.now() + (NEW_RESPONSE + 2) * 60_000;
    expect(responseDue).toBeGreaterThan(expectedMin);
    expect(responseDue).toBeLessThan(expectedMax);

    // Clean up the replacement policy; afterAll will restore original
    await app.inject({
      method: "DELETE",
      url: `/sla/policies/${newPolicy.id}`,
      headers: adminHeaders,
    });
    // afterAll's restoreUrgentPolicy() will re-create the original
  });
});
