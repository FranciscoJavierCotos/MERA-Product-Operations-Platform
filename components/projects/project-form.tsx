"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { projectSchema, type ProjectFormData } from "@/lib/validations/project.schema";
import { createProjectAction } from "@/app/(dashboard)/projects/actions";
import type { Team } from "@/types/team.types";
import type { Profile } from "@/types/user.types";

interface Props {
  teams: Team[];
  leadCandidates: Profile[];
}

const NO_TEAM = "__none__";
const NO_LEAD = "__none__";

const SPRINT_DURATION_OPTIONS = [
  { value: 1, label: "1 week" },
  { value: 2, label: "2 weeks" },
  { value: 3, label: "3 weeks" },
  { value: 4, label: "4 weeks" },
] as const;

export function ProjectForm({ teams, leadCandidates }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { methodology: "scrum", sprint_duration_weeks: 2 },
  });

  const methodology = watch("methodology") ?? "scrum";
  const sprintDurationWeeks = watch("sprint_duration_weeks") ?? 2;

  const onSubmit = (data: ProjectFormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createProjectAction(data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/projects/${result.data.key}`);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <Label htmlFor="key">Key *</Label>
          <Input
            id="key"
            placeholder="MOB"
            maxLength={10}
            {...register("key")}
            className="font-mono uppercase"
          />
          {errors.key && <p className="text-xs text-red-600 mt-1">{errors.key.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" placeholder="Mobile App" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...register("description")} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Methodology</Label>
          <Select
            value={methodology}
            onValueChange={(v) => setValue("methodology", v as ProjectFormData["methodology"])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scrum">Scrum</SelectItem>
              <SelectItem value="kanban" disabled>Kanban (soon)</SelectItem>
              <SelectItem value="waterfall" disabled>Waterfall (soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {methodology === "scrum" && (
          <div>
            <Label>Sprint duration</Label>
            <Select
              value={String(sprintDurationWeeks)}
              onValueChange={(v) => setValue("sprint_duration_weeks", Number(v) as 1 | 2 | 3 | 4)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPRINT_DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Used to auto-fill end dates when creating sprints.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Team</Label>
          <Select
            onValueChange={(v) => setValue("team_id", v === NO_TEAM ? null : v)}
            defaultValue={NO_TEAM}
          >
            <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEAM}>— None —</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Project lead</Label>
          <Select
            onValueChange={(v) => setValue("lead_id", v === NO_LEAD ? null : v)}
            defaultValue={NO_LEAD}
          >
            <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LEAD}>— None —</SelectItem>
              {leadCandidates.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
