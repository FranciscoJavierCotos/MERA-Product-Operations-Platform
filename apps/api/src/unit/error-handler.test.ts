/**
 * Unit tests: error-handler plugin
 *
 * Exercises every branch of apps/api/src/plugins/error-handler.ts with a
 * minimal Fastify instance.  No Supabase connection is required — the plugin
 * only depends on `fastify-plugin` and `zod`.
 *
 * Branches covered:
 *   ✓ ZodError               → 400  validation_error
 *   ✓ PG 23514 check         → 422  constraint_violation
 *   ✓ PG 23505 unique        → 409  conflict
 *   ✓ PG 23503 foreign key   → 422  invalid_reference
 *   ✓ PG 23502 not-null      → 422  missing_required_field
 *   ✓ Generic error w/ code  → passthrough statusCode + code
 *   ✓ Unhandled error        → 500  internal_error
 *   ✓ Not-found handler      → 404  not_found
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import errorHandlerPlugin from "../plugins/error-handler.js";

// ---------------------------------------------------------------------------
// Minimal test app — registers only the plugin under test + probe routes
// ---------------------------------------------------------------------------
function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  void app.register(errorHandlerPlugin);

  // ── ZodError ───────────────────────────────────────────────────────────────
  app.get("/throw/zod", async () => {
    z.object({ name: z.string() }).parse({}); // always throws ZodError
  });

  // ── Postgres constraint / trigger codes ───────────────────────────────────
  // Simulates the shape of a PostgREST error: a plain Error with a `code`
  // string that matches the relevant Postgres error code constant.
  function pgRoute(url: string, code: string) {
    app.get(url, async () => {
      const err = Object.assign(new Error(`pg error ${code}`), { code });
      throw err;
    });
  }
  pgRoute("/throw/pg-check",    "23514");
  pgRoute("/throw/pg-unique",   "23505");
  pgRoute("/throw/pg-fk",       "23503");
  pgRoute("/throw/pg-not-null", "23502");

  // ── Generic error with an explicit 4xx statusCode + code ──────────────────
  app.get("/throw/4xx", async () => {
    const err = Object.assign(new Error("bad input"), {
      statusCode: 400,
      code: "bad_input",
    });
    throw err;
  });

  // ── Unhandled error — no statusCode, no matching code ─────────────────────
  app.get("/throw/5xx", async () => {
    throw new Error("something broke");
  });

  return app;
}

describe("error-handler plugin", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── ZodError ───────────────────────────────────────────────────────────────

  it("maps ZodError → 400 validation_error with flattened details", async () => {
    const res = await app.inject({ method: "GET", url: "/throw/zod" });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string; details: unknown }>();
    expect(body.error).toBe("validation_error");
    expect(body.details).toBeDefined();
  });

  // ── Postgres constraint codes ──────────────────────────────────────────────

  it("maps PG 23514 (check_violation) → 422 constraint_violation", async () => {
    const res = await app.inject({ method: "GET", url: "/throw/pg-check" });
    expect(res.statusCode).toBe(422);
    const body = res.json<{ error: string; message: string }>();
    expect(body.error).toBe("constraint_violation");
    expect(body.message).toContain("23514");
  });

  it("maps PG 23505 (unique_violation) → 409 conflict", async () => {
    const res = await app.inject({ method: "GET", url: "/throw/pg-unique" });
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: string }>().error).toBe("conflict");
  });

  it("maps PG 23503 (foreign_key) → 422 invalid_reference", async () => {
    const res = await app.inject({ method: "GET", url: "/throw/pg-fk" });
    expect(res.statusCode).toBe(422);
    expect(res.json<{ error: string }>().error).toBe("invalid_reference");
  });

  it("maps PG 23502 (not_null) → 422 missing_required_field", async () => {
    const res = await app.inject({ method: "GET", url: "/throw/pg-not-null" });
    expect(res.statusCode).toBe(422);
    expect(res.json<{ error: string }>().error).toBe("missing_required_field");
  });

  // ── Generic fallback ───────────────────────────────────────────────────────

  it("passes through a 4xx statusCode and code from a generic error", async () => {
    const res = await app.inject({ method: "GET", url: "/throw/4xx" });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string; message: string }>();
    expect(body.error).toBe("bad_input");
    expect(body.message).toBe("bad input");
  });

  it("falls back to 500 internal_error for unhandled errors without a statusCode", async () => {
    const res = await app.inject({ method: "GET", url: "/throw/5xx" });
    expect(res.statusCode).toBe(500);
    const body = res.json<{ error: string; message: string }>();
    expect(body.error).toBe("internal_error");
    expect(body.message).toBe("something broke");
  });

  // ── Not-found handler ──────────────────────────────────────────────────────

  it("returns 404 not_found with method+url in message for unknown routes", async () => {
    const res = await app.inject({ method: "GET", url: "/does-not-exist" });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string; message: string }>();
    expect(body.error).toBe("not_found");
    expect(body.message).toBe("GET /does-not-exist");
  });

  it("not-found message reflects the actual HTTP method", async () => {
    const res = await app.inject({ method: "DELETE", url: "/also-missing" });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ message: string }>().message).toBe("DELETE /also-missing");
  });
});
