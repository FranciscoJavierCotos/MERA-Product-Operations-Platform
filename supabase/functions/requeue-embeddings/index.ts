// ============================================================
// requeue-embeddings Edge Function
//
// HTTP endpoint that re-queues any tickets whose
// resolution_plain is set but resolution_embedding is still
// NULL after the initial pg_net trigger attempt, and also
// auto-fails kb_document_versions stuck in "processing".
//
// Designed to be called:
//   • Nightly by a pg_cron job (via net.http_post to itself).
//   • On-demand by an operator: POST /functions/v1/requeue-embeddings
//   • By the Supabase CLI: supabase functions invoke requeue-embeddings
//
// Required secrets (auto-injected by Supabase):
//   SUPABASE_URL              — project URL
//   SUPABASE_SERVICE_ROLE_KEY — bypasses RLS for the scan query
//
// The function does NOT directly call Gemini — it re-fires
// the existing embed-resolution Edge Function via the same
// net.http_post mechanism the DB trigger uses, ensuring that
// the same retry/backoff surface is used for both paths.
//
// Response body:
//   { requeued: number, stuck_marked_failed: number }
// ============================================================

// @ts-expect-error: Deno-only ESM import resolved at deploy time
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get: (key: string) => string | undefined } };

const MISSING_EMBEDDING_GRACE_HOURS = 1;
const STUCK_PROCESSING_MINUTES = 10;
const REQUEUE_BATCH_LIMIT = 100;

interface RequeueSummary {
  requeued: number;
  stuck_marked_failed: number;
  errors: string[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function requeueMissingEmbeddings(
  supabaseUrl: string,
  serviceKey: string,
  anonKey: string,
): Promise<{ requeued: number; errors: string[] }> {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const cutoff = new Date(
    Date.now() - MISSING_EMBEDDING_GRACE_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("id")
    .not("resolution_plain", "is", null)
    .gt("resolution_plain", "")
    .is("resolution_embedding", null)
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(REQUEUE_BATCH_LIMIT);

  if (error) {
    return { requeued: 0, errors: [`Scan failed: ${error.message}`] };
  }

  const errors: string[] = [];
  let requeued = 0;

  for (const ticket of tickets ?? []) {
    try {
      const res = await fetch(
        `${supabaseUrl}/functions/v1/embed-resolution`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ ticket_id: ticket.id }),
        },
      );
      if (!res.ok) {
        errors.push(
          `embed-resolution returned ${res.status} for ticket ${ticket.id}`,
        );
      } else {
        requeued++;
      }
    } catch (err) {
      errors.push(
        `Network error for ticket ${ticket.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { requeued, errors };
}

async function markStuckDocuments(
  supabaseUrl: string,
  serviceKey: string,
): Promise<{ stuck_marked_failed: number; errors: string[] }> {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const cutoff = new Date(
    Date.now() - STUCK_PROCESSING_MINUTES * 60 * 1000,
  ).toISOString();

  const { data: stuck, error: scanError } = await supabase
    .from("kb_document_versions")
    .select("id")
    .eq("status_id", 2)
    .lt("updated_at", cutoff);

  if (scanError) {
    return {
      stuck_marked_failed: 0,
      errors: [`Stuck-doc scan failed: ${scanError.message}`],
    };
  }

  const errors: string[] = [];
  let stuck_marked_failed = 0;

  for (const ver of stuck ?? []) {
    const { error: upErr } = await supabase
      .from("kb_document_versions")
      .update({
        status_id: 4,
        processing_error:
          "Timed out in processing state (auto-marked by requeue-embeddings)",
        processed_at: new Date().toISOString(),
      })
      .eq("id", ver.id);

    if (upErr) {
      errors.push(`Failed to mark version ${ver.id}: ${upErr.message}`);
      continue;
    }

    await supabase.from("kb_audit_log").insert({
      entity_type: "document_version",
      entity_id: ver.id,
      action: "ingest_stuck",
      payload: {
        error: `Stuck in processing for > ${STUCK_PROCESSING_MINUTES} min; auto-failed by requeue-embeddings`,
      },
    });

    stuck_marked_failed++;
  }

  return { stuck_marked_failed, errors };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return jsonResponse({ error: "Missing required environment secrets" }, 500);
  }

  const summary: RequeueSummary = {
    requeued: 0,
    stuck_marked_failed: 0,
    errors: [],
  };

  const [embedResult, stuckResult] = await Promise.all([
    requeueMissingEmbeddings(supabaseUrl, serviceKey, anonKey),
    markStuckDocuments(supabaseUrl, serviceKey),
  ]);

  summary.requeued = embedResult.requeued;
  summary.stuck_marked_failed = stuckResult.stuck_marked_failed;
  summary.errors = [...embedResult.errors, ...stuckResult.errors];

  console.log(
    `requeue-embeddings: requeued=${summary.requeued} stuck_failed=${summary.stuck_marked_failed} errors=${summary.errors.length}`,
  );

  return jsonResponse(summary);
});
