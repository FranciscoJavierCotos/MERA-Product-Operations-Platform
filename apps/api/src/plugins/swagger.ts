import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import { env } from "../config.js";

export default fp(async (app) => {
  // @fastify/swagger must always be registered so the OpenAPI spec object
  // is available for the type provider and schema generation.
  // Only the HTML UI (/docs) is gated — it must never be reachable in production.
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "STMS API",
        description: "Owned API layer for the Support Ticket Management System.",
        version: "0.7.0",
      },
      servers: [{ url: "http://localhost:8080" }],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    transform: jsonSchemaTransform,
  });

  // Swagger UI exposes the full API schema. Only mount it in development.
  // In production/test the /docs route simply does not exist (404).
  if (!env.isDev) return;

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });
});
