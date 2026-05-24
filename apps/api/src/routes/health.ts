import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

const HealthResponse = z.object({
  status: z.literal("ok"),
  uptime: z.number(),
  timestamp: z.string(),
});

export const healthRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      config: { public: true },
      schema: {
        tags: ["meta"],
        summary: "Liveness probe",
        response: { 200: HealthResponse },
      },
    },
    async () => ({
      status: "ok" as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
};
