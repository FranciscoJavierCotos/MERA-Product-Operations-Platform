/** Thin client-side shim around the owned API. See ./tickets.ts for context. */

import { apiBrowser } from "@/lib/api-client-browser";
import type {
  Team,
  TeamCategory,
  SupportLevel,
  EscalationHistory,
  TicketCollaborator,
} from "@/types/team.types";

type AnyClient = unknown;

// ── Reads ────────────────────────────────────────────────────────────────────

export async function getTeams(_sb: AnyClient) {
  return apiBrowser.get<Team[]>("/teams");
}

export async function getTeamsByCategory(_sb: AnyClient, category: TeamCategory) {
  return apiBrowser.get<Team[]>("/teams/by-category", { category });
}

export async function getFunctionalTeams(_sb: AnyClient) {
  return apiBrowser.get<Team[]>("/teams/functional");
}

export async function getL1SupportTeam(_sb: AnyClient) {
  return apiBrowser.get<Team>("/teams/l1");
}

export async function getSupportTeamsByLevel(_sb: AnyClient, level: SupportLevel) {
  return apiBrowser.get<Team[]>("/teams/support/by-level", { level });
}

export async function getAllSupportTeams(_sb: AnyClient) {
  return apiBrowser.get<Team[]>("/teams/support");
}

export async function getEscalationHistory(_sb: AnyClient, ticketId: string) {
  return apiBrowser.get<EscalationHistory[]>(`/teams/escalations/${ticketId}`);
}

export async function getTicketCollaborators(_sb: AnyClient, ticketId: string) {
  return apiBrowser.get<TicketCollaborator[]>(`/teams/collaborators/${ticketId}`);
}

export async function getTeamById(_sb: AnyClient, teamId: string) {
  return apiBrowser.get<Team>(`/teams/${teamId}`);
}

// ── Mutations ───────────────────────────────────────────────────────────────

export async function addEscalationHistory(
  _sb: AnyClient,
  input: Record<string, unknown>,
) {
  return apiBrowser.post<EscalationHistory>("/teams/escalations", input);
}

export async function addTicketCollaborator(
  _sb: AnyClient,
  collaborator: {
    ticket_id: string;
    functional_team_id?: string;
    support_team_id?: string;
    support_level?: SupportLevel;
    added_by?: string;
    notes?: string;
  },
) {
  const { ticket_id, ...body } = collaborator;
  return apiBrowser.post<TicketCollaborator>(
    `/teams/collaborators/${ticket_id}`,
    body,
  );
}

export async function removeTicketCollaborator(
  _sb: AnyClient,
  collaboratorId: string,
) {
  await apiBrowser.del(`/teams/collaborators/by-id/${collaboratorId}`);
}

export async function createTeam(
  _sb: AnyClient,
  input: { name: string; description?: string | null; category: TeamCategory },
) {
  return apiBrowser.post<Team>("/teams", input);
}

export async function updateTeam(
  _sb: AnyClient,
  id: string,
  input: Partial<{ name: string; description: string | null; category: TeamCategory }>,
) {
  return apiBrowser.patch<Team>(`/teams/${id}`, input);
}

export async function deleteTeam(_sb: AnyClient, id: string) {
  await apiBrowser.del(`/teams/${id}`);
}
