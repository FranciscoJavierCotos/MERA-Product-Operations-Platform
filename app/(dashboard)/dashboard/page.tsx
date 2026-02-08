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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-700">
          Overview of your support ticket system
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myTasks}</div>
            {overdueTasks > 0 && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                {overdueTasks} overdue
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolved Today
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolvedToday}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTickets && recentTickets.length > 0 ? (
              recentTicketsSorted.map((ticket: any) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="block p-4 hover:bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">
                          {formatTicketNumber(ticket.ticket_number)}
                        </span>
                        <h3 className="text-sm font-semibold">
                          {ticket.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {ticket.assigned_user?.full_name || "Unassigned"} •{" "}
                        {ticket.functional_team?.name ||
                        ticket.support_team?.name ? (
                          <>
                            {ticket.functional_team?.name && (
                              <span>{ticket.functional_team.name}</span>
                            )}
                            {ticket.functional_team?.name &&
                              ticket.support_team?.name &&
                              " / "}
                            {ticket.support_team?.name && (
                              <span>{ticket.support_team.name}</span>
                            )}
                            {" • "}
                          </>
                        ) : null}
                        {formatRelativeTime(ticket.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TemperatureBadge
                        temperature={ticket.client_temperature}
                        showLabel={false}
                      />
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No recent tickets
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Tasks Widget */}
      <DashboardUpcomingTasks
        userId={user.id}
        initialTasks={upcomingTasks || []}
      />
    </div>
  );
}
