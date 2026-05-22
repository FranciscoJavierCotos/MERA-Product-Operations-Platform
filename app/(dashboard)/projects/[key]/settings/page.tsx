import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectByKey } from "@/lib/supabase/queries/projects";
import { getTeams } from "@/lib/supabase/queries/teams";
import { getAllProfiles } from "@/lib/supabase/queries/users";
import { ProjectSettingsClient } from "@/components/projects/project-settings-client";

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function ProjectSettingsPage({ params }: PageProps) {
  const { key } = await params;
  const supabase = await createClient();
  const project = await getProjectByKey(supabase, key);
  if (!project) notFound();

  const [teams, profiles] = await Promise.all([
    getTeams(supabase),
    getAllProfiles(supabase),
  ]);

  return (
    <ProjectSettingsClient
      project={project}
      teams={teams}
      leadCandidates={profiles.filter((p) => p.role !== "client")}
    />
  );
}
