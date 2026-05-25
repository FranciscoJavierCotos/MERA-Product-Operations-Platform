/**
 * Integration tests: Task lifecycle — complete / reopen with time_spent_minutes
 *
 * Covers the optimistic-update path that powers the dashboard's "My Tasks"
 * checkbox + "Reopen" action.
 *
 * Service contract (apps/api/src/services/tasks.ts):
 *   completeTask(id, timeSpentMinutes?)
 *     → status="completed", completed_at=now, time_spent_minutes=<n> if provided
 *   reopenTask(id)
 *     → status="pending", completed_at=null
 *       (time_spent_minutes is intentionally NOT cleared so a re-complete
 *        without a new value keeps the prior total)
 *
 * Route contract (apps/api/src/routes/tasks.ts):
 *   POST /tasks/:id/complete   body: { time_spent_minutes?: number }
 *   POST /tasks/:id/reopen     body: none
 *
 * Requires: local Supabase running with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader, TEST_USERS } from "../test-helpers/auth.js";

interface TaskRow {
  id: string;
  status: "pending" | "completed";
  completed_at: string | null;
  time_spent_minutes: number | null;
  title: string;
  assigned_to: string | null;
  created_by: string;
}

describe("Task lifecycle: complete / reopen", () => {
  let app: FastifyInstance;
  const createdTaskIds: string[] = [];

  /** Create a fresh pending task owned by the admin and return its id. */
  async function newPendingTask(suffix: string): Promise<string> {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/tasks",
      headers: adminHeaders,
      payload: {
        title: `[test-task-lifecycle] ${suffix}`,
        priority: "medium",
        assigned_to: TEST_USERS.admin.id,
      },
    });
    expect(res.statusCode, `Task create failed: ${res.body}`).toBe(200);
    const id: string = res.json().id;
    createdTaskIds.push(id);
    return id;
  }

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    const adminHeaders = await authHeader("admin");
    await Promise.all(
      createdTaskIds.map((id) =>
        app.inject({ method: "DELETE", url: `/tasks/${id}`, headers: adminHeaders }),
      ),
    );
    await app.close();
  });

  // ── Complete ──────────────────────────────────────────────────────────────

  it("POST /tasks/:id/complete with time_spent_minutes sets status, completed_at, and time", async () => {
    const adminHeaders = await authHeader("admin");
    const taskId = await newPendingTask("complete-with-time");

    const beforeIso = new Date().toISOString();
    const res = await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers: adminHeaders,
      payload: { time_spent_minutes: 90 },
    });
    expect(res.statusCode).toBe(200);
    const task = res.json() as TaskRow;
    expect(task.status).toBe("completed");
    expect(task.time_spent_minutes).toBe(90);
    expect(task.completed_at).not.toBeNull();
    // completed_at is set by the API to "now" — within a few seconds of beforeIso
    expect(new Date(task.completed_at!).getTime()).toBeGreaterThanOrEqual(
      new Date(beforeIso).getTime() - 1000,
    );
  });

  it("POST /tasks/:id/complete without time_spent_minutes still transitions to completed", async () => {
    const adminHeaders = await authHeader("admin");
    const taskId = await newPendingTask("complete-no-time");

    const res = await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers: adminHeaders,
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const task = res.json() as TaskRow;
    expect(task.status).toBe("completed");
    expect(task.completed_at).not.toBeNull();
    // time_spent_minutes was never set on this task → remains null or default
    expect([null, 0]).toContain(task.time_spent_minutes);
  });

  it("POST /tasks/:id/complete with time_spent_minutes=0 is accepted (zero-time done)", async () => {
    const adminHeaders = await authHeader("admin");
    const taskId = await newPendingTask("complete-zero-time");

    const res = await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers: adminHeaders,
      payload: { time_spent_minutes: 0 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("completed");
    expect(res.json().time_spent_minutes).toBe(0);
  });

  it("POST /tasks/:id/complete with non-integer time → 400", async () => {
    const adminHeaders = await authHeader("admin");
    const taskId = await newPendingTask("complete-bad-time");

    const res = await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers: adminHeaders,
      payload: { time_spent_minutes: 12.5 },
    });
    expect(res.statusCode).toBe(400);
  });

  // ── Reopen ────────────────────────────────────────────────────────────────

  it("POST /tasks/:id/reopen on a completed task clears completed_at and sets status=pending", async () => {
    const adminHeaders = await authHeader("admin");
    const taskId = await newPendingTask("reopen-roundtrip");

    // 1. Complete with a known time
    await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers: adminHeaders,
      payload: { time_spent_minutes: 60 },
    });

    // 2. Reopen
    const reopenRes = await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/reopen`,
      headers: adminHeaders,
    });
    expect(reopenRes.statusCode).toBe(200);
    const reopened = reopenRes.json() as TaskRow;
    expect(reopened.status).toBe("pending");
    expect(reopened.completed_at).toBeNull();
    // The service deliberately preserves time_spent_minutes — only completed_at
    // and status are touched. This keeps any logged time visible on retry.
    expect(reopened.time_spent_minutes).toBe(60);
  });

  it("complete → reopen → complete with a NEW time updates time_spent_minutes", async () => {
    const adminHeaders = await authHeader("admin");
    const taskId = await newPendingTask("re-complete-with-new-time");

    await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers: adminHeaders,
      payload: { time_spent_minutes: 30 },
    });
    await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/reopen`,
      headers: adminHeaders,
    });

    const final = await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers: adminHeaders,
      payload: { time_spent_minutes: 45 },
    });
    expect(final.statusCode).toBe(200);
    const task = final.json() as TaskRow;
    expect(task.status).toBe("completed");
    // Overwritten (NOT additive) — the route stores exactly what's posted
    expect(task.time_spent_minutes).toBe(45);
  });

  it("POST /tasks/:id/reopen with non-uuid → 400", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/tasks/not-a-uuid/reopen",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /tasks/:id/complete with non-uuid → 400", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/tasks/not-a-uuid/complete",
      headers: adminHeaders,
      payload: { time_spent_minutes: 10 },
    });
    expect(res.statusCode).toBe(400);
  });

  // ── PATCH /tasks/:id status transitions also auto-manage completed_at ────

  it("PATCH /tasks/:id status='completed' also sets completed_at", async () => {
    // updateTask() in services/tasks.ts has the same auto-completed_at logic
    const adminHeaders = await authHeader("admin");
    const taskId = await newPendingTask("patch-status-completed");

    const res = await app.inject({
      method: "PATCH",
      url: `/tasks/${taskId}`,
      headers: adminHeaders,
      payload: { status: "completed" },
    });
    expect(res.statusCode).toBe(200);
    const task = res.json() as TaskRow;
    expect(task.status).toBe("completed");
    expect(task.completed_at).not.toBeNull();
  });

  it("PATCH /tasks/:id status='pending' clears completed_at", async () => {
    const adminHeaders = await authHeader("admin");
    const taskId = await newPendingTask("patch-status-pending");

    // First complete
    await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers: adminHeaders,
    });

    const res = await app.inject({
      method: "PATCH",
      url: `/tasks/${taskId}`,
      headers: adminHeaders,
      payload: { status: "pending" },
    });
    expect(res.statusCode).toBe(200);
    const task = res.json() as TaskRow;
    expect(task.status).toBe("pending");
    expect(task.completed_at).toBeNull();
  });
});
