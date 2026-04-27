import { createClient } from "@/lib/supabase/server";
import { getSlaStats, getMostUrgentSlaTickets } from "@/lib/supabase/queries/slas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock, Timer, CheckCircle2 } from "lucide-react";
import { formatTicketNumber } from "@/lib/utils/format";
import { computeSlaDisplayInfo, formatSlaCountdown } from "@/lib/utils/sla";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

export async function SlaSummaryWidget() {
  const supabase = await createClient();
  const [stats, urgentTickets] = await Promise.all([
    getSlaStats(supabase),
    getMostUrgentSlaTickets(supabase, 5),
  ]);

  const total = stats.breached + stats.due1h + stats.due4h + stats.onTrack;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">SLA Overview</h2>

      {/* Four stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">
              Breached
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {stats.breached}
            </div>
            {total > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {Math.round((stats.breached / total) * 100)}% of open
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              Due &lt; 1h
            </CardTitle>
            <Timer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {stats.due1h}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">
              Due &lt; 4h
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {stats.due4h}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              On Track
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {stats.onTrack}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most urgent tickets list */}
      {urgentTickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Most Urgent SLAs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentTickets.map((row: any) => {
                const ticket = row.ticket;
                if (!ticket) return null;

                const info = computeSlaDisplayInfo(
                  row,
                  ticket.status,
                  null,
                );
                const isBreached = info.resolutionMinutesRemaining < 0;
                const isAtRisk =
                  !isBreached && info.resolutionMinutesRemaining <= 60;

                return (
                  <Link
                    key={row.ticket_id}
                    href={`/tickets/${ticket.id}`}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50 border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatTicketNumber(ticket.ticket_number)}
                      </span>
                      <span className="text-sm truncate">{ticket.title}</span>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium shrink-0 ml-2",
                        isBreached
                          ? "text-red-600"
                          : isAtRisk
                            ? "text-amber-600"
                            : "text-green-600",
                      )}
                    >
                      {formatSlaCountdown(info.resolutionMinutesRemaining)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
