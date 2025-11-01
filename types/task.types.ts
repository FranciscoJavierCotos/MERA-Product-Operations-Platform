import { Profile } from "./user.types";
import { Ticket } from "./ticket.types";

export type TaskStatus = "todo" | "in_progress" | "completed";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  ticket_id?: string;
  assigned_to: string;
  created_by?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;

  // Relations
  ticket?: Ticket;
  assigned_user?: Profile;
  creator?: Profile;
}
