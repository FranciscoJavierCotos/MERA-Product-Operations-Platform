import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@stms/contracts";
import type { WorkItemComment } from "../types/work-item.types";

type Client = SupabaseClient<Database>;

const COMMENT_SELECT = `
  id, work_item_id, user_id, content, attachments, created_at, updated_at,
  user:profiles(id, full_name, email, avatar_url)
`;

export async function listWorkItemComments(
  supabase: Client,
  workItemId: string,
): Promise<WorkItemComment[]> {
  const { data, error } = await supabase
    .from("work_item_comments")
    .select(COMMENT_SELECT)
    .eq("work_item_id", workItemId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as WorkItemComment[];
}

export async function createWorkItemComment(
  supabase: Client,
  input: { work_item_id: string; user_id: string; content: string },
): Promise<WorkItemComment> {
  const { data, error } = await (supabase.from("work_item_comments") as any)
    .insert([input])
    .select(COMMENT_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as WorkItemComment;
}
