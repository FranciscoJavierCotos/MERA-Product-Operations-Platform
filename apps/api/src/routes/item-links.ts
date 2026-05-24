import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as itemLinks from "../services/item-links";

const IdParam = z.object({ id: z.string().uuid() });
const TicketIdParam = z.object({ ticketId: z.string().uuid() });
const WorkItemIdParam = z.object({ workItemId: z.string().uuid() });
const SearchQuery = z.object({
  q: z.string().min(1),
  projectId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const CreateLinkBody = z.object({
  source_ticket_id: z.string().uuid().nullable().optional(),
  source_work_item_id: z.string().uuid().nullable().optional(),
  target_work_item_id: z.string().uuid(),
  link_type: z.string(),
  is_primary: z.boolean().optional(),
  note: z.string().nullable().optional(),
}).passthrough();

export const itemLinkRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/item-links/types", { schema: { tags: ["item-links"] } }, async (req) =>
    itemLinks.listLinkTypes(req.supabase),
  );
  app.get(
    "/item-links/tickets/:ticketId",
    { schema: { tags: ["item-links"], params: TicketIdParam } },
    async (req) => itemLinks.listTicketLinks(req.supabase, req.params.ticketId),
  );
  app.get(
    "/item-links/tickets/:ticketId/primary",
    { schema: { tags: ["item-links"], params: TicketIdParam } },
    async (req) => itemLinks.getPrimaryTicketLink(req.supabase, req.params.ticketId),
  );
  app.get(
    "/item-links/work-items/:workItemId/inbound",
    { schema: { tags: ["item-links"], params: WorkItemIdParam } },
    async (req) => itemLinks.listWorkItemInboundLinks(req.supabase, req.params.workItemId),
  );
  app.get(
    "/item-links/work-items/:workItemId/outbound",
    { schema: { tags: ["item-links"], params: WorkItemIdParam } },
    async (req) => itemLinks.listWorkItemOutboundLinks(req.supabase, req.params.workItemId),
  );
  app.get(
    "/item-links/work-items/search",
    { schema: { tags: ["item-links"], querystring: SearchQuery } },
    async (req) =>
      itemLinks.searchLinkableWorkItems(req.supabase, {
        query: req.query.q,
        projectId: req.query.projectId,
        limit: req.query.limit,
      }),
  );
  app.get("/item-links/projects", { schema: { tags: ["item-links"] } }, async (req) =>
    itemLinks.listLinkableProjects(req.supabase),
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  app.post(
    "/item-links",
    { schema: { tags: ["item-links"], body: CreateLinkBody } },
    async (req) =>
      itemLinks.createItemLink(req.supabase, { ...req.body, created_by: req.user.id } as any),
  );

  app.post(
    "/item-links/:id/primary",
    { schema: { tags: ["item-links"], params: IdParam } },
    async (req) => itemLinks.setPrimaryItemLink(req.supabase, req.params.id),
  );

  app.delete(
    "/item-links/:id",
    { schema: { tags: ["item-links"], params: IdParam } },
    async (req) => {
      await itemLinks.deleteItemLink(req.supabase, req.params.id);
      return { ok: true };
    },
  );
};
