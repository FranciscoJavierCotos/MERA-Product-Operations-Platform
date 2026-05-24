/**
 * Integration tests: Role elevation prevention
 *
 * Verifies that PATCH /users/:id correctly enforces the two-layer privilege
 * check introduced in apps/api/src/routes/users.ts:
 *
 *   Layer 1 — API route logic:
 *     - Non-admins may only update their own profile.
 *     - Non-admins may not include `role` or `team_id` in the body.
 *
 *   Layer 2 — DB trigger (prevent_role_self_elevation):
 *     - A BEFORE UPDATE trigger on `profiles` blocks any non-admin authenticated
 *       session from changing the `role` column, even if the API check somehow
 *       passed (defense-in-depth).
 *
 * Tested in both directions:
 *   - support_member / client → 403 when attempting privilege escalation
 *   - admin → 200 when changing any user's role (and the change is verified)
 *
 * Requires: local Supabase running with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader, TEST_USERS } from "../test-helpers/auth.js";

describe("Role elevation prevention", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Self-elevation attempts ───────────────────────────────────────────────

  it("support_member cannot elevate their own role to admin → 403", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.support_member.id}`,
      headers,
      payload: { role: "admin" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("forbidden");
  });

  it("support_member cannot escalate to support_lead → 403", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.support_member.id}`,
      headers,
      payload: { role: "support_lead" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("forbidden");
  });

  it("client cannot change their own role → 403", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.client.id}`,
      headers,
      payload: { role: "support_member" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("client cannot include team_id (admin-only field) → 403", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.client.id}`,
      headers,
      payload: { team_id: TEST_USERS.admin.id }, // any UUID
    });
    expect(res.statusCode).toBe(403);
  });

  // ── Horizontal privilege check (non-admin updating another user) ──────────

  it("support_member cannot update another user's profile → 403", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.client.id}`,
      headers,
      payload: { full_name: "Hacked by member" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("forbidden");
  });

  it("client cannot update another user's profile → 403", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.admin.id}`,
      headers,
      payload: { full_name: "Hacked admin" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("client cannot update the support_member's profile → 403", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.support_member.id}`,
      headers,
      payload: { full_name: "Hacked member" },
    });
    expect(res.statusCode).toBe(403);
  });

  // ── Allowed self-updates (non-role fields) ────────────────────────────────

  it("support_member can update their own full_name (non-privileged field) → 200", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.support_member.id}`,
      headers,
      payload: { full_name: "Test Support (updated)" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().full_name).toBe("Test Support (updated)");
  });

  it("client can update their own full_name → 200", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.client.id}`,
      headers,
      payload: { full_name: "Test Client (updated)" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().full_name).toBe("Test Client (updated)");
  });

  // ── Admin privilege — full control ────────────────────────────────────────

  it("admin can change any user's role and the DB reflects the change → 200", async () => {
    const headers = await authHeader("admin");

    // Promote support_member → support_lead
    const promoteRes = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.support_member.id}`,
      headers,
      payload: { role: "support_lead" },
    });
    expect(promoteRes.statusCode).toBe(200);
    expect(promoteRes.json().role).toBe("support_lead");

    // Restore original role
    const restoreRes = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.support_member.id}`,
      headers,
      payload: { role: "support_member" },
    });
    expect(restoreRes.statusCode).toBe(200);
    expect(restoreRes.json().role).toBe("support_member");
  });

  it("admin can update another user's full_name → 200", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.client.id}`,
      headers,
      payload: { full_name: "Test Client (admin edit)" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().full_name).toBe("Test Client (admin edit)");
  });

  it("admin can update their own profile → 200", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "PATCH",
      url: `/users/${TEST_USERS.admin.id}`,
      headers,
      payload: { full_name: "Test Admin (self-edit)" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().full_name).toBe("Test Admin (self-edit)");
  });
});
