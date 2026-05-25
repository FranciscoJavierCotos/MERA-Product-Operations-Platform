/**
 * Unit tests: health route
 *
 * Exercises GET /health with a minimal Fastify instance that only registers
 * the Zod type-provider and the health route itself.  No auth plugin, no
 * Supabase connection, no config.ts — fully isolated.
 *
 * Verifies:
 *   ✓ Returns HTTP 200
 *   ✓ Body shape: { status: "ok", uptime: number, timestamp: ISO-8601 string }
 *   ✓ `uptime` is a non-negative number
 *   ✓ `timestamp` round-trips through Date without loss
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { healthRoute } from "../routes/health.js";

interface HealthBody {
  status: string;
  uptime: number;
  timestamp: string;
}

describe("health route", () => {
  // The route is typed as FastifyPluginAsyncZod, so the test app needs the
  // Zod type-provider — otherwise Fastify's default serializer is used and
  // the response schema is silently ignored.
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();

  beforeAll(async () => {
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(healthRoute);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health → 200", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it('response body contains status "ok"', async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.json<HealthBody>().status).toBe("ok");
  });

  it("uptime is a non-negative number", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    const { uptime } = res.json<HealthBody>();
    expect(typeof uptime).toBe("number");
    expect(uptime).toBeGreaterThanOrEqual(0);
  });

  it("timestamp is a valid ISO-8601 string", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    const { timestamp } = res.json<HealthBody>();
    expect(typeof timestamp).toBe("string");
    // Round-trip through Date — toISOString() is the canonical form
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  it("two consecutive calls both return 200", async () => {
    const [a, b] = await Promise.all([
      app.inject({ method: "GET", url: "/health" }),
      app.inject({ method: "GET", url: "/health" }),
    ]);
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
  });
});
