"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Users,
  Building2,
  Headset,
  Code2,
  Search,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Crown,
} from "lucide-react";
import { apiBrowser } from "@/lib/api-client-browser";
import type { TeamMember } from "@/types/team.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/lib/hooks/use-toast";
import {
  teamSchema,
  type TeamFormData,
} from "@/lib/validations/settings.schema";
import type { Team, TeamType } from "@/types/team.types";
import {
  isBusinessTeam,
  isSupportTeam,
  isEngineeringTeam,
} from "@/types/team.types";
import {
  createTeamAction,
  updateTeamAction,
  deleteTeamAction,
} from "../actions";

interface TeamsListClientProps {
  initialTeams: Team[];
}

const SUPPORT_LEVEL_COLORS: Record<string, string> = {
  L1: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  L2: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  L3: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

// ── Team Form ─────────────────────────────────────────────────────────────────

function TeamForm({
  initialValues,
  onSubmit,
  isPending,
  onCancel,
}: {
  initialValues?: Partial<Team>;
  onSubmit: (data: TeamFormData) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      team_type: initialValues?.team_type ?? "support",
      support_level:
        initialValues?.support_level ??
        (initialValues?.team_type === "support" ? "L1" : "L3"),
    },
  });

  const teamType = watch("team_type") as TeamType | undefined;
  const isSupport = teamType === "support";

  const handleFormSubmit = (data: TeamFormData) => {
    // Business and engineering teams are always L3
    if (data.team_type !== "support") {
      data.support_level = "L3";
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="team-name">Team name</Label>
        <Input
          id="team-name"
          placeholder="e.g. Finance, L1 Help Desk, Platform Squad"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="team-desc">Description</Label>
        <Textarea
          id="team-desc"
          rows={2}
          placeholder="Optional description"
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Type</Label>
          <Controller
            control={control}
            name="team_type"
            render={({ field }) => (
              <Select
                value={field.value ?? "support"}
                onValueChange={(v) => {
                  field.onChange(v);
                  if (v === "support") setValue("support_level", "L1");
                  else setValue("support_level", "L3");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.team_type && (
            <p className="text-xs text-red-600">{errors.team_type.message}</p>
          )}
        </div>

        {isSupport && (
          <div className="space-y-1">
            <Label>Support Level</Label>
            <Controller
              control={control}
              name="support_level"
              render={({ field }) => (
                <Select
                  value={field.value ?? "L1"}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L1">L1 – Support Desk</SelectItem>
                    <SelectItem value="L2">L2 – Technical</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.support_level && (
              <p className="text-xs text-red-600">
                {errors.support_level.message}
              </p>
            )}
          </div>
        )}
      </div>

      {!isSupport && (
        <p className="text-xs text-gray-500">
          {teamType === "business" ? "Business" : "Engineering"} teams are
          classified as Level 3.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

// ── Team Card ─────────────────────────────────────────────────────────────────

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function TeamCard({
  team,
  onEdit,
  onDelete,
}: {
  team: Team;
  onEdit: (t: Team) => void;
  onDelete: (t: Team) => void;
}) {
  const level = team.support_level;
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [fetched, setFetched] = useState(false);

  const toggleExpand = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !expanded;
    setExpanded(next);
    if (next && !fetched) {
      setLoadingMembers(true);
      try {
        const data = await apiBrowser.get<TeamMember[]>(`/teams/${team.id}/members`);
        setMembers(data);
      } catch {
        // silently fail — empty state shown
      } finally {
        setLoadingMembers(false);
        setFetched(true);
      }
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-lg border bg-white dark:bg-gray-900",
        "shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-150",
        "dark:border-gray-800 dark:hover:border-primary/40",
      )}
    >
      {/* Card header row */}
      <div className="flex items-start justify-between p-5">
        <Link href={`/teams/${team.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {team.name}
            </span>
            {level && (
              <span
                className={cn(
                  "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
                  SUPPORT_LEVEL_COLORS[level] ?? "bg-gray-100 text-gray-700",
                )}
              >
                {level}
              </span>
            )}
          </div>
          {team.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {team.description}
            </p>
          )}
        </Link>

        <div className="flex items-center gap-0.5 ml-3 flex-shrink-0">
          {/* Inline edit button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 cursor-pointer"
            aria-label="Edit team"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(team);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          {/* Delete dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => onDelete(team)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Expand toggle */}
          <button
            onClick={toggleExpand}
            aria-label={expanded ? "Collapse members" : "Expand members"}
            aria-expanded={expanded}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-md cursor-pointer",
              "text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800",
              "transition-colors duration-150",
            )}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                expanded && "rotate-90",
              )}
            />
          </button>
        </div>
      </div>

      {/* Expandable members section */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
          {loadingMembers ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-primary" />
              Loading members…
            </div>
          ) : members.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              No members yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800/60 px-2.5 py-1.5"
                  >
                    {m.user?.avatar_url ? (
                      <img
                        src={m.user.avatar_url}
                        alt={m.user.full_name}
                        className="h-5 w-5 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[9px] font-semibold text-primary select-none">
                        {getInitials(m.user?.full_name)}
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate min-w-0 flex-1">
                      {m.user?.full_name ?? "Unknown"}
                    </span>
                    {m.role === "lead" && (
                      <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2.5">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        No {label} teams found.
      </p>
    </div>
  );
}

function TeamGrid({
  teams,
  emptyLabel,
  onEdit,
  onDelete,
}: {
  teams: Team[];
  emptyLabel: string;
  onEdit: (t: Team) => void;
  onDelete: (t: Team) => void;
}) {
  if (teams.length === 0) return <EmptyState label={emptyLabel} />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map((t) => (
        <TeamCard key={t.id} team={t} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TeamsListClient({ initialTeams }: TeamsListClientProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);

  const filtered = search.trim()
    ? initialTeams.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : initialTeams;

  const businessTeams = filtered.filter(isBusinessTeam);
  const supportTeams = filtered.filter(isSupportTeam);
  const engTeams = filtered.filter(isEngineeringTeam);

  const openAddDialog = () => {
    setEditingTeam(null);
    setDialogOpen(true);
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTeam(null);
  };

  const handleSubmit = (data: TeamFormData) => {
    startTransition(async () => {
      const result = editingTeam
        ? await updateTeamAction({ id: editingTeam.id, ...data })
        : await createTeamAction(data);

      if (!result.ok) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: editingTeam ? "Team updated" : "Team created",
        description: `"${data.name}" ${editingTeam ? "updated" : "created"} successfully.`,
      });
      closeDialog();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteTeamAction(deleteTarget.id);
      if (!result.ok) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({ title: "Team deleted" });
      }
      setDeleteTarget(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search teams…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openAddDialog} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Team
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            All
            <Badge variant="secondary" className="ml-1">{filtered.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Business
            <Badge variant="secondary" className="ml-1">{businessTeams.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-1.5">
            <Headset className="h-3.5 w-3.5" />
            Support
            <Badge variant="secondary" className="ml-1">{supportTeams.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="engineering" className="gap-1.5">
            <Code2 className="h-3.5 w-3.5" />
            Engineering
            <Badge variant="secondary" className="ml-1">{engTeams.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <TeamGrid teams={filtered} emptyLabel="" onEdit={openEditDialog} onDelete={setDeleteTarget} />
        </TabsContent>

        <TabsContent value="business" className="mt-4">
          <TeamGrid teams={businessTeams} emptyLabel="business" onEdit={openEditDialog} onDelete={setDeleteTarget} />
        </TabsContent>

        <TabsContent value="support" className="mt-4">
          {supportTeams.length === 0 ? (
            <EmptyState label="support" />
          ) : (
            <div className="space-y-6">
              {(["L1", "L2"] as const).map((lvl) => {
                const lvlTeams = supportTeams.filter((t) => t.support_level === lvl);
                if (lvlTeams.length === 0) return null;
                const lvlLabel =
                  lvl === "L1" ? "Level 1 – Support Desk" : "Level 2 – Technical Support";
                return (
                  <div key={lvl}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                      {lvlLabel}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {lvlTeams.map((t) => (
                        <TeamCard key={t.id} team={t} onEdit={openEditDialog} onDelete={setDeleteTarget} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="engineering" className="mt-4">
          <TeamGrid teams={engTeams} emptyLabel="engineering" onEdit={openEditDialog} onDelete={setDeleteTarget} />
        </TabsContent>
      </Tabs>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit Team" : "New Team"}</DialogTitle>
          </DialogHeader>
          <TeamForm
            initialValues={editingTeam ?? undefined}
            onSubmit={handleSubmit}
            isPending={isPending}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete team?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete{" "}
            <span className="font-medium">{deleteTarget?.name}</span>? This cannot
            be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
