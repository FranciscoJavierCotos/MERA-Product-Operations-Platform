import { z } from "zod";

export const uploadDocumentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(2000).optional().nullable(),
  collection_id: z.string().uuid().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).optional().default([]),
});

export const updateDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  collection_id: z.string().uuid().nullable().optional(),
  ai_retrieval_enabled: z.boolean().optional(),
});

export const collectionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, and dashes"),
  description: z.string().max(1000).nullable().optional(),
});

export const retrievalConfigSchema = z.object({
  similarity_threshold: z.number().min(0).max(1),
  max_results: z.number().int().min(1).max(50),
  source_weights: z.object({
    resolution: z.number().min(0).max(5),
    document: z.number().min(0).max(5),
  }),
  sources_enabled: z.object({
    resolution: z.boolean(),
    document: z.boolean(),
  }),
});

export const toggleResolutionAiSchema = z.object({
  ticket_id: z.string().uuid(),
  ai_retrieval_enabled: z.boolean(),
});

export const archiveResolutionSchema = z.object({
  ticket_id: z.string().uuid(),
  archive: z.boolean(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type CollectionInput = z.infer<typeof collectionSchema>;
export type RetrievalConfigInput = z.infer<typeof retrievalConfigSchema>;
