export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "admin" | "support_lead" | "support_member" | "client";
          avatar_url: string | null;
          team_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: "admin" | "support_lead" | "support_member" | "client";
          avatar_url?: string | null;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: "admin" | "support_lead" | "support_member" | "client";
          avatar_url?: string | null;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category:
            | "functional"
            | "l1_support"
            | "l2_technical"
            | "l3_engineering"
            | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category?:
            | "functional"
            | "l1_support"
            | "l2_technical"
            | "l3_engineering"
            | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?:
            | "functional"
            | "l1_support"
            | "l2_technical"
            | "l3_engineering"
            | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          ticket_number: number;
          title: string;
          description: string;
          status:
            | "new"
            | "pending_customer"
            | "pending_internal"
            | "escalated"
            | "resolved"
            | "closed";
          priority: "low" | "medium" | "high" | "urgent";
          created_by: string | null;
          assigned_to: string | null;
          team_id: string | null;
          client_email: string | null;
          client_name: string | null;
          tags: string[];
          attachments: Json;
          custom_fields: Json;
          time_worked_minutes: number;
          search_vector: unknown | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          ticket_number?: number;
          title: string;
          description: string;
          status?:
            | "new"
            | "pending_customer"
            | "pending_internal"
            | "escalated"
            | "resolved"
            | "closed";
          priority?: "low" | "medium" | "high" | "urgent";
          created_by?: string | null;
          assigned_to?: string | null;
          team_id?: string | null;
          client_email?: string | null;
          client_name?: string | null;
          tags?: string[];
          attachments?: Json;
          custom_fields?: Json;
          time_worked_minutes?: number;
          search_vector?: unknown | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          ticket_number?: number;
          title?: string;
          description?: string;
          status?:
            | "new"
            | "pending_customer"
            | "pending_internal"
            | "escalated"
            | "resolved"
            | "closed";
          priority?: "low" | "medium" | "high" | "urgent";
          created_by?: string | null;
          assigned_to?: string | null;
          team_id?: string | null;
          client_email?: string | null;
          client_name?: string | null;
          tags?: string[];
          attachments?: Json;
          custom_fields?: Json;
          time_worked_minutes?: number;
          search_vector?: unknown | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          closed_at?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: "pending" | "completed";
          priority: "low" | "medium" | "high" | "urgent";
          action_tag:
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
          ticket_id: string | null;
          assigned_to: string;
          created_by: string | null;
          due_date: string | null;
          completed_at: string | null;
          time_spent_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: "pending" | "completed";
          priority?: "low" | "medium" | "high" | "urgent";
          action_tag?:
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
          ticket_id?: string | null;
          assigned_to: string;
          created_by?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          time_spent_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: "pending" | "completed";
          priority?: "low" | "medium" | "high" | "urgent";
          action_tag?:
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
          ticket_id?: string | null;
          assigned_to?: string;
          created_by?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          time_spent_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ticket_comments: {
        Row: {
          id: string;
          ticket_id: string;
          user_id: string;
          content: string;
          is_internal: boolean;
          attachments: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          user_id: string;
          content: string;
          is_internal?: boolean;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          user_id?: string;
          content?: string;
          is_internal?: boolean;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      ticket_history: {
        Row: {
          id: string;
          ticket_id: string;
          user_id: string | null;
          action: string;
          changes: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          user_id?: string | null;
          action: string;
          changes: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          user_id?: string | null;
          action?: string;
          changes?: Json;
          created_at?: string;
        };
      };
      integrations: {
        Row: {
          id: string;
          team_id: string | null;
          service: string;
          config: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          service: string;
          config: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string | null;
          service?: string;
          config?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "admin" | "support_lead" | "support_member" | "client";
      ticket_status:
        | "new"
        | "pending_customer"
        | "pending_internal"
        | "escalated"
        | "resolved"
        | "closed";
      ticket_priority: "low" | "medium" | "high" | "urgent";
      task_status: "todo" | "in_progress" | "completed";
    };
  };
}
