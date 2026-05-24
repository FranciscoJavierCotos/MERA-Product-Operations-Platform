/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";
import type {
  Sprint,
  SprintWithCounts,
  CreateSprintInput,
  UpdateSprintInput,
} from "@/types/sprint.types";

type AnyClient = unknown;

export async function listProjectSprints(_sb: AnyClient, projectId: string) {
  return apiBrowser.get<SprintWithCounts[]>(`/projects/${projectId}/sprints`);
}

export async function getActiveSprint(_sb: AnyClient, projectId: string) {
  return apiBrowser.get<Sprint | null>(`/projects/${projectId}/sprints/active`);
}

export async function getNextSprint(_sb: AnyClient, projectId: string) {
  return apiBrowser.get<Sprint | null>(`/projects/${projectId}/sprints/next`);
}

export async function getSprintById(_sb: AnyClient, id: string) {
  return apiBrowser.get<Sprint | null>(`/sprints/${id}`);
}

export async function createSprint(_sb: AnyClient, input: CreateSprintInput) {
  const { project_id, ...body } = input;
  return apiBrowser.post<Sprint>(`/projects/${project_id}/sprints`, body);
}

export async function updateSprint(
  _sb: AnyClient,
  id: string,
  updates: UpdateSprintInput,
) {
  return apiBrowser.patch<Sprint>(`/sprints/${id}`, updates);
}

export async function startSprint(_sb: AnyClient, id: string) {
  return apiBrowser.post<Sprint>(`/sprints/${id}/start`);
}

export async function completeSprint(_sb: AnyClient, id: string) {
  return apiBrowser.post<Sprint>(`/sprints/${id}/complete`);
}

export async function deleteSprint(_sb: AnyClient, id: string) {
  await apiBrowser.del(`/sprints/${id}`);
}
