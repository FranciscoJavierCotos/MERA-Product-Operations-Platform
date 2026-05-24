import Link from "next/link";
import { api } from "@/lib/api-client";
import type { Team } from "@/types/team.types";
import type { Profile } from "@/types/user.types";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function NewProjectPage() {
  const [teams, profiles] = await Promise.all([
    api.get<Team[]>("/teams"),
    api.get<Profile[]>("/users"),
  ]);

  const leadCandidates = profiles.filter((p) => p.role !== "client");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/projects">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to projects
        </Button>
      </Link>
      <div className="rounded-lg border bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">New project</h1>
        <p className="text-sm text-gray-500 mb-6">
          Projects group sprints and work items. Choose a short, uppercase key —
          it prefixes every work item (e.g. <code>MOB-42</code>).
        </p>
        <ProjectForm teams={teams} leadCandidates={leadCandidates} />
      </div>
    </div>
  );
}
