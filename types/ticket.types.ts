import { Profile } from "./user.types";

export type TicketStatus =
  | "new"
  | "pending_customer"
  | "pending_internal"
  | "escalated"
  | "resolved"
  | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_by?: string;
  assigned_to?: string;
  team_id?: string;
  client_email?: string;
  client_name?: string;
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
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
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
