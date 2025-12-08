"use client";

import { useState, useEffect } from "react";
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
  getFunctionalTeams,
  getAllSupportTeams,
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
  isSupportAgent: boolean;
  isClosed: boolean;
}

export function CollaboratorsSection({
  ticketId,
  isSupportAgent,
  isClosed,
}: CollaboratorsSectionProps) {
  const router = useRouter();
  const supabase = createClient();
  const [collaborators, setCollaborators] = useState<TicketCollaborator[]>([]);
  const [functionalTeams, setFunctionalTeams] = useState<Team[]>([]);
  const [supportTeams, setSupportTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [collaboratorType, setCollaboratorType] = useState<
    "functional" | "support"
  >("functional");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
  }, [ticketId]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [collabs, funcTeams, supTeams] = await Promise.all([
        getTicketCollaborators(supabase, ticketId),
        getFunctionalTeams(supabase),
        getAllSupportTeams(supabase),
      ]);
      setCollaborators(collabs);
      setFunctionalTeams(funcTeams);
      setSupportTeams(supTeams);
    } catch (err) {
      console.error("Error loading collaborators:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const getSupportLevel = (teamId: string): SupportLevel | undefined => {
    const team = supportTeams.find((t) => t.id === teamId);
    if (!team) return undefined;
    if (team.category === "l1_support") return "L1";
    if (team.category === "l2_technical") return "L2";
    if (team.category === "l3_engineering") return "L3";
    return undefined;
  };

  const handleAddCollaborator = async () => {
    if (!selectedTeamId || isAdding) return;

    setIsAdding(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const collaborator: Parameters<typeof addTicketCollaborator>[1] = {
        ticket_id: ticketId,
        added_by: user?.id,
        notes: notes || undefined,
      };

      if (collaboratorType === "functional") {
        collaborator.functional_team_id = selectedTeamId;
      } else {
        collaborator.support_team_id = selectedTeamId;
        collaborator.support_level = getSupportLevel(selectedTeamId);
      }

      await addTicketCollaborator(supabase, collaborator);

      // Reset form
      setSelectedTeamId("");
      setNotes("");
      setIsDialogOpen(false);

      // Reload data
      await loadData();
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
      await loadData();
      router.refresh();
    } catch (error) {
      console.error("Failed to remove collaborator:", error);
    }
  };

  const teamsForSelect =
    collaboratorType === "functional" ? functionalTeams : supportTeams;

  // Group support teams by level for better display
  const groupedSupportTeams = {
    l1: supportTeams.filter((t) => t.category === "l1_support"),
    l2: supportTeams.filter((t) => t.category === "l2_technical"),
    l3: supportTeams.filter((t) => t.category === "l3_engineering"),
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
          <h4 className="text-sm font-medium text-gray-700">Collaborators</h4>
          <Badge variant="secondary" className="text-xs">
            {collaborators.length}
          </Badge>
        </div>
        {isSupportAgent && !isClosed && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  <Label>Collaborator Type</Label>
                  <Select
                    value={collaboratorType}
                    onValueChange={(value) => {
                      setCollaboratorType(value as "functional" | "support");
                      setSelectedTeamId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="functional">
                        Functional Department
                      </SelectItem>
                      <SelectItem value="support">Support Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Team</Label>
                  {collaboratorType === "functional" ? (
                    <Select
                      value={selectedTeamId}
                      onValueChange={setSelectedTeamId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department..." />
                      </SelectTrigger>
                      <SelectContent>
                        {functionalTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={selectedTeamId}
                      onValueChange={setSelectedTeamId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a support team..." />
                      </SelectTrigger>
                      <SelectContent>
                        {groupedSupportTeams.l1.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-blue-600">
                              L1 - Support Desk
                            </div>
                            {groupedSupportTeams.l1.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {groupedSupportTeams.l2.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-amber-600">
                              L2 - Technical
                            </div>
                            {groupedSupportTeams.l2.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {groupedSupportTeams.l3.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-red-600">
                              L3 - Engineering
                            </div>
                            {groupedSupportTeams.l3.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  )}
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
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
            >
              <div className="flex items-center gap-2">
                {collab.functional_team && (
                  <>
                    <Badge variant="outline">
                      {collab.functional_team.name}
                    </Badge>
                    <span className="text-xs text-gray-500">Functional</span>
                  </>
                )}
                {collab.support_team && (
                  <>
                    {collab.support_level && (
                      <Badge
                        variant="secondary"
                        className={
                          SUPPORT_LEVEL_CONFIG[collab.support_level].color
                        }
                      >
                        {SUPPORT_LEVEL_CONFIG[collab.support_level].label}
                      </Badge>
                    )}
                    <span className="text-sm">{collab.support_team.name}</span>
                  </>
                )}
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
