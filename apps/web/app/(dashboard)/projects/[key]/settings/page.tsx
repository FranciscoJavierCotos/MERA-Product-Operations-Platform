import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api-client";
import type { Project } from "@/types/project.types";
import type { Team } from "@/types/team.types";
import type { Profile } from "@/types/user.types";
import { ProjectSettingsClient } from "@/components/projects/project-settings-client";

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function ProjectSettingsPage({ params }: PageProps) {
  const { key } = await params;
  const project = await api.get<Project | null>(`/projects/by-key/${key}`);
  if (!project) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [teams, profiles, currentProfile] = await Promise.all([
    api.get<Team[]>("/teams"),
    api.get<Profile[]>("/users"),
    user ? api.get<Profile | null>(`/users/${user.id}`) : Promise.resolve(null),
  ]);

  return (
    <ProjectSettingsClient
      project={project}
      teams={teams}
      leadCandidates={profiles.filter((p) => p.role !== "client")}
      currentUserRole={currentProfile?.role}
    />
  );
}
