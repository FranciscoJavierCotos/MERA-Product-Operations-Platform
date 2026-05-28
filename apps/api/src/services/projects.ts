import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";
import type {
  Project,
  ProjectListItem,
  CreateProjectInput,
  UpdateProjectInput,
} from "../types/project.types";
import type { ProjectMember, ProjectMemberRole } from "../types/team.types";

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

/**
 * Hard-deletes a project and all its data.
 *
 * Order of operations (prevents FK / trigger issues):
 *  1. Collect the IDs of every work_item in this project.
 *  2. Delete item_links where any of those work_items is the source OR the
 *     target — while the work_items still exist so the audit triggers can read
 *     them cleanly.
 *  3. Delete the project row; ON DELETE CASCADE removes sprints, work_items,
 *     work_item_comments, and work_item_history automatically.
 */
export async function deleteProject(
  supabase: Client,
  id: string,
): Promise<void> {
  // 1. Gather work-item IDs belonging to this project.
  const { data: workItems, error: wiErr } = await (supabase.from("work_items") as any)
    .select("id")
    .eq("project_id", id) as { data: Array<{ id: string }> | null; error: { message: string } | null };

  if (wiErr) throw new Error(wiErr.message);

  if (workItems && workItems.length > 0) {
    const ids = workItems.map((wi) => wi.id);

    // 2a. Delete links where our work items are the target
    //     (ticket → our item, other-project item → our item).
    const { error: ltErr } = await (supabase.from("item_links") as any)
      .delete()
      .in("target_work_item_id", ids);
    if (ltErr) throw new Error(ltErr.message);

    // 2b. Delete links where our work items are the source
    //     (our item → other-project item).
    const { error: lsErr } = await (supabase.from("item_links") as any)
      .delete()
      .in("source_work_item_id", ids);
    if (lsErr) throw new Error(lsErr.message);
  }

  // 3. Delete the project; cascades handle everything else.
  const { error } = await (supabase.from("projects") as any)
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── Dashboard overview ────────────────────────────────────────────────────

export interface ProjectSprintSummary {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  total_items: number;
  done_items: number;
  total_points: number;
  done_points: number;
}

export interface ProjectDashboardCard {
  id: string;
  key: string;
  name: string;
  methodology: string;
  lead: { id: string; full_name: string } | null;
  team: { id: string; name: string } | null;
  activeSprint: ProjectSprintSummary | null;
}

/**
 * Fetches all active projects with their active sprint's item + story-point
 * progress. Designed for the dashboard overview widget.
 */
export async function getActiveProjectsForDashboard(
  supabase: Client,
): Promise<ProjectDashboardCard[]> {
  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select(
      `id, key, name, methodology,
       team:teams(id, name),
       lead:profiles!projects_lead_id_fkey(id, full_name)`,
    )
    .eq("status", "active")
    .order("name", { ascending: true });

  if (pErr) throw new Error(pErr.message);
  if (!projects || projects.length === 0) return [];

  const projectIds = (projects as Array<{ id: string }>).map((p) => p.id);

  // Fetch active sprints for these projects in one query.
  const { data: sprints, error: sErr } = await supabase
    .from("sprints")
    .select("id, project_id, name, start_date, end_date")
    .in("project_id", projectIds)
    .eq("status", "active");

  if (sErr) throw new Error(sErr.message);
  const activeSprints = (sprints ?? []) as Array<{
    id: string;
    project_id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
  }>;

  // Aggregate work-item counts & story points per sprint in one query.
  const sprintIds = activeSprints.map((s) => s.id);
  const aggMap = new Map<
    string,
    { total: number; done: number; total_points: number; done_points: number }
  >();

  if (sprintIds.length > 0) {
    const { data: items, error: iErr } = await supabase
      .from("work_items")
      .select("sprint_id, status, story_points")
      .in("sprint_id", sprintIds);

    if (iErr) throw new Error(iErr.message);

    for (const item of (items ?? []) as Array<{
      sprint_id: string;
      status: string;
      story_points: number | null;
    }>) {
      const agg = aggMap.get(item.sprint_id) ?? {
        total: 0,
        done: 0,
        total_points: 0,
        done_points: 0,
      };
      agg.total += 1;
      agg.total_points += item.story_points ?? 0;
      if (item.status === "done") {
        agg.done += 1;
        agg.done_points += item.story_points ?? 0;
      }
      aggMap.set(item.sprint_id, agg);
    }
  }

  return (
    projects as Array<{
      id: string;
      key: string;
      name: string;
      methodology: string;
      team: { id: string; name: string } | null;
      lead: { id: string; full_name: string } | null;
    }>
  ).map((project) => {
    const sprint = activeSprints.find((s) => s.project_id === project.id) ?? null;
    const counts = sprint
      ? (aggMap.get(sprint.id) ?? {
          total: 0,
          done: 0,
          total_points: 0,
          done_points: 0,
        })
      : null;

    return {
      id: project.id,
      key: project.key,
      name: project.name,
      methodology: project.methodology,
      lead: project.lead as { id: string; full_name: string } | null,
      team: project.team as { id: string; name: string } | null,
      activeSprint: sprint
        ? {
            id: sprint.id,
            name: sprint.name,
            start_date: sprint.start_date,
            end_date: sprint.end_date,
            total_items: counts!.total,
            done_items: counts!.done,
            total_points: counts!.total_points,
            done_points: counts!.done_points,
          }
        : null,
    };
  });
}

// ── Project member management (migration 034) ─────────────────────────────────

const PROJECT_MEMBER_SELECT = `
  id, project_id, user_id, role, joined_at, added_by,
  user:profiles!project_members_user_id_fkey(id, full_name, email, avatar_url)
`;

export async function getProjectMembers(
  supabase: Client,
  projectId: string,
): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select(PROJECT_MEMBER_SELECT)
    .eq("project_id", projectId)
    .order("role", { ascending: true })
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProjectMember[];
}

export async function addProjectMember(
  supabase: Client,
  projectId: string,
  userId: string,
  role: ProjectMemberRole,
  addedBy: string,
): Promise<ProjectMember> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("project_members") as any)
    .insert([{ project_id: projectId, user_id: userId, role, added_by: addedBy }])
    .select(PROJECT_MEMBER_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as ProjectMember;
}

export async function updateProjectMemberRole(
  supabase: Client,
  memberId: string,
  role: ProjectMemberRole,
): Promise<ProjectMember> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("project_members") as any)
    .update({ role })
    .eq("id", memberId)
    .select(PROJECT_MEMBER_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as ProjectMember;
}

export async function removeProjectMember(
  supabase: Client,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", memberId);

  if (error) throw new Error(error.message);
}
