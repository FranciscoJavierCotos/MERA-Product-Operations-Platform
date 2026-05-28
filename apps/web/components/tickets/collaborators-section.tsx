"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  getTeams,
  getTicketCollaborators,
  addTicketCollaborator,
  removeTicketCollaborator,
} from "@/lib/supabase/queries/teams";
import {
  Team,
  TicketCollaborator,
  SupportLevel,
  SUPPORT_LEVEL_CONFIG,
} from "@/types/team.types";
import { Plus, X, Users } from "lucide-react";

interface CollaboratorsSectionProps {
  ticketId: string;
  initialCollaborators?: TicketCollaborator[];
  availableTeams?: Team[];
  isSupportAgent: boolean;
  isClosed: boolean;
}

export function CollaboratorsSection({
  ticketId,
  initialCollaborators,
  availableTeams,
  isSupportAgent,
  isClosed,
}: CollaboratorsSectionProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [collaborators, setCollaborators] = useState<TicketCollaborator[]>(
    initialCollaborators ?? [],
  );
  const [teams, setTeams] = useState<Team[]>(availableTeams ?? []);
  const [isLoading, setIsLoading] = useState(!initialCollaborators);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const didInitFromProps = useRef(false);

  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (didInitFromProps.current) return;
    didInitFromProps.current = true;

    if (initialCollaborators) setCollaborators(initialCollaborators);
    if (availableTeams) setTeams(availableTeams);
    setIsLoading(false);
  }, [initialCollaborators, availableTeams]);

  useEffect(() => {
    if (initialCollaborators) return;

    async function loadCollaborators() {
      setIsLoading(true);
      try {
        const collabs = await getTicketCollaborators(supabase, ticketId);
        setCollaborators(collabs);
      } catch (err) {
        console.error("Error loading collaborators:", err);
      } finally {
        setIsLoading(false);
      }
    }

    void loadCollaborators();
  }, [initialCollaborators, supabase, ticketId]);

  const ensureTeamOptionsLoaded = async () => {
    if (!isSupportAgent) return;
    if (teams.length > 0) return;

    try {
      const allTeams = await getTeams(supabase);
      setTeams(allTeams);
    } catch (err) {
      console.error("Error loading team options:", err);
    }
  };

  const refreshCollaborators = async () => {
    try {
      const collabs = await getTicketCollaborators(supabase, ticketId);
      setCollaborators(collabs);
    } catch (err) {
      console.error("Error refreshing collaborators:", err);
    }
  };

  const handleAddCollaborator = async () => {
    if (!selectedTeamId || isAdding) return;

    setIsAdding(true);
    try {
      const team = teams.find((t) => t.id === selectedTeamId);

      await addTicketCollaborator(supabase, {
        ticket_id: ticketId,
        team_id: selectedTeamId,
        support_level: team?.support_level ?? undefined,
        notes: notes || undefined,
      });

      setSelectedTeamId("");
      setNotes("");
      setIsDialogOpen(false);

      await refreshCollaborators();
      router.refresh();
    } catch (error) {
      console.error("Failed to add collaborator:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      await removeTicketCollaborator(supabase, collaboratorId);
      await refreshCollaborators();
      router.refresh();
    } catch (error) {
      console.error("Failed to remove collaborator:", error);
    }
  };

  const grouped = {
    support: teams.filter((t) => t.team_type === "support"),
    business: teams.filter((t) => t.team_type === "business"),
    engineering: teams.filter((t) => t.team_type === "engineering"),
  };

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500">Loading collaborators...</div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Collaborators</h4>
          <Badge variant="secondary" className="text-xs">
            {collaborators.length}
          </Badge>
        </div>
        {isSupportAgent && !isClosed && (
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (open) void ensureTeamOptionsLoaded();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Collaborating Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select
                    value={selectedTeamId}
                    onValueChange={setSelectedTeamId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team..." />
                    </SelectTrigger>
                    <SelectContent>
                      {grouped.support.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-blue-600">
                            Support
                          </div>
                          {grouped.support.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                              {team.support_level ? ` (${team.support_level})` : ""}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {grouped.business.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-purple-600">
                            Business
                          </div>
                          {grouped.business.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {grouped.engineering.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-red-600">
                            Engineering
                          </div>
                          {grouped.engineering.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Why is this team being added..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCollaborator}
                    disabled={!selectedTeamId || isAdding}
                  >
                    {isAdding ? "Adding..." : "Add Collaborator"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {collaborators.length === 0 ? (
        <p className="text-sm text-gray-500">No collaborating teams yet</p>
      ) : (
        <div className="space-y-2">
          {collaborators.map((collab) => (
            <div
              key={collab.id}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
            >
              <div className="flex items-center gap-2">
                {collab.support_level && (
                  <Badge
                    variant="secondary"
                    className={SUPPORT_LEVEL_CONFIG[collab.support_level]?.color ?? ""}
                  >
                    {SUPPORT_LEVEL_CONFIG[collab.support_level]?.label ?? collab.support_level}
                  </Badge>
                )}
                <span className="text-sm">{collab.team?.name}</span>
              </div>
              {isSupportAgent && !isClosed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCollaborator(collab.id)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
