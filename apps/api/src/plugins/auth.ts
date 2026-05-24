import fp from "fastify-plugin";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config.js";

/**
 * Verifies the incoming Bearer token against Supabase Auth and attaches a
 * per-request Supabase client scoped to that user. Because the user JWT is
 * forwarded, every query goes through Postgres RLS using auth.uid() — RLS
 * keeps doing the real authorization work; the API just enforces shape.
 *
 * Routes that must skip auth (health, swagger docs) should be registered
 * before this plugin or call request.routeOptions.config.public.
 */
export default fp(async (app) => {
  // Fastify 5: decorate without a default value — type-only declaration.
  app.decorateRequest("supabase");
  app.decorateRequest("user");

  app.addHook("preHandler", async (req, reply) => {
    const routeConfig = (req.routeOptions?.config ?? {}) as { public?: boolean };
    if (routeConfig.public) return;

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "missing_token" });
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      return reply.code(401).send({ error: "missing_token" });
    }

    const sb = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) {
      req.log.warn({ err: error }, "auth: invalid token");
      return reply.code(401).send({ error: "invalid_token" });
    }

    req.supabase = sb;
    req.user = data.user;
  });
});
