/**
 * Integration tests: Task stats aggregation correctness
 *
 * GET /tasks/stats returns counts for the current user (assigned_to OR
 * created_by). The shape — TaskStats — is:
 *   { total: number, pending: number, completed: number, overdue: number }
 *
 * "overdue" = status='pending' AND due_date IS NOT NULL AND due_date < now().
 *
 * The seeded database may already contain unrelated tasks, so this suite uses
 * a delta-based approach:
 *   1. Snapshot baseline stats.
 *   2. Create N tasks with known statuses + due dates.
 *   3. Re-fetch stats and assert the delta matches the expected counts.
 *   4. Clean up all created tasks in afterAll.
 *
 * Also asserts:
 *   - total == pending + completed (the two terminal statuses partition the set).
 *   - Completing a task moves the count from pending → completed without
 *     changing total.
 *   - A past due_date on a pending task increments `overdue` by exactly 1.
 *   - A past due_date on a COMPLETED task does NOT count as overdue.
 *
 * Requires: local Supabase running with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader, TEST_USERS } from "../test-helpers/auth.js";

interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
}

describe("Task stats aggregation", () => {
  let app: FastifyInstance;
  const createdTaskIds: string[] = [];

  async function fetchStats(): Promise<TaskStats> {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tasks/stats",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    return res.json() as TaskStats;
  }

  async function createTask(payload: {
    title: string;
    status?: "pending" | "completed";
    due_date?: string;
  }): Promise<string> {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/tasks",
      headers: adminHeaders,
      payload: {
        title: payload.title,
        priority: "medium",
        assigned_to: TEST_USERS.admin.id,
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.due_date ? { due_date: payload.due_date } : {}),
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

  // ── Shape ─────────────────────────────────────────────────────────────────

  it("GET /tasks/stats returns all four fields as numbers", async () => {
    const stats = await fetchStats();
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.pending).toBe("number");
    expect(typeof stats.completed).toBe("number");
    expect(typeof stats.overdue).toBe("number");
  });

  it("total = pending + completed (status is partitioned)", async () => {
    const stats = await fetchStats();
    expect(stats.total).toBe(stats.pending + stats.completed);
  });

  it("overdue ≤ pending (overdue is a subset of pending)", async () => {
    const stats = await fetchStats();
    expect(stats.overdue).toBeLessThanOrEqual(stats.pending);
  });

  // ── Delta-based correctness ───────────────────────────────────────────────

  it("creating 2 pending and 1 completed task moves stats by (+3, +2, +1, 0)", async () => {
    const before = await fetchStats();

    await createTask({ title: "[test-stats] pending 1" });
    await createTask({ title: "[test-stats] pending 2" });
    const completedId = await createTask({ title: "[test-stats] to-complete" });
    // Mark the third one completed via the dedicated endpoint
    const adminHeaders = await authHeader("admin");
    await app.inject({
      method: "POST",
      url: `/tasks/${completedId}/complete`,
      headers: adminHeaders,
    });

    const after = await fetchStats();
    expect(after.total     - before.total).toBe(3);
    expect(after.pending   - before.pending).toBe(2);
    expect(after.completed - before.completed).toBe(1);
    // The new tasks have no due_date → no overdue delta
    expect(after.overdue   - before.overdue).toBe(0);
  });

  it("completing a pending task shifts the count from pending to completed (total unchanged)", async () => {
    const taskId = await createTask({ title: "[test-stats] shift-to-completed" });
    const mid = await fetchStats();

    const adminHeaders = await authHeader("admin");
    await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers: adminHeaders,
    });

    const after = await fetchStats();
    expect(after.total).toBe(mid.total);
    expect(after.pending).toBe(mid.pending - 1);
    expect(after.completed).toBe(mid.completed + 1);
  });

  it("a pending task with a PAST due_date increments overdue by exactly 1", async () => {
    const before = await fetchStats();

    const past = "2000-01-01T00:00:00.000Z"; // safely in the past
    await createTask({ title: "[test-stats] overdue-pending", due_date: past });

    const after = await fetchStats();
    expect(after.total    - before.total).toBe(1);
    expect(after.pending  - before.pending).toBe(1);
    expect(after.overdue  - before.overdue).toBe(1);
  });

  it("a pending task with a FUTURE due_date does NOT increment overdue", async () => {
    const before = await fetchStats();
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await createTask({ title: "[test-stats] future-pending", due_date: future });

    const after = await fetchStats();
    expect(after.total    - before.total).toBe(1);
    expect(after.pending  - before.pending).toBe(1);
    expect(after.overdue  - before.overdue).toBe(0);
  });

  it("a COMPLETED task with a past due_date does NOT count as overdue", async () => {
    const before = await fetchStats();

    const past = "2000-01-01T00:00:00.000Z";
    const taskId = await createTask({ title: "[test-stats] past-completed", due_date: past });
    const adminHeaders = await authHeader("admin");
    await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers: adminHeaders,
    });

    const after = await fetchStats();
    expect(after.completed - before.completed).toBe(1);
    // Overdue only counts pending tasks
    expect(after.overdue   - before.overdue).toBe(0);
  });

  it("reopening a completed task moves it back to pending in the stats", async () => {
    const taskId = await createTask({ title: "[test-stats] reopen-cycle" });

    const adminHeaders = await authHeader("admin");
    await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/complete`,
      headers: adminHeaders,
    });
    const afterComplete = await fetchStats();

    await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/reopen`,
      headers: adminHeaders,
    });
    const afterReopen = await fetchStats();

    // Reopen: completed -1, pending +1, total unchanged
    expect(afterReopen.total).toBe(afterComplete.total);
    expect(afterReopen.pending  ).toBe(afterComplete.pending   + 1);
    expect(afterReopen.completed).toBe(afterComplete.completed - 1);
  });
});
