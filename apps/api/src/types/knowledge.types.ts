import type { Database } from "@stms/contracts";

type T = Database["public"]["Tables"];

export type KbCollection = T["kb_collections"]["Row"];
export type KbTag = T["kb_tags"]["Row"];
export type KbDocument = T["kb_documents"]["Row"];
export type KbDocumentVersion = T["kb_document_versions"]["Row"];
export type KbDocumentChunk = T["kb_document_chunks"]["Row"];
export type KbResolutionSettings = T["kb_resolution_settings"]["Row"];
export type KbRetrievalConfig = T["kb_retrieval_config"]["Row"];
export type KbAuditLog = T["kb_audit_log"]["Row"];
export type KbRetrievalLog = T["kb_retrieval_log"]["Row"];

export const KB_STATUS = {
  PENDING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
  ARCHIVED: 5,
} as const;

export type KbStatusId = (typeof KB_STATUS)[keyof typeof KB_STATUS];

export const KB_SOURCE_TYPE = {
  RESOLUTION: 1,
  DOCUMENT: 2,
} as const;

export interface KbSourceWeights {
  resolution: number;
  document: number;
}

export interface KbSourcesEnabled {
  resolution: boolean;
  document: boolean;
}

export interface KnowledgeMatch {
  source_type: "resolution" | "document";
  source_id: string;
  chunk_id: string | null;
  title: string;
  snippet: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface KbDocumentWithVersion extends KbDocument {
  current_version: KbDocumentVersion | null;
  collection: Pick<KbCollection, "id" | "name" | "slug"> | null;
  tags: Pick<KbTag, "id" | "name" | "color">[];
  chunk_count: number;
}

export interface KbResolutionRow {
  ticket_id: string;
  ticket_number: number;
  title: string;
  resolution_plain: string | null;
  has_embedding: boolean;
  resolved_at: string | null;
  category: string | null;
  status_name: string;
  ai_retrieval_enabled: boolean;
  archived_at: string | null;
}

export interface KbKpiSnapshot {
  resolutions_indexed: number;
  resolutions_disabled: number;
  document_chunks: number;
  documents_ready: number;
  versions_pending: number;
  versions_failed: number;
  retrievals_7d: number;
  top_source_7d: { title: string; count: number } | null;
}
