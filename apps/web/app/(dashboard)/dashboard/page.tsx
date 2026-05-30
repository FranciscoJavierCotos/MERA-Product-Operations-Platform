import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api-client";
import type { DashboardStats } from "@/lib/supabase/queries/dashboard";
import type { TaskWithRelations } from "@/types/task.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Ticket,
  CheckSquare,
  AlertCircle,
  Building2,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/date";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { TemperatureBadge } from "@/components/shared/temperature-badge";
import { formatTicketNumber } from "@/lib/utils/format";
import { sortTicketsForList } from "@/lib/utils/ticketSort";
import Link from "next/link";
import { DashboardUpcomingTasks } from "./dashboard-upcoming-tasks";
import { UrgentSlasWidget } from "./urgent-slas-widget";
import { AtRiskCompaniesWidget } from "./at-risk-companies-widget";
import { HotTicketsWidget } from "./hot-tickets-widget";
import { ProjectsOverviewWidget } from "./projects-overview-widget";
import { cn } from "@/lib/utils/cn";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function formatDashboardDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/* ── KPI Card ────────────────────────────────────────────────────────────── */

type Severity = "critical" | "warning" | "hot" | "info" | "neutral";

const severityStyles: Record<
  Severity,
  { border: string; iconBg: string; iconColor: string; valueColor: string }
> = {
  critical: {
    border: "border-l-red-500",
    iconBg: "bg-red-50 dark:bg-red-500/10",
    iconColor: "text-red-500",
    valueColor: "text-red-600 dark:text-red-400",
  },
  warning: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-500",
    valueColor: "text-amber-600 dark:text-amber-400",
  },
  hot: {
    border: "border-l-orange-500",
    iconBg: "bg-orange-50 dark:bg-orange-500/10",
    iconColor: "text-orange-500",
    valueColor: "text-orange-600 dark:text-orange-400",
  },
  info: {
    border: "border-l-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-500",
    valueColor: "text-blue-600 dark:text-blue-400",
  },
  neutral: {
    border: "border-l-primary",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    valueColor: "text-foreground",
  },
};

function KpiCard({
  label,
  value,
  sub,
  icon,
  severity,
  subAlert,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  severity: Severity;
  subAlert?: boolean;
}) {
  const s = severityStyles[severity];
  return (
    <Card className={cn("border-l-4 overflow-hidden", s.border)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </p>
            <p
              className={cn(
                "text-3xl font-bold tabular-nums mt-1 leading-none",
                s.valueColor,
              )}
            >
              {value}
            </p>
            <p
              className={cn(
                "text-xs mt-1.5",
                subAlert
                  ? "text-red-600 dark:text-red-400 font-medium"
                  : "text-muted-foreground",
              )}
            >
              {sub}
            </p>
          </div>
          <div className={cn("p-2 rounded-lg shrink-0", s.iconBg)}>
            <span className={s.iconColor}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Section header ──────────────────────────────────────────────────────── */

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {label}
      </h2>
      <div className="flex-1 border-t border-border/60" />
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [stats, recentTickets, upcomingTasks] = await Promise.all([
    api.get<DashboardStats>("/dashboard/stats"),
    api.get<any[]>("/dashboard/recent-tickets", { limit: 5 }),
    api.get<TaskWithRelations[]>("/tasks/upcoming", { days: 7 }),
  ]);

  const recentTicketsSorted = sortTicketsForList(recentTickets ?? []);

  const now = new Date();
  const overdueTasks =
    upcomingTasks?.filter((t) => t.due_date && new Date(t.due_date) < now)
      .length || 0;

  const firstName = user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Good {getGreeting()}, {firstName}. Here&apos;s what needs your
            attention today.
          </p>
        </div>
        <p className="text-sm text-muted-foreground hidden sm:block shrink-0 pt-0.5">
          {formatDashboardDate()}
        </p>
      </div>

      {/* ── 5 KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          severity="critical"
          label="Breached SLAs"
          value={stats.breachedSlas}
          sub={stats.breachedSlas > 0 ? "Needs immediate action" : "None breached"}
          icon={<AlertCircle className="h-5 w-5" />}
        />
        <KpiCard
          severity="warning"
          label="At-Risk Accounts"
          value={stats.atRiskCompanies}
          sub={stats.atRiskCompanies > 0 ? "Critical or at-risk" : "All healthy"}
          icon={<Building2 className="h-5 w-5" />}
        />
        <KpiCard
          severity="hot"
          label="Hot Tickets"
          value={stats.hotTickets}
          sub={stats.hotTickets > 0 ? "Client temp: hot" : "No hot tickets"}
          icon={<Flame className="h-5 w-5" />}
        />
        <KpiCard
          severity="info"
          label="Open Tickets"
          value={stats.openTickets}
          sub={`${stats.totalTickets} total`}
          icon={<Ticket className="h-5 w-5" />}
        />
        <KpiCard
          severity={overdueTasks > 0 ? "warning" : "neutral"}
          label="My Tasks"
          value={stats.myTasks}
          sub={overdueTasks > 0 ? `${overdueTasks} overdue` : "All on track"}
          subAlert={overdueTasks > 0}
          icon={<CheckSquare className="h-5 w-5" />}
        />
      </div>

      {/* ── Needs Attention ── */}
      <div>
        <SectionHeader label="Needs Attention" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <UrgentSlasWidget />
          <AtRiskCompaniesWidget />
          <HotTicketsWidget />
        </div>
      </div>

      {/* ── Active Projects ── */}
      <ProjectsOverviewWidget />

      {/* ── Recent Tickets + Upcoming Tasks ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        {/* Recent Tickets */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Recent Tickets
              </CardTitle>
              <Link
                href="/tickets"
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0.5">
              {recentTickets && recentTickets.length > 0 ? (
                recentTicketsSorted.map((ticket: any) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.id}`}
                    className="flex items-center justify-between gap-3 py-2 px-2 hover:bg-muted/50 rounded-md -mx-2 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-xs font-mono text-muted-foreground tabular-nums">
                        {formatTicketNumber(ticket.ticket_number)}
                      </span>
                      <span className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {ticket.title}
                      </span>
                      <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">
                        {ticket.assigned_user?.full_name || "Unassigned"}
                        {" · "}
                        {formatRelativeTime(ticket.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <TemperatureBadge
                        temperature={ticket.client_temperature}
                        showLabel={false}
                      />
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="text-sm">No recent tickets</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <DashboardUpcomingTasks
          userId={user.id}
          initialTasks={upcomingTasks || []}
        />
      </div>
    </div>
  );
}
