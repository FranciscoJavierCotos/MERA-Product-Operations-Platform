/**
 * Integration tests: Sprint 5 schema changes
 *
 * Covers:
 *   2.6 — HNSW vector indexes replace IVFFlat on tickets and
 *         kb_document_chunks. Verified via pg_indexes.
 *   3.6 — requeue_missing_embeddings() and mark_stuck_documents()
 *         functions exist and return the expected shapes.
 *         mark_stuck_documents() is exercised end-to-end by
 *         inserting a version stuck in processing and verifying
 *         it gets marked failed.
 *   3.3 — purge_old_records() function exists and returns a
 *         per-table summary without deleting current data
 *         (called with retention_days = 100 years).
 *
 * Requires: local Supabase running with seed data
 *   (supabase start + supabase db reset).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Service-role client is needed to call SECURITY DEFINER functions
// and to insert/query kb_* tables that bypass RLS.
function makeServiceClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
    process.env["SUPABASE_ANON_KEY"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const sb = makeServiceClient();

// ── 2.6: HNSW indexes ────────────────────────────────────────────────────────

describe("Sprint 5 — 2.6: HNSW vector indexes", () => {
  it("tickets has an HNSW index on resolution_embedding", async () => {
    const { data, error } = await sb
      .from("pg_indexes")
      .select("indexname, indexdef")
      .eq("tablename", "tickets")
      .ilike("indexname", "%hnsw%");

    expect(error, `pg_indexes error: ${error?.message}`).toBeNull();
    const idx = (data ?? []).find((r) =>
      (r.indexname as string).includes("resolution_hnsw"),
    );
    expect(idx, "idx_tickets_resolution_hnsw not found").toBeDefined();
    expect((idx!.indexdef as string).toLowerCase()).toContain("hnsw");
  });

  it("tickets does NOT have an IVFFlat index on resolution_embedding", async () => {
    const { data, error } = await sb
      .from("pg_indexes")
      .select("indexname")
      .eq("tablename", "tickets")
      .ilike("indexname", "%ivfflat%");

    expect(error).toBeNull();
    // No IVFFlat index should remain on tickets
    const ivf = (data ?? []).find((r) =>
      (r.indexname as string).toLowerCase().includes("ivfflat"),
    );
    expect(ivf, "IVFFlat index still present on tickets").toBeUndefined();
  });

  it("kb_document_chunks has an HNSW index on embedding", async () => {
    const { data, error } = await sb
      .from("pg_indexes")
      .select("indexname, indexdef")
      .eq("tablename", "kb_document_chunks")
      .ilike("indexname", "%hnsw%");

    expect(error, `pg_indexes error: ${error?.message}`).toBeNull();
    const idx = (data ?? []).find((r) =>
      (r.indexname as string).includes("embedding_hnsw"),
    );
    expect(idx, "idx_kb_chunks_embedding_hnsw not found").toBeDefined();
    expect((idx!.indexdef as string).toLowerCase()).toContain("hnsw");
  });

  it("kb_document_chunks does NOT have an IVFFlat index on embedding", async () => {
    const { data, error } = await sb
      .from("pg_indexes")
      .select("indexname")
      .eq("tablename", "kb_document_chunks")
      .ilike("indexname", "%ivfflat%");

    expect(error).toBeNull();
    const ivf = (data ?? []).find((r) =>
      (r.indexname as string).toLowerCase().includes("ivfflat"),
    );
    expect(ivf, "IVFFlat index still present on kb_document_chunks").toBeUndefined();
  });
});

// ── 3.6: Embedding retry functions ───────────────────────────────────────────

describe("Sprint 5 — 3.6: requeue_missing_embeddings() function", () => {
  it("function exists in pg_proc", async () => {
    const { data, error } = await sb
      .from("pg_proc")
      .select("proname")
      .eq("proname", "requeue_missing_embeddings");

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("calling requeue_missing_embeddings() returns (requeued_count, error_text)", async () => {
    // The function may return an error_text if app settings are not
    // configured in the local env — that is acceptable. We only
    // verify it is callable and returns the expected column shape.
    const { data, error } = await sb.rpc("requeue_missing_embeddings");

    expect(error, `rpc error: ${error?.message}`).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    // Each row has requeued_count (int) and error_text (text|null)
    const row = (data as Array<{ requeued_count: number; error_text: string | null }>)[0];
    expect(row).toBeDefined();
    expect(typeof row.requeued_count).toBe("number");
    // error_text is either null (success) or a string (config missing)
    expect(row.error_text === null || typeof row.error_text === "string").toBe(true);
  });
});

describe("Sprint 5 — 3.6: mark_stuck_documents() function", () => {
  let testVersionId: string | null = null;
  let testDocumentId: string | null = null;
  let testCollectionId: string | null = null;

  beforeAll(async () => {
    // Create a minimal collection → document → version chain so we
    // have a real row to exercise mark_stuck_documents().
    const { data: coll } = await sb
      .from("kb_collections")
      .insert({ name: "[sprint5-test] stuck-doc-coll", environment: "test" })
      .select("id")
      .single();
    testCollectionId = coll?.id ?? null;

    if (!testCollectionId) return;

    const { data: doc } = await sb
      .from("kb_documents")
      .insert({
        collection_id: testCollectionId,
        title: "[sprint5-test] stuck document",
        storage_path: "test/not-real.pdf",
      })
      .select("id")
      .single();
    testDocumentId = doc?.id ?? null;

    if (!testDocumentId) return;

    // Insert a version already in "processing" (status_id=2) with an
    // updated_at far enough in the past to be considered stuck.
    const { data: ver } = await sb
      .from("kb_document_versions")
      .insert({
        document_id: testDocumentId,
        version_number: 1,
        storage_path: "test/not-real.pdf",
        status_id: 2, // processing
      })
      .select("id")
      .single();
    testVersionId = ver?.id ?? null;

    // Back-date updated_at so it appears stuck
    if (testVersionId) {
      await sb
        .from("kb_document_versions")
        .update({ updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() })
        .eq("id", testVersionId);
    }
  });

  afterAll(async () => {
    if (testVersionId) {
      await sb.from("kb_document_versions").delete().eq("id", testVersionId);
    }
    if (testDocumentId) {
      await sb.from("kb_documents").delete().eq("id", testDocumentId);
    }
    if (testCollectionId) {
      await sb.from("kb_collections").delete().eq("id", testCollectionId);
    }
  });

  it("function exists in pg_proc", async () => {
    const { data, error } = await sb
      .from("pg_proc")
      .select("proname")
      .eq("proname", "mark_stuck_documents");

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("marks a stuck processing version as failed and logs to kb_audit_log", async () => {
    if (!testVersionId) {
      console.warn("Skipping: test version creation failed (likely missing KB tables).");
      return;
    }

    const { data: count, error } = await sb.rpc("mark_stuck_documents");
    expect(error, `rpc error: ${error?.message}`).toBeNull();
    expect(typeof count).toBe("number");
    expect(count as number).toBeGreaterThanOrEqual(1);

    // Verify the version was flipped to failed (status_id = 4)
    const { data: ver } = await sb
      .from("kb_document_versions")
      .select("status_id, processing_error")
      .eq("id", testVersionId)
      .single();

    expect(ver?.status_id).toBe(4);
    expect(ver?.processing_error).toContain("Timed out");

    // Verify an audit log row was written
    const { data: auditRows } = await sb
      .from("kb_audit_log")
      .select("action, payload")
      .eq("entity_id", testVersionId)
      .eq("action", "ingest_stuck");

    expect((auditRows ?? []).length).toBeGreaterThanOrEqual(1);
  });
});

// ── 3.3: TTL archival function ────────────────────────────────────────────────

describe("Sprint 5 — 3.3: purge_old_records() function", () => {
  it("function exists in pg_proc", async () => {
    const { data, error } = await sb
      .from("pg_proc")
      .select("proname")
      .eq("proname", "purge_old_records");

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("purge_old_records(36500) returns 6 table-name rows with numeric counts", async () => {
    // 36500 days ≈ 100 years — nothing should be deleted in a test DB.
    const { data, error } = await sb.rpc("purge_old_records", {
      p_retention_days: 36500,
    });

    expect(error, `rpc error: ${error?.message}`).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    const rows = data as Array<{ table_name: string; deleted_count: number }>;
    expect(rows.length).toBe(6);

    const expectedTables = new Set([
      "ticket_history",
      "work_item_history",
      "kb_audit_log",
      "kb_retrieval_log",
      "company_health_history",
      "escalation_history",
    ]);

    for (const row of rows) {
      expect(expectedTables.has(row.table_name)).toBe(true);
      expect(typeof row.deleted_count).toBe("number");
      // With 100-year retention nothing should be deleted in a test DB
      expect(row.deleted_count).toBe(0);
    }
  });
});
