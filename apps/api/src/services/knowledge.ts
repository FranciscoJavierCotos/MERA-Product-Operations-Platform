import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@stms/contracts";
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
} from "../types/knowledge.types";

type Client = SupabaseClient<Database>;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Collections
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getCollections(supabase: Client): Promise<KbCollection[]> {
  const { data, error } = await supabase
    .from("kb_collections")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as KbCollection[];
}

export async function getTags(supabase: Client): Promise<KbTag[]> {
  const { data, error } = await supabase
    .from("kb_tags")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as KbTag[];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Documents
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface DocumentFilters {
  search?: string;
  collection_id?: string;
  status_id?: number;
  archived?: boolean;
}

export async function getDocuments(
  supabase: Client,
  filters: DocumentFilters = {},
): Promise<KbDocumentWithVersion[]> {
  let q = supabase
    .from("kb_documents")
    .select(
      `
      *,
      collection:kb_collections(id, name, slug),
      tags:kb_document_tags(tag:kb_tags(id, name, color)),
      current_version:kb_document_versions!kb_documents_current_version_fk(*)
    `,
    )
    .order("updated_at", { ascending: false });

  if (filters.collection_id) q = q.eq("collection_id", filters.collection_id);
  if (filters.archived === false) q = q.is("archived_at", null);
  if (filters.archived === true) q = q.not("archived_at", "is", null);
  if (filters.search) q = q.ilike("title", `%${filters.search}%`);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    collection: { id: string; name: string; slug: string } | null;
    tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
    current_version: KbDocumentVersion | null;
    [k: string]: unknown;
  }>;

  // Best-effort chunk counts (one round-trip across all docs).
  const ids = rows.map((r) => r.id);
  const counts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: chunkRows } = await supabase
      .from("kb_document_chunks")
      .select("document_id")
      .in("document_id", ids);
    for (const c of (chunkRows ?? []) as { document_id: string }[]) {
      counts[c.document_id] = (counts[c.document_id] ?? 0) + 1;
    }
  }

  return rows.map((r) => ({
    ...(r as unknown as KbDocument),
    collection: r.collection,
    tags: r.tags?.map((t) => t.tag) ?? [],
    current_version: r.current_version,
    chunk_count: counts[r.id] ?? 0,
  }));
}

export async function getDocumentById(
  supabase: Client,
  id: string,
): Promise<KbDocumentWithVersion | null> {
  const { data, error } = await supabase
    .from("kb_documents")
    .select(
      `
      *,
      collection:kb_collections(id, name, slug),
      tags:kb_document_tags(tag:kb_tags(id, name, color)),
      current_version:kb_document_versions!kb_documents_current_version_fk(*)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { count } = await supabase
    .from("kb_document_chunks")
    .select("*", { count: "exact", head: true })
    .eq("document_id", id);

  const r = data as unknown as {
    collection: { id: string; name: string; slug: string } | null;
    tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
    current_version: KbDocumentVersion | null;
  } & KbDocument;

  return {
    ...(r as unknown as KbDocument),
    collection: r.collection,
    tags: r.tags?.map((t) => t.tag) ?? [],
    current_version: r.current_version,
    chunk_count: count ?? 0,
  };
}

export async function getDocumentVersions(
  supabase: Client,
  documentId: string,
): Promise<KbDocumentVersion[]> {
  const { data, error } = await supabase
    .from("kb_document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as KbDocumentVersion[];
}

export async function getDocumentChunks(
  supabase: Client,
  documentVersionId: string,
): Promise<KbDocumentChunk[]> {
  const { data, error } = await supabase
    .from("kb_document_chunks")
    .select(
      "id, document_id, document_version_id, chunk_index, content, content_tokens, page_number, metadata, created_at",
    )
    .eq("document_version_id", documentVersionId)
    .order("chunk_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as KbDocumentChunk[];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Resolutions (governance side)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ResolutionFilters {
  search?: string;
  ai_enabled?: boolean;
  archived?: boolean;
}

export async function getResolutionRows(
  supabase: Client,
  filters: ResolutionFilters = {},
): Promise<KbResolutionRow[]> {
  let q = supabase
    .from("tickets")
    .select(
      `
      id, ticket_number, title, resolution_plain, resolution_embedding, resolved_at,
      status:ticket_statuses(name, is_final),
      category:ticket_categories(name, label),
      settings:kb_resolution_settings(ai_retrieval_enabled, archived_at)
    `,
    )
    .not("resolution_plain", "is", null)
    .order("resolved_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (filters.search) q = q.ilike("title", `%${filters.search}%`);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    ticket_number: number;
    title: string;
    resolution_plain: string | null;
    resolution_embedding: unknown | null;
    resolved_at: string | null;
    status: { name: string; is_final: boolean } | null;
    category: { name: string; label: string } | null;
    settings:
      | { ai_retrieval_enabled: boolean; archived_at: string | null }[]
      | { ai_retrieval_enabled: boolean; archived_at: string | null }
      | null;
  }>;

  const normalized: KbResolutionRow[] = rows
    .filter((r) => r.status?.is_final)
    .map((r) => {
      const s = Array.isArray(r.settings) ? r.settings[0] : r.settings;
      return {
        ticket_id: r.id,
        ticket_number: r.ticket_number,
        title: r.title,
        resolution_plain: r.resolution_plain,
        has_embedding: r.resolution_embedding != null,
        resolved_at: r.resolved_at,
        category: r.category?.label ?? null,
        status_name: r.status?.name ?? "",
        ai_retrieval_enabled: s?.ai_retrieval_enabled ?? true,
        archived_at: s?.archived_at ?? null,
      };
    });

  return normalized.filter((r) => {
    if (filters.ai_enabled === true && !r.ai_retrieval_enabled) return false;
    if (filters.ai_enabled === false && r.ai_retrieval_enabled) return false;
    if (filters.archived === false && r.archived_at) return false;
    if (filters.archived === true && !r.archived_at) return false;
    return true;
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Retrieval config
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getRetrievalConfig(
  supabase: Client,
): Promise<KbRetrievalConfig> {
  const { data, error } = await supabase
    .from("kb_retrieval_config")
    .select("*")
    .eq("environment", "production")
    .single();
  if (error) throw error;
  return data as KbRetrievalConfig;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// KPIs
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getKnowledgeKpis(
  supabase: Client,
): Promise<KbKpiSnapshot> {
  const [
    indexed,
    disabledRes,
    chunks,
    docsReady,
    pending,
    failed,
    retrievals,
    topSourceRes,
  ] = await Promise.all([
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .not("resolution_embedding", "is", null),
    supabase
      .from("kb_resolution_settings")
      .select("ticket_id", { count: "exact", head: true })
      .eq("ai_retrieval_enabled", false),
    supabase.from("kb_document_chunks").select("id", { count: "exact", head: true }),
    supabase
      .from("kb_documents")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .eq("ai_retrieval_enabled", true),
    supabase
      .from("kb_document_versions")
      .select("id", { count: "exact", head: true })
      .in("status_id", [1, 2]),
    supabase
      .from("kb_document_versions")
      .select("id", { count: "exact", head: true })
      .eq("status_id", 4),
    supabase
      .from("kb_retrieval_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    // SQL aggregate via RPC (replaces O(n Ã— m) JS tally â€” see migration 038).
    // Cast needed: generated types don't yet include this function.
    (supabase as unknown as { rpc: (fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }> })
      .rpc("get_top_kb_source", { days_back: 7 }),
  ]);

  const topRow = (topSourceRes.data as Array<{ title: string; cnt: number }> | null)?.[0];
  const topSource = topRow ? { title: topRow.title, count: Number(topRow.cnt) } : null;

  return {
    resolutions_indexed: indexed.count ?? 0,
    resolutions_disabled: disabledRes.count ?? 0,
    document_chunks: chunks.count ?? 0,
    documents_ready: docsReady.count ?? 0,
    versions_pending: pending.count ?? 0,
    versions_failed: failed.count ?? 0,
    retrievals_7d: retrievals.count ?? 0,
    top_source_7d: topSource,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Audit + retrieval (read)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getRecentAudit(
  supabase: Client,
  limit = 50,
): Promise<KbAuditLog[]> {
  const { data, error } = await supabase
    .from("kb_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as KbAuditLog[];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Retrieval RPC
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function matchKnowledge(
  supabase: Client,
  embedding: number[],
  options: { threshold?: number; count?: number } = {},
): Promise<KnowledgeMatch[]> {
  const { data, error } = await (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: KnowledgeMatch[] | null; error: unknown }>)(
    "match_knowledge",
    {
      query_embedding: embedding,
      match_threshold: options.threshold ?? null,
      match_count: options.count ?? null,
    },
  );
  if (error) throw error;
  return (data ?? []) as KnowledgeMatch[];
}
