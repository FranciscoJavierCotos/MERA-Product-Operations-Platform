import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as kb from "../services/knowledge";
import * as kbAdmin from "../services/knowledge-admin";

const IdParam = z.object({ id: z.string().uuid() });

const DocumentFiltersQuery = z.object({
  collection_id: z.string().uuid().optional(),
  archived: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

const ResolutionFiltersQuery = z.object({
  search: z.string().optional(),
  ai_enabled: z.coerce.boolean().optional(),
  archived: z.coerce.boolean().optional(),
});

const AuditQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

const MatchBody = z.object({
  embedding: z.array(z.number()),
  threshold: z.number().optional(),
  count: z.number().int().min(1).max(50).optional(),
});

export const knowledgeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/knowledge/collections", { schema: { tags: ["knowledge"] } }, async (req) =>
    kb.getCollections(req.supabase),
  );
  app.get("/knowledge/tags", { schema: { tags: ["knowledge"] } }, async (req) =>
    kb.getTags(req.supabase),
  );
  app.get(
    "/knowledge/documents",
    { schema: { tags: ["knowledge"], querystring: DocumentFiltersQuery } },
    async (req) => kb.getDocuments(req.supabase, req.query),
  );
  app.get(
    "/knowledge/documents/:id",
    { schema: { tags: ["knowledge"], params: IdParam } },
    async (req) => kb.getDocumentById(req.supabase, req.params.id),
  );
  app.get(
    "/knowledge/documents/:id/versions",
    { schema: { tags: ["knowledge"], params: IdParam } },
    async (req) => kb.getDocumentVersions(req.supabase, req.params.id),
  );
  app.get(
    "/knowledge/documents/:id/chunks",
    { schema: { tags: ["knowledge"], params: IdParam } },
    async (req) => kb.getDocumentChunks(req.supabase, req.params.id),
  );
  app.get(
    "/knowledge/resolutions",
    { schema: { tags: ["knowledge"], querystring: ResolutionFiltersQuery } },
    async (req) => kb.getResolutionRows(req.supabase, req.query),
  );
  app.get("/knowledge/retrieval-config", { schema: { tags: ["knowledge"] } }, async (req) =>
    kb.getRetrievalConfig(req.supabase),
  );
  app.get("/knowledge/kpis", { schema: { tags: ["knowledge"] } }, async (req) =>
    kb.getKnowledgeKpis(req.supabase),
  );
  app.get(
    "/knowledge/audit",
    { schema: { tags: ["knowledge"], querystring: AuditQuery } },
    async (req) => kb.getRecentAudit(req.supabase, req.query.limit),
  );
  app.post(
    "/knowledge/match",
    { schema: { tags: ["knowledge"], body: MatchBody } },
    async (req) =>
      kb.matchKnowledge(req.supabase, req.body.embedding, {
        threshold: req.body.threshold,
        count: req.body.count,
      }),
  );

  // ─── Admin mutations ─────────────────────────────────────────────────────

  const TicketIdParam = z.object({ ticketId: z.string().uuid() });
  const DocIdParam = z.object({ documentId: z.string().uuid() });
  const VersionIdParam = z.object({ versionId: z.string().uuid() });
  const CollectionIdParam = z.object({ collectionId: z.string().uuid() });

  app.post(
    "/knowledge/documents",
    {
      schema: {
        tags: ["knowledge"],
        body: z.object({
          title: z.string().min(1),
          description: z.string().nullable().optional(),
          collection_id: z.string().uuid().nullable().optional(),
          tag_ids: z.array(z.string().uuid()).optional(),
        }),
      },
    },
    async (req) => kbAdmin.createDocument(req.supabase, req.user.id, req.body),
  );

  app.patch(
    "/knowledge/documents/:documentId",
    {
      schema: {
        tags: ["knowledge"],
        params: DocIdParam,
        // Explicit allowlist — .strict() rejects any key not listed here.
        body: z.object({
          title: z.string().min(1).optional(),
          description: z.string().nullable().optional(),
          collection_id: z.string().uuid().nullable().optional(),
          current_version_id: z.string().uuid().nullable().optional(),
        }).strict(),
      },
    },
    async (req) =>
      kbAdmin.updateDocument(req.supabase, req.user.id, req.params.documentId, req.body),
  );

  app.post(
    "/knowledge/documents/:documentId/archive",
    {
      schema: {
        tags: ["knowledge"],
        params: DocIdParam,
        body: z.object({ archive: z.boolean() }),
      },
    },
    async (req) =>
      kbAdmin.archiveDocument(req.supabase, req.user.id, req.params.documentId, req.body.archive),
  );

  app.delete(
    "/knowledge/documents/:documentId",
    { schema: { tags: ["knowledge"], params: DocIdParam } },
    async (req) => kbAdmin.deleteDocument(req.supabase, req.user.id, req.params.documentId),
  );

  app.get(
    "/knowledge/documents/:documentId/next-version",
    { schema: { tags: ["knowledge"], params: DocIdParam } },
    async (req) => ({
      version_number: await kbAdmin.getNextVersionNumber(req.supabase, req.params.documentId),
    }),
  );

  app.post(
    "/knowledge/document-versions",
    {
      schema: {
        tags: ["knowledge"],
        body: z.object({
          document_id: z.string().uuid(),
          version_number: z.number().int().min(1),
          storage_path: z.string(),
          original_filename: z.string(),
          mime_type: z.string(),
          file_size_bytes: z.number().int().min(0),
        }),
      },
    },
    async (req) => kbAdmin.recordDocumentVersion(req.supabase, req.user.id, req.body),
  );

  app.post(
    "/knowledge/document-versions/:versionId/reprocess",
    { schema: { tags: ["knowledge"], params: VersionIdParam } },
    async (req) => kbAdmin.reprocessVersion(req.supabase, req.user.id, req.params.versionId),
  );

  app.post(
    "/knowledge/collections",
    {
      schema: {
        tags: ["knowledge"],
        body: z.object({
          id: z.string().uuid().optional(),
          name: z.string().min(1),
          slug: z.string().min(1),
          description: z.string().nullable().optional(),
        }),
      },
    },
    async (req) => kbAdmin.upsertCollection(req.supabase, req.user.id, req.body),
  );

  app.post(
    "/knowledge/collections/:collectionId/archive",
    {
      schema: {
        tags: ["knowledge"],
        params: CollectionIdParam,
        body: z.object({ archive: z.boolean() }),
      },
    },
    async (req) =>
      kbAdmin.archiveCollection(
        req.supabase,
        req.user.id,
        req.params.collectionId,
        req.body.archive,
      ),
  );

  app.patch(
    "/knowledge/retrieval-config",
    {
      schema: {
        tags: ["knowledge"],
        body: z.object({
          similarity_threshold: z.number(),
          max_results: z.number().int(),
          source_weights: z.record(z.number()),
          sources_enabled: z.record(z.boolean()),
        }),
      },
    },
    async (req) => kbAdmin.updateRetrievalConfig(req.supabase, req.user.id, req.body),
  );

  app.post(
    "/knowledge/resolutions/:ticketId/toggle-ai",
    {
      schema: {
        tags: ["knowledge"],
        params: TicketIdParam,
        body: z.object({ enabled: z.boolean() }),
      },
    },
    async (req) =>
      kbAdmin.toggleResolutionAi(
        req.supabase,
        req.user.id,
        req.params.ticketId,
        req.body.enabled,
      ),
  );

  app.post(
    "/knowledge/resolutions/:ticketId/archive",
    {
      schema: {
        tags: ["knowledge"],
        params: TicketIdParam,
        body: z.object({ archive: z.boolean() }),
      },
    },
    async (req) =>
      kbAdmin.archiveResolution(
        req.supabase,
        req.user.id,
        req.params.ticketId,
        req.body.archive,
      ),
  );

  app.post(
    "/knowledge/resolutions/:ticketId/reembed",
    { schema: { tags: ["knowledge"], params: TicketIdParam } },
    async (req) => kbAdmin.reembedResolution(req.supabase, req.user.id, req.params.ticketId),
  );

  app.post(
    "/knowledge/retrieval-log",
    {
      schema: {
        tags: ["knowledge"],
        body: z.object({
          ticket_id: z.string().uuid(),
          query_text: z.string(),
          results: z.unknown(),
          result_count: z.number().int().min(0),
        }),
      },
    },
    async (req) => kbAdmin.writeRetrievalLog(req.supabase, req.user.id, req.body as any),
  );
};
