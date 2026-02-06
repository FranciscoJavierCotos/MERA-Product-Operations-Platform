import { createClient } from "@/lib/supabase/server";
import { getMyTickets } from "@/lib/supabase/queries/tickets";
import Link from "next/link";
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
import { formatTicketNumber } from "@/lib/utils/format";
import { formatRelativeTime } from "@/lib/utils/date";

export default async function MyTicketsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const tickets = await getMyTickets(supabase, user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
        <p className="mt-2 text-sm text-gray-700">
          Tickets assigned to you ({tickets?.length || 0})
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Temperature</TableHead>
              <TableHead>Functional Team</TableHead>
              <TableHead>Support Team</TableHead>
              <TableHead>Created</TableHead>
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
                  <TableCell>
                    <StatusBadge status={ticket.status} />
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
                  <TableCell className="text-gray-500">
                    {formatRelativeTime(ticket.created_at)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-gray-500 py-8"
                >
                  No tickets assigned to you
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
