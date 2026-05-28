"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { getTeams } from "@/lib/supabase/queries/teams";
import { Team, SupportLevel, SUPPORT_LEVEL_CONFIG } from "@/types/team.types";
import { ChevronDown } from "lucide-react";

interface SupportTeamDropdownProps {
  ticketId: string;
  currentTeam: Team | null;
  currentLevel: SupportLevel;
  availableTeams?: Team[];
  isSupportAgent: boolean;
  isClosed: boolean;
  showLevelBadge?: boolean;
  chevronClassName?: string;
}

export function SupportTeamDropdown({
  ticketId,
  currentTeam,
  currentLevel,
  availableTeams,
  isSupportAgent,
  isClosed,
  showLevelBadge = true,
  chevronClassName,
}: SupportTeamDropdownProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [teams, setTeams] = useState<Team[]>(availableTeams ?? []);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const didInitFromProps = useRef(false);

  useEffect(() => {
    if (didInitFromProps.current) return;
    if (availableTeams) {
      didInitFromProps.current = true;
      setTeams(availableTeams);
      return;
    }
  }, [availableTeams]);

  const ensureTeamsLoaded = async () => {
    if (!isSupportAgent) return;
    if (availableTeams) return;
    if (teams.length > 0 || isLoading) return;

    setIsLoading(true);
    try {
      const allTeams = await getTeams(supabase);
      setTeams(allTeams);
    } catch (err) {
      console.error("Error loading teams:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSupportLevelId = (team: Team): number => {
    if (team.support_level === "L1") return 1;
    if (team.support_level === "L2") return 2;
    if (team.support_level === "L3") return 3;
    return 1;
  };

  const handleTeamChange = async (team: Team) => {
    if (isUpdating || team.id === currentTeam?.id) return;

    const newLevelId = getSupportLevelId(team);

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, {
        team_id: team.id,
        support_level_id: newLevelId,
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update team:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const supportL1 = teams.filter((t) => t.team_type === "support" && t.support_level === "L1");
  const supportL2 = teams.filter((t) => t.team_type === "support" && t.support_level === "L2");
  const businessTeams = teams.filter((t) => t.team_type === "business");
  const engineeringTeams = teams.filter((t) => t.team_type === "engineering");

  if (!isSupportAgent || isClosed) {
    return (
      <div className="flex items-center gap-2">
        {showLevelBadge && (
          <Badge
            variant="secondary"
            className={`whitespace-nowrap ${SUPPORT_LEVEL_CONFIG[currentLevel]?.color ?? ""}`}
          >
            {SUPPORT_LEVEL_CONFIG[currentLevel]?.label ?? "Team"}
          </Badge>
        )}
        <span className="text-sm text-gray-600">
          {currentTeam?.name || "Unassigned"}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && void ensureTeamsLoaded()}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md px-2 py-1 -ml-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
          disabled={isUpdating || isLoading}
        >
          {showLevelBadge && (
            <Badge
              variant="secondary"
              className={`whitespace-nowrap ${SUPPORT_LEVEL_CONFIG[currentLevel]?.color ?? ""}`}
            >
              {SUPPORT_LEVEL_CONFIG[currentLevel]?.label ?? "Team"}
            </Badge>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {currentTeam?.name || "Unassigned"}
          </span>
          <ChevronDown className={`h-3 w-3 text-gray-400 ${chevronClassName ?? ""}`} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px] p-1">
        {supportL1.length > 0 && (
          <>
            <div className="px-2 py-1.5 mb-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                Level 1 – Support Desk
              </span>
            </div>
            {supportL1.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => handleTeamChange(team)}
                className={`rounded-md py-2 px-3 ${team.id === currentTeam?.id ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" : ""}`}
              >
                <span className="text-sm">{team.name}</span>
                {team.id === currentTeam?.id && (
                  <span className="ml-auto text-blue-500 text-sm">✓</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="my-1.5" />
          </>
        )}

        {supportL2.length > 0 && (
          <>
            <div className="px-2 py-1.5 mb-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-400">
                Level 2 – Technical Support
              </span>
            </div>
            {supportL2.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => handleTeamChange(team)}
                className={`rounded-md py-2 px-3 ${team.id === currentTeam?.id ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" : ""}`}
              >
                <span className="text-sm">{team.name}</span>
                {team.id === currentTeam?.id && (
                  <span className="ml-auto text-amber-500 text-sm">✓</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="my-1.5" />
          </>
        )}

        {businessTeams.length > 0 && (
          <>
            <div className="px-2 py-1.5 mb-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-500 dark:text-purple-400">
                Level 3 – Business
              </span>
            </div>
            {businessTeams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => handleTeamChange(team)}
                className={`rounded-md py-2 px-3 ${team.id === currentTeam?.id ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300" : ""}`}
              >
                <span className="text-sm">{team.name}</span>
                {team.id === currentTeam?.id && (
                  <span className="ml-auto text-purple-500 text-sm">✓</span>
                )}
              </DropdownMenuItem>
            ))}
            {engineeringTeams.length > 0 && <DropdownMenuSeparator className="my-1.5" />}
          </>
        )}

        {engineeringTeams.length > 0 && (
          <>
            <div className="px-2 py-1.5 mb-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-500 dark:text-rose-400">
                Level 3 – Engineering
              </span>
            </div>
            {engineeringTeams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => handleTeamChange(team)}
                className={`rounded-md py-2 px-3 ${team.id === currentTeam?.id ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300" : ""}`}
              >
                <span className="text-sm">{team.name}</span>
                {team.id === currentTeam?.id && (
                  <span className="ml-auto text-rose-500 text-sm">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
