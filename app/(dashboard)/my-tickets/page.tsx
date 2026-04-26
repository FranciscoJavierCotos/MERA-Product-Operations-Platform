import { createClient } from "@/lib/supabase/server";
import { getMyTicketsPaginated } from "@/lib/supabase/queries/tickets";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTicketNumber } from "@/lib/utils/format";
import { formatRelativeTime } from "@/lib/utils/date";
import { Pagination } from "@/components/shared/pagination";
import { TicketCategoryDropdown } from "@/components/shared/ticket-category-dropdown";
import { StatusBadgeDropdown } from "@/components/shared/status-badge-dropdown";
import { PriorityBadgeDropdown } from "@/components/shared/priority-badge-dropdown";
import { TemperatureBadgeDropdown } from "@/components/shared/temperature-badge-dropdown";
import { FunctionalTeamDropdown } from "@/components/shared/functional-team-dropdown";
import { SupportTeamDropdown } from "@/components/shared/support-team-dropdown";
import { SupportLevel, Team } from "@/types/team.types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const categoryLabel: Record<string, string> = {
  bug: "Bug",
  feature_request: "Feature Request",
  question: "Question",
  configuration_request: "Configuration Request",
};

interface MyTicketsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function MyTicketsPage({
  searchParams,
}: MyTicketsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  type ProfileRole = {
    role: "admin" | "support_lead" | "support_member" | "client";
  };
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileData as ProfileRole | null;
  const isSupportAgent =
    profile &&
    ["admin", "support_lead", "support_member"].includes(profile.role);

  const params = await searchParams;
  const parsedPage = parseInt(params?.page ?? "1", 10);
  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const { data: tickets, totalCount } = await getMyTicketsPaginated(
    supabase,
    user.id,
    requestedPage,
    PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
        <p className="mt-2 text-sm text-gray-700">
          Tickets assigned to you ({totalCount})
        </p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Temperature</TableHead>
              <TableHead>Functional Team</TableHead>
              <TableHead>Support Team</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets && tickets.length > 0 ? (
              tickets.map((ticket) => (
                <TableRow key={ticket.id} className="cursor-pointer">
                  <TableCell className="p-0">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="block px-4 py-4 text-blue-600 hover:underline"
                    >
                      {formatTicketNumber(ticket.ticket_number)}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="block px-4 py-4 hover:underline"
                    >
                      {ticket.title}
                    </Link>
                  </TableCell>

                  {/* Dropdown fields (do not navigate) */}
                  <TableCell>
                    <TicketCategoryDropdown
                      ticketId={ticket.id}
                      category={ticket.category}
                      isSupportAgent={!!isSupportAgent}
                      isClosed={ticket.status === "closed"}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadgeDropdown
                      ticketId={ticket.id}
                      status={ticket.status}
                      isSupportAgent={!!isSupportAgent}
                      isClosed={ticket.status === "closed"}
                    />
                  </TableCell>
                  <TableCell>
                    <PriorityBadgeDropdown
                      ticketId={ticket.id}
                      priority={ticket.priority}
                      isSupportAgent={!!isSupportAgent}
                      isClosed={ticket.status === "closed"}
                    />
                  </TableCell>
                  <TableCell>
                    <TemperatureBadgeDropdown
                      ticketId={ticket.id}
                      temperature={ticket.client_temperature}
                      isAssignedUser={ticket.assigned_to === user.id}
                      isClosed={ticket.status === "closed"}
                    />
                  </TableCell>
                  <TableCell>
                    <FunctionalTeamDropdown
                      ticketId={ticket.id}
                      currentTeam={
                        (ticket.functional_team as Team | undefined) || null
                      }
                      isSupportAgent={!!isSupportAgent}
                      isClosed={ticket.status === "closed"}
                    />
                  </TableCell>
                  <TableCell>
                    <SupportTeamDropdown
                      ticketId={ticket.id}
                      currentTeam={
                        (ticket.support_team as Team | undefined) || null
                      }
                      currentLevel={
                        (ticket.support_level as SupportLevel) || "L1"
                      }
                      isSupportAgent={!!isSupportAgent}
                      isClosed={ticket.status === "closed"}
                    />
                  </TableCell>

                  {/* Non-dropdown fields (navigate) */}
                  <TableCell className="p-0">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="block px-4 py-4 text-gray-500"
                    >
                      {formatRelativeTime(ticket.created_at)}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="block px-4 py-4 text-gray-500"
                    >
                      {formatRelativeTime(ticket.updated_at)}
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center text-gray-500 py-8"
                >
                  No tickets assigned to you
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
