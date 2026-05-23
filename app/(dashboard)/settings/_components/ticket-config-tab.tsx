"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
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
import { LookupTableManager } from "./lookup-table-manager";
import {
  ticketStatusSchema,
  ticketPrioritySchema,
  ticketCategorySchema,
  type TicketStatusFormData,
  type TicketPriorityFormData,
  type TicketCategoryFormData,
} from "@/lib/validations/settings.schema";
import {
  createTicketStatusAction,
  updateTicketStatusAction,
  deleteTicketStatusAction,
  createTicketPriorityAction,
  updateTicketPriorityAction,
  deleteTicketPriorityAction,
  createTicketCategoryAction,
  updateTicketCategoryAction,
  deleteTicketCategoryAction,
} from "../actions";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
} from "@/types/ticket.types";

// ── Status Form ───────────────────────────────────────────────────────────────

function StatusForm({
  initialValues,
  onSubmit,
  isPending,
  onCancel,
}: {
  initialValues?: Partial<TicketStatusRow>;
  onSubmit: (data: Omit<TicketStatusRow, "id">) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TicketStatusFormData>({
    resolver: zodResolver(ticketStatusSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      label: initialValues?.label ?? "",
      badge_variant:
        (initialValues?.badge_variant as TicketStatusFormData["badge_variant"]) ??
        "secondary",
      is_final: initialValues?.is_final ?? false,
      display_order: initialValues?.display_order ?? 10,
    },
  });

  const isFinal = watch("is_final");

  return (
    <form
      onSubmit={handleSubmit((d) => onSubmit(d as Omit<TicketStatusRow, "id">))}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="status-name">Name (slug)</Label>
          <Input id="status-name" placeholder="e.g. in_progress" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="status-label">Label</Label>
          <Input id="status-label" placeholder="e.g. In Progress" {...register("label")} />
          {errors.label && <p className="text-xs text-red-600">{errors.label.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Badge variant</Label>
          <Select
            defaultValue={initialValues?.badge_variant ?? "secondary"}
            onValueChange={(v) =>
              setValue("badge_variant", v as TicketStatusFormData["badge_variant"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["default", "secondary", "destructive", "outline"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="status-order">Display order</Label>
          <Input
            id="status-order"
            type="number"
            min={1}
            max={999}
            {...register("display_order")}
          />
          {errors.display_order && (
            <p className="text-xs text-red-600">{errors.display_order.message}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          id="is-final"
          type="checkbox"
          checked={isFinal}
          onChange={(e) => setValue("is_final", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <Label htmlFor="is-final">Final status (closes the ticket)</Label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

// ── Priority Form ─────────────────────────────────────────────────────────────

function PriorityForm({
  initialValues,
  onSubmit,
  isPending,
  onCancel,
}: {
  initialValues?: Partial<TicketPriorityRow>;
  onSubmit: (data: Omit<TicketPriorityRow, "id">) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketPriorityFormData>({
    resolver: zodResolver(ticketPrioritySchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      label: initialValues?.label ?? "",
      color_class: initialValues?.color_class ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      display_order: initialValues?.display_order ?? 10,
    },
  });

  return (
    <form
      onSubmit={handleSubmit((d) => onSubmit(d as Omit<TicketPriorityRow, "id">))}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="priority-name">Name (slug)</Label>
          <Input id="priority-name" placeholder="e.g. critical" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="priority-label">Label</Label>
          <Input id="priority-label" placeholder="e.g. Critical" {...register("label")} />
          {errors.label && <p className="text-xs text-red-600">{errors.label.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="priority-color">Tailwind color classes</Label>
        <Input
          id="priority-color"
          placeholder="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
          {...register("color_class")}
        />
        {errors.color_class && (
          <p className="text-xs text-red-600">{errors.color_class.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="priority-order">Display order</Label>
        <Input
          id="priority-order"
          type="number"
          min={1}
          max={999}
          {...register("display_order")}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

// ── Category Form ─────────────────────────────────────────────────────────────

function CategoryForm({
  initialValues,
  onSubmit,
  isPending,
  onCancel,
}: {
  initialValues?: Partial<TicketCategoryRow>;
  onSubmit: (data: Omit<TicketCategoryRow, "id">) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketCategoryFormData>({
    resolver: zodResolver(ticketCategorySchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      label: initialValues?.label ?? "",
      display_order: initialValues?.display_order ?? 10,
    },
  });

  return (
    <form
      onSubmit={handleSubmit((d) => onSubmit(d as Omit<TicketCategoryRow, "id">))}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="cat-name">Name (slug)</Label>
          <Input id="cat-name" placeholder="e.g. data_issue" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="cat-label">Label</Label>
          <Input id="cat-label" placeholder="e.g. Data Issue" {...register("label")} />
          {errors.label && <p className="text-xs text-red-600">{errors.label.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="cat-order">Display order</Label>
        <Input
          id="cat-order"
          type="number"
          min={1}
          max={999}
          {...register("display_order")}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

// ── Main Tab Component ────────────────────────────────────────────────────────

interface TicketConfigTabProps {
  statuses: TicketStatusRow[];
  priorities: TicketPriorityRow[];
  categories: TicketCategoryRow[];
}

export function TicketConfigTab({
  statuses,
  priorities,
  categories,
}: TicketConfigTabProps) {
  return (
    <div className="space-y-8">
      {/* Statuses */}
      <LookupTableManager<TicketStatusRow>
        title="Ticket Statuses"
        description="Define the lifecycle stages a ticket can be in."
        rows={statuses}
        columns={[
          { header: "Order", render: (r) => r.display_order },
          { header: "Name", render: (r) => <code className="text-xs">{r.name}</code> },
          { header: "Label", render: (r) => r.label },
          {
            header: "Badge",
            render: (r) => (
              <Badge variant={r.badge_variant as "default" | "secondary" | "destructive" | "outline"}>
                {r.label}
              </Badge>
            ),
          },
          {
            header: "Final",
            render: (r) =>
              r.is_final ? (
                <span className="text-xs font-medium text-green-700">Yes</span>
              ) : (
                <span className="text-xs text-gray-400">No</span>
              ),
          },
        ]}
        FormComponent={StatusForm}
        onAdd={(data) => createTicketStatusAction(data)}
        onEdit={(data) => updateTicketStatusAction(data)}
        onDelete={(id) => deleteTicketStatusAction(id)}
      />

      {/* Priorities */}
      <LookupTableManager<TicketPriorityRow>
        title="Ticket Priorities"
        description="Priority levels available when creating or updating tickets."
        rows={priorities}
        columns={[
          { header: "Order", render: (r) => r.display_order },
          { header: "Name", render: (r) => <code className="text-xs">{r.name}</code> },
          { header: "Label", render: (r) => r.label },
          {
            header: "Color preview",
            render: (r) => (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.color_class}`}>
                {r.label}
              </span>
            ),
          },
        ]}
        FormComponent={PriorityForm}
        onAdd={(data) => createTicketPriorityAction(data)}
        onEdit={(data) => updateTicketPriorityAction(data)}
        onDelete={(id) => deleteTicketPriorityAction(id)}
      />

      {/* Categories */}
      <LookupTableManager<TicketCategoryRow>
        title="Ticket Categories"
        description="Types of issues or requests that can be submitted."
        rows={categories}
        columns={[
          { header: "Order", render: (r) => r.display_order },
          { header: "Name", render: (r) => <code className="text-xs">{r.name}</code> },
          { header: "Label", render: (r) => r.label },
        ]}
        FormComponent={CategoryForm}
        onAdd={(data) => createTicketCategoryAction(data)}
        onEdit={(data) => updateTicketCategoryAction(data)}
        onDelete={(id) => deleteTicketCategoryAction(id)}
      />
    </div>
  );
}
