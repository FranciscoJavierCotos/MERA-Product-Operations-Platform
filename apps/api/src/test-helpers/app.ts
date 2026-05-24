import { build } from "../server.js";
import type { FastifyInstance } from "fastify";

/**
 * Creates a fully initialised Fastify test app.
 * Call `await app.close()` in afterAll() to release connections.
 */
export async function createTestApp(): Promise<FastifyInstance> {
  const app = await build();
  await app.ready();
  return app;
}
