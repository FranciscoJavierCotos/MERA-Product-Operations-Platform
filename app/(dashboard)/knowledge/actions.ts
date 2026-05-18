"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  uploadDocumentSchema,
  updateDocumentSchema,
  collectionSchema,
  retrievalConfigSchema,
  toggleResolutionAiSchema,
  archiveResolutionSchema,
} from "@/lib/validations/knowledge.schema";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
  return { supabase, user };
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  entityType: string,
  entityId: string | null,
  action: string,
  payload: Record<string, unknown> = {},
) {
  await (supabase.from("kb_audit_log") as any).insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: actorId,
    payload,
  });
}

// ────────────────────────────────────────────────
// Upload a new document or new version
// ────────────────────────────────────────────────

export async function uploadDocumentAction(formData: FormData) {
  const { supabase, user } = await assertAdmin();

  const parsed = uploadDocumentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    collection_id: formData.get("collection_id") || null,
    tag_ids: formData.getAll("tag_ids").filter(Boolean) as string[],
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const file = formData.get("file");
  const existingDocId = formData.get("document_id") as string | null;

  if (!(file instanceof File)) {
    return { ok: false, error: "file is required" };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "Only PDF files are supported" };
  }
  if (file.size > 50 * 1024 * 1024) {
    return { ok: false, error: "File exceeds 50 MB limit" };
  }

  // Resolve target document.
  let documentId = existingDocId;
  if (!documentId) {
    const { data: doc, error: docErr } = await (supabase.from("kb_documents") as any)
      .insert({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        collection_id: parsed.data.collection_id ?? null,
        source_type_id: 2,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (docErr || !doc) {
      return { ok: false, error: docErr?.message ?? "Failed to create document" };
    }
    documentId = doc.id;

    if (parsed.data.tag_ids && parsed.data.tag_ids.length > 0) {
      await (supabase.from("kb_document_tags") as any).insert(
        parsed.data.tag_ids.map((tagId) => ({
          document_id: documentId!,
          tag_id: tagId,
        })),
      );
    }
  }

  if (!documentId) {
    return { ok: false, error: "Failed to resolve document" };
  }

  // Determine next version number.
  const { data: latest } = await supabase
    .from("kb_document_versions")
    .select("version_number")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle<{ version_number: number }>();
  const nextVersion = (latest?.version_number ?? 0) + 1;

  // Upload to Storage.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${documentId}/v${nextVersion}/${safeName}`;
  const buffer = new Uint8Array(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from("kb-documents")
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadErr) {
    return { ok: false, error: `Upload failed: ${uploadErr.message}` };
  }

  // Insert version row (pending) — DB trigger calls ingest Edge Function.
  const { data: version, error: vErr } = await (supabase.from("kb_document_versions") as any)
    .insert({
      document_id: documentId,
      version_number: nextVersion,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      status_id: 1,
      uploaded_by: user.id,
    })
    .select("id")
    .single();
  if (vErr || !version) {
    return { ok: false, error: vErr?.message ?? "Failed to record version" };
  }

  await writeAudit(supabase, user.id, "document_version", version.id, "uploaded", {
    document_id: documentId,
    filename: file.name,
    version: nextVersion,
  });

  revalidatePath("/knowledge");
  return { ok: true, document_id: documentId, version_id: version.id };
}

// ────────────────────────────────────────────────
// Update document metadata
// ────────────────────────────────────────────────

export async function updateDocumentAction(input: unknown) {
  const { supabase, user } = await assertAdmin();
  const parsed = updateDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...patch } = parsed.data;
  const { error } = await (supabase.from("kb_documents") as any)
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await writeAudit(supabase, user.id, "document", id, "updated", patch);
  revalidatePath("/knowledge");
  return { ok: true };
}

// ────────────────────────────────────────────────
// Archive / unarchive document
// ────────────────────────────────────────────────

export async function archiveDocumentAction(documentId: string, archive: boolean) {
  const { supabase, user } = await assertAdmin();
  const { error } = await (supabase.from("kb_documents") as any)
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq("id", documentId);
  if (error) return { ok: false, error: error.message };
  await writeAudit(supabase, user.id, "document", documentId, archive ? "archived" : "unarchived");
  revalidatePath("/knowledge");
  return { ok: true };
}

// ────────────────────────────────────────────────
// Delete document (hard delete)
// ────────────────────────────────────────────────

export async function deleteDocumentAction(documentId: string) {
  const { supabase, user } = await assertAdmin();

  const { data: versions } = await supabase
    .from("kb_document_versions")
    .select("storage_path")
    .eq("document_id", documentId)
    .returns<{ storage_path: string }[]>();

  if (versions && versions.length > 0) {
    await supabase.storage
      .from("kb-documents")
      .remove(versions.map((v) => v.storage_path));
  }

  // Detach current_version FK before cascading delete to avoid FK churn.
  await (supabase.from("kb_documents") as any)
    .update({ current_version_id: null })
    .eq("id", documentId);

  const { error } = await supabase.from("kb_documents").delete().eq("id", documentId);
  if (error) return { ok: false, error: error.message };
  await writeAudit(supabase, user.id, "document", documentId, "deleted");
  revalidatePath("/knowledge");
  return { ok: true };
}

// ────────────────────────────────────────────────
// Reprocess version
// ────────────────────────────────────────────────

export async function reprocessVersionAction(versionId: string) {
  const { supabase, user } = await assertAdmin();
  const { error } = await (supabase.from("kb_document_versions") as any)
    .update({ status_id: 1, processing_error: null, processed_at: null })
    .eq("id", versionId);
  if (error) return { ok: false, error: error.message };
  await writeAudit(supabase, user.id, "document_version", versionId, "reprocess_requested");
  revalidatePath("/knowledge");
  return { ok: true };
}

// ────────────────────────────────────────────────
// Collections
// ────────────────────────────────────────────────

export async function saveCollectionAction(input: unknown) {
  const { supabase, user } = await assertAdmin();
  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, name, slug, description } = parsed.data;
  if (id) {
    const { error } = await (supabase.from("kb_collections") as any)
      .update({ name, slug, description: description ?? null })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    await writeAudit(supabase, user.id, "collection", id, "updated", { name, slug });
  } else {
    const { data, error } = await (supabase.from("kb_collections") as any)
      .insert({ name, slug, description: description ?? null, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
    await writeAudit(supabase, user.id, "collection", data.id, "created", { name, slug });
  }
  revalidatePath("/knowledge");
  return { ok: true };
}

export async function archiveCollectionAction(id: string, archive: boolean) {
  const { supabase, user } = await assertAdmin();
  const { error } = await (supabase.from("kb_collections") as any)
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await writeAudit(supabase, user.id, "collection", id, archive ? "archived" : "unarchived");
  revalidatePath("/knowledge");
  return { ok: true };
}

// ────────────────────────────────────────────────
// Retrieval config
// ────────────────────────────────────────────────

export async function saveRetrievalConfigAction(input: unknown) {
  const { supabase, user } = await assertAdmin();
  const parsed = retrievalConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { error } = await (supabase.from("kb_retrieval_config") as any)
    .update({
      similarity_threshold: parsed.data.similarity_threshold,
      max_results: parsed.data.max_results,
      source_weights: parsed.data.source_weights,
      sources_enabled: parsed.data.sources_enabled,
      updated_by: user.id,
    })
    .eq("id", true);
  if (error) return { ok: false, error: error.message };
  await writeAudit(supabase, user.id, "config", null, "updated", parsed.data);
  revalidatePath("/knowledge");
  return { ok: true };
}

// ────────────────────────────────────────────────
// Resolution governance
// ────────────────────────────────────────────────

export async function toggleResolutionAiAction(input: unknown) {
  const { supabase, user } = await assertAdmin();
  const parsed = toggleResolutionAiSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { error } = await (supabase.from("kb_resolution_settings") as any).upsert(
    {
      ticket_id: parsed.data.ticket_id,
      ai_retrieval_enabled: parsed.data.ai_retrieval_enabled,
      updated_by: user.id,
    },
    { onConflict: "ticket_id" },
  );
  if (error) return { ok: false, error: error.message };
  await writeAudit(
    supabase,
    user.id,
    "resolution_setting",
    parsed.data.ticket_id,
    "toggle_ai",
    { enabled: parsed.data.ai_retrieval_enabled },
  );
  revalidatePath("/knowledge");
  return { ok: true };
}

export async function archiveResolutionAction(input: unknown) {
  const { supabase, user } = await assertAdmin();
  const parsed = archiveResolutionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { error } = await (supabase.from("kb_resolution_settings") as any).upsert(
    {
      ticket_id: parsed.data.ticket_id,
      archived_at: parsed.data.archive ? new Date().toISOString() : null,
      updated_by: user.id,
    },
    { onConflict: "ticket_id" },
  );
  if (error) return { ok: false, error: error.message };
  await writeAudit(
    supabase,
    user.id,
    "resolution_setting",
    parsed.data.ticket_id,
    parsed.data.archive ? "archived" : "unarchived",
  );
  revalidatePath("/knowledge");
  return { ok: true };
}

// ────────────────────────────────────────────────
// On-demand retrieval for the ticket detail "AI Recommendation" button
// Available to support+admin (not just admin).
// ────────────────────────────────────────────────

export async function recommendForTicketAction(ticketId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (
    !profile ||
    !["admin", "support_lead", "support_member"].includes(profile.role)
  ) {
    return { ok: false, error: "Forbidden" };
  }

  const { data: ticket, error: tErr } = await supabase
    .from("tickets")
    .select("id, title, description")
    .eq("id", ticketId)
    .single<{ id: string; title: string; description: string | null }>();
  if (tErr || !ticket) {
    return { ok: false, error: tErr?.message ?? "Ticket not found" };
  }

  // Strip HTML and merge title + description as the query.
  const plain = `${ticket.title}\n\n${ticket.description ?? ""}`
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length < 5) {
    return { ok: false, error: "Ticket has no description to search on" };
  }

  // Call embed-query Edge Function with the user's session JWT.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? anonKey;

  let embedding: number[] | null = null;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/embed-query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ text: plain }),
    });
    if (!res.ok) {
      return { ok: false, error: `Embed function error: ${res.status}` };
    }
    const payload = (await res.json()) as { embedding?: number[] };
    embedding = payload.embedding ?? null;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Embed call failed",
    };
  }

  if (!embedding || embedding.length === 0) {
    return { ok: false, error: "No embedding returned" };
  }

  const { data, error } = await (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>)("match_knowledge", {
    query_embedding: embedding,
    match_threshold: null,
    match_count: null,
  });
  if (error) {
    const message = (error as { message?: string }).message ?? "RPC failed";
    return { ok: false, error: message };
  }

  type Match = {
    source_type: "resolution" | "document";
    source_id: string;
    chunk_id: string | null;
    title: string;
    snippet: string;
    similarity: number;
    metadata: Record<string, unknown>;
  };
  const results = (Array.isArray(data) ? data : []).filter(
    (r): r is Match => !!r && (r as Match).source_id !== ticketId,
  );

  await (supabase.from("kb_retrieval_log") as any).insert({
    ticket_id: ticketId,
    user_id: user.id,
    query_text: plain.slice(0, 1000),
    results,
    result_count: results.length,
  });

  return { ok: true, results };
}

// ────────────────────────────────────────────────
// Re-embed a resolution (touch the resolution column to re-fire the trigger)
// ────────────────────────────────────────────────

export async function reembedResolutionAction(ticketId: string) {
  const { supabase, user } = await assertAdmin();
  const { data: ticket, error: fetchErr } = await supabase
    .from("tickets")
    .select("resolution")
    .eq("id", ticketId)
    .single<{ resolution: string | null }>();
  if (fetchErr || !ticket) {
    return { ok: false, error: fetchErr?.message ?? "Ticket not found" };
  }
  const { error } = await (supabase.from("tickets") as any)
    .update({ resolution: ticket.resolution })
    .eq("id", ticketId);
  if (error) return { ok: false, error: error.message };
  await writeAudit(supabase, user.id, "resolution_setting", ticketId, "reembed_requested");
  revalidatePath("/knowledge");
  return { ok: true };
}
