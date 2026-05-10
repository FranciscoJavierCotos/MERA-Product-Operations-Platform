// Generates a 768-dim embedding for a ticket's resolution_plain
// field using Gemini text-embedding-004 and writes it back to
// tickets.resolution_embedding. Triggered via pg_net from the
// tickets_request_resolution_embedding trigger.
//
// Required secrets (set with `supabase secrets set ...`):
//   GEMINI_API_KEY              — Google AI Studio key
//   SUPABASE_URL                — auto-injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY   — auto-injected by Supabase

// @ts-expect-error: Deno-only ESM import resolved at deploy time
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get: (key: string) => string | undefined } };

const GEMINI_MODEL = "models/gemini-embedding-001";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:embedContent`;
const EMBEDDING_DIMS = 768;
const MAX_INPUT_CHARS = 8000; // ~2,048 tokens, Gemini's hard limit

interface RequestBody {
  ticket_id?: string;
}

interface GeminiEmbedResponse {
  embedding?: { values?: number[] };
  error?: { message?: string };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

  const ticketId = body.ticket_id;
  if (!ticketId) {
    return jsonResponse({ error: "ticket_id is required" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: ticket, error: fetchError } = await supabase
    .from("tickets")
    .select("id, resolution_plain")
    .eq("id", ticketId)
    .maybeSingle();

  if (fetchError) {
    return jsonResponse({ error: fetchError.message }, 500);
  }
  if (!ticket) {
    return jsonResponse({ error: "Ticket not found" }, 404);
  }

  const plain = (ticket.resolution_plain ?? "").trim();
  if (!plain) {
    return jsonResponse({ skipped: "empty resolution" }, 200);
  }

  const truncated = plain.length > MAX_INPUT_CHARS;
  const input = truncated ? plain.slice(0, MAX_INPUT_CHARS) : plain;
  if (truncated) {
    console.warn(
      `Resolution for ticket ${ticketId} exceeded ${MAX_INPUT_CHARS} chars; truncating.`,
    );
  }

  const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      content: { parts: [{ text: input }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMS,
    }),
  });

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    return jsonResponse(
      { error: `Gemini API error: ${geminiResponse.status} ${errText}` },
      502,
    );
  }

  const payload = (await geminiResponse.json()) as GeminiEmbedResponse;
  const values = payload.embedding?.values;
  if (!values || values.length !== EMBEDDING_DIMS) {
    return jsonResponse(
      {
        error: `Unexpected embedding shape (got ${values?.length ?? 0} dims, expected ${EMBEDDING_DIMS})`,
      },
      502,
    );
  }

  const { error: updateError } = await supabase
    .from("tickets")
    .update({ resolution_embedding: values as unknown as string })
    .eq("id", ticketId);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  return jsonResponse({ ok: true, dims: values.length, truncated });
});
