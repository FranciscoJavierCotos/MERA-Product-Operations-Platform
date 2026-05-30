import { apiBrowser } from "@/lib/api-client-browser";
import type { ProjectMember, ProjectMemberRole } from "@/types/team.types";

/** @deprecated */
export async function getProjectMembers(
  projectId: string,
): Promise<ProjectMember[]> {
  return apiBrowser.get<ProjectMember[]>(`/projects/${projectId}/members`);
}

/** @deprecated */
export async function addProjectMember(
  projectId: string,
  data: { user_id: string; role: ProjectMemberRole },
): Promise<ProjectMember> {
  return apiBrowser.post<ProjectMember>(`/projects/${projectId}/members`, data);
}

/** @deprecated */
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

/** @deprecated */
export async function removeProjectMember(
  projectId: string,
  memberId: string,
): Promise<void> {
  await apiBrowser.del(`/projects/${projectId}/members/${memberId}`);
}
