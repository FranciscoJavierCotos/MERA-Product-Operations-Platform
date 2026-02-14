"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { getSupportMembers } from "@/lib/supabase/queries/users";
import { Profile } from "@/types/user.types";
import { ChevronDown } from "lucide-react";

interface AssignedUserDropdownProps {
  ticketId: string;
  assignedUser: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  availableSupportMembers?: Profile[];
  isSupportAgent: boolean;
  isClosed: boolean;
  compact?: boolean;
}

export function AssignedUserDropdown({
  ticketId,
  assignedUser,
  availableSupportMembers,
  isSupportAgent,
  isClosed,
  compact = false,
}: AssignedUserDropdownProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [supportMembers, setSupportMembers] = useState<Profile[]>(
    availableSupportMembers ?? [],
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const didInitFromProps = useRef(false);

  useEffect(() => {
    if (didInitFromProps.current) return;
    if (availableSupportMembers) {
      didInitFromProps.current = true;
      setSupportMembers(availableSupportMembers);
      return;
    }
  }, [availableSupportMembers]);

  const ensureMembersLoaded = async () => {
    if (!isSupportAgent) return;
    if (availableSupportMembers) return;
    if (supportMembers.length > 0 || isLoading) return;

    setIsLoading(true);
    try {
      const members = await getSupportMembers(supabase);
      setSupportMembers(members);
    } catch (err) {
      console.error("Error loading support members:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignmentChange = async (newAssignedUserId: string | null) => {
    if (isUpdating) return;

    // Don't update if same user
    if (newAssignedUserId === assignedUser?.id) return;

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, {
        assigned_to: newAssignedUserId || undefined,
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update assignment:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // If not a support agent or ticket is closed, show non-interactive display
  if (!isSupportAgent || isClosed) {
    return (
      <div className={`${compact ? "" : "mt-2 "}flex items-center gap-2`}>
        {assignedUser ? (
          <>
            <UserAvatar
              name={assignedUser.full_name}
              avatarUrl={assignedUser.avatar_url || undefined}
              className={compact ? "h-5 w-5" : "h-6 w-6"}
            />
            <span className="text-sm">{assignedUser.full_name}</span>
          </>
        ) : (
          <span className="text-sm text-gray-500">Unassigned</span>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && void ensureMembersLoaded()}>
      <DropdownMenuTrigger asChild>
        <button
          className={`${compact ? "" : "mt-2 "}flex items-center gap-2 hover:bg-gray-50 rounded-md px-2 py-1 -ml-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          disabled={isUpdating || isLoading}
        >
          {assignedUser ? (
            <>
              <UserAvatar
                name={assignedUser.full_name}
                avatarUrl={assignedUser.avatar_url || undefined}
                className={compact ? "h-5 w-5" : "h-6 w-6"}
              />
              <span className="text-sm">{assignedUser.full_name}</span>
            </>
          ) : (
            <span className="text-sm text-gray-500">Unassigned</span>
          )}
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuItem
          onClick={() => handleAssignmentChange(null)}
          className={!assignedUser ? "bg-gray-100" : ""}
        >
          <span className="text-gray-500">Unassigned</span>
          {!assignedUser && <span className="ml-auto text-blue-600">✓</span>}
        </DropdownMenuItem>
        {supportMembers.map((member) => (
          <DropdownMenuItem
            key={member.id}
            onClick={() => handleAssignmentChange(member.id)}
            className={assignedUser?.id === member.id ? "bg-gray-100" : ""}
          >
            <div className="flex items-center gap-2 flex-1">
              <UserAvatar
                name={member.full_name}
                avatarUrl={member.avatar_url || undefined}
                className="h-5 w-5"
              />
              <span className="text-sm">{member.full_name}</span>
            </div>
            {assignedUser?.id === member.id && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
