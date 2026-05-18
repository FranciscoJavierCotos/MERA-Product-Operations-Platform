// ============================================================
// embed-query Edge Function
//
// Generates a 768-dim Gemini embedding for an arbitrary query
// string. Called synchronously from Next.js Server Actions
// (e.g. the "AI Recommendation" button on the ticket detail
// page) — does NOT write to the DB.
//
// Uses task_type RETRIEVAL_QUERY (the asymmetric counterpart to
// RETRIEVAL_DOCUMENT used by embed-resolution and
// ingest-document) for better retrieval quality.
//
// Required secrets:
//   GEMINI_API_KEY
// ============================================================

declare const Deno: { env: { get: (key: string) => string | undefined } };

const GEMINI_MODEL = "models/gemini-embedding-001";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:embedContent`;
const EMBEDDING_DIMS = 768;
const MAX_INPUT_CHARS = 8000;

interface RequestBody {
  text?: string;
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
  if (!geminiKey) {
    return jsonResponse({ error: "Missing GEMINI_API_KEY" }, 500);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const raw = (body.text ?? "").trim();
  if (!raw) {
    return jsonResponse({ error: "text is required" }, 400);
  }

  const truncated = raw.length > MAX_INPUT_CHARS;
  const input = truncated ? raw.slice(0, MAX_INPUT_CHARS) : raw;

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      content: { parts: [{ text: input }] },
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: EMBEDDING_DIMS,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return jsonResponse(
      { error: `Gemini API error: ${res.status} ${errText}` },
      502,
    );
  }

  const payload = (await res.json()) as {
    embedding?: { values?: number[] };
  };
  const values = payload.embedding?.values;
  if (!values || values.length !== EMBEDDING_DIMS) {
    return jsonResponse(
      {
        error: `Unexpected embedding shape (got ${values?.length ?? 0} dims, expected ${EMBEDDING_DIMS})`,
      },
      502,
    );
  }

  return jsonResponse({ embedding: values, truncated });
});
