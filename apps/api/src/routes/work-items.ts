import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as workItems from "../services/work-items";
import * as workItemComments from "../services/work-item-comments";

const IdParam = z.object({ id: z.string().uuid() });
const KeyParam = z.object({ key: z.string().min(1) });
const SprintIdParam = z.object({ sprintId: z.string().uuid() });

const ProjectQuery = z.object({ projectId: z.string().uuid() });

const RankQuery = z.object({
  projectId: z.string().uuid(),
  sprintId: z.string().uuid().nullable().optional(),
  status: z.string().optional(),
});

const CreateBody = z.object({
  project_id: z.string().uuid(),
  sprint_id: z.string().uuid().nullable().optional(),
  type: z.string().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  priority_id: z.number().int().nullable().optional(),
  story_points: z.number().int().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  rank: z.string(),
}).passthrough();

const UpdateBody = z.object({}).passthrough();

const StatusBody = z.object({ status: z.string() });
const MoveBody = z.object({ sprint_id: z.string().uuid().nullable() });
const ReorderBody = z.object({
  rank: z.string(),
  status: z.string().optional(),
  sprint_id: z.string().uuid().nullable().optional(),
});

const WorkItemCommentBody = z.object({
  content: z.string().min(1),
});

export const workItemRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/work-items/backlog",
    { schema: { tags: ["work-items"], querystring: ProjectQuery } },
    async (req) => workItems.listBacklog(req.supabase, req.query.projectId),
  );
  app.get(
    "/work-items/rank/first",
    { schema: { tags: ["work-items"], querystring: RankQuery } },
    async (req) => ({
      rank: await workItems.getFirstRank(
        req.supabase,
        req.query.projectId,
        req.query.sprintId ?? null,
        req.query.status as any,
      ),
    }),
  );
  app.get(
    "/work-items/rank/last",
    { schema: { tags: ["work-items"], querystring: RankQuery } },
    async (req) => ({
      rank: await workItems.getLastRank(
        req.supabase,
        req.query.projectId,
        req.query.sprintId ?? null,
        req.query.status as any,
      ),
    }),
  );
  app.get(
    "/work-items/sprint/:sprintId",
    { schema: { tags: ["work-items"], params: SprintIdParam } },
    async (req) => workItems.listSprintItems(req.supabase, req.params.sprintId),
  );
  app.get(
    "/work-items/sprint/:sprintId/board",
    { schema: { tags: ["work-items"], params: SprintIdParam } },
    async (req) => workItems.listSprintBoard(req.supabase, req.params.sprintId),
  );
  app.get(
    "/work-items/by-key/:key",
    { schema: { tags: ["work-items"], params: KeyParam } },
    async (req) => workItems.getWorkItemByKey(req.supabase, req.params.key),
  );
  app.get(
    "/work-items/:id",
    { schema: { tags: ["work-items"], params: IdParam } },
    async (req) => workItems.getWorkItem(req.supabase, req.params.id),
  );
  app.get(
    "/work-items/:id/history",
    { schema: { tags: ["work-items"], params: IdParam } },
    async (req) => workItems.getWorkItemHistory(req.supabase, req.params.id),
  );
  app.get(
    "/work-items/:id/comments",
    { schema: { tags: ["work-items"], params: IdParam } },
    async (req) => workItemComments.listWorkItemComments(req.supabase, req.params.id),
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  app.post(
    "/work-items",
    { schema: { tags: ["work-items"], body: CreateBody } },
    async (req) =>
      workItems.createWorkItem(req.supabase, { ...req.body, reporter_id: req.user.id } as any),
  );

  app.patch(
    "/work-items/:id",
    { schema: { tags: ["work-items"], params: IdParam, body: UpdateBody } },
    async (req) => workItems.updateWorkItem(req.supabase, req.params.id, req.body as any),
  );

  app.patch(
    "/work-items/:id/status",
    { schema: { tags: ["work-items"], params: IdParam, body: StatusBody } },
    async (req) =>
      workItems.updateStatus(req.supabase, req.params.id, req.body.status as any),
  );

  app.patch(
    "/work-items/:id/move-to-sprint",
    { schema: { tags: ["work-items"], params: IdParam, body: MoveBody } },
    async (req) =>
      workItems.moveToSprint(req.supabase, req.params.id, req.body.sprint_id),
  );

  app.patch(
    "/work-items/:id/reorder",
    { schema: { tags: ["work-items"], params: IdParam, body: ReorderBody } },
    async (req) =>
      workItems.reorderItem(req.supabase, req.params.id, req.body.rank, {
        status: req.body.status as any,
        sprint_id: req.body.sprint_id,
      }),
  );

  app.post(
    "/work-items/:id/comments",
    { schema: { tags: ["work-items"], params: IdParam, body: WorkItemCommentBody } },
    async (req) =>
      workItemComments.createWorkItemComment(req.supabase, {
        work_item_id: req.params.id,
        user_id: req.user.id,
        content: req.body.content,
      } as any),
  );
};
