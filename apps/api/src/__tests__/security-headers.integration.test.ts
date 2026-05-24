/**
 * Integration tests: Security headers (@fastify/helmet + @fastify/rate-limit)
 *
 * Verifies that @fastify/helmet is registered and injects the expected
 * security response headers on every route — including unauthenticated 401s
 * (headers are added before auth checks).
 *
 * Headers checked (all set by Helmet's defaults; CSP is disabled to keep
 * Swagger UI functional during development):
 *
 *   x-content-type-options: nosniff      — MIME-sniffing prevention
 *   x-frame-options: SAMEORIGIN          — clickjacking prevention
 *   strict-transport-security: max-age=… — HSTS (HTTPS enforcement)
 *   x-dns-prefetch-control: off          — DNS prefetch opt-out
 *   referrer-policy: no-referrer         — referrer leakage prevention
 *
 * Also verifies that rate-limit headers are present (x-ratelimit-*) so
 * clients can see their current consumption.
 *
 * Uses the public /health endpoint (no auth required) to keep the test
 * self-contained — Helmet fires unconditionally on all responses.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";

describe("Security headers", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Helmet headers ────────────────────────────────────────────────────────

  it("X-Content-Type-Options: nosniff is set (MIME-sniffing prevention)", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("X-Frame-Options: SAMEORIGIN is set (clickjacking prevention)", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });

  it("Strict-Transport-Security header is present with max-age (HSTS)", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    const hsts = res.headers["strict-transport-security"] as string | undefined;
    expect(hsts, "Expected HSTS header to be present").toBeTruthy();
    expect(hsts).toContain("max-age=");
  });

  it("X-DNS-Prefetch-Control: off is set", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["x-dns-prefetch-control"]).toBe("off");
  });

  it("Referrer-Policy header is set", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["referrer-policy"]).toBeTruthy();
  });

  it("security headers are present even on 401 (unauthenticated) responses", async () => {
    // Auth rejection happens after Helmet has already written the headers
    const res = await app.inject({ method: "GET", url: "/tickets" });
    expect(res.statusCode).toBe(401);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });

  it("security headers are present on 404 responses", async () => {
    const res = await app.inject({ method: "GET", url: "/nonexistent-route" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  // ── Rate-limit headers ────────────────────────────────────────────────────

  it("rate-limit headers (x-ratelimit-*) are present on responses", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    // @fastify/rate-limit adds these by default
    expect(
      res.headers["x-ratelimit-limit"],
      "Expected x-ratelimit-limit header from @fastify/rate-limit",
    ).toBeTruthy();
    expect(res.headers["x-ratelimit-remaining"]).toBeTruthy();
    expect(res.headers["x-ratelimit-reset"]).toBeTruthy();
  });
});
