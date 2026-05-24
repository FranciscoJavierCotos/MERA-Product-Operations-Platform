"use client";

import Link from "next/link";
import { Plus, Ticket, CheckSquare, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/types/user.types";

interface TopbarCreateMenuProps {
  role: UserRole;
}

export function TopbarCreateMenu({ role }: TopbarCreateMenuProps) {
  const canCreateTasks = role !== "client";
  const canCreateProjects = role !== "client";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-9 gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick Create</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/tickets/new" className="cursor-pointer">
            <Ticket className="mr-2 h-4 w-4" />
            New ticket
          </Link>
        </DropdownMenuItem>

        {canCreateTasks && (
          <DropdownMenuItem asChild>
            <Link href="/tasks?create=1" className="cursor-pointer">
              <CheckSquare className="mr-2 h-4 w-4" />
              New task
            </Link>
          </DropdownMenuItem>
        )}

        {canCreateProjects && (
          <DropdownMenuItem asChild>
            <Link href="/projects/new" className="cursor-pointer">
              <FolderKanban className="mr-2 h-4 w-4" />
              New project
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
