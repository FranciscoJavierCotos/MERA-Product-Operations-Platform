"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LookupTableManager } from "./lookup-table-manager";
import {
  tagSchema,
  type TagFormData,
} from "@/lib/validations/settings.schema";
import {
  createTagAction,
  updateTagAction,
  deleteTagAction,
} from "../actions";
import type { TicketTagRow } from "@/types/ticket.types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Tag Form ──────────────────────────────────────────────────────────────────

function TagForm({
  initialValues,
  onSubmit,
  isPending,
  onCancel,
}: {
  initialValues?: Partial<TicketTagRow>;
  onSubmit: (data: Omit<TicketTagRow, "id">) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      slug: initialValues?.slug ?? "",
      color_class:
        initialValues?.color_class ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    },
  });

  const nameValue = watch("name");

  // Auto-derive slug from name when creating (not editing)
  useEffect(() => {
    if (!initialValues?.slug) {
      setValue("slug", toSlug(nameValue));
    }
  }, [nameValue, initialValues?.slug, setValue]);

  return (
    <form
      onSubmit={handleSubmit((d) => onSubmit(d as Omit<TicketTagRow, "id">))}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="tag-name">Name</Label>
          <Input id="tag-name" placeholder="e.g. Performance" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="tag-slug">Slug</Label>
          <Input id="tag-slug" placeholder="e.g. performance" {...register("slug")} />
          {errors.slug && (
            <p className="text-xs text-red-600">{errors.slug.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="tag-color">Tailwind color classes</Label>
        <Input
          id="tag-color"
          placeholder="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
          {...register("color_class")}
        />
        {errors.color_class && (
          <p className="text-xs text-red-600">{errors.color_class.message}</p>
        )}
        <p className="text-xs text-gray-500">
          Use Tailwind background and text classes, e.g.{" "}
          <code className="font-mono">bg-blue-100 text-blue-800</code>
        </p>
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

interface TagsTabProps {
  tags: TicketTagRow[];
}

export function TagsTab({ tags }: TagsTabProps) {
  return (
    <LookupTableManager<TicketTagRow>
      title="Tags"
      description="Labels that can be applied to tickets for filtering and organisation."
      rows={tags}
      columns={[
        { header: "Name", render: (r) => r.name },
        { header: "Slug", render: (r) => <code className="text-xs">{r.slug}</code> },
        {
          header: "Color preview",
          render: (r) => (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.color_class}`}
            >
              {r.name}
            </span>
          ),
        },
      ]}
      FormComponent={TagForm}
      onAdd={(data) => createTagAction(data)}
      onEdit={(data) => updateTagAction(data)}
      onDelete={(id) => deleteTagAction(id)}
    />
  );
}
