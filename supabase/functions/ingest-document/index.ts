// ============================================================
// ingest-document Edge Function
//
// Triggered via pg_net by an AFTER INSERT/UPDATE on
// kb_document_versions when status_id = 1 (pending). Pipeline:
//
//   1. Mark version processing.
//   2. Download the source object from kb-documents Storage.
//   3. Extract text from the PDF (Deno-native unpdf).
//   4. Chunk the text (~800 tokens, ~100 overlap).
//   5. Batch-embed chunks via Gemini gemini-embedding-001 (768 dims).
//   6. Persist chunks + flip current_version_id + mark ready.
//   7. On any failure: mark failed, persist error, write audit row.
//
// Required secrets:
//   GEMINI_API_KEY                 — Google AI Studio key
//   SUPABASE_URL                   — auto-injected
//   SUPABASE_SERVICE_ROLE_KEY      — auto-injected
// ============================================================

// @ts-expect-error: Deno ESM imports resolved at deploy time
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-expect-error: Deno ESM imports resolved at deploy time
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

declare const Deno: { env: { get: (key: string) => string | undefined } };

const GEMINI_MODEL = "models/gemini-embedding-001";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:embedContent`;
const EMBEDDING_DIMS = 768;
const MAX_EXTRACTED_CHARS = 5_000_000;
const TARGET_CHUNK_CHARS = 3200;
const CHUNK_OVERLAP_CHARS = 400;
const MIN_CHUNK_CHARS = 50;
const EMBED_BATCH = 5;

interface RequestBody {
  version_id?: string;
}

interface ChunkRecord {
  chunk_index: number;
  content: string;
  content_tokens: number;
  page_number: number | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function approxTokens(text: string): number {
  // Cheap heuristic — Gemini's tokenizer is ~4 chars/token for English.
  return Math.ceil(text.length / 4);
}

function chunkText(
  pages: { page: number; text: string }[],
): ChunkRecord[] {
  const chunks: ChunkRecord[] = [];
  let chunkIndex = 0;

  for (const { page, text } of pages) {
    let remaining = text.replace(/\s+/g, " ").trim();
    if (!remaining) continue;

    while (remaining.length > 0) {
      let slice: string;
      if (remaining.length <= TARGET_CHUNK_CHARS) {
        slice = remaining;
        remaining = "";
      } else {
        // Prefer splits on paragraph / sentence boundaries within the window.
        const window = remaining.slice(0, TARGET_CHUNK_CHARS);
        const candidates = [
          window.lastIndexOf("\n\n"),
          window.lastIndexOf(". "),
          window.lastIndexOf("! "),
          window.lastIndexOf("? "),
          window.lastIndexOf(" "),
        ];
        const splitAt = Math.max(...candidates);
        const cut =
          splitAt > TARGET_CHUNK_CHARS / 2 ? splitAt + 1 : TARGET_CHUNK_CHARS;
        slice = remaining.slice(0, cut).trim();
        const overlapStart = Math.max(0, cut - CHUNK_OVERLAP_CHARS);
        remaining = remaining.slice(overlapStart).trimStart();
        // Guard against infinite loop if the slice gobbled the overlap zone.
        if (remaining.length >= TARGET_CHUNK_CHARS && overlapStart === 0) {
          remaining = remaining.slice(cut);
        }
      }

      if (slice.length >= MIN_CHUNK_CHARS) {
        chunks.push({
          chunk_index: chunkIndex++,
          content: slice,
          content_tokens: approxTokens(slice),
          page_number: page,
        });
      }
    }
  }

  return chunks;
}

async function embedOne(
  text: string,
  geminiKey: string,
): Promise<number[] | null> {
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMS,
    }),
  });
  if (!res.ok) {
    console.error(`Gemini embed failed: ${res.status} ${await res.text()}`);
    return null;
  }
  const payload = (await res.json()) as {
    embedding?: { values?: number[] };
  };
  const values = payload.embedding?.values;
  if (!values || values.length !== EMBEDDING_DIMS) return null;
  return values;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!geminiKey || !supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Missing required secrets" }, 500);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const versionId = body.version_id;
  if (!versionId) {
    return jsonResponse({ error: "version_id is required" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: version, error: fetchError } = await supabase
    .from("kb_document_versions")
    .select("id, document_id, storage_path, status_id, version_number")
    .eq("id", versionId)
    .maybeSingle();

  if (fetchError) return jsonResponse({ error: fetchError.message }, 500);
  if (!version) return jsonResponse({ error: "Version not found" }, 404);

  async function fail(message: string) {
    await supabase
      .from("kb_document_versions")
      .update({ status_id: 4, processing_error: message, processed_at: new Date().toISOString() })
      .eq("id", versionId);
    await supabase.from("kb_audit_log").insert({
      entity_type: "document_version",
      entity_id: versionId,
      action: "ingest_failed",
      payload: { error: message },
    });
  }

  // Flip to processing.
  const { error: procErr } = await supabase
    .from("kb_document_versions")
    .update({ status_id: 2, processing_error: null })
    .eq("id", versionId);
  if (procErr) {
    return jsonResponse({ error: procErr.message }, 500);
  }

  // Wipe any chunks lingering from a previous ingest of this version.
  await supabase
    .from("kb_document_chunks")
    .delete()
    .eq("document_version_id", versionId);

  try {
    const { data: file, error: dlErr } = await supabase.storage
      .from("kb-documents")
      .download(version.storage_path);
    if (dlErr || !file) {
      await fail(`Download failed: ${dlErr?.message ?? "no file"}`);
      return jsonResponse({ error: "Download failed" }, 500);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(bytes);
    const pageCount = pdf.numPages;

    // Extract all pages in a single WASM call — iterating page-by-page is
    // ~100x slower and causes the function to time out on large PDFs.
    const { text: rawPages } = await extractText(pdf, { mergePages: false });
    const pageTexts: string[] = Array.isArray(rawPages)
      ? rawPages.map((t) => (typeof t === "string" ? t : String(t ?? "")))
      : [String(rawPages ?? "")];

    const pages: { page: number; text: string }[] = [];
    let totalChars = 0;
    for (let p = 0; p < pageTexts.length; p++) {
      const pageText = pageTexts[p];
      totalChars += pageText.length;
      if (totalChars > MAX_EXTRACTED_CHARS) {
        await fail(`Extracted text exceeds ${MAX_EXTRACTED_CHARS} chars`);
        return jsonResponse({ error: "Document too large" }, 413);
      }
      pages.push({ page: p + 1, text: pageText });
    }

    const fullText = pages.map((p) => p.text).join("\n\n");
    const chunks = chunkText(pages);

    if (chunks.length === 0) {
      await fail("No extractable text in PDF");
      return jsonResponse({ error: "No extractable text" }, 422);
    }

    // Embed in batches; halt on first persistent failure.
    const rows: Array<{
      document_version_id: string;
      document_id: string;
      chunk_index: number;
      content: string;
      content_tokens: number;
      page_number: number | null;
      embedding: number[];
    }> = [];

    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const embeddings = await Promise.all(
        batch.map((c) => embedOne(c.content, geminiKey)),
      );
      for (let j = 0; j < batch.length; j++) {
        const emb = embeddings[j];
        if (!emb) {
          await fail(`Embedding failed at chunk ${batch[j].chunk_index}`);
          return jsonResponse({ error: "Embedding failed" }, 502);
        }
        rows.push({
          document_version_id: versionId,
          document_id: version.document_id,
          chunk_index: batch[j].chunk_index,
          content: batch[j].content,
          content_tokens: batch[j].content_tokens,
          page_number: batch[j].page_number,
          embedding: emb as unknown as number[],
        });
      }
    }

    const { error: insertErr } = await supabase
      .from("kb_document_chunks")
      .insert(rows);
    if (insertErr) {
      await fail(`Chunk insert failed: ${insertErr.message}`);
      return jsonResponse({ error: insertErr.message }, 500);
    }

    // Persist full text + page count + mark ready.
    const { error: doneErr } = await supabase
      .from("kb_document_versions")
      .update({
        status_id: 3,
        extracted_text: fullText.slice(0, MAX_EXTRACTED_CHARS),
        page_count: pageCount,
        processed_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq("id", versionId);
    if (doneErr) {
      await fail(`Finalize failed: ${doneErr.message}`);
      return jsonResponse({ error: doneErr.message }, 500);
    }

    // Promote this version if it's the newest for the document.
    const { data: latest } = await supabase
      .from("kb_document_versions")
      .select("id, version_number")
      .eq("document_id", version.document_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest && latest.id === versionId) {
      await supabase
        .from("kb_documents")
        .update({ current_version_id: versionId })
        .eq("id", version.document_id);
    }

    await supabase.from("kb_audit_log").insert({
      entity_type: "document_version",
      entity_id: versionId,
      action: "ingest_ready",
      payload: { chunks: rows.length, pages: pageCount },
    });

    return jsonResponse({
      ok: true,
      chunks: rows.length,
      pages: pageCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await fail(msg);
    return jsonResponse({ error: msg }, 500);
  }
});
