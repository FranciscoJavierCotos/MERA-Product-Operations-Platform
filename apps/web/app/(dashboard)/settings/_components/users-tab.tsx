"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/lib/hooks/use-toast";
import {
  profileAdminUpdateSchema,
  type ProfileAdminUpdateData,
} from "@/lib/validations/settings.schema";
import { updateProfileAdminAction } from "../actions";
import type { Profile, UserRole } from "@/types/user.types";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  support_lead: "Support Lead",
  support_member: "Support Member",
  client: "Client",
};

const ROLE_BADGE_VARIANTS: Record<
  UserRole,
  "default" | "secondary" | "destructive" | "outline"
> = {
  admin: "default",
  support_lead: "secondary",
  support_member: "outline",
  client: "outline",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// â”€â”€ Edit Profile Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EditProfileForm({
  profile,
  currentUserId,
  onSubmit,
  isPending,
  onCancel,
}: {
  profile: Profile;
  currentUserId?: string;
  onSubmit: (data: ProfileAdminUpdateData) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const { setValue, handleSubmit } = useForm<ProfileAdminUpdateData>({
    resolver: zodResolver(profileAdminUpdateSchema),
    defaultValues: {
      id: profile.id,
      role: profile.role,
    },
  });

  const isSelf = profile.id === currentUserId;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{profile.full_name}</p>
          <p className="text-xs text-gray-500">{profile.email}</p>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Role</Label>
        <Select
          defaultValue={profile.role}
          disabled={isSelf}
          onValueChange={(v) => setValue("role", v as UserRole)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSelf && (
          <p className="text-xs text-amber-600">
            You cannot change your own role.
          </p>
        )}
      </div>


      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Savingâ€¦" : "Save"}
        </Button>
      </div>
    </form>
  );
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface UsersTabProps {
  profiles: Profile[];
}

export function UsersTab({ profiles }: UsersTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const handleSubmit = (data: ProfileAdminUpdateData) => {
    startTransition(async () => {
      const result = await updateProfileAdminAction(data);
      if (!result.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "User updated successfully." });
      setEditingProfile(null);
    });
  };

  // Sort: admins first, then by name
  const sorted = [...profiles].sort((a, b) => {
    const roleOrder: UserRole[] = [
      "admin",
      "support_lead",
      "support_member",
      "client",
    ];
    const diff = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
    if (diff !== 0) return diff;
    return a.full_name.localeCompare(b.full_name);
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Users</CardTitle>
          <CardDescription>
            Manage user roles and team assignments. To add or remove users, use
            the Supabase Auth dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {profile.full_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {profile.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_BADGE_VARIANTS[profile.role]}>
                      {ROLE_LABELS[profile.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingProfile(profile)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={editingProfile !== null}
        onOpenChange={(open) => !open && setEditingProfile(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingProfile && (
            <EditProfileForm
              profile={editingProfile}
              onSubmit={handleSubmit}
              isPending={isPending}
              onCancel={() => setEditingProfile(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
