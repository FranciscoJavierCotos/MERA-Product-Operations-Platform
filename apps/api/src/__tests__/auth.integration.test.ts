/**
 * Integration tests: Authentication enforcement
 *
 * Verifies that the auth plugin (apps/api/src/plugins/auth.ts) correctly:
 *   - Rejects requests with no Bearer token (missing_token)
 *   - Rejects requests with malformed / tampered JWTs (invalid_token)
 *   - Allows requests with valid JWTs for all three test roles
 *   - Leaves public routes (health, swagger) accessible without a token
 *
 * Requires: local Supabase running (`supabase start`) with seed data applied.
 * Set env vars via apps/api/.env.test (see .env.test.example).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

describe("Authentication enforcement", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Missing / malformed token ──────────────────────────────────────────────

  it("rejects request with no Authorization header → 401 missing_token", async () => {
    const res = await app.inject({ method: "GET", url: "/tickets" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("missing_token");
  });

  it("rejects request with non-Bearer Authorization scheme → 401 missing_token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/tickets",
      headers: { Authorization: "Token abc123" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("missing_token");
  });

  it("rejects request with empty Bearer value → 401 missing_token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/tickets",
      headers: { Authorization: "Bearer " },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("missing_token");
  });

  // ── Invalid / tampered token ───────────────────────────────────────────────

  it("rejects a structurally valid but tampered JWT → 401 invalid_token", async () => {
    // Real JWT structure (header.payload.signature) but signature does not match
    const res = await app.inject({
      method: "GET",
      url: "/tickets",
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6ImFkbWluIn0.TAMPERED_SIGNATURE",
      },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("invalid_token");
  });

  it("rejects a completely garbage token → 401 invalid_token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/tickets",
      headers: { Authorization: "Bearer not-a-jwt-at-all" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("invalid_token");
  });

  it("rejects a token from a different Supabase project (wrong secret) → 401 invalid_token", async () => {
    // A real Supabase JWT shape but signed with a different secret
    const wrongProjectToken =
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo5OTk5OTk5OTk5LCJzdWIiOiI" +
      "wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMTAiLCJlbWFpbCI6ImFk" +
      "bWluQHRlc3QubWVyYS5sb2NhbCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIn0." +
      "wrong_signature_from_different_project";
    const res = await app.inject({
      method: "GET",
      url: "/tickets",
      headers: { Authorization: wrongProjectToken },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("invalid_token");
  });

  // ── Valid tokens — all three test roles ───────────────────────────────────

  it("allows access with a valid admin JWT → 200", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({ method: "GET", url: "/tickets", headers });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("allows access with a valid support_member JWT → 200", async () => {
    const headers = await authHeader("support_member");
    const res = await app.inject({ method: "GET", url: "/tickets", headers });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("allows access with a valid client JWT → 200", async () => {
    const headers = await authHeader("client");
    const res = await app.inject({ method: "GET", url: "/tickets", headers });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  // ── Public routes — no token required ────────────────────────────────────

  it("health endpoint is public (no token needed) → 200", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("API auth enforcement applies on POST endpoints too", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/tickets",
      payload: { title: "should be blocked" },
    });
    // No token → 401, not a schema error
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("missing_token");
  });
});
