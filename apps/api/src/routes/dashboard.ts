import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as dashboard from "../services/dashboard";

const RecentQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const dashboardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/dashboard/stats", { schema: { tags: ["dashboard"] } }, async (req) =>
    dashboard.getDashboardStats(req.supabase, req.user.id),
  );
  app.get(
    "/dashboard/recent-tickets",
    { schema: { tags: ["dashboard"], querystring: RecentQuery } },
    async (req) => dashboard.getRecentTickets(req.supabase, req.query.limit),
  );
};
