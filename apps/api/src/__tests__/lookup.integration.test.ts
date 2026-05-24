/**
 * Integration tests: Admin-only lookup table mutations
 *
 * Verifies that write operations on lookup tables (statuses, priorities,
 * categories…) are gated by RLS policies that require `is_admin(auth.uid())`.
 *
 * The `ticket_statuses_admin_write`, `ticket_priorities_admin_write`, and
 * `ticket_categories_admin_write` RLS policies block INSERT / UPDATE / DELETE
 * for any non-admin authenticated session. When RLS blocks an insert the
 * Supabase client returns a Postgres error which the error handler surfaces
 * as a 4xx/5xx — we assert `>= 400` (not a specific code) to remain resilient
 * to whether the rejection comes from the DB or from a future API-layer check.
 *
 * Cleanup: any status/priority rows created during the admin tests are deleted
 * in afterAll to keep the DB clean for subsequent runs.
 *
 * Requires: local Supabase running with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

describe("Admin-only lookup mutations", () => {
  let app: FastifyInstance;

  // Track created rows for cleanup
  const createdStatusIds: number[] = [];
  const createdPriorityIds: number[] = [];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    const headers = await authHeader("admin");

    // Clean up any rows created by the admin tests
    await Promise.all([
      ...createdStatusIds.map((id) =>
        app.inject({ method: "DELETE", url: `/lookup/statuses/${id}`, headers }),
      ),
      ...createdPriorityIds.map((id) =>
        app.inject({ method: "DELETE", url: `/lookup/priorities/${id}`, headers }),
      ),
    ]);

    await app.close();
  });

  // ── Read access is open to all authenticated roles ────────────────────────

  it("client can read ticket statuses → 200", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({ method: "GET", url: "/lookup/statuses", headers });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("support_member can read ticket priorities → 200", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({ method: "GET", url: "/lookup/priorities", headers });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  // ── Non-admin write attempts are blocked by RLS ───────────────────────────

  it("support_member cannot create a ticket status → ≥400 (RLS blocks)", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({
      method: "POST",
      url: "/lookup/statuses",
      headers,
      payload: {
        name: "test_status_member_attempt",
        label: "Test Status (member attempt)",
        display_order: 9901,
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("client cannot create a ticket status → ≥400 (RLS blocks)", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "POST",
      url: "/lookup/statuses",
      headers,
      payload: {
        name: "test_status_client_attempt",
        label: "Test Status (client attempt)",
        display_order: 9902,
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("support_member cannot create a ticket priority → ≥400 (RLS blocks)", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({
      method: "POST",
      url: "/lookup/priorities",
      headers,
      payload: {
        name: "test_priority_member_attempt",
        label: "Test Priority (member attempt)",
        display_order: 9903,
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("client cannot create a ticket category → ≥400 (RLS blocks)", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "POST",
      url: "/lookup/categories",
      headers,
      payload: {
        name: "test_category_client_attempt",
        label: "Test Category (client attempt)",
        display_order: 9904,
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  // ── Admin write access is permitted ──────────────────────────────────────

  it("admin can create a ticket status → 200 with id", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/lookup/statuses",
      headers,
      payload: {
        name: "test_status_admin_created",
        label: "Test Status (admin)",
        display_order: 9905,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("id");
    expect(body.name).toBe("test_status_admin_created");
    createdStatusIds.push(body.id as number);
  });

  it("admin can update the status they just created → 200", async () => {
    expect(createdStatusIds.length).toBeGreaterThan(0);
    const headers = await authHeader("admin");
    const statusId = createdStatusIds[0];
    const res = await app.inject({
      method: "PATCH",
      url: `/lookup/statuses/${statusId}`,
      headers,
      payload: { label: "Test Status (admin, updated)" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().label).toBe("Test Status (admin, updated)");
  });

  it("support_member cannot update an existing status → ≥400", async () => {
    // Use the first seeded status (id=1 is a safe assumption given seed data)
    const headers = await authHeader("support_member");
    const statusesRes = await app.inject({
      method: "GET",
      url: "/lookup/statuses",
      headers,
    });
    const firstId: number = statusesRes.json()[0].id;

    const res = await app.inject({
      method: "PATCH",
      url: `/lookup/statuses/${firstId}`,
      headers,
      payload: { label: "Tampered label" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("admin can create a ticket priority → 200 with id", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/lookup/priorities",
      headers,
      payload: {
        name: "test_priority_admin_created",
        label: "Test Priority (admin)",
        display_order: 9906,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("id");
    createdPriorityIds.push(body.id as number);
  });
});
