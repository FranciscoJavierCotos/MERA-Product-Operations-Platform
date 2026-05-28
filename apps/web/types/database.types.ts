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
          team_type: "business" | "support" | "engineering" | null;
          support_level: "L1" | "L2" | "L3" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          team_type?: "business" | "support" | "engineering" | null;
          support_level?: "L1" | "L2" | "L3" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          team_type?: "business" | "support" | "engineering" | null;
          support_level?: "L1" | "L2" | "L3" | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: "lead" | "member";
          joined_at: string;
          added_by: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role?: "lead" | "member";
          joined_at?: string;
          added_by?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          role?: "lead" | "member";
          joined_at?: string;
          added_by?: string | null;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "owner" | "developer" | "viewer";
          joined_at: string;
          added_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: "owner" | "developer" | "viewer";
          joined_at?: string;
          added_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: "owner" | "developer" | "viewer";
          joined_at?: string;
          added_by?: string | null;
        };
      };
      escalation_history: {
        Row: {
          id: string;
          ticket_id: string;
          user_id: string | null;
          from_support_level: "L1" | "L2" | "L3" | null;
          to_support_level: "L1" | "L2" | "L3";
          from_team_id: string | null;
          to_team_id: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          user_id?: string | null;
          from_support_level?: "L1" | "L2" | "L3" | null;
          to_support_level: "L1" | "L2" | "L3";
          from_team_id?: string | null;
          to_team_id: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          user_id?: string | null;
          from_support_level?: "L1" | "L2" | "L3" | null;
          to_support_level?: "L1" | "L2" | "L3";
          from_team_id?: string | null;
          to_team_id?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      ticket_collaborators: {
        Row: {
          id: string;
          ticket_id: string;
          team_id: string;
          support_level: "L1" | "L2" | "L3" | null;
          added_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          team_id: string;
          support_level?: "L1" | "L2" | "L3" | null;
          added_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          team_id?: string;
          support_level?: "L1" | "L2" | "L3" | null;
          added_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      ticket_statuses: {
        Row: {
          id: number;
          name: string;
          label: string;
          badge_variant: string;
          is_final: boolean;
          display_order: number;
        };
        Insert: {
          id: number;
          name: string;
          label: string;
          badge_variant?: string;
          is_final?: boolean;
          display_order: number;
        };
        Update: {
          id?: number;
          name?: string;
          label?: string;
          badge_variant?: string;
          is_final?: boolean;
          display_order?: number;
        };
      };
      ticket_priorities: {
        Row: {
          id: number;
          name: string;
          label: string;
          color_class: string;
          display_order: number;
        };
        Insert: {
          id: number;
          name: string;
          label: string;
          color_class: string;
          display_order: number;
        };
        Update: {
          id?: number;
          name?: string;
          label?: string;
          color_class?: string;
          display_order?: number;
        };
      };
      ticket_categories: {
        Row: {
          id: number;
          name: string;
          label: string;
          display_order: number;
        };
        Insert: {
          id: number;
          name: string;
          label: string;
          display_order: number;
        };
        Update: {
          id?: number;
          name?: string;
          label?: string;
          display_order?: number;
        };
      };
      ticket_support_levels: {
        Row: {
          id: number;
          name: string;
          label: string;
          description: string;
          color_class: string;
          display_order: number;
        };
        Insert: {
          id: number;
          name: string;
          label: string;
          description: string;
          color_class: string;
          display_order: number;
        };
        Update: {
          id?: number;
          name?: string;
          label?: string;
          description?: string;
          color_class?: string;
          display_order?: number;
        };
      };
      ticket_temperatures: {
        Row: {
          id: number;
          name: string;
          label: string;
          emoji: string;
          color_class: string;
          display_order: number;
        };
        Insert: {
          id: number;
          name: string;
          label: string;
          emoji: string;
          color_class: string;
          display_order: number;
        };
        Update: {
          id?: number;
          name?: string;
          label?: string;
          emoji?: string;
          color_class?: string;
          display_order?: number;
        };
      };
      tags: {
        Row: {
          id: number;
          name: string;
          slug: string;
          color_class: string;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          color_class?: string;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          color_class?: string;
        };
      };
      ticket_tags: {
        Row: {
          ticket_id: string;
          tag_id: number;
        };
        Insert: {
          ticket_id: string;
          tag_id: number;
        };
        Update: {
          ticket_id?: string;
          tag_id?: number;
        };
      };
      tickets: {
        Row: {
          id: string;
          ticket_number: number;
          title: string;
          description: string;
          cc_email: string | null;
          status_id: number;
          priority_id: number;
          category_id: number | null;
          support_level_id: number | null;
          temperature_id: number | null;
          created_by: string | null;
          assigned_to: string | null;
          team_id: string | null;
          client_email: string | null;
          client_name: string | null;
          attachments: Json;
          custom_fields: Json;
          time_worked_minutes: number;
          search_vector: unknown | null;
          resolution: string | null;
          resolution_plain: string | null;
          resolution_embedding: unknown | null;
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
          cc_email?: string | null;
          status_id?: number;
          priority_id: number;
          category_id?: number | null;
          support_level_id?: number | null;
          temperature_id?: number | null;
          created_by?: string | null;
          assigned_to?: string | null;
          team_id?: string | null;
          client_email?: string | null;
          client_name?: string | null;
          attachments?: Json;
          custom_fields?: Json;
          time_worked_minutes?: number;
          search_vector?: unknown | null;
          resolution?: string | null;
          resolution_plain?: string | null;
          resolution_embedding?: unknown | null;
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
          cc_email?: string | null;
          status_id?: number;
          priority_id?: number;
          category_id?: number | null;
          support_level_id?: number | null;
          temperature_id?: number | null;
          created_by?: string | null;
          assigned_to?: string | null;
          team_id?: string | null;
          client_email?: string | null;
          client_name?: string | null;
          attachments?: Json;
          custom_fields?: Json;
          time_worked_minutes?: number;
          search_vector?: unknown | null;
          resolution?: string | null;
          resolution_plain?: string | null;
          resolution_embedding?: unknown | null;
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
          field_name: string | null;
          old_value: string | null;
          new_value: string | null;
          source_table: string;
          source_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          user_id?: string | null;
          action: string;
          changes: Json;
          field_name?: string | null;
          old_value?: string | null;
          new_value?: string | null;
          source_table?: string;
          source_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          user_id?: string | null;
          action?: string;
          changes?: Json;
          field_name?: string | null;
          old_value?: string | null;
          new_value?: string | null;
          source_table?: string;
          source_id?: string | null;
          metadata?: Json;
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
      sla_policies: {
        Row: {
          id: string;
          name: string;
          priority_id: number;
          response_time_minutes: number;
          resolution_time_minutes: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          priority_id: number;
          response_time_minutes: number;
          resolution_time_minutes: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          priority_id?: number;
          response_time_minutes?: number;
          resolution_time_minutes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      sla_instances: {
        Row: {
          id: string;
          ticket_id: string;
          policy_id: string;
          response_due_at: string;
          resolution_due_at: string;
          responded_at: string | null;
          paused_at: string | null;
          total_paused_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          policy_id: string;
          response_due_at: string;
          resolution_due_at: string;
          responded_at?: string | null;
          paused_at?: string | null;
          total_paused_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          policy_id?: string;
          response_due_at?: string;
          resolution_due_at?: string;
          responded_at?: string | null;
          paused_at?: string | null;
          total_paused_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      kb_collections: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          owner_team_id: string | null;
          environment: string;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          owner_team_id?: string | null;
          environment?: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          owner_team_id?: string | null;
          environment?: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      kb_tags: {
        Row: {
          id: string;
          name: string;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string | null;
          created_at?: string;
        };
      };
      kb_documents: {
        Row: {
          id: string;
          collection_id: string | null;
          title: string;
          description: string | null;
          source_type_id: number;
          current_version_id: string | null;
          ai_retrieval_enabled: boolean;
          archived_at: string | null;
          expires_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          collection_id?: string | null;
          title: string;
          description?: string | null;
          source_type_id?: number;
          current_version_id?: string | null;
          ai_retrieval_enabled?: boolean;
          archived_at?: string | null;
          expires_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          collection_id?: string | null;
          title?: string;
          description?: string | null;
          source_type_id?: number;
          current_version_id?: string | null;
          ai_retrieval_enabled?: boolean;
          archived_at?: string | null;
          expires_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      kb_document_versions: {
        Row: {
          id: string;
          document_id: string;
          version_number: number;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          file_size_bytes: number;
          file_sha256: string | null;
          extracted_text: string | null;
          page_count: number | null;
          status_id: number;
          processing_error: string | null;
          uploaded_by: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_number: number;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          file_size_bytes: number;
          file_sha256?: string | null;
          extracted_text?: string | null;
          page_count?: number | null;
          status_id?: number;
          processing_error?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          document_id?: string;
          version_number?: number;
          storage_path?: string;
          original_filename?: string;
          mime_type?: string;
          file_size_bytes?: number;
          file_sha256?: string | null;
          extracted_text?: string | null;
          page_count?: number | null;
          status_id?: number;
          processing_error?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
      };
      kb_document_tags: {
        Row: { document_id: string; tag_id: string };
        Insert: { document_id: string; tag_id: string };
        Update: { document_id?: string; tag_id?: string };
      };
      kb_document_chunks: {
        Row: {
          id: string;
          document_version_id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          content_tokens: number | null;
          page_number: number | null;
          embedding: unknown | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_version_id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          content_tokens?: number | null;
          page_number?: number | null;
          embedding?: unknown | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_version_id?: string;
          document_id?: string;
          chunk_index?: number;
          content?: string;
          content_tokens?: number | null;
          page_number?: number | null;
          embedding?: unknown | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      kb_resolution_settings: {
        Row: {
          ticket_id: string;
          ai_retrieval_enabled: boolean;
          archived_at: string | null;
          collection_id: string | null;
          manual_notes: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          ticket_id: string;
          ai_retrieval_enabled?: boolean;
          archived_at?: string | null;
          collection_id?: string | null;
          manual_notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          ticket_id?: string;
          ai_retrieval_enabled?: boolean;
          archived_at?: string | null;
          collection_id?: string | null;
          manual_notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      kb_retrieval_config: {
        Row: {
          id: boolean;
          similarity_threshold: number;
          max_results: number;
          source_weights: Json;
          sources_enabled: Json;
          environment: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: boolean;
          similarity_threshold?: number;
          max_results?: number;
          source_weights?: Json;
          sources_enabled?: Json;
          environment?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: boolean;
          similarity_threshold?: number;
          max_results?: number;
          source_weights?: Json;
          sources_enabled?: Json;
          environment?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      kb_audit_log: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string | null;
          action: string;
          actor_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id?: string | null;
          action: string;
          actor_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string | null;
          action?: string;
          actor_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
      };
      kb_retrieval_log: {
        Row: {
          id: string;
          ticket_id: string | null;
          user_id: string | null;
          query_text: string | null;
          results: Json;
          result_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id?: string | null;
          user_id?: string | null;
          query_text?: string | null;
          results?: Json;
          result_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string | null;
          user_id?: string | null;
          query_text?: string | null;
          results?: Json;
          result_count?: number;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          methodology: "scrum" | "kanban" | "waterfall";
          status: "active" | "archived";
          team_id: string | null;
          lead_id: string | null;
          next_item_number: number;
          sprint_duration_weeks: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          methodology?: "scrum" | "kanban" | "waterfall";
          status?: "active" | "archived";
          team_id?: string | null;
          lead_id?: string | null;
          next_item_number?: number;
          sprint_duration_weeks?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          description?: string | null;
          methodology?: "scrum" | "kanban" | "waterfall";
          status?: "active" | "archived";
          team_id?: string | null;
          lead_id?: string | null;
          next_item_number?: number;
          sprint_duration_weeks?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sprints: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          goal: string | null;
          start_date: string | null;
          end_date: string | null;
          status: "planned" | "active" | "completed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          goal?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: "planned" | "active" | "completed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          goal?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: "planned" | "active" | "completed";
          created_at?: string;
          updated_at?: string;
        };
      };
      work_items: {
        Row: {
          id: string;
          project_id: string;
          sprint_id: string | null;
          item_key: string;
          type: "epic" | "story" | "task" | "bug";
          status: "todo" | "in_progress" | "in_review" | "done";
          priority_id: number | null;
          title: string;
          description: string | null;
          story_points: number | null;
          assigned_to: string | null;
          reporter_id: string | null;
          parent_id: string | null;
          rank: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          sprint_id?: string | null;
          item_key?: string;
          type?: "epic" | "story" | "task" | "bug";
          status?: "todo" | "in_progress" | "in_review" | "done";
          priority_id?: number | null;
          title: string;
          description?: string | null;
          story_points?: number | null;
          assigned_to?: string | null;
          reporter_id?: string | null;
          parent_id?: string | null;
          rank: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          sprint_id?: string | null;
          item_key?: string;
          type?: "epic" | "story" | "task" | "bug";
          status?: "todo" | "in_progress" | "in_review" | "done";
          priority_id?: number | null;
          title?: string;
          description?: string | null;
          story_points?: number | null;
          assigned_to?: string | null;
          reporter_id?: string | null;
          parent_id?: string | null;
          rank?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      work_item_comments: {
        Row: {
          id: string;
          work_item_id: string;
          user_id: string;
          content: string;
          attachments: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          work_item_id: string;
          user_id: string;
          content: string;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          work_item_id?: string;
          user_id?: string;
          content?: string;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      work_item_history: {
        Row: {
          id: string;
          work_item_id: string;
          user_id: string | null;
          action: string;
          field_name: string | null;
          old_value: string | null;
          new_value: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          work_item_id: string;
          user_id?: string | null;
          action: string;
          field_name?: string | null;
          old_value?: string | null;
          new_value?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          work_item_id?: string;
          user_id?: string | null;
          action?: string;
          field_name?: string | null;
          old_value?: string | null;
          new_value?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      link_types: {
        Row: {
          id: string;
          inverse_id: string;
          label: string;
          inverse_label: string;
          is_symmetric: boolean;
          sort_order: number;
        };
        Insert: {
          id: string;
          inverse_id: string;
          label: string;
          inverse_label: string;
          is_symmetric?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          inverse_id?: string;
          label?: string;
          inverse_label?: string;
          is_symmetric?: boolean;
          sort_order?: number;
        };
      };
      item_links: {
        Row: {
          id: string;
          source_ticket_id: string | null;
          source_work_item_id: string | null;
          target_work_item_id: string;
          link_type: string;
          is_primary: boolean;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_ticket_id?: string | null;
          source_work_item_id?: string | null;
          target_work_item_id: string;
          link_type: string;
          is_primary?: boolean;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_ticket_id?: string | null;
          source_work_item_id?: string | null;
          target_work_item_id?: string;
          link_type?: string;
          is_primary?: boolean;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
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
      task_status: "todo" | "in_progress" | "completed";
      project_methodology: "scrum" | "kanban" | "waterfall";
      project_status: "active" | "archived";
      sprint_status: "planned" | "active" | "completed";
      work_item_type: "epic" | "story" | "task" | "bug";
      work_item_status: "todo" | "in_progress" | "in_review" | "done";
    };
  };
}
