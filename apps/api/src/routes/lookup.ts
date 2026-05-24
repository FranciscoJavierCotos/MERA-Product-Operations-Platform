import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as lookup from "../services/lookup";

const IdParam = z.object({ id: z.coerce.number().int() });

const StatusBody = z.object({
  name: z.string(),
  label: z.string(),
  badge_variant: z.string().optional(),
  is_final: z.boolean().optional(),
  display_order: z.number().int(),
}).passthrough();

const PriorityBody = z.object({
  name: z.string(),
  label: z.string(),
  color_class: z.string().optional(),
  display_order: z.number().int(),
}).passthrough();

const CategoryBody = z.object({
  name: z.string(),
  label: z.string(),
  display_order: z.number().int(),
}).passthrough();

const TagBody = z.object({
  name: z.string(),
  slug: z.string(),
  color_class: z.string().optional(),
}).passthrough();

export const lookupRoutes: FastifyPluginAsyncZod = async (app) => {
  // Reads
  app.get("/lookup/statuses", { schema: { tags: ["lookup"] } }, async (req) =>
    lookup.getTicketStatuses(req.supabase),
  );
  app.get("/lookup/priorities", { schema: { tags: ["lookup"] } }, async (req) =>
    lookup.getTicketPriorities(req.supabase),
  );
  app.get("/lookup/categories", { schema: { tags: ["lookup"] } }, async (req) =>
    lookup.getTicketCategories(req.supabase),
  );
  app.get("/lookup/support-levels", { schema: { tags: ["lookup"] } }, async (req) =>
    lookup.getTicketSupportLevels(req.supabase),
  );
  app.get("/lookup/temperatures", { schema: { tags: ["lookup"] } }, async (req) =>
    lookup.getTicketTemperatures(req.supabase),
  );
  app.get("/lookup/tags", { schema: { tags: ["lookup"] } }, async (req) =>
    lookup.getTags(req.supabase),
  );

  // Statuses
  app.post("/lookup/statuses", { schema: { tags: ["lookup"], body: StatusBody.passthrough() } }, async (req) =>
    lookup.createTicketStatus(req.supabase, req.body as any),
  );
  app.patch("/lookup/statuses/:id", { schema: { tags: ["lookup"], params: IdParam, body: StatusBody.partial().passthrough() } }, async (req) =>
    lookup.updateTicketStatus(req.supabase, req.params.id, req.body as any),
  );
  app.delete("/lookup/statuses/:id", { schema: { tags: ["lookup"], params: IdParam } }, async (req) => {
    await lookup.deleteTicketStatus(req.supabase, req.params.id);
    return { ok: true };
  });

  // Priorities
  app.post("/lookup/priorities", { schema: { tags: ["lookup"], body: PriorityBody } }, async (req) =>
    lookup.createTicketPriority(req.supabase, req.body as any),
  );
  app.patch("/lookup/priorities/:id", { schema: { tags: ["lookup"], params: IdParam, body: PriorityBody.partial().passthrough() } }, async (req) =>
    lookup.updateTicketPriority(req.supabase, req.params.id, req.body as any),
  );
  app.delete("/lookup/priorities/:id", { schema: { tags: ["lookup"], params: IdParam } }, async (req) => {
    await lookup.deleteTicketPriority(req.supabase, req.params.id);
    return { ok: true };
  });

  // Categories
  app.post("/lookup/categories", { schema: { tags: ["lookup"], body: CategoryBody } }, async (req) =>
    lookup.createTicketCategory(req.supabase, req.body as any),
  );
  app.patch("/lookup/categories/:id", { schema: { tags: ["lookup"], params: IdParam, body: CategoryBody.partial().passthrough() } }, async (req) =>
    lookup.updateTicketCategory(req.supabase, req.params.id, req.body as any),
  );
  app.delete("/lookup/categories/:id", { schema: { tags: ["lookup"], params: IdParam } }, async (req) => {
    await lookup.deleteTicketCategory(req.supabase, req.params.id);
    return { ok: true };
  });

  // Tags
  app.post("/lookup/tags", { schema: { tags: ["lookup"], body: TagBody } }, async (req) =>
    lookup.createTag(req.supabase, req.body as any),
  );
  app.patch("/lookup/tags/:id", { schema: { tags: ["lookup"], params: IdParam, body: TagBody.partial().passthrough() } }, async (req) =>
    lookup.updateTag(req.supabase, req.params.id, req.body as any),
  );
  app.delete("/lookup/tags/:id", { schema: { tags: ["lookup"], params: IdParam } }, async (req) => {
    await lookup.deleteTag(req.supabase, req.params.id);
    return { ok: true };
  });
};
