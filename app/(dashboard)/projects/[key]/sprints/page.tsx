import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectByKey } from "@/lib/supabase/queries/projects";
import { listProjectSprints } from "@/lib/supabase/queries/sprints";
import { listSprintItems } from "@/lib/supabase/queries/work-items";
import { getAllProfiles } from "@/lib/supabase/queries/users";
import { getTicketPriorities } from "@/lib/supabase/queries/lookup";
import { SprintsClient } from "@/components/sprints/sprints-client";
import type { WorkItemWithRelations } from "@/types/work-item.types";

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function SprintsPage({ params }: PageProps) {
  const { key } = await params;
  const supabase = await createClient();
  const project = await getProjectByKey(supabase, key);
  if (!project) notFound();

  const [sprints, profiles, priorities] = await Promise.all([
    listProjectSprints(supabase, project.id),
    getAllProfiles(supabase),
    getTicketPriorities(supabase),
  ]);

  // Fetch items for all non-completed sprints in parallel.
  const activeSprints = sprints.filter((s) => s.status !== "completed");
  const itemArrays = await Promise.all(
    activeSprints.map((s) => listSprintItems(supabase, s.id)),
  );

  const sprintItems: Record<string, WorkItemWithRelations[]> = {};
  for (let i = 0; i < activeSprints.length; i++) {
    sprintItems[activeSprints[i].id] = itemArrays[i];
  }

  return (
    <SprintsClient
      project={project}
      initialSprints={sprints}
      sprintItems={sprintItems}
      profiles={profiles.filter((p) => p.role !== "client")}
      priorities={priorities}
    />
  );
}
