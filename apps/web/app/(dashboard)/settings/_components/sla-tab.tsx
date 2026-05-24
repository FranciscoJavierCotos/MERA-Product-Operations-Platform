"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/hooks/use-toast";
import {
  slaPolicySchema,
  type SlaPolicyFormData,
} from "@/lib/validations/settings.schema";
import {
  createSlaPolicyAction,
  updateSlaPolicyAction,
  deleteSlaPolicyAction,
} from "../actions";
import type { SlaPolicy } from "@/types/sla.types";
import type { TicketPriorityRow } from "@/types/ticket.types";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// â”€â”€ SLA Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SlaForm({
  initialValues,
  priorities,
  onSubmit,
  isPending,
  onCancel,
}: {
  initialValues?: Partial<SlaPolicy>;
  priorities: TicketPriorityRow[];
  onSubmit: (data: SlaPolicyFormData) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SlaPolicyFormData>({
    resolver: zodResolver(slaPolicySchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      priority_id: initialValues?.priority_id ?? priorities[0]?.id ?? 1,
      response_time_minutes: initialValues?.response_time_minutes ?? 60,
      resolution_time_minutes: initialValues?.resolution_time_minutes ?? 480,
      is_active: initialValues?.is_active ?? true,
    },
  });

  const isActive = watch("is_active");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="sla-name">Policy name</Label>
        <Input id="sla-name" placeholder="e.g. Standard SLA" {...register("name")} />
        {errors.name && (
          <p className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Priority</Label>
        <Select
          defaultValue={String(initialValues?.priority_id ?? priorities[0]?.id ?? 1)}
          onValueChange={(v) => setValue("priority_id", Number(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.priority_id && (
          <p className="text-xs text-red-600">{errors.priority_id.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="sla-response">Response time (minutes)</Label>
          <Input
            id="sla-response"
            type="number"
            min={1}
            {...register("response_time_minutes")}
          />
          {errors.response_time_minutes && (
            <p className="text-xs text-red-600">
              {errors.response_time_minutes.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="sla-resolution">Resolution time (minutes)</Label>
          <Input
            id="sla-resolution"
            type="number"
            min={1}
            {...register("resolution_time_minutes")}
          />
          {errors.resolution_time_minutes && (
            <p className="text-xs text-red-600">
              {errors.resolution_time_minutes.message}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          id="sla-active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setValue("is_active", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-ring"
        />
        <Label htmlFor="sla-active">Active</Label>
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

interface SlaTabProps {
  policies: SlaPolicy[];
  priorities: TicketPriorityRow[];
}

export function SlaTab({ policies, priorities }: SlaTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicy | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const priorityMap = Object.fromEntries(priorities.map((p) => [p.id, p]));

  const openAddDialog = () => {
    setEditingPolicy(null);
    setDialogOpen(true);
  };

  const openEditDialog = (policy: SlaPolicy) => {
    setEditingPolicy(policy);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPolicy(null);
  };

  const handleSubmit = (data: SlaPolicyFormData) => {
    startTransition(async () => {
      const result = editingPolicy
        ? await updateSlaPolicyAction({ id: editingPolicy.id, ...data })
        : await createSlaPolicyAction(data);

      if (!result.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({
        title: editingPolicy ? "Policy updated" : "Policy created",
        description: `"${data.name}" ${editingPolicy ? "updated" : "created"} successfully.`,
      });
      closeDialog();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteSlaPolicyAction(id);
      if (!result.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Policy deleted" });
      }
      setConfirmDeleteId(null);
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">SLA Policies</CardTitle>
            <CardDescription className="mt-1">
              Define response and resolution time targets per priority level.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openAddDialog} className="gap-1">
            <Plus className="h-4 w-4" />
            Add Policy
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-6 text-center text-sm text-gray-500"
                  >
                    No SLA policies yet. Click Add Policy to create one.
                  </TableCell>
                </TableRow>
              ) : (
                policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.name}</TableCell>
                    <TableCell>
                      {priorityMap[policy.priority_id] ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityMap[policy.priority_id].color_class}`}
                        >
                          {priorityMap[policy.priority_id].label}
                        </span>
                      ) : (
                        <span className="text-gray-400">â€”</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatMinutes(policy.response_time_minutes)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatMinutes(policy.resolution_time_minutes)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={policy.is_active ? "default" : "secondary"}>
                        {policy.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {confirmDeleteId === policy.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-600">Delete?</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={isPending}
                            onClick={() => handleDelete(policy.id)}
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
                              onClick={() => openEditDialog(policy)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => setConfirmDeleteId(policy.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? "Edit SLA Policy" : "New SLA Policy"}
            </DialogTitle>
          </DialogHeader>
          <SlaForm
            initialValues={editingPolicy ?? undefined}
            priorities={priorities}
            onSubmit={handleSubmit}
            isPending={isPending}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
