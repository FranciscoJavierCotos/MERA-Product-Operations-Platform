/**
 * Integration tests: Ticket comment CRUD + time tracking
 *
 * Covers the day-to-day support workflow:
 *   - POST   /tickets/:ticketId/comments   create a comment with time_worked_minutes
 *   - PATCH  /comments/:id                 edit comment content (immutable time field)
 *   - DELETE /comments/:id                 remove a comment
 *   - GET    /tickets/:id/comments         list comments (returns most-recent first)
 *
 * Verifies that:
 *   - time_worked_minutes is stored verbatim and surfaced via GET.
 *   - When time_worked_minutes is omitted, the service defaults to 0
 *     (see services/comments.ts → `comment.time_worked_minutes || 0`).
 *   - Editing content does NOT clobber the time_worked_minutes field.
 *   - Deleting a comment removes it from the list.
 *   - is_internal flag round-trips correctly when set by support staff.
 *
 * Separate from comments.integration.test.ts which covers RLS visibility.
 *
 * Requires: local Supabase running with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

interface CommentRow {
  id: string;
  content: string;
  time_worked_minutes: number;
  is_internal: boolean;
  ticket_id: string;
  created_at: string;
  updated_at: string;
}

describe("Comment CRUD + time tracking", () => {
  let app: FastifyInstance;
  let ticketId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const adminHeaders = await authHeader("admin");

    const [statusRes, priorityRes, categoryRes] = await Promise.all([
      app.inject({ method: "GET", url: "/lookup/statuses",   headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/priorities", headers: adminHeaders }),
      app.inject({ method: "GET", url: "/lookup/categories", headers: adminHeaders }),
    ]);

    const ticketRes = await app.inject({
      method: "POST",
      url: "/tickets",
      headers: adminHeaders,
      payload: {
        title: "[test-comments] Comment CRUD parent ticket",
        status_id:   statusRes.json()[0].id,
        priority_id: priorityRes.json()[0].id,
        category_id: categoryRes.json()[0].id,
      },
    });
    expect(ticketRes.statusCode).toBe(200);
    ticketId = ticketRes.json().id;
  });

  afterAll(async () => {
    if (ticketId) {
      const adminHeaders = await authHeader("admin");
      // Deleting the ticket cascades to comments
      await app.inject({
        method: "DELETE",
        url: `/tickets/${ticketId}`,
        headers: adminHeaders,
      });
    }
    await app.close();
  });

  // ── Create ────────────────────────────────────────────────────────────────

  it("POST /tickets/:id/comments stores time_worked_minutes verbatim", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
      payload: {
        content: "[test-comments] Spent 45 minutes investigating",
        time_worked_minutes: 45,
      },
    });
    expect(res.statusCode).toBe(200);
    const created = res.json() as CommentRow;
    expect(created.time_worked_minutes).toBe(45);
    expect(created.content).toBe("[test-comments] Spent 45 minutes investigating");
    expect(created.ticket_id).toBe(ticketId);
  });

  it("POST without time_worked_minutes defaults to 0", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
      payload: { content: "[test-comments] No time field" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().time_worked_minutes).toBe(0);
  });

  it("POST with time_worked_minutes=0 is accepted", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
      payload: {
        content: "[test-comments] Zero-time comment (admin note)",
        time_worked_minutes: 0,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().time_worked_minutes).toBe(0);
  });

  it("POST with negative time_worked_minutes → 400 (schema: min(0))", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
      payload: {
        content: "[test-comments] Negative time",
        time_worked_minutes: -10,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST with empty content → 400 (schema: min(1))", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
      payload: { content: "" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST is_internal=true round-trips for support_member", async () => {
    const memberHeaders = await authHeader("support_member");
    const res = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: memberHeaders,
      payload: {
        content: "[test-comments] Internal investigation note",
        is_internal: true,
        time_worked_minutes: 15,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().is_internal).toBe(true);
    expect(res.json().time_worked_minutes).toBe(15);
  });

  // ── Read ──────────────────────────────────────────────────────────────────

  it("GET /tickets/:id/comments returns the created comments", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const comments = res.json() as CommentRow[];
    // Multiple comments were created above; their times should be visible
    const times = comments.map((c) => c.time_worked_minutes).sort((a, b) => a - b);
    expect(times).toContain(0);
    expect(times).toContain(15);
    expect(times).toContain(45);
  });

  it("GET orders comments by created_at DESC (most-recent first)", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
    });
    const comments = res.json() as CommentRow[];
    for (let i = 1; i < comments.length; i++) {
      const prev = new Date(comments[i - 1]!.created_at).getTime();
      const curr = new Date(comments[i]!.created_at).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  // ── Update ────────────────────────────────────────────────────────────────

  it("PATCH /comments/:id updates content but leaves time_worked_minutes intact", async () => {
    const adminHeaders = await authHeader("admin");

    // Create a fresh comment with a known time so we can assert it survives
    const create = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
      payload: {
        content: "[test-comments] Original content (30 min)",
        time_worked_minutes: 30,
      },
    });
    const commentId: string = create.json().id;

    const update = await app.inject({
      method: "PATCH",
      url: `/comments/${commentId}`,
      headers: adminHeaders,
      payload: { content: "[test-comments] Edited content" },
    });
    expect(update.statusCode).toBe(200);
    const updated = update.json() as CommentRow;
    expect(updated.content).toBe("[test-comments] Edited content");
    // The PATCH route only accepts a `content` field — time must be unchanged
    expect(updated.time_worked_minutes).toBe(30);
  });

  it("PATCH /comments/:id with empty content → 400", async () => {
    const adminHeaders = await authHeader("admin");
    // Need a real comment to patch
    const create = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
      payload: { content: "[test-comments] To be edited (will fail)" },
    });
    const commentId: string = create.json().id;

    const res = await app.inject({
      method: "PATCH",
      url: `/comments/${commentId}`,
      headers: adminHeaders,
      payload: { content: "" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("PATCH /comments/:id with non-uuid → 400", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "PATCH",
      url: "/comments/not-a-uuid",
      headers: adminHeaders,
      payload: { content: "anything" },
    });
    expect(res.statusCode).toBe(400);
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  it("DELETE /comments/:id removes the comment", async () => {
    const adminHeaders = await authHeader("admin");

    const create = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
      payload: {
        content: "[test-comments] Soon to be deleted",
        time_worked_minutes: 5,
      },
    });
    const commentId: string = create.json().id;

    const del = await app.inject({
      method: "DELETE",
      url: `/comments/${commentId}`,
      headers: adminHeaders,
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().success).toBe(true);

    // Confirm it's no longer in the list
    const list = await app.inject({
      method: "GET",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
    });
    const remaining = list.json() as CommentRow[];
    expect(remaining.find((c) => c.id === commentId)).toBeUndefined();
  });
});
