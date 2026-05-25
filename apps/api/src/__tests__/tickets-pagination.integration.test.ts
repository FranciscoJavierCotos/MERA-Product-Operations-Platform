/**
 * Integration tests: Pagination bounds on GET /tickets/paginated
 *
 * The PaginatedQuery schema in apps/api/src/routes/tickets.ts enforces:
 *   page:     int, min(1),             default 1
 *   pageSize: int, min(1), max(200),   default 50
 *
 * Out-of-range values must be rejected by Zod with HTTP 400 — never silently
 * coerced to the default. This prevents pathological queries (page=0,
 * pageSize=10_000) from reaching Postgres.
 *
 * Also verifies positive cases: a valid page returns the expected slice and the
 * `totalCount` field matches the schema contract.
 *
 * Requires: local Supabase running with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

describe("Ticket pagination bounds", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Rejected: out-of-range ────────────────────────────────────────────────

  it("page=0 → 400 (min is 1)", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/paginated?page=0&pageSize=10",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(400);
  });

  it("page=-5 → 400", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/paginated?page=-5&pageSize=10",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(400);
  });

  it("pageSize=0 → 400 (min is 1)", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/paginated?page=1&pageSize=0",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(400);
  });

  it("pageSize=201 → 400 (cap is 200, prevents oversized queries)", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/paginated?page=1&pageSize=201",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(400);
  });

  it("pageSize=10000 → 400", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/paginated?page=1&pageSize=10000",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(400);
  });

  it("non-integer page → 400 (Zod int validation)", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/paginated?page=1.5&pageSize=10",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(400);
  });

  it("non-numeric page → 400", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/paginated?page=abc&pageSize=10",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(400);
  });

  // ── Accepted: valid bounds ────────────────────────────────────────────────

  it("page=1, pageSize=1 → 200 with data array (size ≤ 1) and totalCount", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/paginated?page=1&pageSize=1",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: unknown[]; totalCount: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(1);
    expect(typeof body.totalCount).toBe("number");
    expect(body.totalCount).toBeGreaterThanOrEqual(body.data.length);
  });

  it("page=1, pageSize=200 → 200 (upper edge accepted)", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/paginated?page=1&pageSize=200",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: unknown[]; totalCount: number };
    expect(body.data.length).toBeLessThanOrEqual(200);
  });

  it("no query params → uses defaults (page=1, pageSize=50)", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/paginated",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: unknown[]; totalCount: number };
    expect(body.data.length).toBeLessThanOrEqual(50);
  });

  it("page beyond data → 200 with empty data array and accurate totalCount", async () => {
    const adminHeaders = await authHeader("admin");
    // First learn how many rows actually exist
    const first = await app.inject({
      method: "GET",
      url: "/tickets/paginated?page=1&pageSize=1",
      headers: adminHeaders,
    });
    const total = (first.json() as { totalCount: number }).totalCount;

    // Request a page well beyond what exists
    const farPage = Math.max(2, Math.ceil(total / 5) + 1000);
    const res = await app.inject({
      method: "GET",
      url: `/tickets/paginated?page=${farPage}&pageSize=5`,
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: unknown[]; totalCount: number };
    expect(body.data.length).toBe(0);
    // totalCount should remain accurate regardless of which page we asked for
    expect(body.totalCount).toBe(total);
  });

  // ── /tickets/me/paginated mirrors the same bounds ─────────────────────────

  it("/tickets/me/paginated also enforces pageSize≤200", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/me/paginated?page=1&pageSize=201",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(400);
  });

  it("/tickets/me/paginated also rejects page=0", async () => {
    const adminHeaders = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/tickets/me/paginated?page=0&pageSize=10",
      headers: adminHeaders,
    });
    expect(res.statusCode).toBe(400);
  });
});
