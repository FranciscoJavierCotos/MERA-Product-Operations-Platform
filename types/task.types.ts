import { Profile } from "./user.types";
import { Ticket } from "./ticket.types";

export type TaskStatus = "pending" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskActionTag =
  | "meeting"
  | "pending_customer"
  | "for_review"
  | "send_email"
  | "follow_up"
  | "internal_review"
  | "documentation"
  | "testing"
  | "deployment"
  | "other";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  action_tag: TaskActionTag;
  ticket_id?: string;
  assigned_to: string;
  created_by?: string;
  due_date?: string;
  completed_at?: string;
  time_spent_minutes?: number;
  created_at: string;
  updated_at: string;

  // Relations
  ticket?: Pick<Ticket, "id" | "ticket_number" | "title" | "status">;
  assigned_user?: Profile;
  creator?: Profile;
}

export interface TaskWithRelations extends Task {
  ticket?: Ticket;
  assigned_user?: Profile;
  creator?: Profile;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  action_tag: TaskActionTag;
  ticket_id?: string | null;
  assigned_to: string;
  created_by: string;
  due_date?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  action_tag?: TaskActionTag;
  status?: TaskStatus;
  assigned_to?: string;
  due_date?: string | null;
}

export interface CompleteTaskInput {
  time_spent_minutes?: number;
}

export interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  action_tag?: TaskActionTag;
}

// Helper constants for UI
export const TASK_PRIORITIES: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const TASK_ACTION_TAGS: TaskActionTag[] = [
  "meeting",
  "pending_customer",
  "for_review",
  "send_email",
  "follow_up",
  "internal_review",
  "documentation",
  "testing",
  "deployment",
  "other",
];

export const ACTION_TAG_LABELS: Record<TaskActionTag, string> = {
  meeting: "Meeting",
  pending_customer: "Pending Customer",
  for_review: "For Review",
  send_email: "Send Email",
  follow_up: "Follow Up",
  internal_review: "Internal Review",
  documentation: "Documentation",
  testing: "Testing",
  deployment: "Deployment",
  other: "Other",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: "text-red-600 bg-red-50 border-red-200",
  high: "text-orange-600 bg-orange-50 border-orange-200",
  medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
  low: "text-gray-600 bg-gray-50 border-gray-200",
};
