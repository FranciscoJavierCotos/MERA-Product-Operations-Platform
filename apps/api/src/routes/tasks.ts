import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as tasks from "../services/tasks";

const IdParam = z.object({ id: z.string().uuid() });
const TicketIdParam = z.object({ ticketId: z.string().uuid() });
const UserIdParam = z.object({ userId: z.string().uuid() });

const TaskFiltersQuery = z.object({
  status: z.enum(["pending", "completed"]).optional(),
  assigned_to: z.string().uuid().optional(),
});

const UpcomingQuery = z.object({
  days: z.coerce.number().int().min(1).max(60).default(7),
});

const CreateBody = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  ticket_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  created_by: z.string().uuid().optional(),
  status: z.enum(["pending", "completed"]).optional(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  action_tag: z.string().optional().nullable(),
  time_spent_minutes: z.number().int().optional().nullable(),
}).passthrough();

const UpdateBody = CreateBody.partial();

const CompleteBody = z.object({
  time_spent_minutes: z.number().int().optional(),
});

export const taskRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/tasks",
    { schema: { tags: ["tasks"], querystring: TaskFiltersQuery } },
    async (req) => tasks.getTasks(req.supabase, req.query),
  );

  app.get("/tasks/me", { schema: { tags: ["tasks"] } }, async (req) =>
    tasks.getMyTasks(req.supabase, req.user.id),
  );

  app.get(
    "/tasks/upcoming",
    { schema: { tags: ["tasks"], querystring: UpcomingQuery } },
    async (req) => tasks.getUpcomingTasks(req.supabase, req.user.id, req.query.days),
  );

  app.get("/tasks/pending", { schema: { tags: ["tasks"] } }, async (req) =>
    tasks.getAllPendingTasks(req.supabase),
  );

  app.get("/tasks/stats", { schema: { tags: ["tasks"] } }, async (req) =>
    tasks.getTaskStats(req.supabase, req.user.id),
  );

  app.get(
    "/tasks/by-ticket/:ticketId",
    { schema: { tags: ["tasks"], params: TicketIdParam } },
    async (req) => tasks.getTasksByTicket(req.supabase, req.params.ticketId),
  );

  app.get(
    "/tasks/by-user/:userId",
    { schema: { tags: ["tasks"], params: UserIdParam } },
    async (req) => tasks.getTasksByUser(req.supabase, req.params.userId),
  );

  app.get(
    "/tasks/:id",
    { schema: { tags: ["tasks"], params: IdParam } },
    async (req) => tasks.getTaskById(req.supabase, req.params.id),
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  app.post(
    "/tasks",
    { schema: { tags: ["tasks"], body: CreateBody } },
    async (req) =>
      tasks.createTask(req.supabase, { created_by: req.user.id, ...req.body } as any),
  );

  app.patch(
    "/tasks/:id",
    { schema: { tags: ["tasks"], params: IdParam, body: UpdateBody } },
    async (req) => tasks.updateTask(req.supabase, req.params.id, req.body as any),
  );

  app.post(
    "/tasks/:id/complete",
    { schema: { tags: ["tasks"], params: IdParam, body: CompleteBody } },
    async (req) =>
      tasks.completeTask(req.supabase, req.params.id, req.body.time_spent_minutes),
  );

  app.post(
    "/tasks/:id/reopen",
    { schema: { tags: ["tasks"], params: IdParam } },
    async (req) => tasks.reopenTask(req.supabase, req.params.id),
  );

  app.delete(
    "/tasks/:id",
    { schema: { tags: ["tasks"], params: IdParam } },
    async (req) => tasks.deleteTask(req.supabase, req.params.id),
  );
};
