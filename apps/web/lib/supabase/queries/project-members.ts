import { apiBrowser } from "@/lib/api-client-browser";
import type { ProjectMember, ProjectMemberRole } from "@/types/team.types";

export async function getProjectMembers(
  projectId: string,
): Promise<ProjectMember[]> {
  return apiBrowser.get<ProjectMember[]>(`/projects/${projectId}/members`);
}

export async function addProjectMember(
  projectId: string,
  data: { user_id: string; role: ProjectMemberRole },
): Promise<ProjectMember> {
  return apiBrowser.post<ProjectMember>(`/projects/${projectId}/members`, data);
}

export async function updateProjectMemberRole(
  projectId: string,
  memberId: string,
  role: ProjectMemberRole,
): Promise<ProjectMember> {
  return apiBrowser.patch<ProjectMember>(
    `/projects/${projectId}/members/${memberId}`,
    { role },
  );
}

export async function removeProjectMember(
  projectId: string,
  memberId: string,
): Promise<void> {
  await apiBrowser.del(`/projects/${projectId}/members/${memberId}`);
}
