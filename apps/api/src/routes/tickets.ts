import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as tickets from "../services/tickets";

const IdParam = z.object({ id: z.string().uuid() });

const TicketFiltersQuery = z.object({
  search: z.string().optional(),
  status_id: z.coerce.number().int().optional(),
  priority_id: z.coerce.number().int().optional(),
  category_id: z.coerce.number().int().optional(),
  temperature_id: z.coerce.number().int().optional(),
  functional_team_id: z.string().uuid().optional(),
  support_team_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  created_from: z.string().optional(),
  created_to: z.string().optional(),
  sort_column: z.string().optional(),
  sort_dir: z.enum(["asc", "desc"]).optional(),
});

const PaginatedQuery = TicketFiltersQuery.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const SearchQuery = z.object({ q: z.string().min(1) });
const NavQuery = z.object({ currentTicketId: z.string().uuid() });
const SimilarBody = z.object({
  embedding: z.array(z.number()),
  limit: z.number().int().min(1).max(50).optional(),
  excludeTicketId: z.string().uuid().optional(),
});

const TicketCreateBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category_id: z.number().int(),
  priority_id: z.number().int(),
  status_id: z.number().int(),
  cc_email: z.string().email().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  functional_team_id: z.string().uuid().optional(),
  team_id: z.string().uuid().optional(),
  support_level_id: z.number().int().optional(),
}).strict();

const TicketUpdateBody = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  resolution: z.string().nullable().optional(),
  status_id: z.number().int().optional(),
  priority_id: z.number().int().optional(),
  category_id: z.number().int().optional(),
  temperature_id: z.number().int().nullable().optional(),
  support_level_id: z.number().int().optional(),
  functional_team_id: z.string().uuid().nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  cc_email: z.string().nullable().optional(),
}).strict();

const TimeWorkedBody = z.object({
  time_worked_minutes: z.number().int().min(0),
});

export const ticketRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/tickets",
    { schema: { tags: ["tickets"], querystring: TicketFiltersQuery } },
    async (req) => tickets.getTickets(req.supabase, req.query),
  );

  app.get(
    "/tickets/paginated",
    { schema: { tags: ["tickets"], querystring: PaginatedQuery } },
    async (req) => {
      const { page, pageSize, ...filters } = req.query;
      return tickets.getTicketsPaginated(req.supabase, page, pageSize, filters);
    },
  );

  app.get(
    "/tickets/me",
    { schema: { tags: ["tickets"] } },
    async (req) => tickets.getMyTickets(req.supabase, req.user.id),
  );

  app.get(
    "/tickets/me/paginated",
    { schema: { tags: ["tickets"], querystring: PaginatedQuery } },
    async (req) => {
      const { page, pageSize, ...filters } = req.query;
      return tickets.getMyTicketsPaginated(req.supabase, req.user.id, page, pageSize, filters);
    },
  );

  app.get(
    "/tickets/me/navigation",
    { schema: { tags: ["tickets"], querystring: NavQuery } },
    async (req) =>
      tickets.getMyTicketNavigation(req.supabase, req.user.id, req.query.currentTicketId),
  );

  app.get(
    "/tickets/search",
    { schema: { tags: ["tickets"], querystring: SearchQuery } },
    async (req) => tickets.searchTickets(req.supabase, req.query.q),
  );

  app.get(
    "/tickets/:id",
    { schema: { tags: ["tickets"], params: IdParam } },
    async (req) => tickets.getTicketById(req.supabase, req.params.id),
  );

  app.get(
    "/tickets/:id/comments",
    { schema: { tags: ["tickets"], params: IdParam } },
    async (req) => tickets.getTicketComments(req.supabase, req.params.id),
  );

  app.get(
    "/tickets/:id/history",
    { schema: { tags: ["tickets"], params: IdParam } },
    async (req) => tickets.getTicketHistory(req.supabase, req.params.id),
  );

  app.post(
    "/tickets/similar-resolutions",
    { schema: { tags: ["tickets"], body: SimilarBody } },
    async (req) =>
      tickets.findSimilarResolutions(
        req.supabase,
        req.body.embedding,
        req.body.limit,
        req.body.excludeTicketId,
      ),
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  app.post(
    "/tickets",
    { schema: { tags: ["tickets"], body: TicketCreateBody } },
    async (req) =>
      tickets.createTicket(req.supabase, { ...req.body, created_by: req.user.id } as any),
  );

  app.patch(
    "/tickets/:id",
    { schema: { tags: ["tickets"], params: IdParam, body: TicketUpdateBody } },
    async (req) => tickets.updateTicket(req.supabase, req.params.id, req.body as any),
  );

  app.delete(
    "/tickets/:id",
    { schema: { tags: ["tickets"], params: IdParam } },
    async (req) => tickets.deleteTicket(req.supabase, req.params.id),
  );

  app.patch(
    "/tickets/:id/time-worked",
    { schema: { tags: ["tickets"], params: IdParam, body: TimeWorkedBody } },
    async (req) =>
      tickets.updateTimeWorked(req.supabase, req.params.id, req.body.time_worked_minutes),
  );
};
