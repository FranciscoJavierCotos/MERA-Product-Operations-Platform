import { Profile } from "./user.types";
import { Team, SupportLevel, TicketCollaborator } from "./team.types";
import type { SlaInstance } from "./sla.types";

// ── Lookup row types (returned by joined queries) ─────────────────────────────

export interface TicketStatusRow {
  id: number;
  name: string;
  label: string;
  badge_variant: string;
  is_final: boolean;
  display_order: number;
}

export interface TicketPriorityRow {
  id: number;
  name: string;
  label: string;
  color_class: string;
  display_order: number;
}

export interface TicketCategoryRow {
  id: number;
  name: string;
  label: string;
  display_order: number;
}

export interface TicketSupportLevelRow {
  id: number;
  name: string;
  label: string;
  description: string;
  color_class: string;
  display_order: number;
}

export interface TicketTemperatureRow {
  id: number;
  name: string;
  label: string;
  emoji: string;
  color_class: string;
  display_order: number;
}

export interface TicketTagRow {
  id: string;
  name: string;
  slug: string;
  color_class: string;
}

// ── Legacy name aliases (used in utility functions that compare by slug name) ─

export type TicketStatusName =
  | "new"
  | "pending_customer"
  | "pending_internal"
  | "escalated"
  | "resolved"
  | "closed";

export type TicketPriorityName = "low" | "medium" | "high" | "urgent";

/** @deprecated Use TicketStatusRow for joined data; TicketStatusName for name comparisons */
export type TicketStatus = TicketStatusName;
/** @deprecated Use TicketPriorityRow for joined data; TicketPriorityName for name comparisons */
export type TicketPriority = TicketPriorityName;
/** @deprecated Use TicketTemperatureRow for joined data */
export type ClientTemperature = "hot" | "warm" | "cool";
/** @deprecated Use TicketCategoryRow for joined data */
export type TicketCategory =
  | "bug"
  | "feature_request"
  | "question"
  | "configuration_request";

// ── Main entity types ─────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  status_id: number;
  priority_id: number;
  category_id: number | null;
  support_level_id: number | null;
  temperature_id: number | null;
  created_by?: string;
  assigned_to?: string;
  team_id?: string;
  company_id?: string | null;
  client_email?: string;
  client_name?: string;
  cc_email?: string | null;
  attachments?: unknown[];
  custom_fields?: Record<string, unknown>;
  time_worked_minutes: number;
  resolution?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;

  // Joined lookup relations
  status: TicketStatusRow;
  priority: TicketPriorityRow;
  category?: TicketCategoryRow | null;
  support_level?: TicketSupportLevelRow | null;
  temperature?: TicketTemperatureRow | null;
  tags?: Array<{ tag: TicketTagRow }>;

  // Joined entity relations
  assigned_user?: Profile;
  creator?: Profile;
  team?: Team;
  company?: { id: string; name: string } | null;
  collaborators?: TicketCollaborator[];
  sla_instance?: SlaInstance | SlaInstance[] | null;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  attachments?: unknown[];
  created_at: string;
  updated_at: string;

  // Relations
  user?: Profile;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  user_id?: string;
  action: string;
  changes: Record<string, unknown>;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  source_table?: string | null;
  source_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;

  // Relations
  user?: Profile;
}
