import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectByKey } from "@/lib/supabase/queries/projects";
import { listBacklog } from "@/lib/supabase/queries/work-items";
import { listProjectSprints } from "@/lib/supabase/queries/sprints";
import { getAllProfiles } from "@/lib/supabase/queries/users";
import { getTicketPriorities } from "@/lib/supabase/queries/lookup";
import { BacklogClient } from "@/components/work-items/backlog-client";

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function BacklogPage({ params }: PageProps) {
  const { key } = await params;
  const supabase = await createClient();
  const project = await getProjectByKey(supabase, key);
  if (!project) notFound();

  const [items, sprints, profiles, priorities] = await Promise.all([
    listBacklog(supabase, project.id),
    listProjectSprints(supabase, project.id),
    getAllProfiles(supabase),
    getTicketPriorities(supabase),
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
