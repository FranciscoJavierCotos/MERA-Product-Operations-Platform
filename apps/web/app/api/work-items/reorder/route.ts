import { NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api-client";
import { reorderWorkItemSchema } from "@/lib/validations/work-item.schema";
import { rankBetween } from "@/lib/utils/rank";

/**
 * Drag-reorder endpoint. High-frequency — bypasses Server Actions to
 * avoid full route revalidation per drag. The client computes neighbor
 * ranks and posts them; this route derives the midpoint and delegates
 * to the owned API, which writes status/sprint atomically.
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = reorderWorkItemSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { item_id, before_rank, after_rank, status, sprint_id } = parsed.data;
  const rank = rankBetween(before_rank ?? null, after_rank ?? null);

  try {
    const item = await api.patch(`/work-items/${item_id}/reorder`, {
      rank,
      status,
      sprint_id,
    });
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
