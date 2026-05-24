/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";
import type { WorkItemComment } from "@/types/work-item.types";

type AnyClient = unknown;

export async function listWorkItemComments(
  _sb: AnyClient,
  workItemId: string,
): Promise<WorkItemComment[]> {
  return apiBrowser.get<WorkItemComment[]>(
    `/work-items/${workItemId}/comments`,
  );
}

export async function createWorkItemComment(
  _sb: AnyClient,
  input: { work_item_id: string; user_id: string; content: string },
): Promise<WorkItemComment> {
  return apiBrowser.post<WorkItemComment>(
    `/work-items/${input.work_item_id}/comments`,
    { content: input.content },
  );
}
