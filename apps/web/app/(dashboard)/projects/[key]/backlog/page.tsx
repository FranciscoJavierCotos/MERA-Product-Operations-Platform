import { notFound } from "next/navigation";
import { api } from "@/lib/api-client";
import type { Project } from "@/types/project.types";
import type { SprintWithCounts } from "@/types/sprint.types";
import type { WorkItemWithRelations } from "@/types/work-item.types";
import type { Profile } from "@/types/user.types";
import type { TicketPriorityRow } from "@/types/ticket.types";
import { BacklogClient } from "@/components/work-items/backlog-client";

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function BacklogPage({ params }: PageProps) {
  const { key } = await params;
  const project = await api.get<Project | null>(`/projects/by-key/${key}`);
  if (!project) notFound();

  const [items, sprints, profiles, priorities] = await Promise.all([
    api.get<WorkItemWithRelations[]>("/work-items/backlog", { projectId: project.id }),
    api.get<SprintWithCounts[]>(`/projects/${project.id}/sprints`),
    api.getRevalidated<Profile[]>("/users", 300),
    api.getRevalidated<TicketPriorityRow[]>("/lookup/priorities", 3600),
  ]);

  return (
    <BacklogClient
      project={project}
      initialItems={items}
      sprints={sprints.filter((s) => s.status !== "completed")}
      profiles={profiles.filter((p) => p.role !== "client")}
      priorities={priorities}
    />
  );
}
