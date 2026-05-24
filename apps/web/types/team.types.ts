// Team categories for organizing teams
export type TeamCategory =
  | "functional"
  | "l1_support"
  | "l2_technical"
  | "l3_engineering";

// Support levels for escalation path
export type SupportLevel = "L1" | "L2" | "L3";

// Extended Team interface with category
export interface Team {
  id: string;
  name: string;
  description?: string;
  category?: TeamCategory;
  created_at: string;
  updated_at: string;
}

// Functional team options (predefined)
export const FUNCTIONAL_TEAMS = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Finance" },
  { id: "00000000-0000-0000-0000-000000000002", name: "Supply Chain" },
  { id: "00000000-0000-0000-0000-000000000003", name: "Manufacturing" },
  { id: "00000000-0000-0000-0000-000000000004", name: "HR/Payroll" },
  { id: "00000000-0000-0000-0000-000000000005", name: "CRM/Sales" },
  { id: "00000000-0000-0000-0000-000000000006", name: "Projects" },
  { id: "00000000-0000-0000-0000-000000000007", name: "Service/Field Service" },
] as const;

// L1 Support Desk
export const L1_SUPPORT_DESK_ID = "00000000-0000-0000-0001-000000000001";

// Escalation history entry
export interface EscalationHistory {
  id: string;
  ticket_id: string;
  user_id?: string;
  from_support_level?: SupportLevel;
  to_support_level?: SupportLevel;
  from_team_id?: string;
  to_team_id?: string;
  from_functional_team_id?: string;
  to_functional_team_id?: string;
  notes?: string;
  created_at: string;

  // Relations
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  from_team?: Team;
  to_team?: Team;
  from_functional_team?: Team;
  to_functional_team?: Team;
}

// Ticket collaborator (secondary teams assigned)
export interface TicketCollaborator {
  id: string;
  ticket_id: string;
  functional_team_id?: string;
  support_team_id?: string;
  support_level?: SupportLevel;
  added_by?: string;
  notes?: string;
  created_at: string;

  // Relations
  functional_team?: Team;
  support_team?: Team;
  added_by_user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

// Support level display configuration
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
    description: "Engineering",
    color: "bg-red-100 text-red-800",
  },
};

// Team category display configuration
export const TEAM_CATEGORY_CONFIG: Record<
  TeamCategory,
  { label: string; supportLevel?: SupportLevel }
> = {
  functional: { label: "Functional Department" },
  l1_support: { label: "L1 - Support Desk", supportLevel: "L1" },
  l2_technical: { label: "L2 - Technical Support", supportLevel: "L2" },
  l3_engineering: { label: "L3 - Engineering", supportLevel: "L3" },
};
