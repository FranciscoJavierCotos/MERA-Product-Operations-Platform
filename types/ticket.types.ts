import { Profile } from "./user.types";
import { Team, SupportLevel, TicketCollaborator } from "./team.types";

export type TicketStatus =
  | "new"
  | "pending_customer"
  | "pending_internal"
  | "escalated"
  | "resolved"
  | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type ClientTemperature = "hot" | "warm" | "cool";
export type TicketCategory =
  | "bug"
  | "feature_request"
  | "question"
  | "configuration_request";

export interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  client_temperature: ClientTemperature;
  category?: TicketCategory | null;
  created_by?: string;
  assigned_to?: string;
  team_id?: string;
  functional_team_id?: string;
  support_level?: SupportLevel;
  client_email?: string;
  client_name?: string;
  cc_email?: string | null;
  tags: string[];
  attachments?: any[];
  custom_fields?: Record<string, any>;
  time_worked_minutes: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;

  // Relations
  assigned_user?: Profile;
  creator?: Profile;
  functional_team?: Team;
  support_team?: Team;
  collaborators?: TicketCollaborator[];
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  time_worked_minutes?: number;
  attachments?: any[];
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
  changes: Record<string, any>;
  created_at: string;

  // Relations
  user?: Profile;
}
