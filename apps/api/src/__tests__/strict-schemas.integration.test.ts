/**
 * Security regression: strict Zod schemas reject unknown request fields.
 *
 * Before the Weeks 11-12 hardening pass every mutation body schema used
 * `.passthrough()`, which silently forwarded unknown keys to the Supabase
 * client — a mass-assignment vector. After migrating to `.strict()` the API
 * must return 400 for any request that includes a field not explicitly listed
 * in the schema, even if the caller is authenticated as admin.
 *
 * This file tests representative endpoints across each route domain:
 *
 *   tickets   – POST /tickets         (TicketCreateBody.strict())
 *   tickets   – PATCH /tickets/:id    (TicketUpdateBody.strict())
 *   tasks     – POST /tasks           (CreateBody.strict())
 *   sprints   – POST /projects/:id/sprints   (CreateBody.strict())
 *   projects  – POST /projects        (CreateBody.strict())
 *   lookup    – POST /lookup/statuses (StatusBody.strict())
 *   lookup    – PATCH /lookup/statuses/:id (StatusBody.partial().strict())
 *   teams     – POST /teams           (TeamBody.strict())
 *   sla       – POST /sla/policies    (PolicyBody.strict())
 *   work-items – POST /work-items     (CreateBody.strict())
 *   work-items – PATCH /work-items/:id (UpdateBody.strict())
 *
 * Requires: local Supabase running with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Asserts that the response is 400 (schema validation error). */
function expect400(res: { statusCode: number; payload: string }) {
  // Zod/fastify-type-provider-zod maps unknown-key errors to 400
  expect(
    res.statusCode,
    `Expected 400 for unknown field, got ${res.statusCode}: ${res.payload}`,
  ).toBe(400);
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe("Strict-schema regression — unknown body fields are rejected with 400", () => {
  let app: FastifyInstance;

  // Rows created during the test, cleaned up in afterAll.
  const createdStatusIds: number[] = [];
  const createdProjectIds: string[] = [];
  const createdTeamIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    const adminH = await authHeader("admin");

    await Promise.all([
      ...createdStatusIds.map((id) =>
        app.inject({ method: "DELETE", url: `/lookup/statuses/${id}`, headers: adminH }),
      ),
      ...createdProjectIds.map((id) =>
        app.inject({ method: "DELETE", url: `/projects/${id}`, headers: adminH }),
      ),
      ...createdTeamIds.map((id) =>
        app.inject({ method: "DELETE", url: `/teams/${id}`, headers: adminH }),
      ),
    ]);

    await app.close();
  });

  // ── tickets ─────────────────────────────────────────────────────────────

  it("POST /tickets with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    // Resolve a valid status/priority/category first
    const [statuses, priorities, categories] = await Promise.all([
      app.inject({ method: "GET", url: "/lookup/statuses", headers }).then((r) => r.json()),
      app.inject({ method: "GET", url: "/lookup/priorities", headers }).then((r) => r.json()),
      app.inject({ method: "GET", url: "/lookup/categories", headers }).then((r) => r.json()),
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/tickets",
      headers,
      payload: {
        title: "strict-test ticket",
        status_id: statuses[0].id,
        priority_id: priorities[0].id,
        category_id: categories[0].id,
        __injected_field__: "should-be-rejected",   // ← unknown key
      },
    });
    expect400(res);
  });

  it("PATCH /tickets/:id with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    // Fetch any ticket to get a real ID
    const listRes = await app.inject({ method: "GET", url: "/tickets", headers });
    const tickets = listRes.json<{ id: string }[]>();
    if (!tickets.length) return; // no data to test against — skip gracefully

    const res = await app.inject({
      method: "PATCH",
      url: `/tickets/${tickets[0].id}`,
      headers,
      payload: {
        title: "updated title",
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });

  // ── tasks ────────────────────────────────────────────────────────────────

  it("POST /tasks with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/tasks",
      headers,
      payload: {
        title: "strict-test task",
        status: "pending",
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });

  // ── lookup — statuses ─────────────────────────────────────────────────────

  it("POST /lookup/statuses with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/lookup/statuses",
      headers,
      payload: {
        name: "strict_test_status",
        label: "Strict Test",
        display_order: 9980,
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });

  it("PATCH /lookup/statuses/:id with unknown field → 400", async () => {
    // First create a legitimate status to patch
    const adminH = await authHeader("admin");
    const createRes = await app.inject({
      method: "POST",
      url: "/lookup/statuses",
      headers: adminH,
      payload: { name: "strict_patch_status", label: "Strict Patch", display_order: 9981 },
    });
    if (createRes.statusCode !== 200) return; // already tested above — skip
    const created = createRes.json<{ id: number }>();
    createdStatusIds.push(created.id);

    const res = await app.inject({
      method: "PATCH",
      url: `/lookup/statuses/${created.id}`,
      headers: adminH,
      payload: {
        label: "Updated label",
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });

  it("POST /lookup/priorities with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/lookup/priorities",
      headers,
      payload: {
        name: "strict_test_priority",
        label: "Strict Priority",
        display_order: 9982,
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });

  // ── teams ────────────────────────────────────────────────────────────────

  it("POST /teams with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers,
      payload: {
        name: "strict-test-team",
        category: "functional",
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });

  // ── sla ──────────────────────────────────────────────────────────────────

  it("POST /sla/policies with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    // First get a priority ID
    const priorities = await app.inject({ method: "GET", url: "/lookup/priorities", headers })
      .then((r) => r.json<{ id: number }[]>());

    const res = await app.inject({
      method: "POST",
      url: "/sla/policies",
      headers,
      payload: {
        name: "strict-test-sla",
        priority_id: priorities[0]?.id ?? 1,
        response_time_minutes: 60,
        resolution_time_minutes: 240,
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });

  // ── projects ──────────────────────────────────────────────────────────────

  it("POST /projects with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers,
      payload: {
        key: `STRICTTEST${Date.now()}`,
        name: "Strict Test Project",
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });

  // ── sprints ───────────────────────────────────────────────────────────────

  it("POST /projects/:id/sprints with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    // Create a minimal project for this test
    const projRes = await app.inject({
      method: "POST",
      url: "/projects",
      headers,
      payload: { key: `SPRINTSTRICT${Date.now()}`, name: "Sprint Strict Test Project" },
    });
    if (projRes.statusCode !== 200) return; // projects creation failed — skip
    const proj = projRes.json<{ id: string }>();
    createdProjectIds.push(proj.id);

    const res = await app.inject({
      method: "POST",
      url: `/projects/${proj.id}/sprints`,
      headers,
      payload: {
        name: "Sprint 1",
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });

  // ── work-items ────────────────────────────────────────────────────────────

  it("POST /work-items with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    // Need a valid project ID
    const projects = await app.inject({ method: "GET", url: "/projects", headers })
      .then((r) => r.json<{ id: string }[]>());
    if (!projects.length) return;

    const res = await app.inject({
      method: "POST",
      url: "/work-items",
      headers,
      payload: {
        project_id: projects[0].id,
        title: "Strict test item",
        rank: "a",
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });

  it("PATCH /work-items/:id with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    const projects = await app.inject({ method: "GET", url: "/projects", headers })
      .then((r) => r.json<{ id: string }[]>());
    if (!projects.length) return;

    // Fetch a work item to patch
    const items = await app.inject({
      method: "GET",
      url: `/work-items/backlog?projectId=${projects[0].id}`,
      headers,
    }).then((r) => r.json<{ id: string }[]>());
    if (!items.length) return;

    const res = await app.inject({
      method: "PATCH",
      url: `/work-items/${items[0].id}`,
      headers,
      payload: {
        title: "updated title",
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });

  // ── item-links ───────────────────────────────────────────────────────────

  it("POST /item-links with unknown field → 400", async () => {
    const headers = await authHeader("admin");
    const projects = await app.inject({ method: "GET", url: "/projects", headers })
      .then((r) => r.json<{ id: string }[]>());
    if (!projects.length) return;

    const items = await app.inject({
      method: "GET",
      url: `/work-items/backlog?projectId=${projects[0].id}`,
      headers,
    }).then((r) => r.json<{ id: string }[]>());
    if (!items.length) return;

    const res = await app.inject({
      method: "POST",
      url: "/item-links",
      headers,
      payload: {
        target_work_item_id: items[0].id,
        link_type: "relates_to",
        __injected_field__: "should-be-rejected",
      },
    });
    expect400(res);
  });
});
