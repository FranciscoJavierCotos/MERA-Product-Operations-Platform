/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";
import type {
  WorkItem,
  WorkItemWithRelations,
  WorkItemStatus,
  WorkItemHistoryEntry,
  BoardColumn,
  CreateWorkItemInput,
  UpdateWorkItemInput,
} from "@/types/work-item.types";

type AnyClient = unknown;

// ── Reads ────────────────────────────────────────────────────────────────────

/** @deprecated */
export async function listBacklog(_sb: AnyClient, projectId: string) {
  return apiBrowser.get<WorkItemWithRelations[]>("/work-items/backlog", {
    projectId,
  });
}

/** @deprecated */
export async function listSprintItems(_sb: AnyClient, sprintId: string) {
  return apiBrowser.get<WorkItemWithRelations[]>(`/work-items/sprint/${sprintId}`);
}

/** @deprecated */
export async function listSprintBoard(
  _sb: AnyClient,
  sprintId: string | null,
) {
  if (!sprintId) return [] as BoardColumn[];
  return apiBrowser.get<BoardColumn[]>(`/work-items/sprint/${sprintId}/board`);
}

/** @deprecated */
export async function getWorkItemByKey(_sb: AnyClient, itemKey: string) {
  return apiBrowser.get<WorkItemWithRelations | null>(
    `/work-items/by-key/${itemKey}`,
  );
}

/** @deprecated */
export async function getWorkItem(_sb: AnyClient, id: string) {
  return apiBrowser.get<WorkItemWithRelations | null>(`/work-items/${id}`);
}

/** @deprecated */
export async function getWorkItemHistory(_sb: AnyClient, workItemId: string) {
  return apiBrowser.get<WorkItemHistoryEntry[]>(
    `/work-items/${workItemId}/history`,
  );
}

/** @deprecated */
export async function getFirstRank(
  _sb: AnyClient,
  projectId: string,
  sprintId: string | null,
  status?: WorkItemStatus,
) {
  const { rank } = await apiBrowser.get<{ rank: string | null }>(
    "/work-items/rank/first",
    {
      projectId,
      sprintId: sprintId ?? undefined,
      status,
    },
  );
  return rank;
}

/** @deprecated */
export async function getLastRank(
  _sb: AnyClient,
  projectId: string,
  sprintId: string | null,
  status?: WorkItemStatus,
) {
  const { rank } = await apiBrowser.get<{ rank: string | null }>(
    "/work-items/rank/last",
    {
      projectId,
      sprintId: sprintId ?? undefined,
      status,
    },
  );
  return rank;
}

// ── Mutations ───────────────────────────────────────────────────────────────

/** @deprecated */
export async function createWorkItem(
  _sb: AnyClient,
  input: CreateWorkItemInput & { reporter_id?: string; rank: string },
) {
  const { reporter_id: _ignored, ...body } = input;
  return apiBrowser.post<WorkItem>("/work-items", body);
}

/** @deprecated */
export async function updateWorkItem(
  _sb: AnyClient,
  id: string,
  updates: UpdateWorkItemInput,
) {
  return apiBrowser.patch<WorkItem>(`/work-items/${id}`, updates);
}

/** @deprecated */
export async function moveToSprint(
  _sb: AnyClient,
  id: string,
  sprintId: string | null,
) {
  return apiBrowser.patch<WorkItem>(`/work-items/${id}/move-to-sprint`, {
    sprint_id: sprintId,
  });
}

/** @deprecated */
export async function updateStatus(
  _sb: AnyClient,
  id: string,
  status: WorkItemStatus,
) {
  return apiBrowser.patch<WorkItem>(`/work-items/${id}/status`, { status });
}

/** @deprecated */
export async function reorderItem(
  _sb: AnyClient,
  id: string,
  rank: string,
  patch: { status?: WorkItemStatus; sprint_id?: string | null } = {},
) {
  return apiBrowser.patch<WorkItem>(`/work-items/${id}/reorder`, {
    rank,
    ...patch,
  });
}
