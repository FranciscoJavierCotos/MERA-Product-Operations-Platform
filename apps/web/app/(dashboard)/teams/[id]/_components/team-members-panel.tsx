"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Crown, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/lib/hooks/use-toast";
import {
  getTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
} from "@/lib/supabase/queries/team-members";
import { AddMemberDialog } from "./add-member-dialog";
import type { TeamMember, TeamMemberRole } from "@/types/team.types";
import type { Profile } from "@/types/user.types";
import { cn } from "@/lib/utils/cn";

interface TeamMembersPanelProps {
  teamId: string;
  initialMembers: TeamMember[];
  availableProfiles: Profile[];
}

export function TeamMembersPanel({
  teamId,
  initialMembers,
  availableProfiles,
}: TeamMembersPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const queryKey = ["team-members", teamId] as const;

  const { data: members = initialMembers } = useQuery({
    queryKey,
    queryFn: () => getTeamMembers(teamId),
    initialData: initialMembers,
  });

  const addMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: TeamMemberRole;
    }) => addTeamMember(teamId, { user_id: userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setAddOpen(false);
      toast({ title: "Member added" });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to add member",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: TeamMemberRole;
    }) => updateTeamMemberRole(teamId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Role updated" });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update role",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeTeamMember(teamId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setRemovingId(null);
      toast({ title: "Member removed" });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to remove member",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Compute available profiles excluding current members
  const memberUserIds = new Set(members.map((m) => m.user_id));
  const filteredAvailable = availableProfiles.filter(
    (p) => !memberUserIds.has(p.id),
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Members</CardTitle>
            <CardDescription>
              {members.length} {members.length === 1 ? "person" : "people"} on this team
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add member
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              No members yet. Add someone to get started.
            </div>
          ) : (
            <ul className="divide-y dark:divide-gray-800">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 px-6 py-3"
                >
                  {/* Avatar */}
                  <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {member.user?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.user.avatar_url}
                        alt={member.user.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-gray-500" />
                    )}
                  </div>

                  {/* Name + email */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {member.user?.full_name ?? "Unknown"}
                      {member.role === "lead" && (
                        <Crown className="inline h-3 w-3 ml-1 text-amber-500" />
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {member.user?.email}
                    </p>
                  </div>

                  {/* Role selector */}
                  <Select
                    value={member.role}
                    onValueChange={(v) =>
                      roleMutation.mutate({
                        memberId: member.id,
                        role: v as TeamMemberRole,
                      })
                    }
                    disabled={roleMutation.isPending}
                  >
                    <SelectTrigger className="w-28 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-red-500"
                    onClick={() => setRemovingId(member.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        availableProfiles={filteredAvailable}
        isPending={addMutation.isPending}
        onAdd={(userId, role) => addMutation.mutate({ userId, role })}
      />

      {/* Remove Confirm Dialog */}
      <Dialog
        open={!!removingId}
        onOpenChange={(open: boolean) => !open && setRemovingId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              This person will be removed from the team. This action can be
              undone by adding them again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => removingId && removeMutation.mutate(removingId)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
