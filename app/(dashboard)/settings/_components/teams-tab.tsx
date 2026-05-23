"use client";

import { Fragment, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  teamSchema,
  type TeamFormData,
} from "@/lib/validations/settings.schema";
import {
  createTeamAction,
  updateTeamAction,
  deleteTeamAction,
} from "../actions";
import type { Team, TeamCategory } from "@/types/team.types";

const CATEGORY_LABELS: Record<TeamCategory, string> = {
  functional: "Functional",
  l1_support: "L1 Support",
  l2_technical: "L2 Technical",
  l3_engineering: "L3 Engineering",
};

const CATEGORY_ORDER: TeamCategory[] = [
  "l1_support",
  "l2_technical",
  "l3_engineering",
  "functional",
];

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
    setValue,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      category: initialValues?.category ?? "l1_support",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="team-name">Team name</Label>
        <Input id="team-name" placeholder="e.g. L1 Help Desk" {...register("name")} />
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
      <div className="space-y-1">
        <Label>Category</Label>
        <Select
          defaultValue={initialValues?.category ?? "l1_support"}
          onValueChange={(v) => setValue("category", v as TeamCategory)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ORDER.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-xs text-red-600">{errors.category.message}</p>
        )}
      </div>
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

// ── Main Component ────────────────────────────────────────────────────────────

interface TeamsTabProps {
  teams: Team[];
}

export function TeamsTab({ teams }: TeamsTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({
        title: editingTeam ? "Team updated" : "Team created",
        description: `"${data.name}" ${editingTeam ? "updated" : "created"} successfully.`,
      });
      closeDialog();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteTeamAction(id);
      if (!result.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Team deleted" });
      }
      setConfirmDeleteId(null);
    });
  };

  // Group teams by category
  const grouped = CATEGORY_ORDER.reduce<Record<TeamCategory, Team[]>>(
    (acc, cat) => {
      acc[cat] = teams.filter((t) => t.category === cat);
      return acc;
    },
    { l1_support: [], l2_technical: [], l3_engineering: [], functional: [] },
  );

  const populatedCategories = CATEGORY_ORDER.filter(
    (cat) => grouped[cat].length > 0,
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Teams</CardTitle>
            <CardDescription className="mt-1">
              Support and functional teams used for ticket routing and assignment.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openAddDialog} className="gap-1">
            <Plus className="h-4 w-4" />
            Add Team
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {populatedCategories.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              No teams yet. Click &ldquo;Add Team&rdquo; to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {populatedCategories.map((cat) => (
                  <Fragment key={cat}>
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={3}
                        className="bg-gray-50 py-2 px-4 border-y"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {CATEGORY_LABELS[cat]}
                        </span>
                      </TableCell>
                    </TableRow>
                    {grouped[cat].map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {team.description ?? "—"}
                        </TableCell>
                        <TableCell>
                          {confirmDeleteId === team.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600">Delete?</span>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                disabled={isPending}
                                onClick={() => handleDelete(team.id)}
                              >
                                Yes
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(team)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setConfirmDeleteId(team.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
    </>
  );
}
