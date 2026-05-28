"use client";

import Link from "next/link";
import { ChevronLeft, Building2, Headset, Code2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Team, TeamType } from "@/types/team.types";
import { getTeamTypeLabel, SUPPORT_LEVEL_CONFIG } from "@/types/team.types";
import { cn } from "@/lib/utils/cn";

interface TeamDetailHeaderProps {
  team: Team;
}

const TYPE_ICONS: Record<TeamType, React.ElementType> = {
  business:    Building2,
  support:     Headset,
  engineering: Code2,
};

const TYPE_COLORS: Record<TeamType, string> = {
  business:    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  support:     "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  engineering: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export function TeamDetailHeader({ team }: TeamDetailHeaderProps) {
  const teamType = team.team_type as TeamType | null | undefined;
  const Icon = teamType ? TYPE_ICONS[teamType] : Users;
  const typeColor = teamType ? TYPE_COLORS[teamType] : "bg-gray-100 text-gray-700";
  const typeLabel = getTeamTypeLabel(team);

  const supportLevel = team.support_level ?? null;

  return (
    <div>
      <Link
        href="/teams"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        All teams
      </Link>

      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl",
            teamType === "business"    && "bg-violet-100 dark:bg-violet-900/30",
            teamType === "support"     && "bg-blue-100 dark:bg-blue-900/30",
            teamType === "engineering" && "bg-emerald-100 dark:bg-emerald-900/30",
            !teamType                  && "bg-gray-100 dark:bg-gray-800",
          )}
        >
          <Icon className={cn(
            "h-6 w-6",
            teamType === "business"    && "text-violet-600 dark:text-violet-400",
            teamType === "support"     && "text-blue-600 dark:text-blue-400",
            teamType === "engineering" && "text-emerald-600 dark:text-emerald-400",
            !teamType                  && "text-gray-500",
          )} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {team.name}
            </h1>
            <Badge
              className={cn("text-xs", typeColor)}
              variant="outline"
            >
              {typeLabel}
            </Badge>
            {supportLevel && (
              <Badge
                className={cn(
                  "text-xs",
                  SUPPORT_LEVEL_CONFIG[supportLevel]?.color,
                )}
                variant="outline"
              >
                {SUPPORT_LEVEL_CONFIG[supportLevel]?.label}
              </Badge>
            )}
          </div>
          {team.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {team.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
