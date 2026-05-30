import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as dashboard from "../services/dashboard";

const RecentQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const DashboardStatsSchema = z.object({
  totalTickets: z.number(),
  openTickets: z.number(),
  myTasks: z.number(),
  resolvedToday: z.number(),
  breachedSlas: z.number(),
  atRiskCompanies: z.number(),
  hotTickets: z.number(),
});

export const dashboardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/dashboard/stats",
    { schema: { tags: ["dashboard"], response: { 200: DashboardStatsSchema } } },
    async (req) => dashboard.getDashboardStats(req.supabase, req.user.id),
  );

  app.get(
    "/dashboard/recent-tickets",
    { schema: { tags: ["dashboard"], querystring: RecentQuery } },
    async (req) => dashboard.getRecentTickets(req.supabase, req.query.limit),
  );

  app.get(
    "/dashboard/at-risk-companies",
    { schema: { tags: ["dashboard"] } },
    async (req) => dashboard.getAtRiskCompanies(req.supabase),
  );

  app.get(
    "/dashboard/hot-tickets",
    { schema: { tags: ["dashboard"] } },
    async (req) => dashboard.getHotTickets(req.supabase),
  );
};
