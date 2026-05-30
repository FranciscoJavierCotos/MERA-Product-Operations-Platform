import { apiBrowser } from "@/lib/api-client-browser";
import type { TeamMember, TeamMemberRole } from "@/types/team.types";

/** @deprecated */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  return apiBrowser.get<TeamMember[]>(`/teams/${teamId}/members`);
}

/** @deprecated */
export async function addTeamMember(
  teamId: string,
  data: { user_id: string; role: TeamMemberRole },
): Promise<TeamMember> {
  return apiBrowser.post<TeamMember>(`/teams/${teamId}/members`, data);
}

/** @deprecated */
export async function updateTeamMemberRole(
  teamId: string,
  memberId: string,
  role: TeamMemberRole,
): Promise<TeamMember> {
  return apiBrowser.patch<TeamMember>(`/teams/${teamId}/members/${memberId}`, {
    role,
  });
}

/** @deprecated */
export async function removeTeamMember(
  teamId: string,
  memberId: string,
): Promise<void> {
  await apiBrowser.del(`/teams/${teamId}/members/${memberId}`);
}
