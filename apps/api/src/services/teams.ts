import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";
import {
  Team,
  TeamType,
  TeamMember,
  TeamDetail,
  SupportLevel,
  EscalationHistory,
  TicketCollaborator,
  L1_SUPPORT_DESK_ID,
} from "../types/team.types";

type Client = SupabaseClient<Database>;

const TEAM_MEMBER_SELECT = `
  id, team_id, user_id, role, joined_at, added_by,
  user:profiles!team_members_user_id_fkey(id, full_name, email, avatar_url, role)
`;

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getTeams(supabase: Client) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("name");

  if (error) throw error;
  return data as unknown as Team[];
}

export async function getTeamsByType(supabase: Client, type: TeamType) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("team_type", type)
    .order("name");

  if (error) throw error;
  return data as unknown as Team[];
}

export async function getBusinessTeams(supabase: Client) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("team_type", "business")
    .order("name");

  if (error) throw error;
  return data as unknown as Team[];
}

export async function getL1SupportTeam(supabase: Client) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", L1_SUPPORT_DESK_ID)
    .single();

  if (error) throw error;
  return data as unknown as Team;
}

export async function getSupportTeamsByLevel(
  supabase: Client,
  level: SupportLevel,
) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("team_type", "support")
    .eq("support_level", level)
    .order("name");

  if (error) throw error;
  return data as unknown as Team[];
}

export async function getAllSupportTeams(supabase: Client) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("team_type", "support")
    .order("support_level", { ascending: true, nullsFirst: false })
    .order("name");

  if (error) throw error;
  return data as unknown as Team[];
}

export async function getTeamById(supabase: Client, teamId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (error) throw error;
  return data as unknown as Team;
}

// ── Team detail (aggregated) ──────────────────────────────────────────────────

export async function getTeamDetail(
  supabase: Client,
  teamId: string,
): Promise<TeamDetail> {
  const [teamRes, membersRes, projectsRes, ticketsRes] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).single(),
    supabase
      .from("team_members")
      .select(TEAM_MEMBER_SELECT)
      .eq("team_id", teamId)
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true }),
    supabase
      .from("projects")
      .select("id, name, key, methodology, status")
      .eq("team_id", teamId)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("tickets")
      .select(
        "id, ticket_number, title, status:ticket_statuses!tickets_status_id_fkey(name), priority:ticket_priorities!tickets_priority_id_fkey(name), created_at",
      )
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (teamRes.error) throw teamRes.error;
  if (membersRes.error) throw membersRes.error;

  const team = teamRes.data as unknown as Team;
  const members = (membersRes.data ?? []) as unknown as TeamMember[];

  const activeProjects = (projectsRes.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    key: p.key,
    methodology: p.methodology,
    status: p.status,
  }));

  const recentTickets = (ticketsRes.data ?? []).map((t: any) => ({
    id: t.id,
    ticket_number: t.ticket_number,
    title: t.title,
    status: t.status?.name ?? "",
    priority: t.priority?.name ?? "",
    created_at: t.created_at,
  }));

  return {
    ...team,
    members,
    activeProjects,
    recentTickets,
  };
}

// ── Team member management ────────────────────────────────────────────────────

export async function getTeamMembers(
  supabase: Client,
  teamId: string,
): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select(TEAM_MEMBER_SELECT)
    .eq("team_id", teamId)
    .order("role", { ascending: true })
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as TeamMember[];
}

export async function addTeamMember(
  supabase: Client,
  teamId: string,
  userId: string,
  role: "lead" | "member",
  addedBy: string,
): Promise<TeamMember> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("team_members") as any)
    .insert([{ team_id: teamId, user_id: userId, role, added_by: addedBy }])
    .select(TEAM_MEMBER_SELECT)
    .single();

  if (error) throw error;

  const { data: profile } = await (supabase.from("profiles") as any)
    .select("team_id")
    .eq("id", userId)
    .single();

  if (profile && !profile.team_id) {
    await (supabase.from("profiles") as any)
      .update({ team_id: teamId })
      .eq("id", userId);
  }

  return data as unknown as TeamMember;
}

export async function updateTeamMemberRole(
  supabase: Client,
  memberId: string,
  role: "lead" | "member",
): Promise<TeamMember> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("team_members") as any)
    .update({ role })
    .eq("id", memberId)
    .select(TEAM_MEMBER_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as TeamMember;
}

export async function removeTeamMember(
  supabase: Client,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;
}

// ── Escalation history ────────────────────────────────────────────────────────

export async function getEscalationHistory(
  supabase: Client,
  ticketId: string,
) {
  const { data, error } = await supabase
    .from("escalation_history")
    .select(
      `
      *,
      user:profiles!escalation_history_user_id_fkey(id, full_name, avatar_url),
      from_team:teams!escalation_history_from_team_id_fkey(id, name, team_type, support_level),
      to_team:teams!escalation_history_to_team_id_fkey(id, name, team_type, support_level)
    `,
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as EscalationHistory[];
}

export async function addEscalationHistory(
  supabase: Client,
  entry: {
    ticket_id: string;
    user_id?: string;
    from_support_level?: SupportLevel;
    to_support_level?: SupportLevel;
    from_team_id?: string;
    to_team_id?: string;
    notes?: string;
  },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("escalation_history") as any)
    .insert([entry])
    .select()
    .single();

  if (error) throw error;
  return data as unknown as EscalationHistory;
}

// ── Ticket collaborators ──────────────────────────────────────────────────────

export async function getTicketCollaborators(
  supabase: Client,
  ticketId: string,
) {
  const { data, error } = await supabase
    .from("ticket_collaborators")
    .select(
      `
      *,
      team:teams!ticket_collaborators_team_id_fkey(id, name, team_type, support_level),
      added_by_user:profiles!ticket_collaborators_added_by_fkey(id, full_name, avatar_url)
    `,
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as TicketCollaborator[];
}

export async function addTicketCollaborator(
  supabase: Client,
  collaborator: {
    ticket_id: string;
    team_id: string;
    support_level?: SupportLevel;
    added_by?: string;
    notes?: string;
  },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("ticket_collaborators") as any)
    .insert([collaborator])
    .select(
      `
      *,
      team:teams!ticket_collaborators_team_id_fkey(id, name, team_type, support_level),
      added_by_user:profiles!ticket_collaborators_added_by_fkey(id, full_name, avatar_url)
    `,
    )
    .single();

  if (error) throw error;
  return data as unknown as TicketCollaborator;
}

export async function removeTicketCollaborator(
  supabase: Client,
  collaboratorId: string,
) {
  const { error } = await supabase
    .from("ticket_collaborators")
    .delete()
    .eq("id", collaboratorId);

  if (error) throw error;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createTeam(
  supabase: Client,
  input: {
    name: string;
    description?: string | null;
    team_type?: TeamType | null;
    support_level?: SupportLevel | null;
  },
): Promise<Team> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("teams") as any)
    .insert([input])
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Team;
}

export async function updateTeam(
  supabase: Client,
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    team_type: TeamType | null;
    support_level: SupportLevel | null;
  }>,
): Promise<Team> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("teams") as any)
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Team;
}

export async function deleteTeam(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw error;
}
