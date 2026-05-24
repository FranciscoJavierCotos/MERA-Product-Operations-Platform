import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

type Client = SupabaseClient<Database>;

/**
 * Admin write operations for the knowledge base. Reads live in knowledge.ts
 * since they're called from many places; admin writes are concentrated in
 * the knowledge actions and got their own module for readability.
 *
 * Each write logs a row in kb_audit_log so the source of every change is
 * traceable. The actorId comes from the per-request JWT.
 */

async function writeAudit(
  sb: Client,
  actorId: string,
  entityType: string,
  entityId: string | null,
  action: string,
  payload: Record<string, unknown> = {},
) {
  await (sb.from("kb_audit_log") as any).insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: actorId,
    payload,
  });
}

// ── Documents ───────────────────────────────────────────────────────────────

export async function createDocument(
  sb: Client,
  actorId: string,
  input: {
    title: string;
    description?: string | null;
    collection_id?: string | null;
    tag_ids?: string[];
  },
) {
  const { data, error } = await (sb.from("kb_documents") as any)
    .insert({
      title: input.title,
      description: input.description ?? null,
      collection_id: input.collection_id ?? null,
      source_type_id: 2,
      created_by: actorId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create document");

  if (input.tag_ids && input.tag_ids.length > 0) {
    await (sb.from("kb_document_tags") as any).insert(
      input.tag_ids.map((tag_id) => ({ document_id: data.id, tag_id })),
    );
  }
  return { id: data.id as string };
}

export async function updateDocument(
  sb: Client,
  actorId: string,
  id: string,
  patch: Record<string, unknown>,
) {
  const { error } = await (sb.from("kb_documents") as any).update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit(sb, actorId, "document", id, "updated", patch);
  return { ok: true as const };
}

export async function archiveDocument(
  sb: Client,
  actorId: string,
  id: string,
  archive: boolean,
) {
  const { error } = await (sb.from("kb_documents") as any)
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit(sb, actorId, "document", id, archive ? "archived" : "unarchived");
  return { ok: true as const };
}

export async function deleteDocument(
  sb: Client,
  actorId: string,
  id: string,
): Promise<{ storage_paths: string[] }> {
  const { data: versions } = await sb
    .from("kb_document_versions")
    .select("storage_path")
    .eq("document_id", id)
    .returns<{ storage_path: string }[]>();

  await (sb.from("kb_documents") as any).update({ current_version_id: null }).eq("id", id);

  const { error } = await sb.from("kb_documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit(sb, actorId, "document", id, "deleted");
  return { storage_paths: (versions ?? []).map((v) => v.storage_path) };
}

// ── Document versions ───────────────────────────────────────────────────────

export async function getNextVersionNumber(sb: Client, documentId: string) {
  const { data } = await sb
    .from("kb_document_versions")
    .select("version_number")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle<{ version_number: number }>();
  return (data?.version_number ?? 0) + 1;
}

export async function recordDocumentVersion(
  sb: Client,
  actorId: string,
  input: {
    document_id: string;
    version_number: number;
    storage_path: string;
    original_filename: string;
    mime_type: string;
    file_size_bytes: number;
  },
) {
  const { data, error } = await (sb.from("kb_document_versions") as any)
    .insert({
      ...input,
      status_id: 1,
      uploaded_by: actorId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to record version");
  await writeAudit(sb, actorId, "document_version", data.id, "uploaded", {
    document_id: input.document_id,
    filename: input.original_filename,
    version: input.version_number,
  });
  return { id: data.id as string };
}

export async function reprocessVersion(sb: Client, actorId: string, versionId: string) {
  const { error } = await (sb.from("kb_document_versions") as any)
    .update({ status_id: 1, processing_error: null, processed_at: null })
    .eq("id", versionId);
  if (error) throw new Error(error.message);
  await writeAudit(sb, actorId, "document_version", versionId, "reprocess_requested");
  return { ok: true as const };
}

// ── Collections ─────────────────────────────────────────────────────────────

export async function upsertCollection(
  sb: Client,
  actorId: string,
  input: { id?: string; name: string; slug: string; description?: string | null },
) {
  if (input.id) {
    const { error } = await (sb.from("kb_collections") as any)
      .update({
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    await writeAudit(sb, actorId, "collection", input.id, "updated", {
      name: input.name,
      slug: input.slug,
    });
    return { id: input.id };
  }

  const { data, error } = await (sb.from("kb_collections") as any)
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      created_by: actorId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Insert failed");
  await writeAudit(sb, actorId, "collection", data.id, "created", {
    name: input.name,
    slug: input.slug,
  });
  return { id: data.id as string };
}

export async function archiveCollection(
  sb: Client,
  actorId: string,
  id: string,
  archive: boolean,
) {
  const { error } = await (sb.from("kb_collections") as any)
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit(sb, actorId, "collection", id, archive ? "archived" : "unarchived");
  return { ok: true as const };
}

// ── Retrieval config ────────────────────────────────────────────────────────

export async function updateRetrievalConfig(
  sb: Client,
  actorId: string,
  input: {
    similarity_threshold: number;
    max_results: number;
    source_weights: Record<string, number>;
    sources_enabled: Record<string, boolean>;
  },
) {
  const { error } = await (sb.from("kb_retrieval_config") as any)
    .update({ ...input, updated_by: actorId })
    .eq("id", true);
  if (error) throw new Error(error.message);
  await writeAudit(sb, actorId, "config", null, "updated", input);
  return { ok: true as const };
}

// ── Resolution governance ───────────────────────────────────────────────────

export async function toggleResolutionAi(
  sb: Client,
  actorId: string,
  ticketId: string,
  enabled: boolean,
) {
  const { error } = await (sb.from("kb_resolution_settings") as any).upsert(
    {
      ticket_id: ticketId,
      ai_retrieval_enabled: enabled,
      updated_by: actorId,
    },
    { onConflict: "ticket_id" },
  );
  if (error) throw new Error(error.message);
  await writeAudit(sb, actorId, "resolution_setting", ticketId, "toggle_ai", {
    enabled,
  });
  return { ok: true as const };
}

export async function archiveResolution(
  sb: Client,
  actorId: string,
  ticketId: string,
  archive: boolean,
) {
  const { error } = await (sb.from("kb_resolution_settings") as any).upsert(
    {
      ticket_id: ticketId,
      archived_at: archive ? new Date().toISOString() : null,
      updated_by: actorId,
    },
    { onConflict: "ticket_id" },
  );
  if (error) throw new Error(error.message);
  await writeAudit(
    sb,
    actorId,
    "resolution_setting",
    ticketId,
    archive ? "archived" : "unarchived",
  );
  return { ok: true as const };
}

export async function reembedResolution(sb: Client, actorId: string, ticketId: string) {
  // Re-fires the BEFORE/AFTER triggers on the resolution column.
  const { data: ticket, error: fetchErr } = await sb
    .from("tickets")
    .select("resolution")
    .eq("id", ticketId)
    .single<{ resolution: string | null }>();
  if (fetchErr || !ticket) throw new Error(fetchErr?.message ?? "Ticket not found");

  const { error } = await (sb.from("tickets") as any)
    .update({ resolution: ticket.resolution })
    .eq("id", ticketId);
  if (error) throw new Error(error.message);
  await writeAudit(sb, actorId, "resolution_setting", ticketId, "reembed_requested");
  return { ok: true as const };
}

// ── Retrieval log ───────────────────────────────────────────────────────────

export async function writeRetrievalLog(
  sb: Client,
  actorId: string,
  input: {
    ticket_id: string;
    query_text: string;
    results: unknown;
    result_count: number;
  },
) {
  await (sb.from("kb_retrieval_log") as any).insert({
    ticket_id: input.ticket_id,
    user_id: actorId,
    query_text: input.query_text,
    results: input.results,
    result_count: input.result_count,
  });
  return { ok: true as const };
}
