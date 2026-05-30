/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";
import type {
  Sprint,
  SprintWithCounts,
  CreateSprintInput,
  UpdateSprintInput,
} from "@/types/sprint.types";

type AnyClient = unknown;

/** @deprecated */
export async function listProjectSprints(_sb: AnyClient, projectId: string) {
  return apiBrowser.get<SprintWithCounts[]>(`/projects/${projectId}/sprints`);
}

/** @deprecated */
export async function getActiveSprint(_sb: AnyClient, projectId: string) {
  return apiBrowser.get<Sprint | null>(`/projects/${projectId}/sprints/active`);
}

/** @deprecated */
export async function getNextSprint(_sb: AnyClient, projectId: string) {
  return apiBrowser.get<Sprint | null>(`/projects/${projectId}/sprints/next`);
}

/** @deprecated */
export async function getSprintById(_sb: AnyClient, id: string) {
  return apiBrowser.get<Sprint | null>(`/sprints/${id}`);
}

/** @deprecated */
export async function createSprint(_sb: AnyClient, input: CreateSprintInput) {
  const { project_id, ...body } = input;
  return apiBrowser.post<Sprint>(`/projects/${project_id}/sprints`, body);
}

/** @deprecated */
export async function updateSprint(
  _sb: AnyClient,
  id: string,
  updates: UpdateSprintInput,
) {
  return apiBrowser.patch<Sprint>(`/sprints/${id}`, updates);
}

/** @deprecated */
export async function startSprint(_sb: AnyClient, id: string) {
  return apiBrowser.post<Sprint>(`/sprints/${id}/start`);
}

/** @deprecated */
export async function completeSprint(_sb: AnyClient, id: string) {
  return apiBrowser.post<Sprint>(`/sprints/${id}/complete`);
}

/** @deprecated */
export async function deleteSprint(_sb: AnyClient, id: string) {
  await apiBrowser.del(`/sprints/${id}`);
}
