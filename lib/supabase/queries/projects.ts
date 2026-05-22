import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  Project,
  ProjectListItem,
  CreateProjectInput,
  UpdateProjectInput,
} from "@/types/project.types";

type Client = SupabaseClient<Database>;

const PROJECT_SELECT = `
  id, key, name, description, methodology, status,
  team_id, lead_id, next_item_number, sprint_duration_weeks,
  created_by, created_at, updated_at,
  team:teams(id, name),
  lead:profiles!projects_lead_id_fkey(id, full_name, email, avatar_url),
  creator:profiles!projects_created_by_fkey(id, full_name, email)
`;

export async function listProjects(supabase: Client): Promise<ProjectListItem[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .order("status", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProjectListItem[];
}

export async function getProjectByKey(
  supabase: Client,
  key: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("key", key.toUpperCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as Project) ?? null;
}

export async function getProjectById(
  supabase: Client,
  id: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as Project) ?? null;
}

export async function createProject(
  supabase: Client,
  input: CreateProjectInput & { created_by: string },
): Promise<Project> {
  const { data, error } = await (supabase.from("projects") as any)
    .insert([
      {
        key: input.key.toUpperCase(),
        name: input.name,
        description: input.description ?? null,
        methodology: input.methodology ?? "scrum",
        sprint_duration_weeks: input.sprint_duration_weeks ?? 2,
        team_id: input.team_id ?? null,
        lead_id: input.lead_id ?? null,
        created_by: input.created_by,
      },
    ])
    .select(PROJECT_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Project;
}

export async function updateProject(
  supabase: Client,
  id: string,
  updates: UpdateProjectInput,
): Promise<Project> {
  const { data, error } = await (supabase.from("projects") as any)
    .update(updates)
    .eq("id", id)
    .select(PROJECT_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Project;
}

export async function archiveProject(
  supabase: Client,
  id: string,
): Promise<void> {
  const { error } = await (supabase.from("projects") as any)
    .update({ status: "archived" })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
