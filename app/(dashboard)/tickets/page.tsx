import { createClient } from "@/lib/supabase/server";
import { getTickets } from "@/lib/supabase/queries/tickets";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { TemperatureBadge } from "@/components/shared/temperature-badge";
import { SupportLevelBadge } from "@/components/shared/support-level-badge";
import { formatTicketNumber } from "@/lib/utils/format";
import { formatRelativeTime } from "@/lib/utils/date";
import { SupportLevel } from "@/types/team.types";
import { sortTicketsForList } from "@/lib/utils/ticketSort";

const categoryLabel: Record<string, string> = {
  bug: "Bug",
  feature_request: "Feature Request",
  question: "Question",
  configuration_request: "Configuration Request",
};

export default async function TicketsPage() {
  const supabase = await createClient();
  const tickets = sortTicketsForList((await getTickets(supabase)) ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Tickets</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and track all support tickets
          </p>
        </div>
        <Link href="/tickets/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Temperature</TableHead>
              <TableHead>Functional Team</TableHead>
              <TableHead>Support Team</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>CC</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets && tickets.length > 0 ? (
              tickets.map((ticket) => (
                <TableRow key={ticket.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {formatTicketNumber(ticket.ticket_number)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="hover:underline"
                    >
                      {ticket.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {ticket.category ? categoryLabel[ticket.category] : "-"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell>
                    <SupportLevelBadge
                      level={(ticket.support_level as SupportLevel) || "L1"}
                    />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>
                  <TableCell>
                    <TemperatureBadge
                      temperature={ticket.client_temperature}
                      showLabel={false}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {ticket.functional_team?.name || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {ticket.support_team?.name || "-"}
                  </TableCell>
                  <TableCell>
                    {ticket.assigned_user?.full_name || "Unassigned"}
                  </TableCell>
                  <TableCell
                    className="text-sm text-gray-600 max-w-[220px] truncate"
                    title={ticket.cc_email || ""}
                  >
                    {ticket.cc_email || "-"}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {formatRelativeTime(ticket.created_at)}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {formatRelativeTime(ticket.updated_at)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={13}
                  className="text-center text-gray-500 py-8"
                >
                  No tickets found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
