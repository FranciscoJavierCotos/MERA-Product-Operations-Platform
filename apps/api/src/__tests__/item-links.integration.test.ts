/**
 * Integration tests: Item-links API — 9 endpoints
 *
 * Covers:
 *   - GET /item-links/types — link type lookup
 *   - GET /item-links/projects — linkable project list
 *   - GET /item-links/work-items/search?q=... — work item search
 *   - POST /item-links — create ticket→work_item link
 *   - GET /item-links/tickets/:ticketId — list all links for a ticket
 *   - GET /item-links/tickets/:ticketId/primary — get primary link
 *   - GET /item-links/work-items/:workItemId/inbound — inbound links
 *   - GET /item-links/work-items/:workItemId/outbound — outbound links
 *   - POST /item-links/:id/primary — set primary; verify previous primary unset
 *   - DELETE /item-links/:id — remove link
 *
 * Requires: local Supabase running (`supabase start` + `supabase db reset`).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

const TEAM_ID = "00000000-0000-0000-0000-000000000001";

describe("Item-links API", () => {
  let app: FastifyInstance;

  // Resources created during setup
  let projectId: string;
  let sprintId: string;
  let workItemId: string;
  let workItemBId: string;
  let ticketId: string;

  // Links created during test cases
  let linkId: string;
  let linkBId: string;

  // ── helpers ────────────────────────────────────────────────────────────────

  async function setupResources() {
    const headers = await authHeader("admin");

    // Lookup IDs
    const [statusRes, priorityRes, categoryRes] = await Promise.all([
      app.inject({ method: "GET", url: "/lookup/statuses", headers }),
      app.inject({ method: "GET", url: "/lookup/priorities", headers }),
      app.inject({ method: "GET", url: "/lookup/categories", headers }),
    ]);
    const statusId: number = statusRes.json()[0].id;
    const priorityId: number = priorityRes.json()[0].id;
    const categoryId: number = categoryRes.json()[0].id;

    // Create project
    const key = `IL${Date.now().toString().slice(-6)}`;
    const projRes = await app.inject({
      method: "POST",
      url: "/projects",
      headers,
      payload: { key, name: "[test-il] Links Project", team_id: TEAM_ID },
    });
    expect(projRes.statusCode, `Project create failed: ${projRes.body}`).toBe(200);
    projectId = projRes.json().id as string;

    // Create sprint
    const sprintRes = await app.inject({
      method: "POST",
      url: `/projects/${projectId}/sprints`,
      headers,
      payload: { name: "[test-il] Sprint 1" },
    });
    expect(sprintRes.statusCode, `Sprint create failed: ${sprintRes.body}`).toBe(200);
    sprintId = sprintRes.json().id as string;

    // Create work item A (will be link target)
    const wiARes = await app.inject({
      method: "POST",
      url: "/work-items",
      headers,
      payload: {
        project_id: projectId,
        sprint_id: sprintId,
        title: "[test-il] Work Item A",
        rank: "m",
        type: "story",
      },
    });
    expect(wiARes.statusCode, `WorkItem A create failed: ${wiARes.body}`).toBe(200);
    workItemId = wiARes.json().id as string;

    // Create work item B (second target for primary-swap test)
    const wiBRes = await app.inject({
      method: "POST",
      url: "/work-items",
      headers,
      payload: {
        project_id: projectId,
        sprint_id: sprintId,
        title: "[test-il] Work Item B",
        rank: "n",
        type: "story",
      },
    });
    expect(wiBRes.statusCode, `WorkItem B create failed: ${wiBRes.body}`).toBe(200);
    workItemBId = wiBRes.json().id as string;

    // Create ticket (will be link source)
    const ticketRes = await app.inject({
      method: "POST",
      url: "/tickets",
      headers,
      payload: {
        title: "[test-il] Source Ticket",
        status_id: statusId,
        priority_id: priorityId,
        category_id: categoryId,
      },
    });
    expect(ticketRes.statusCode, `Ticket create failed: ${ticketRes.body}`).toBe(200);
    ticketId = ticketRes.json().id as string;
  }

  beforeAll(async () => {
    app = await createTestApp();
    await setupResources();
  });

  afterAll(async () => {
    const headers = await authHeader("admin");
    // Links are cascade-deleted with their sources, but clean up explicitly to be safe
    await Promise.all([
      linkId && app.inject({ method: "DELETE", url: `/item-links/${linkId}`, headers }),
      linkBId && app.inject({ method: "DELETE", url: `/item-links/${linkBId}`, headers }),
    ]);
    await Promise.all([
      workItemId && app.inject({ method: "DELETE", url: `/work-items/${workItemId}`, headers }),
      workItemBId && app.inject({ method: "DELETE", url: `/work-items/${workItemBId}`, headers }),
    ]);
    await Promise.all([
      ticketId && app.inject({ method: "DELETE", url: `/tickets/${ticketId}`, headers }),
      sprintId && app.inject({ method: "DELETE", url: `/sprints/${sprintId}`, headers }),
    ]);
    projectId && await app.inject({ method: "DELETE", url: `/projects/${projectId}`, headers });
    await app.close();
  });

  // ── Lookup endpoints ───────────────────────────────────────────────────────

  it("GET /item-links/types returns an array of link types", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/item-links/types",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ id: string; label: string }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(typeof body[0].id).toBe("string");
    expect(typeof body[0].label).toBe("string");
  });

  it("GET /item-links/types requires auth", async () => {
    const res = await app.inject({ method: "GET", url: "/item-links/types" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /item-links/projects returns active projects", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/item-links/projects",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ id: string; key: string; name: string }>;
    expect(Array.isArray(body)).toBe(true);
    // The project we created in beforeAll is active — it should appear
    expect(body.some((p) => p.id === projectId)).toBe(true);
  });

  it("GET /item-links/work-items/search?q=... finds work items by title", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/item-links/work-items/search?q=test-il",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ id: string; item_key: string }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((w) => w.id === workItemId)).toBe(true);
  });

  it("GET /item-links/work-items/search requires q param", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/item-links/work-items/search",
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(400);
  });

  // ── Ticket → work item links ───────────────────────────────────────────────

  it("GET /item-links/tickets/:ticketId returns empty array before any links", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/item-links/tickets/${ticketId}`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("GET /item-links/tickets/:ticketId/primary returns null before any links", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/item-links/tickets/${ticketId}/primary`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toBeNull();
  });

  it("POST /item-links creates a non-primary ticket→work_item link", async () => {
    const typesRes = await app.inject({
      method: "GET",
      url: "/item-links/types",
      headers: await authHeader("admin"),
    });
    const linkType = typesRes.json()[0].id as string;

    const res = await app.inject({
      method: "POST",
      url: "/item-links",
      headers: await authHeader("admin"),
      payload: {
        source_ticket_id: ticketId,
        target_work_item_id: workItemId,
        link_type: linkType,
        is_primary: false,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.id).toBe("string");
    linkId = body.id;
  });

  it("GET /item-links/tickets/:ticketId lists the created link with target join", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/item-links/tickets/${ticketId}`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{
      id: string;
      is_primary: boolean;
      target: { id: string };
    }>;
    expect(body.length).toBe(1);
    expect(body[0].id).toBe(linkId);
    expect(body[0].is_primary).toBe(false);
    expect(body[0].target.id).toBe(workItemId);
  });

  it("POST /item-links creates a primary link to work item B", async () => {
    const typesRes = await app.inject({
      method: "GET",
      url: "/item-links/types",
      headers: await authHeader("admin"),
    });
    const linkType = typesRes.json()[0].id as string;

    const res = await app.inject({
      method: "POST",
      url: "/item-links",
      headers: await authHeader("admin"),
      payload: {
        source_ticket_id: ticketId,
        target_work_item_id: workItemBId,
        link_type: linkType,
        is_primary: true,
      },
    });
    expect(res.statusCode).toBe(200);
    linkBId = res.json().id as string;
  });

  it("GET /item-links/tickets/:ticketId/primary returns the primary link", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/item-links/tickets/${ticketId}/primary`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).not.toBeNull();
    expect(body.id).toBe(linkBId);
    expect(body.is_primary).toBe(true);
    expect(body.target.id).toBe(workItemBId);
  });

  it("POST /item-links/:id/primary promotes link A and demotes the previous primary", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/item-links/${linkId}/primary`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);

    // Fetch all links and verify only linkId is primary now
    const listRes = await app.inject({
      method: "GET",
      url: `/item-links/tickets/${ticketId}`,
      headers: await authHeader("admin"),
    });
    const links = listRes.json() as Array<{ id: string; is_primary: boolean }>;
    const promoted = links.find((l) => l.id === linkId);
    const demoted = links.find((l) => l.id === linkBId);
    expect(promoted?.is_primary).toBe(true);
    expect(demoted?.is_primary).toBe(false);
  });

  // ── Inbound / outbound (work-item perspective) ─────────────────────────────

  it("GET /item-links/work-items/:workItemId/inbound returns inbound links for work item A", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/item-links/work-items/${workItemId}/inbound`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ id: string; source_ticket_id: string }>;
    // linkId points ticket → workItemId, so workItemId should see one inbound
    expect(body.some((l) => l.id === linkId)).toBe(true);
    expect(body.find((l) => l.id === linkId)?.source_ticket_id).toBe(ticketId);
  });

  it("GET /item-links/work-items/:workItemId/outbound returns empty for a pure target", async () => {
    // workItemId is only ever a target, never a source — outbound should be empty
    const res = await app.inject({
      method: "GET",
      url: `/item-links/work-items/${workItemId}/outbound`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  // ── Delete ─────────────────────────────────────────────────────────────────

  it("DELETE /item-links/:id removes the link", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/item-links/${linkBId}`,
      headers: await authHeader("admin"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    linkBId = ""; // mark as already deleted

    // Verify removal
    const listRes = await app.inject({
      method: "GET",
      url: `/item-links/tickets/${ticketId}`,
      headers: await authHeader("admin"),
    });
    const links = listRes.json() as Array<{ id: string }>;
    expect(links.every((l) => l.id !== linkBId)).toBe(true);
    expect(links.length).toBe(1);
  });

  it("DELETE /item-links/:id requires auth", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/item-links/${linkId}`,
    });
    expect(res.statusCode).toBe(401);
  });
});
