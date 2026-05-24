/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";
import type {
  Project,
  ProjectListItem,
  CreateProjectInput,
  UpdateProjectInput,
} from "@/types/project.types";

type AnyClient = unknown;

export async function listProjects(_sb: AnyClient): Promise<ProjectListItem[]> {
  return apiBrowser.get<ProjectListItem[]>("/projects");
}

export async function getProjectByKey(_sb: AnyClient, key: string) {
  return apiBrowser.get<Project | null>(`/projects/by-key/${key}`);
}

export async function getProjectById(_sb: AnyClient, id: string) {
  return apiBrowser.get<Project | null>(`/projects/${id}`);
}

export async function createProject(
  _sb: AnyClient,
  input: CreateProjectInput & { created_by: string },
) {
  const { created_by: _ignored, ...body } = input;
  return apiBrowser.post<Project>("/projects", body);
}

export async function updateProject(
  _sb: AnyClient,
  id: string,
  updates: UpdateProjectInput,
) {
  return apiBrowser.patch<Project>(`/projects/${id}`, updates);
}

export async function archiveProject(_sb: AnyClient, id: string) {
  await apiBrowser.post(`/projects/${id}/archive`);
}

export async function deleteProject(_sb: AnyClient, id: string) {
  await apiBrowser.del(`/projects/${id}`);
}

// ─── Dashboard overview ─────────────────────────────────────────────────────

export interface ProjectSprintSummary {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  total_items: number;
  done_items: number;
  total_points: number;
  done_points: number;
}

export interface ProjectDashboardCard {
  id: string;
  key: string;
  name: string;
  methodology: string;
  lead: { id: string; full_name: string } | null;
  team: { id: string; name: string } | null;
  activeSprint: ProjectSprintSummary | null;
}

export async function getActiveProjectsForDashboard(_sb: AnyClient) {
  return apiBrowser.get<ProjectDashboardCard[]>("/projects/active");
}
