// ── Team type system (migration 035) ─────────────────────────────────────────

export type TeamType = "business" | "support" | "engineering";

export type TeamMemberRole = "lead" | "member";

export type ProjectMemberRole = "owner" | "developer" | "viewer";

export type SupportLevel = "L1" | "L2" | "L3";

// ── Team interface ────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  team_type?: TeamType | null;
  support_level?: SupportLevel | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

// ── Team membership ───────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  joined_at: string;
  added_by?: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
    role: string;
  };
  team?: Pick<Team, "id" | "name" | "team_type" | "support_level">;
}

// ── Project membership ────────────────────────────────────────────────────────

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  joined_at: string;
  added_by?: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
}

// ── Team detail (aggregated for /teams/:id/detail) ────────────────────────────

export interface TeamDetail extends Team {
  members: TeamMember[];
  activeProjects: Array<{
    id: string;
    name: string;
    key: string;
    methodology: string;
    status: string;
  }>;
  recentTickets: Array<{
    id: string;
    ticket_number: number;
    title: string;
    status: string;
    priority: string;
    created_at: string;
  }>;
}

// ── Escalation history entry ──────────────────────────────────────────────────

export interface EscalationHistory {
  id: string;
  ticket_id: string;
  user_id?: string;
  from_support_level?: SupportLevel;
  to_support_level?: SupportLevel;
  from_team_id?: string;
  to_team_id?: string;
  notes?: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  from_team?: Team;
  to_team?: Team;
}

// ── Ticket collaborator (secondary teams assigned) ────────────────────────────

export interface TicketCollaborator {
  id: string;
  ticket_id: string;
  team_id: string;
  support_level?: SupportLevel;
  added_by?: string;
  notes?: string;
  created_at: string;
  team?: Team;
  added_by_user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

// ── Display configuration ─────────────────────────────────────────────────────

export const TEAM_TYPE_CONFIG: Record<
  TeamType,
  { label: string; description: string }
> = {
  business:    { label: "Business",     description: "Business functional unit (Finance, HR, etc.)" },
  support:     { label: "Support Team", description: "Customer support team (L1/L2)" },
  engineering: { label: "Engineering",  description: "Product/engineering team" },
};

export const SUPPORT_LEVEL_CONFIG: Record<
  SupportLevel,
  { label: string; description: string; color: string }
> = {
  L1: {
    label: "Level 1",
    description: "Support Desk",
    color: "bg-blue-100 text-blue-800",
  },
  L2: {
    label: "Level 2",
    description: "Technical Support",
    color: "bg-amber-100 text-amber-800",
  },
  L3: {
    label: "Level 3",
    description: "Business / Engineering",
    color: "bg-red-100 text-red-800",
  },
};

export const L1_SUPPORT_DESK_ID = "00000000-0000-0000-0001-000000000001";

// ── Helper functions ─────────────────────────────────────────────────────────

export function isBusinessTeam(t: Team): boolean {
  return t.team_type === "business";
}

export function isSupportTeam(t: Team): boolean {
  return t.team_type === "support";
}

export function isEngineeringTeam(t: Team): boolean {
  return t.team_type === "engineering";
}

export function isSupportAtLevel(t: Team, level: SupportLevel): boolean {
  return t.support_level === level;
}

export function getTeamTypeLabel(t: Team): string {
  if (t.team_type === "business") return "Business";
  if (t.team_type === "engineering") return "Engineering";
  if (t.team_type === "support") {
    const lvl = t.support_level;
    return lvl ? `Support – ${lvl}` : "Support";
  }
  return "Team";
}
