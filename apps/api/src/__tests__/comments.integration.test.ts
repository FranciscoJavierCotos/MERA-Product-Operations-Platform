/**
 * Integration tests: Internal comment visibility
 *
 * Verifies that the `ticket_comments_read` RLS policy enforces confidentiality
 * of internal comments:
 *
 *   Policy (from migration 001_initial_schema.sql):
 *     SELECT allowed when:
 *       (NOT is_internal AND (is_support_or_admin(uid) OR ticket owned/assigned to uid))
 *       OR
 *       (is_internal AND is_support_or_admin(uid))
 *
 * What this means:
 *   - Internal comments (is_internal = true) are ONLY visible to support/admin.
 *   - Public comments are visible to support/admin AND the ticket's client owner.
 *   - Clients can NEVER see internal comments, even on their own ticket.
 *
 * Additionally tests that clients cannot INSERT internal comments
 * (ticket_comments_insert policy blocks it).
 *
 * Test setup:
 *   1. Client creates a ticket (so they are the owner / created_by).
 *   2. Support member posts one internal comment and one public comment.
 *   3. Client reads comments → sees only the public one.
 *   4. Support member reads comments → sees both.
 *   5. Client attempts to post an internal comment → blocked (≥400).
 *
 * Requires: local Supabase running with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

interface CommentStub {
  id: string;
  content: string;
  is_internal: boolean;
}

const INTERNAL_CONTENT = "[test-internal] Confidential diagnostics — support only";
const PUBLIC_CONTENT = "[test-public] Public reply visible to the client";

describe("Internal comment visibility", () => {
  let app: FastifyInstance;
  let ticketId: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Resolve valid lookup IDs
    const adminHeaders = await authHeader("admin");
    const [statusRes, priorityRes, categoryRes] = await Promise.all([
      app.inject({ method: "GET", url: "/lookup/statuses", headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/priorities", headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/categories", headers: adminHeaders }),
    ]);
    const statusId: number = statusRes.json()[0].id;
    const priorityId: number = priorityRes.json()[0].id;
    const categoryId: number = categoryRes.json()[0].id;

    // Client creates the ticket — they are `created_by`, giving them read access
    const clientHeaders = await authHeader("client");
    const ticketRes = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: clientHeaders,
      payload: {
        title: "[test] Client ticket for comment visibility test",
        status_id: statusId,
        priority_id: priorityId,
        category_id: categoryId,
      },
    });
    expect(ticketRes.statusCode).toBe(200);
    ticketId = ticketRes.json().id;

    // Support member posts both an internal and a public comment
    const memberHeaders = await authHeader("support_member");

    const internalRes = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: memberHeaders,
      payload: { content: INTERNAL_CONTENT, is_internal: true },
    });
    expect(
      internalRes.statusCode,
      `Expected 200 when support_member posts internal comment, got ${internalRes.statusCode}: ${internalRes.body}`,
    ).toBe(200);

    const publicRes = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: memberHeaders,
      payload: { content: PUBLIC_CONTENT, is_internal: false },
    });
    expect(publicRes.statusCode).toBe(200);
  });

  afterAll(async () => {
    // Delete the ticket (cascades to comments)
    if (ticketId) {
      const adminHeaders = await authHeader("admin");
      await app.inject({
        method: "DELETE",
        url: `/tickets/${ticketId}`,
        headers: adminHeaders,
      });
    }
    await app.close();
  });

  // ── Client cannot see internal comments ───────────────────────────────────

  it("client gets zero internal comments on their own ticket", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "GET",
      url: `/tickets/${ticketId}/comments`,
      headers,
    });
    expect(res.statusCode).toBe(200);

    const comments = res.json() as CommentStub[];
    const internal = comments.filter((c) => c.is_internal);
    expect(
      internal,
      "Client should not receive any is_internal=true comments",
    ).toHaveLength(0);
  });

  it("client does NOT receive the internal comment content", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "GET",
      url: `/tickets/${ticketId}/comments`,
      headers,
    });
    const comments = res.json() as CommentStub[];
    const leaked = comments.some((c) => c.content === INTERNAL_CONTENT);
    expect(leaked, "Internal comment content must not be visible to client").toBe(false);
  });

  // ── Client CAN see public comments ────────────────────────────────────────

  it("client sees the public comment on their own ticket", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "GET",
      url: `/tickets/${ticketId}/comments`,
      headers,
    });
    expect(res.statusCode).toBe(200);

    const comments = res.json() as CommentStub[];
    const hasPublic = comments.some((c) => c.content === PUBLIC_CONTENT);
    expect(hasPublic, "Client should see the public comment").toBe(true);
  });

  // ── Support member sees all comments ─────────────────────────────────────

  it("support_member sees both the internal and the public comment", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({
      method: "GET",
      url: `/tickets/${ticketId}/comments`,
      headers,
    });
    expect(res.statusCode).toBe(200);

    const comments = res.json() as CommentStub[];
    expect(comments.some((c) => c.is_internal && c.content === INTERNAL_CONTENT)).toBe(true);
    expect(comments.some((c) => !c.is_internal && c.content === PUBLIC_CONTENT)).toBe(true);
  });

  it("admin sees both comments too", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/tickets/${ticketId}/comments`,
      headers,
    });
    expect(res.statusCode).toBe(200);

    const comments = res.json() as CommentStub[];
    expect(comments.some((c) => c.is_internal)).toBe(true);
  });

  // ── Client cannot INSERT internal comments ────────────────────────────────

  it("client cannot post an internal comment → ≥400 (RLS insert policy blocks)", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers,
      payload: {
        content: "[test-internal-attempt] Client trying to set is_internal",
        is_internal: true,
      },
    });
    // RLS insert check: is_support_or_admin OR (NOT is_internal AND ...)
    // Client is neither support/admin, so is_internal=true → blocked
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("client CAN post a public comment on their own ticket → 200", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers,
      payload: {
        content: "[test-public] Client reply",
        is_internal: false,
      },
    });
    expect(res.statusCode).toBe(200);
  });
});
