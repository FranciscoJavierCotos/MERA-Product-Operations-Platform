import { api } from "@/lib/api-client";
import type { ProjectDashboardCard } from "@/lib/supabase/queries/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  CalendarDays,
  User,
  Building2,
  ArrowRight,
  Zap,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ProgressBar({
  value,
  max,
  colorClass,
  glowClass,
}: {
  value: number;
  max: number;
  colorClass: string;
  glowClass?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-transparent dark:progress-track overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", colorClass, glowClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MethodologyBadge({ methodology }: { methodology: string }) {
  const styles: Record<string, string> = {
    scrum: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    kanban: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    waterfall: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
        styles[methodology] ?? "bg-gray-100 text-gray-600 dark:bg-muted dark:text-gray-400",
      )}
    >
      {methodology}
    </span>
  );
}

function ProjectCard({ project }: { project: ProjectDashboardCard }) {
  const sprint = project.activeSprint;
  const days = sprint ? daysRemaining(sprint.end_date) : null;
  const itemPct =
    sprint && sprint.total_items > 0
      ? Math.round((sprint.done_items / sprint.total_items) * 100)
      : 0;
  const pointPct =
    sprint && sprint.total_points > 0
      ? Math.round((sprint.done_points / sprint.total_points) * 100)
      : 0;

  const daysColor =
    days === null
      ? "text-gray-400"
      : days < 0
        ? "text-red-600"
        : days <= 3
          ? "text-orange-600"
          : "text-gray-500";

  return (
    <Link
      href={`/projects/${project.key}`}
      className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <div className="h-full border border-gray-200 dark:border-border/70 rounded-xl p-4 bg-white dark:bg-card hover:border-primary-300 dark:hover:border-primary/60 hover:shadow-sm dark:magnetic transition-all flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 text-[11px] font-bold tracking-widest text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary/10 border border-primary-200 dark:border-primary/30 rounded px-1.5 py-0.5 dark:shadow-[inset_0_0_8px_-2px_hsl(var(--primary)/0.4)]">
              {project.key}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
              {project.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <MethodologyBadge methodology={project.methodology} />
            <ArrowRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-primary-400 transition-colors" />
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {project.lead && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {project.lead.full_name}
            </span>
          )}
          {project.team && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {project.team.name}
            </span>
          )}
        </div>

        {/* Sprint section */}
        {sprint ? (
          <div className="flex flex-col gap-2.5 pt-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-200">
                <Zap className="h-3 w-3 text-primary dark:drop-shadow-[0_0_6px_hsl(var(--primary)/0.65)]" />
                {sprint.name}
              </span>
              <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                <CalendarDays className="h-3 w-3" />
                {formatDateShort(sprint.start_date)} –{" "}
                {formatDateShort(sprint.end_date)}
              </span>
            </div>

            {/* Items progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>Items</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {sprint.done_items} / {sprint.total_items}
                  <span className="ml-1 text-gray-400 dark:text-gray-500">({itemPct}%)</span>
                </span>
              </div>
              <ProgressBar
                value={sprint.done_items}
                max={sprint.total_items}
                colorClass="bg-primary"
                glowClass="dark:progress-fill-primary"
              />
            </div>

            {/* Story points — only if any exist */}
            {sprint.total_points > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>Story pts</span>
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {sprint.done_points} / {sprint.total_points}
                    <span className="ml-1 text-gray-400 dark:text-gray-500">({pointPct}%)</span>
                  </span>
                </div>
                <ProgressBar
                  value={sprint.done_points}
                  max={sprint.total_points}
                  colorClass="bg-emerald-500"
                  glowClass="dark:progress-fill-success"
                />
              </div>
            )}

            {/* Days remaining */}
            {days !== null && (
              <div
                className={cn(
                  "flex items-center gap-1 text-[11px] font-medium",
                  daysColor,
                )}
              >
                <Clock className="h-3 w-3" />
                {days < 0
                  ? `${Math.abs(days)}d overdue`
                  : days === 0
                    ? "Ends today"
                    : `${days}d remaining`}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic pt-0.5">No active sprint</p>
        )}
      </div>
    </Link>
  );
}

export async function ProjectsOverviewWidget() {
  const projects = await api.get<ProjectDashboardCard[]>("/projects/active");

  if (projects.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base dark:tracking-tight">
            <Layers className="h-4 w-4 text-primary dark:drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
            Active Projects
          </CardTitle>
          <div className="hidden dark:block flex-1 holo-divider" />
          <Link
            href="/projects"
            className="text-xs text-primary hover:text-primary-800 dark:hover:text-primary-200 font-medium flex items-center gap-0.5 shrink-0"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
