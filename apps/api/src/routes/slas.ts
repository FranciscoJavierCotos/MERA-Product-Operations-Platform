import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as slas from "../services/slas";

const TicketIdParam = z.object({ ticketId: z.string().uuid() });
const IdParam = z.object({ id: z.string().uuid() });

const PolicyBody = z.object({
  name: z.string().min(1),
  priority_id: z.number().int(),
  response_time_minutes: z.number().int().min(0),
  resolution_time_minutes: z.number().int().min(0),
  is_active: z.boolean().optional(),
}).strict();

export const slaRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/sla/policies", { schema: { tags: ["sla"] } }, async (req) =>
    slas.getAllSlaPolicies(req.supabase),
  );
  app.get("/sla/policy-targets", { schema: { tags: ["sla"] } }, async (req) =>
    slas.getActiveSlaPolicyTargetsByPriorityId(req.supabase),
  );
  app.get("/sla/stats", { schema: { tags: ["sla"] } }, async (req) =>
    slas.getSlaStats(req.supabase),
  );
  app.get("/sla/most-urgent", { schema: { tags: ["sla"] } }, async (req) =>
    slas.getMostUrgentSlaTickets(req.supabase),
  );
  app.get(
    "/sla/instances/:ticketId",
    { schema: { tags: ["sla"], params: TicketIdParam } },
    async (req) => slas.getSlaInstance(req.supabase, req.params.ticketId),
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  app.post(
    "/sla/policies",
    { schema: { tags: ["sla"], body: PolicyBody } },
    async (req) => slas.createSlaPolicy(req.supabase, req.body as any),
  );

  app.patch(
    "/sla/policies/:id",
    { schema: { tags: ["sla"], params: IdParam, body: PolicyBody.partial() } },
    async (req) => slas.updateSlaPolicy(req.supabase, req.params.id, req.body as any),
  );

  app.delete(
    "/sla/policies/:id",
    { schema: { tags: ["sla"], params: IdParam } },
    async (req) => {
      await slas.deleteSlaPolicy(req.supabase, req.params.id);
      return { ok: true };
    },
  );
};
