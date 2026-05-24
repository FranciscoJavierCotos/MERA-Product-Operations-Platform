import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySensible from "@fastify/sensible";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import "./types.js";
import { env } from "./config.js";
import authPlugin from "./plugins/auth.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import swaggerPlugin from "./plugins/swagger.js";

import { healthRoute } from "./routes/health.js";
import { meRoute } from "./routes/me.js";
import { lookupRoutes } from "./routes/lookup.js";
import { userRoutes } from "./routes/users.js";
import { teamRoutes } from "./routes/teams.js";
import { ticketRoutes } from "./routes/tickets.js";
import { taskRoutes } from "./routes/tasks.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { projectRoutes } from "./routes/projects.js";
import { sprintRoutes } from "./routes/sprints.js";
import { workItemRoutes } from "./routes/work-items.js";
import { slaRoutes } from "./routes/slas.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { itemLinkRoutes } from "./routes/item-links.js";
import { commentRoutes } from "./routes/comments.js";
import { storageRoutes } from "./routes/storage.js";

async function build() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.isDev
        ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
        : undefined,
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifySensible);
  await app.register(fastifyHelmet, {
    // CSP needs per-deployment tuning; all other Helmet defaults remain active
    // (X-Content-Type-Options, X-Frame-Options, HSTS, X-DNS-Prefetch-Control …).
    contentSecurityPolicy: false,
  });
  await app.register(fastifyRateLimit, {
    // Global rate limit: 100 requests per IP per 15-minute window.
    // Tighten specific routes (e.g. auth-adjacent paths) as needed.
    max: 100,
    timeWindow: "15 minutes",
  });
  await app.register(fastifyCors, {
    origin: env.corsOrigins,
    credentials: true,
  });

  await app.register(errorHandlerPlugin);
  await app.register(swaggerPlugin);
  await app.register(authPlugin);

  await app.register(healthRoute);
  await app.register(meRoute);
  await app.register(lookupRoutes);
  await app.register(userRoutes);
  await app.register(teamRoutes);
  await app.register(ticketRoutes);
  await app.register(taskRoutes);
  await app.register(dashboardRoutes);
  await app.register(projectRoutes);
  await app.register(sprintRoutes);
  await app.register(workItemRoutes);
  await app.register(slaRoutes);
  await app.register(knowledgeRoutes);
  await app.register(itemLinkRoutes);
  await app.register(commentRoutes);
  await app.register(storageRoutes);

  return app;
}

export { build };

async function start() {
  const app = await build();
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`API listening on http://localhost:${env.PORT}`);
    app.log.info(`Swagger UI at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Only start the server when run directly (not when imported by tests).
import { fileURLToPath } from "url";
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  start();
}
