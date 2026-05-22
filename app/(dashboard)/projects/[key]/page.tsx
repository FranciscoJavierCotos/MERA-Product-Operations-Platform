import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectByKey } from "@/lib/supabase/queries/projects";
import {
  getActiveSprint,
  getNextSprint,
  listProjectSprints,
} from "@/lib/supabase/queries/sprints";
import {
  listSprintBoard,
  listBacklog,
  getWorkItemByKey,
} from "@/lib/supabase/queries/work-items";
import { getAllProfiles } from "@/lib/supabase/queries/users";
import { getTicketPriorities } from "@/lib/supabase/queries/lookup";
import { SprintBoardClient } from "@/components/work-items/sprint-board-client";

interface PageProps {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ item?: string }>;
}

export default async function ProjectBoardPage({ params, searchParams }: PageProps) {
  const { key } = await params;
  const { item } = await searchParams;

  const supabase = await createClient();
  const project = await getProjectByKey(supabase, key);
  if (!project) notFound();

  const [activeSprint, nextSprint, backlog, profiles, priorities, allSprints] =
    await Promise.all([
      getActiveSprint(supabase, project.id),
      getNextSprint(supabase, project.id),
      listBacklog(supabase, project.id),
      getAllProfiles(supabase),
      getTicketPriorities(supabase),
      listProjectSprints(supabase, project.id),
    ]);

  const [board, nextBoard] = await Promise.all([
    listSprintBoard(supabase, activeSprint?.id ?? null),
    listSprintBoard(supabase, nextSprint?.id ?? null),
  ]);

  const focusedItem = item
    ? await getWorkItemByKey(supabase, item.toUpperCase())
    : null;

  const nonCompletedSprints = allSprints.filter((s) => s.status !== "completed");

  return (
    <SprintBoardClient
      project={project}
      activeSprint={activeSprint}
      nextSprint={nextSprint}
      initialBoard={board}
      nextSprintBoard={nextBoard}
      initialBacklog={backlog}
      sprints={nonCompletedSprints}
      profiles={profiles.filter((p) => p.role !== "client")}
      priorities={priorities}
      focusedItem={focusedItem}
    />
  );
}
