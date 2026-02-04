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
import {
  getAllSupportTeams,
  addEscalationHistory,
} from "@/lib/supabase/queries/teams";
import { Team, SupportLevel, SUPPORT_LEVEL_CONFIG } from "@/types/team.types";
import { ChevronDown } from "lucide-react";

interface SupportTeamDropdownProps {
  ticketId: string;
  currentTeam: Team | null;
  currentLevel: SupportLevel;
  availableTeams?: Team[];
  isSupportAgent: boolean;
  isClosed: boolean;
}

export function SupportTeamDropdown({
  ticketId,
  currentTeam,
  currentLevel,
  availableTeams,
  isSupportAgent,
  isClosed,
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
      const supportTeams = await getAllSupportTeams(supabase);
      setTeams(supportTeams);
    } catch (err) {
      console.error("Error loading support teams:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLevel = (category?: string): SupportLevel => {
    if (category === "l1_support") return "L1";
    if (category === "l2_technical") return "L2";
    if (category === "l3_engineering") return "L3";
    return "L1";
  };

  const handleTeamChange = async (team: Team) => {
    if (isUpdating || team.id === currentTeam?.id) return;

    const newLevel = getCategoryLevel(team.category);

    setIsUpdating(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Update ticket with new team and level
      await updateTicket(supabase, ticketId, {
        team_id: team.id,
        support_level: newLevel,
      });

      // Log escalation history
      await addEscalationHistory(supabase, {
        ticket_id: ticketId,
        user_id: user?.id,
        from_support_level: currentLevel,
        to_support_level: newLevel,
        from_team_id: currentTeam?.id,
        to_team_id: team.id,
      });

      router.refresh();
    } catch (error) {
      console.error("Failed to update support team:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Group teams by category
  const l1Teams = teams.filter((t) => t.category === "l1_support");
  const l2Teams = teams.filter((t) => t.category === "l2_technical");
  const l3Teams = teams.filter((t) => t.category === "l3_engineering");

  // If not a support agent or ticket is closed, show non-interactive display
  if (!isSupportAgent || isClosed) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className={`whitespace-nowrap ${SUPPORT_LEVEL_CONFIG[currentLevel].color}`}
        >
          {SUPPORT_LEVEL_CONFIG[currentLevel].label}
        </Badge>
        <span className="text-sm text-gray-600">
          {currentTeam?.name || "Support Desk"}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && void ensureTeamsLoaded()}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 hover:bg-gray-50 rounded-md px-2 py-1 -ml-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isUpdating || isLoading}
        >
          <Badge
            variant="secondary"
            className={`whitespace-nowrap ${SUPPORT_LEVEL_CONFIG[currentLevel].color}`}
          >
            {SUPPORT_LEVEL_CONFIG[currentLevel].label}
          </Badge>
          <span className="text-sm text-gray-600">
            {currentTeam?.name || "Support Desk"}
          </span>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        {/* L1 Teams */}
        <DropdownMenuLabel className="text-xs text-blue-600">
          Level 1 - Support Desk
        </DropdownMenuLabel>
        {l1Teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => handleTeamChange(team)}
            className={team.id === currentTeam?.id ? "bg-gray-100" : ""}
          >
            <span>{team.name}</span>
            {team.id === currentTeam?.id && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* L2 Teams */}
        <DropdownMenuLabel className="text-xs text-amber-600">
          Level 2 - Technical Support
        </DropdownMenuLabel>
        {l2Teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => handleTeamChange(team)}
            className={team.id === currentTeam?.id ? "bg-gray-100" : ""}
          >
            <span>{team.name}</span>
            {team.id === currentTeam?.id && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* L3 Teams */}
        <DropdownMenuLabel className="text-xs text-red-600">
          Level 3 - Engineering
        </DropdownMenuLabel>
        {l3Teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => handleTeamChange(team)}
            className={team.id === currentTeam?.id ? "bg-gray-100" : ""}
          >
            <span>{team.name}</span>
            {team.id === currentTeam?.id && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
