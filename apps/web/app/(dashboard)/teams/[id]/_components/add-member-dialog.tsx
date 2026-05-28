"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Profile } from "@/types/user.types";
import type { TeamMemberRole } from "@/types/team.types";

interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  availableProfiles: Profile[];
  onAdd: (userId: string, role: TeamMemberRole) => void;
  isPending: boolean;
}

export function AddMemberDialog({
  open,
  onClose,
  availableProfiles,
  onAdd,
  isPending,
}: AddMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [role, setRole] = useState<TeamMemberRole>("member");
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? availableProfiles.filter(
        (p) =>
          p.full_name.toLowerCase().includes(search.toLowerCase()) ||
          p.email.toLowerCase().includes(search.toLowerCase()),
      )
    : availableProfiles;

  const handleAdd = () => {
    if (!selectedUserId) return;
    onAdd(selectedUserId, role);
  };

  const handleClose = () => {
    setSelectedUserId("");
    setRole("member");
    setSearch("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* User search */}
          <div className="space-y-1.5">
            <Label>Person</Label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border dark:border-gray-700 divide-y dark:divide-gray-800">
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">
                  No available members
                </p>
              ) : (
                filtered.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedUserId(profile.id)}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedUserId === profile.id
                        ? "bg-primary/5 dark:bg-primary/10 font-medium"
                        : ""
                    }`}
                  >
                    <span className="block text-gray-900 dark:text-gray-100">
                      {profile.full_name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {profile.email} · {profile.role.replace("_", " ")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Role select */}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as TeamMemberRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead — manages the team</SelectItem>
                <SelectItem value="member">Member — regular team member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedUserId || isPending}
            onClick={handleAdd}
          >
            {isPending ? "Adding…" : "Add member"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
