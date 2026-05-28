import { notFound } from "next/navigation";
import { api } from "@/lib/api-client";
import type { Project } from "@/types/project.types";
import type { Sprint, SprintWithCounts } from "@/types/sprint.types";
import type {
  BoardColumn,
  WorkItemWithRelations,
} from "@/types/work-item.types";
import type { Profile } from "@/types/user.types";
import type { TicketPriorityRow } from "@/types/ticket.types";
import { SprintBoardClient } from "@/components/work-items/sprint-board-client";

interface PageProps {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ item?: string }>;
}

export default async function ProjectBoardPage({ params, searchParams }: PageProps) {
  const { key } = await params;
  const { item } = await searchParams;

  const project = await api.get<Project | null>(`/projects/by-key/${key}`);
  if (!project) notFound();

  const [activeSprint, nextSprint, backlog, profiles, priorities, allSprints] =
    await Promise.all([
      api.get<Sprint | null>(`/projects/${project.id}/sprints/active`),
      api.get<Sprint | null>(`/projects/${project.id}/sprints/next`),
      api.get<WorkItemWithRelations[]>("/work-items/backlog", { projectId: project.id }),
      api.getRevalidated<Profile[]>("/users", 300),
      api.getRevalidated<TicketPriorityRow[]>("/lookup/priorities", 3600),
      api.get<SprintWithCounts[]>(`/projects/${project.id}/sprints`),
    ]);

  const [board, nextBoard] = await Promise.all([
    activeSprint
      ? api.get<BoardColumn[]>(`/work-items/sprint/${activeSprint.id}/board`)
      : Promise.resolve([] as BoardColumn[]),
    nextSprint
      ? api.get<BoardColumn[]>(`/work-items/sprint/${nextSprint.id}/board`)
      : Promise.resolve([] as BoardColumn[]),
  ]);

  const focusedItem = item
    ? await api.get<WorkItemWithRelations | null>(`/work-items/by-key/${item.toUpperCase()}`)
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
