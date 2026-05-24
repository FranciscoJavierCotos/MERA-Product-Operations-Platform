import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reorderWorkItemSchema } from "@/lib/validations/work-item.schema";
import { reorderItem } from "@/lib/supabase/queries/work-items";
import { rankBetween } from "@/lib/utils/rank";

/**
 * Drag-reorder endpoint. High-frequency — bypasses Server Actions to
 * avoid full route revalidation per drag. The client computes neighbor
 * ranks and posts them; the server validates, derives the midpoint,
 * and writes status/sprint atomically.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const patch: { status?: typeof status; sprint_id?: typeof sprint_id } = {};
    if (status !== undefined) patch.status = status;
    if (sprint_id !== undefined) patch.sprint_id = sprint_id;
    const item = await reorderItem(supabase, item_id, rank, patch);
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
