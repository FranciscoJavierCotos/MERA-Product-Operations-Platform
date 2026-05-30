import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as comments from "../services/comments";

const IdParam = z.object({ id: z.string().uuid() });
const TicketIdParam = z.object({ ticketId: z.string().uuid() });

const CreateBody = z.object({
  content: z.string().min(1),
  is_internal: z.boolean().optional(),
});

const UpdateBody = z.object({
  content: z.string().min(1),
});

export const commentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/tickets/:ticketId/comments",
    { schema: { tags: ["comments"], params: TicketIdParam, body: CreateBody } },
    async (req) =>
      comments.createComment(req.supabase, {
        ticket_id: req.params.ticketId,
        content: req.body.content,
        is_internal: req.body.is_internal,
      }),
  );

  app.patch(
    "/comments/:id",
    { schema: { tags: ["comments"], params: IdParam, body: UpdateBody } },
    async (req) => comments.updateComment(req.supabase, req.params.id, req.body.content),
  );

  app.delete(
    "/comments/:id",
    { schema: { tags: ["comments"], params: IdParam } },
    async (req) => comments.deleteComment(req.supabase, req.params.id),
  );
};
