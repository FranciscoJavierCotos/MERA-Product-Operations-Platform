"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { getFunctionalTeams } from "@/lib/supabase/queries/teams";
import { Team } from "@/types/team.types";
import { ChevronDown } from "lucide-react";

interface FunctionalTeamDropdownProps {
  ticketId: string;
  currentTeam: Team | null;
  availableTeams?: Team[];
  isSupportAgent: boolean;
  isClosed: boolean;
}

export function FunctionalTeamDropdown({
  ticketId,
  currentTeam,
  availableTeams,
  isSupportAgent,
  isClosed,
}: FunctionalTeamDropdownProps) {
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
      const functionalTeams = await getFunctionalTeams(supabase);
      setTeams(functionalTeams);
    } catch (err) {
      console.error("Error loading functional teams:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamChange = async (newTeamId: string) => {
    if (isUpdating || newTeamId === currentTeam?.id) return;

    setIsUpdating(true);
    try {
      // Update ticket
      await updateTicket(supabase, ticketId, {
        functional_team_id: newTeamId,
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update functional team:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // If not a support agent or ticket is closed, show non-interactive badge
  if (!isSupportAgent || isClosed) {
    return (
      <Badge variant="secondary" className="whitespace-nowrap">
        {currentTeam?.name || "Not assigned"}
      </Badge>
    );
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && void ensureTeamsLoaded()}>
      <DropdownMenuTrigger asChild>
        <button
          className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring rounded-md"
          disabled={isUpdating || isLoading}
        >
          <Badge
            variant="secondary"
            className="whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            {currentTeam?.name || "Select Department"}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => handleTeamChange(team.id)}
            className={team.id === currentTeam?.id ? "bg-gray-100" : ""}
          >
            <span>{team.name}</span>
            {team.id === currentTeam?.id && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
