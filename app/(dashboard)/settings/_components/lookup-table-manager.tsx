"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { useToast } from "@/hooks/use-toast";
import type { ActionResult } from "../actions";

export interface ColumnDef<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

export interface LookupTableManagerProps<T extends { id: number }> {
  title: string;
  description?: string;
  rows: T[];
  columns: ColumnDef<T>[];
  FormComponent: React.ComponentType<{
    initialValues?: Partial<T>;
    onSubmit: (data: Omit<T, "id">) => void;
    isPending: boolean;
    onCancel: () => void;
  }>;
  onAdd: (data: Omit<T, "id">) => Promise<ActionResult<T>>;
  onEdit: (data: Partial<T> & { id: number }) => Promise<ActionResult<T>>;
  onDelete: (id: number) => Promise<ActionResult<void>>;
}

export function LookupTableManager<T extends { id: number }>({
  title,
  description,
  rows,
  columns,
  FormComponent,
  onAdd,
  onEdit,
  onDelete,
}: LookupTableManagerProps<T>) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<T | null>(null);

  // Inline delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const openAddDialog = () => {
    setEditingRow(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: T) => {
    setEditingRow(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRow(null);
  };

  const handleFormSubmit = (data: Omit<T, "id">) => {
    startTransition(async () => {
      const result = editingRow
        ? await onEdit({ ...data, id: editingRow.id } as Partial<T> & { id: number })
        : await onAdd(data);

      if (!result.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({
        title: editingRow ? "Updated" : "Created",
        description: `${title.replace(/s$/, "")} ${editingRow ? "updated" : "created"} successfully.`,
      });
      closeDialog();
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      const result = await onDelete(id);
      if (!result.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Deleted", description: "Item removed successfully." });
      }
      setConfirmDeleteId(null);
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && (
            <CardDescription className="mt-1">{description}</CardDescription>
          )}
        </div>
        <Button size="sm" onClick={openAddDialog} className="gap-1">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.header}>{col.header}</TableHead>
              ))}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="py-6 text-center text-sm text-gray-500"
                >
                  No items yet. Click Add to create one.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((col) => (
                    <TableCell key={col.header}>{col.render(row)}</TableCell>
                  ))}
                  <TableCell>
                    {confirmDeleteId === row.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600">Delete?</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          disabled={isPending}
                          onClick={() => handleDelete(row.id)}
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
                          <DropdownMenuItem onClick={() => openEditDialog(row)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setConfirmDeleteId(row.id)}
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRow ? `Edit ${title.replace(/s$/, "")}` : `New ${title.replace(/s$/, "")}`}
            </DialogTitle>
          </DialogHeader>
          <FormComponent
            initialValues={editingRow ?? undefined}
            onSubmit={handleFormSubmit}
            isPending={isPending}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
