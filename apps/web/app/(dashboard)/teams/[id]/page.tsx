import { api } from "@/lib/api-client";
import type { TeamDetail } from "@/types/team.types";
import type { Profile } from "@/types/user.types";
import { notFound } from "next/navigation";
import { TeamDetailHeader } from "./_components/team-detail-header";
import { TeamMembersPanel } from "./_components/team-members-panel";
import { TeamActiveProjects } from "./_components/team-active-projects";
import { TeamRecentTickets } from "./_components/team-recent-tickets";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [detail, allProfiles] = await Promise.allSettled([
    api.get<TeamDetail>(`/teams/${id}/detail`),
    api.get<Profile[]>("/users"),
  ]);

  if (detail.status === "rejected" || !detail.value) {
    notFound();
  }

  const team = detail.value;
  const profiles =
    allProfiles.status === "fulfilled" ? allProfiles.value : [];

  // Profiles that are not already members (for the add-member picker)
  const memberUserIds = new Set(team.members.map((m) => m.user_id));
  const availableProfiles = profiles.filter((p) => !memberUserIds.has(p.id));

  return (
    <div className="space-y-6">
      <TeamDetailHeader team={team} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TeamMembersPanel
            teamId={team.id}
            initialMembers={team.members}
            availableProfiles={availableProfiles}
          />
          <TeamActiveProjects projects={team.activeProjects} />
        </div>
        <div>
          <TeamRecentTickets
            tickets={team.recentTickets}
            teamType={team.team_type ?? null}
          />
        </div>
      </div>
    </div>
  );
}
