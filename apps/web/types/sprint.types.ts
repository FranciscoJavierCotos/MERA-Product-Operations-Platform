export type SprintStatus = "planned" | "active" | "completed";

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: SprintStatus;
  created_at: string;
  updated_at: string;
}

export interface SprintWithCounts extends Sprint {
  total_items: number;
  done_items: number;
}

export interface CreateSprintInput {
  project_id: string;
  name: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface UpdateSprintInput {
  name?: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: SprintStatus;
}
