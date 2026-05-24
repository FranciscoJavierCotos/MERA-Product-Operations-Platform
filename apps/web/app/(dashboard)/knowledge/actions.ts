"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api-client";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const profile = await api.get<{ role: string } | null>(`/users/${user.id}`);
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
  return { supabase, user };
}

function asError(err: unknown, fallback = "Failed"): string {
  if (err instanceof ApiError) return err.message || fallback;
  return err instanceof Error ? err.message : fallback;
}

// ────────────────────────────────────────────────
// Upload a new document or new version
// ────────────────────────────────────────────────

export async function uploadDocumentAction(formData: FormData) {
  try {
    const { user } = await assertAdmin();

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
      const created = await api.post<{ id: string }>("/knowledge/documents", {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        collection_id: parsed.data.collection_id ?? null,
        tag_ids: parsed.data.tag_ids,
      });
      documentId = created.id;
    }
    if (!documentId) {
      return { ok: false, error: "Failed to resolve document" };
    }

    const { version_number } = await api.get<{ version_number: number }>(
      `/knowledge/documents/${documentId}/next-version`,
    );

    // Get a signed upload URL from the API and PUT the file directly to Storage.
    const { signedUrl, path } = await api.post<{
      signedUrl: string;
      token: string;
      path: string;
    }>("/storage/kb-documents/sign-upload", {
      documentId,
      version: version_number,
      filename: file.name,
    });

    const buffer = await file.arrayBuffer();
    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: buffer,
    });
    if (!putRes.ok) {
      return { ok: false, error: `Upload failed: ${putRes.status} ${putRes.statusText}` };
    }

    const version = await api.post<{ id: string }>("/knowledge/document-versions", {
      document_id: documentId,
      version_number,
      storage_path: path,
      original_filename: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
    });

    revalidatePath("/knowledge");
    return { ok: true, document_id: documentId, version_id: version.id };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

// ────────────────────────────────────────────────
// Update document metadata
// ────────────────────────────────────────────────

export async function updateDocumentAction(input: unknown) {
  try {
    await assertAdmin();
    const parsed = updateDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...patch } = parsed.data;
    await api.patch(`/knowledge/documents/${id}`, patch);
    revalidatePath("/knowledge");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

// ────────────────────────────────────────────────
// Archive / unarchive document
// ────────────────────────────────────────────────

export async function archiveDocumentAction(documentId: string, archive: boolean) {
  try {
    await assertAdmin();
    await api.post(`/knowledge/documents/${documentId}/archive`, { archive });
    revalidatePath("/knowledge");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

// ────────────────────────────────────────────────
// Delete document (hard delete)
// ────────────────────────────────────────────────

export async function deleteDocumentAction(documentId: string) {
  try {
    await assertAdmin();
    const { storage_paths } = await api.del<{ storage_paths: string[] }>(
      `/knowledge/documents/${documentId}`,
    );
    if (storage_paths.length > 0) {
      await api.post("/storage/kb-documents/delete", { paths: storage_paths });
    }
    revalidatePath("/knowledge");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

// ────────────────────────────────────────────────
// Reprocess version
// ────────────────────────────────────────────────

export async function reprocessVersionAction(versionId: string) {
  try {
    await assertAdmin();
    await api.post(`/knowledge/document-versions/${versionId}/reprocess`);
    revalidatePath("/knowledge");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

// ────────────────────────────────────────────────
// Collections
// ────────────────────────────────────────────────

export async function saveCollectionAction(input: unknown) {
  try {
    await assertAdmin();
    const parsed = collectionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    await api.post("/knowledge/collections", parsed.data);
    revalidatePath("/knowledge");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

export async function archiveCollectionAction(id: string, archive: boolean) {
  try {
    await assertAdmin();
    await api.post(`/knowledge/collections/${id}/archive`, { archive });
    revalidatePath("/knowledge");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

// ────────────────────────────────────────────────
// Retrieval config
// ────────────────────────────────────────────────

export async function saveRetrievalConfigAction(input: unknown) {
  try {
    await assertAdmin();
    const parsed = retrievalConfigSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    await api.patch("/knowledge/retrieval-config", parsed.data);
    revalidatePath("/knowledge");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

// ────────────────────────────────────────────────
// Resolution governance
// ────────────────────────────────────────────────

export async function toggleResolutionAiAction(input: unknown) {
  try {
    await assertAdmin();
    const parsed = toggleResolutionAiSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    await api.post(
      `/knowledge/resolutions/${parsed.data.ticket_id}/toggle-ai`,
      { enabled: parsed.data.ai_retrieval_enabled },
    );
    revalidatePath("/knowledge");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

export async function archiveResolutionAction(input: unknown) {
  try {
    await assertAdmin();
    const parsed = archiveResolutionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    await api.post(
      `/knowledge/resolutions/${parsed.data.ticket_id}/archive`,
      { archive: parsed.data.archive },
    );
    revalidatePath("/knowledge");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

// ────────────────────────────────────────────────
// On-demand retrieval for the ticket detail "AI Recommendation" button.
// Available to support+admin (not just admin).
// ────────────────────────────────────────────────

export async function recommendForTicketAction(ticketId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const profile = await api.get<{ role: string } | null>(`/users/${user.id}`);
    if (
      !profile ||
      !["admin", "support_lead", "support_member"].includes(profile.role)
    ) {
      return { ok: false, error: "Forbidden" };
    }

    const ticket = await api.get<{
      id: string;
      title: string;
      description: string | null;
    } | null>(`/tickets/${ticketId}`);
    if (!ticket) return { ok: false, error: "Ticket not found" };

    const plain = `${ticket.title}\n\n${ticket.description ?? ""}`
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (plain.length < 5) {
      return { ok: false, error: "Ticket has no description to search on" };
    }

    // Call the embed-query Edge Function directly with the user's session
    // token. The Edge Function is invoked via Supabase Functions URL (not the
    // owned API) because it's stateless and runs on Supabase's Deno runtime —
    // there's nothing to centralize through the API here.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token ?? anonKey;

    const embedRes = await fetch(`${supabaseUrl}/functions/v1/embed-query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ text: plain }),
    });
    if (!embedRes.ok) {
      return { ok: false, error: `Embed function error: ${embedRes.status}` };
    }
    const { embedding } = (await embedRes.json()) as { embedding?: number[] };
    if (!embedding || embedding.length === 0) {
      return { ok: false, error: "No embedding returned" };
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

    const matches = await api.post<Match[]>("/knowledge/match", { embedding });
    const results = matches.filter((r) => r && r.source_id !== ticketId);

    await api.post("/knowledge/retrieval-log", {
      ticket_id: ticketId,
      query_text: plain.slice(0, 1000),
      results,
      result_count: results.length,
    });

    return { ok: true, results };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

// ────────────────────────────────────────────────
// Re-embed a resolution (touch the resolution column to re-fire the trigger)
// ────────────────────────────────────────────────

export async function reembedResolutionAction(ticketId: string) {
  try {
    await assertAdmin();
    await api.post(`/knowledge/resolutions/${ticketId}/reembed`);
    revalidatePath("/knowledge");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}
