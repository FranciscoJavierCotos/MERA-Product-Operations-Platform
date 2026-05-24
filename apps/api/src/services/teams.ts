import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";
import {
  Team,
  TeamCategory,
  SupportLevel,
  EscalationHistory,
  TicketCollaborator,
  L1_SUPPORT_DESK_ID,
} from "../types/team.types";

type Client = SupabaseClient<Database>;

// Get all teams
export async function getTeams(supabase: Client) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("name");

  if (error) throw error;
  return data as unknown as Team[];
}

// Get teams by category
export async function getTeamsByCategory(
  supabase: Client,
  category: TeamCategory
) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("category", category)
    .order("name");

  if (error) throw error;
  return data as unknown as Team[];
}

// Get functional teams only
export async function getFunctionalTeams(supabase: Client) {
  return getTeamsByCategory(supabase, "functional");
}

// Get L1 support desk team
export async function getL1SupportTeam(supabase: Client) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", L1_SUPPORT_DESK_ID)
    .single();

  if (error) throw error;
  return data as unknown as Team;
}

// Get support teams by level
export async function getSupportTeamsByLevel(
  supabase: Client,
  level: SupportLevel
) {
  const categoryMap: Record<SupportLevel, TeamCategory> = {
    L1: "l1_support",
    L2: "l2_technical",
    L3: "l3_engineering",
  };

  return getTeamsByCategory(supabase, categoryMap[level]);
}

// Get all support teams (L1, L2, L3)
export async function getAllSupportTeams(supabase: Client) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .in("category", ["l1_support", "l2_technical", "l3_engineering"])
    .order("category")
    .order("name");

  if (error) throw error;
  return data as unknown as Team[];
}

// Get escalation history for a ticket
export async function getEscalationHistory(supabase: Client, ticketId: string) {
  const { data, error } = await supabase
    .from("escalation_history")
    .select(
      `
      *,
      user:profiles!escalation_history_user_id_fkey(id, full_name, avatar_url),
      from_team:teams!escalation_history_from_team_id_fkey(id, name, category),
      to_team:teams!escalation_history_to_team_id_fkey(id, name, category),
      from_functional_team:teams!escalation_history_from_functional_team_id_fkey(id, name),
      to_functional_team:teams!escalation_history_to_functional_team_id_fkey(id, name)
    `
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as EscalationHistory[];
}

// Add escalation history entry
export async function addEscalationHistory(
  supabase: Client,
  entry: {
    ticket_id: string;
    user_id?: string;
    from_support_level?: SupportLevel;
    to_support_level?: SupportLevel;
    from_team_id?: string;
    to_team_id?: string;
    from_functional_team_id?: string;
    to_functional_team_id?: string;
    notes?: string;
  }
) {
  const { data, error } = await (supabase.from("escalation_history") as any)
    .insert([entry])
    .select()
    .single();

  if (error) throw error;
  return data as unknown as EscalationHistory;
}

// Get collaborators for a ticket
export async function getTicketCollaborators(
  supabase: Client,
  ticketId: string
) {
  const { data, error } = await supabase
    .from("ticket_collaborators")
    .select(
      `
      *,
      functional_team:teams!ticket_collaborators_functional_team_id_fkey(id, name, category),
      support_team:teams!ticket_collaborators_support_team_id_fkey(id, name, category),
      added_by_user:profiles!ticket_collaborators_added_by_fkey(id, full_name, avatar_url)
    `
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as TicketCollaborator[];
}

// Add a collaborator to a ticket
export async function addTicketCollaborator(
  supabase: Client,
  collaborator: {
    ticket_id: string;
    functional_team_id?: string;
    support_team_id?: string;
    support_level?: SupportLevel;
    added_by?: string;
    notes?: string;
  }
) {
  const { data, error } = await (supabase.from("ticket_collaborators") as any)
    .insert([collaborator])
    .select(
      `
      *,
      functional_team:teams!ticket_collaborators_functional_team_id_fkey(id, name, category),
      support_team:teams!ticket_collaborators_support_team_id_fkey(id, name, category),
      added_by_user:profiles!ticket_collaborators_added_by_fkey(id, full_name, avatar_url)
    `
    )
    .single();

  if (error) throw error;
  return data as unknown as TicketCollaborator;
}

// Remove a collaborator from a ticket
export async function removeTicketCollaborator(
  supabase: Client,
  collaboratorId: string
) {
  const { error } = await supabase
    .from("ticket_collaborators")
    .delete()
    .eq("id", collaboratorId);

  if (error) throw error;
}

// Get team by ID
export async function getTeamById(supabase: Client, teamId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (error) throw error;
  return data as unknown as Team;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createTeam(
  supabase: Client,
  input: { name: string; description?: string | null; category: TeamCategory },
): Promise<Team> {
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
  input: Partial<{ name: string; description: string | null; category: TeamCategory }>,
): Promise<Team> {
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
