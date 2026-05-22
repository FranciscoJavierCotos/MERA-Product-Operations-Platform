"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  updateProjectAction,
  archiveProjectAction,
} from "@/app/(dashboard)/projects/actions";
import type { Project } from "@/types/project.types";
import type { Team } from "@/types/team.types";
import type { Profile } from "@/types/user.types";

interface Props {
  project: Project;
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

export function ProjectSettingsClient({ project, teams, leadCandidates }: Props) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [teamId, setTeamId] = useState<string>(project.team_id ?? NO_TEAM);
  const [leadId, setLeadId] = useState<string>(project.lead_id ?? NO_LEAD);
  const [sprintDurationWeeks, setSprintDurationWeeks] = useState<number>(
    project.sprint_duration_weeks ?? 2,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateProjectAction(project.id, {
        name,
        description: description || null,
        team_id: teamId === NO_TEAM ? null : teamId,
        lead_id: leadId === NO_LEAD ? null : leadId,
        sprint_duration_weeks: sprintDurationWeeks,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onArchive = () => {
    if (!confirm("Archive this project? It will be hidden from active lists.")) return;
    startTransition(async () => {
      const result = await archiveProjectAction(project.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/projects");
    });
  };

  return (
    <div className="max-w-2xl rounded-lg border bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold">Project settings</h2>

      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Team</Label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEAM}>— None —</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Lead</Label>
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LEAD}>— None —</SelectItem>
              {leadCandidates.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sprint duration — only relevant for Scrum */}
      {project.methodology === "scrum" && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Scrum settings</h3>
          <div className="max-w-xs">
            <Label htmlFor="sprint-duration">Sprint duration</Label>
            <Select
              value={String(sprintDurationWeeks)}
              onValueChange={(v) => setSprintDurationWeeks(Number(v))}
            >
              <SelectTrigger id="sprint-duration"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPRINT_DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              When creating a sprint, picking a start date will automatically fill the end
              date based on this duration.
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="destructive"
          onClick={onArchive}
          disabled={isPending || project.status === "archived"}
        >
          Archive project
        </Button>
        <Button onClick={onSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
