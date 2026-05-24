import type { Profile } from "./user.types";
import type { Team } from "./team.types";

export type ProjectMethodology = "scrum" | "kanban" | "waterfall";
export type ProjectStatus = "active" | "archived";

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string | null;
  methodology: ProjectMethodology;
  status: ProjectStatus;
  team_id: string | null;
  lead_id: string | null;
  next_item_number: number;
  /** Default sprint length in weeks (1–4). Only relevant for Scrum projects. */
  sprint_duration_weeks: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  team?: Pick<Team, "id" | "name"> | null;
  lead?: Profile | null;
  creator?: Profile | null;
}

export interface ProjectListItem extends Project {
  open_item_count?: number;
  active_sprint_id?: string | null;
}

export interface CreateProjectInput {
  key: string;
  name: string;
  description?: string | null;
  methodology?: ProjectMethodology;
  sprint_duration_weeks?: number;
  team_id?: string | null;
  lead_id?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  methodology?: ProjectMethodology;
  status?: ProjectStatus;
  sprint_duration_weeks?: number;
  team_id?: string | null;
  lead_id?: string | null;
}
