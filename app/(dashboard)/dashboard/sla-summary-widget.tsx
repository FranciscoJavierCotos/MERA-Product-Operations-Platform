import { createClient } from "@/lib/supabase/server";
import { getSlaStats, getMostUrgentSlaTickets } from "@/lib/supabase/queries/slas";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">SLA Overview</h2>

      <div className="flex gap-4 items-stretch">
        {/* Stat cards — left column, stretch to fill list height */}
        <div className="flex flex-col gap-2 w-56 shrink-0 self-stretch">
          <StatCard
            label="Breached"
            value={stats.breached}
            sub={total > 0 ? `${Math.round((stats.breached / total) * 100)}% of open` : undefined}
            icon={<AlertCircle className="h-4 w-4 text-red-500" />}
            color="red"
            grow
          />
          <StatCard
            label="Due < 1h"
            value={stats.due1h}
            icon={<Timer className="h-4 w-4 text-orange-500" />}
            color="orange"
            grow
          />
          <StatCard
            label="Due < 4h"
            value={stats.due4h}
            icon={<Clock className="h-4 w-4 text-gray-400" />}
            color="neutral"
            grow
          />
          <StatCard
            label="On Track"
            value={stats.onTrack}
            icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
            color="green"
            grow
          />
        </div>

        {/* Most urgent tickets list — right, takes remaining width */}
        {urgentTickets.length > 0 ? (
          <Card className="flex-1 min-w-0">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Most Urgent SLAs
              </p>
              <div className="space-y-1">
                {urgentTickets.map((row: any) => {
                  const ticket = row.ticket;
                  if (!ticket) return null;

                  const info = computeSlaDisplayInfo(row, ticket.status, null);
                  const isBreached = info.resolutionMinutesRemaining < 0;
                  const isAtRisk =
                    !isBreached && info.resolutionMinutesRemaining <= 60;

                  return (
                    <Link
                      key={row.ticket_id}
                      href={`/tickets/${ticket.id}`}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                          {formatTicketNumber(ticket.ticket_number)}
                        </span>
                        <span className="text-sm text-gray-700 truncate">
                          {ticket.title}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium shrink-0 ml-3 tabular-nums",
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
        ) : (
          <Card className="flex-1 min-w-0 flex items-center justify-center py-6">
            <p className="text-sm text-gray-400">No urgent SLAs</p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ── Compact stat card ── */
const colorMap = {
  red:     { border: "border-red-200",    text: "text-red-700",    sub: "text-red-400"    },
  orange:  { border: "border-orange-200", text: "text-orange-700", sub: "text-orange-400" },
  neutral: { border: "border-gray-200",   text: "text-gray-600",   sub: "text-gray-400"   },
  green:   { border: "border-green-200",  text: "text-green-700",  sub: "text-green-400"  },
} as const;

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  grow,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: keyof typeof colorMap;
  grow?: boolean;
}) {
  const c = colorMap[color];
  return (
    <Card className={cn("border", c.border, grow && "flex-1")}>
      <CardContent className="flex items-center justify-between h-full px-4 py-0">
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", c.text)}>{label}</p>
          {sub && <p className={cn("text-xs leading-tight mt-0.5", c.sub)}>{sub}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className={cn("text-2xl font-bold tabular-nums", c.text)}>{value}</span>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
