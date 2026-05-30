/** Thin client-side shim around the owned API. See ./tickets.ts for context. */

import { apiBrowser } from "@/lib/api-client-browser";
import type {
  Team,
  TeamType,
  SupportLevel,
  EscalationHistory,
  TicketCollaborator,
} from "@/types/team.types";

type AnyClient = unknown;

// ── Reads ────────────────────────────────────────────────────────────────────

/** @deprecated */
export async function getTeams(_sb: AnyClient) {
  return apiBrowser.get<Team[]>("/teams");
}

/** @deprecated */
export async function getTeamsByType(_sb: AnyClient, type: TeamType) {
  return apiBrowser.get<Team[]>("/teams/by-type", { type });
}

/** @deprecated */
export async function getBusinessTeams(_sb: AnyClient) {
  return apiBrowser.get<Team[]>("/teams/business");
}

/** @deprecated */
export async function getL1SupportTeam(_sb: AnyClient) {
  return apiBrowser.get<Team>("/teams/l1");
}

/** @deprecated */
export async function getSupportTeamsByLevel(_sb: AnyClient, level: SupportLevel) {
  return apiBrowser.get<Team[]>("/teams/support/by-level", { level });
}

/** @deprecated */
export async function getAllSupportTeams(_sb: AnyClient) {
  return apiBrowser.get<Team[]>("/teams/support");
}

/** @deprecated */
export async function getEscalationHistory(_sb: AnyClient, ticketId: string) {
  return apiBrowser.get<EscalationHistory[]>(`/teams/escalations/${ticketId}`);
}

/** @deprecated */
export async function getTicketCollaborators(_sb: AnyClient, ticketId: string) {
  return apiBrowser.get<TicketCollaborator[]>(`/teams/collaborators/${ticketId}`);
}

/** @deprecated */
export async function getTeamById(_sb: AnyClient, teamId: string) {
  return apiBrowser.get<Team>(`/teams/${teamId}`);
}

// ── Mutations ───────────────────────────────────────────────────────────────

/** @deprecated */
export async function addEscalationHistory(
  _sb: AnyClient,
  input: Record<string, unknown>,
) {
  return apiBrowser.post<EscalationHistory>("/teams/escalations", input);
}

/** @deprecated */
export async function addTicketCollaborator(
  _sb: AnyClient,
  collaborator: {
    ticket_id: string;
    team_id: string;
    support_level?: SupportLevel;
    notes?: string;
  },
) {
  const { ticket_id, ...body } = collaborator;
  return apiBrowser.post<TicketCollaborator>(
    `/teams/collaborators/${ticket_id}`,
    body,
  );
}

/** @deprecated */
export async function removeTicketCollaborator(
  _sb: AnyClient,
  collaboratorId: string,
) {
  await apiBrowser.del(`/teams/collaborators/by-id/${collaboratorId}`);
}

/** @deprecated */
export async function createTeam(
  _sb: AnyClient,
  input: { name: string; description?: string | null; team_type?: TeamType; support_level?: SupportLevel },
) {
  return apiBrowser.post<Team>("/teams", input);
}

/** @deprecated */
export async function updateTeam(
  _sb: AnyClient,
  id: string,
  input: Partial<{ name: string; description: string | null; team_type: TeamType; support_level: SupportLevel }>,
) {
  return apiBrowser.patch<Team>(`/teams/${id}`, input);
}

/** @deprecated */
export async function deleteTeam(_sb: AnyClient, id: string) {
  await apiBrowser.del(`/teams/${id}`);
}
