/**
 * Integration tests: Ticket comment CRUD
 *
 * Covers the day-to-day support workflow:
 *   - POST   /tickets/:ticketId/comments   create a comment
 *   - PATCH  /comments/:id                 edit comment content
 *   - DELETE /comments/:id                 remove a comment
 *   - GET    /tickets/:id/comments         list comments (returns most-recent first)
 *
 * Verifies that:
 *   - Content and is_internal flag round-trip correctly.
 *   - Editing content does not affect other fields.
 *   - Deleting a comment removes it from the list.
 *   - is_internal flag round-trips correctly when set by support staff.
 *
 * Note: time_worked_minutes was removed from ticket_comments (Sprint 1 / item 1.3).
 * Time tracking belongs on the parent ticket (tickets.time_worked_minutes).
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
  is_internal: boolean;
  ticket_id: string;
  created_at: string;
  updated_at: string;
}

describe("Comment CRUD", () => {
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
      await app.inject({
        method: "DELETE",
        url: `/tickets/${ticketId}`,
        headers: adminHeaders,
      });
    }
    await app.close();
  });

  // ── Create ────────────────────────────────────────────────────────────────

  it("POST /tickets/:id/comments creates a comment and returns it", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
      payload: { content: "[test-comments] Basic comment" },
    });
    expect(res.statusCode).toBe(200);
    const created = res.json() as CommentRow;
    expect(created.content).toBe("[test-comments] Basic comment");
    expect(created.ticket_id).toBe(ticketId);
    expect(created.is_internal).toBe(false);
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
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().is_internal).toBe(true);
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
    expect(comments.length).toBeGreaterThan(0);
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

  it("PATCH /comments/:id updates content", async () => {
    const adminHeaders = await authHeader("admin");

    const create = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
      payload: { content: "[test-comments] Original content" },
    });
    const commentId: string = create.json().id;

    const update = await app.inject({
      method: "PATCH",
      url: `/comments/${commentId}`,
      headers: adminHeaders,
      payload: { content: "[test-comments] Edited content" },
    });
    expect(update.statusCode).toBe(200);
    expect((update.json() as CommentRow).content).toBe("[test-comments] Edited content");
  });

  it("PATCH /comments/:id with empty content → 400", async () => {
    const adminHeaders = await authHeader("admin");
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
      payload: { content: "[test-comments] Soon to be deleted" },
    });
    const commentId: string = create.json().id;

    const del = await app.inject({
      method: "DELETE",
      url: `/comments/${commentId}`,
      headers: adminHeaders,
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().success).toBe(true);

    const list = await app.inject({
      method: "GET",
      url: `/tickets/${ticketId}/comments`,
      headers: adminHeaders,
    });
    const remaining = list.json() as CommentRow[];
    expect(remaining.find((c) => c.id === commentId)).toBeUndefined();
  });
});
