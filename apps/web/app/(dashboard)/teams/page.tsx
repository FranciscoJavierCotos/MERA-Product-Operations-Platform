import { api } from "@/lib/api-client";
import type { Team } from "@/types/team.types";
import { Users } from "lucide-react";
import { TeamsListClient } from "./_components/teams-list-client";

export default async function TeamsPage() {
  const teams = await api.get<Team[]>("/teams");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Users className="h-6 w-6 text-gray-500" />
          Teams
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage departments, support teams, and engineering squads.
        </p>
      </header>

      <TeamsListClient initialTeams={teams} />
    </div>
  );
}
