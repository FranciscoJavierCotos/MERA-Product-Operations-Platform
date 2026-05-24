import { createClient } from "@/lib/supabase/server";
import {
  getDashboardStats,
  getRecentTickets,
} from "@/lib/supabase/queries/dashboard";
import { getUpcomingTasks } from "@/lib/supabase/queries/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard,
  Ticket,
  CheckSquare,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/date";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { TemperatureBadge } from "@/components/shared/temperature-badge";
import { formatTicketNumber } from "@/lib/utils/format";
import { sortTicketsForList } from "@/lib/utils/ticketSort";
import Link from "next/link";
import { DashboardUpcomingTasks } from "./dashboard-upcoming-tasks";
import { SlaSummaryWidget } from "./sla-summary-widget";
import { ProjectsOverviewWidget } from "./projects-overview-widget";
import { cn } from "@/lib/utils/cn";

function KpiCard({
  label,
  value,
  icon,
  accent,
  footer,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: "primary" | "cyan" | "green";
  footer?: React.ReactNode;
}) {
  const accentRing = {
    primary:
      "dark:before:bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.22),transparent_55%)] dark:hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_20px_44px_-22px_hsl(var(--primary)/0.55)]",
    cyan:
      "dark:before:bg-[radial-gradient(circle_at_top_right,hsl(var(--cyber-cyan)/0.18),transparent_55%)] dark:hover:shadow-[0_0_0_1px_hsl(var(--cyber-cyan)/0.3),0_20px_44px_-22px_hsl(var(--cyber-cyan)/0.45)]",
    green:
      "dark:before:bg-[radial-gradient(circle_at_top_right,hsl(142_70%_45%/0.18),transparent_55%)] dark:hover:shadow-[0_0_0_1px_hsl(142_70%_45%/0.3),0_20px_44px_-22px_hsl(142_70%_45%/0.45)]",
  }[accent];
  const iconAccent = {
    primary: "dark:text-primary-300 dark:drop-shadow-[0_0_8px_hsl(var(--primary)/0.55)]",
    cyan: "dark:text-cyan-300 dark:drop-shadow-[0_0_8px_hsl(var(--cyber-cyan)/0.55)]",
    green: "dark:text-emerald-300 dark:drop-shadow-[0_0_8px_hsl(142_70%_50%/0.55)]",
  }[accent];

  return (
    <Card
      className={cn(
        "relative overflow-hidden dark:before:absolute dark:before:inset-0 dark:before:pointer-events-none dark:before:opacity-80",
        accentRing,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-gray-400/80">
          {label}
        </CardTitle>
        <span className={cn("text-muted-foreground transition-colors", iconAccent)}>
          {icon}
        </span>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-3xl font-bold dark:cyber-number">{value}</div>
        {footer}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [stats, recentTickets, upcomingTasks] = await Promise.all([
    getDashboardStats(supabase, user.id),
    getRecentTickets(supabase, 5),
    getUpcomingTasks(supabase, user.id, 7),
  ]);

  const recentTicketsSorted = sortTicketsForList(recentTickets ?? []);

  // Count overdue tasks
  const now = new Date();
  const overdueTasks =
    upcomingTasks?.filter((t) => t.due_date && new Date(t.due_date) < now)
      .length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
          Overview of your support ticket system
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Tickets"
          value={stats.totalTickets}
          icon={<Ticket className="h-4 w-4" />}
          accent="primary"
        />
        <KpiCard
          label="Open Tickets"
          value={stats.openTickets}
          icon={<LayoutDashboard className="h-4 w-4" />}
          accent="cyan"
        />
        <KpiCard
          label="My Tasks"
          value={stats.myTasks}
          icon={<CheckSquare className="h-4 w-4" />}
          accent="primary"
          footer={
            overdueTasks > 0 ? (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1.5 font-medium">
                <AlertTriangle className="h-3 w-3" />
                {overdueTasks} overdue
              </p>
            ) : null
          }
        />
        <KpiCard
          label="Resolved Today"
          value={stats.resolvedToday}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="green"
        />
      </div>

      {/* Active Projects Overview */}
      <ProjectsOverviewWidget />

      {/* SLA Overview Widget */}
      <SlaSummaryWidget />

      {/* Recent Tickets + Upcoming Tasks — side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Tickets</CardTitle>
              <Link
                href="/tickets"
                className="text-xs text-primary hover:text-primary-800 font-medium"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {recentTickets && recentTickets.length > 0 ? (
                recentTicketsSorted.map((ticket: any) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.id}`}
                    className="flex items-center justify-between gap-3 py-2 px-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md -mx-1 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-xs font-mono text-gray-400 dark:text-gray-500">
                        {formatTicketNumber(ticket.ticket_number)}
                      </span>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {ticket.title}
                      </span>
                      <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {ticket.assigned_user?.full_name || "Unassigned"}
                        {(ticket.functional_team?.name ||
                          ticket.support_team?.name) && (
                          <>
                            {" · "}
                            {ticket.functional_team?.name}
                            {ticket.functional_team?.name &&
                              ticket.support_team?.name &&
                              " / "}
                            {ticket.support_team?.name}
                          </>
                        )}
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
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No recent tickets
                </p>
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
