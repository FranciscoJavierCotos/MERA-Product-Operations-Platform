/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";
import type {
  KbCollection,
  KbDocument,
  KbDocumentVersion,
  KbDocumentChunk,
  KbDocumentWithVersion,
  KbResolutionRow,
  KbRetrievalConfig,
  KbTag,
  KbAuditLog,
  KbKpiSnapshot,
  KnowledgeMatch,
} from "@/types/knowledge.types";

type AnyClient = unknown;

interface DocumentFilters {
  collection_id?: string;
  archived?: boolean;
  search?: string;
}

interface ResolutionFilters {
  search?: string;
  ai_enabled?: boolean;
  archived?: boolean;
}

export async function getCollections(_sb: AnyClient) {
  return apiBrowser.get<KbCollection[]>("/knowledge/collections");
}

export async function getTags(_sb: AnyClient) {
  return apiBrowser.get<KbTag[]>("/knowledge/tags");
}

export async function getDocuments(
  _sb: AnyClient,
  filters: DocumentFilters = {},
) {
  return apiBrowser.get<KbDocumentWithVersion[]>("/knowledge/documents", {
    collection_id: filters.collection_id,
    archived: filters.archived,
    search: filters.search,
  });
}

export async function getDocumentById(_sb: AnyClient, id: string) {
  return apiBrowser.get<KbDocumentWithVersion | null>(
    `/knowledge/documents/${id}`,
  );
}

export async function getDocumentVersions(_sb: AnyClient, documentId: string) {
  return apiBrowser.get<KbDocumentVersion[]>(
    `/knowledge/documents/${documentId}/versions`,
  );
}

export async function getDocumentChunks(_sb: AnyClient, documentId: string) {
  return apiBrowser.get<KbDocumentChunk[]>(
    `/knowledge/documents/${documentId}/chunks`,
  );
}

export async function getResolutionRows(
  _sb: AnyClient,
  filters: ResolutionFilters = {},
) {
  return apiBrowser.get<KbResolutionRow[]>("/knowledge/resolutions", {
    search: filters.search,
    ai_enabled: filters.ai_enabled,
    archived: filters.archived,
  });
}

export async function getRetrievalConfig(_sb: AnyClient) {
  return apiBrowser.get<KbRetrievalConfig>("/knowledge/retrieval-config");
}

export async function getKnowledgeKpis(_sb: AnyClient) {
  return apiBrowser.get<KbKpiSnapshot>("/knowledge/kpis");
}

export async function getRecentAudit(_sb: AnyClient, limit = 50) {
  return apiBrowser.get<KbAuditLog[]>("/knowledge/audit", { limit });
}

export async function matchKnowledge(
  _sb: AnyClient,
  embedding: number[],
  options: { threshold?: number; count?: number } = {},
) {
  return apiBrowser.post<KnowledgeMatch[]>("/knowledge/match", {
    embedding,
    threshold: options.threshold,
    count: options.count,
  });
}
