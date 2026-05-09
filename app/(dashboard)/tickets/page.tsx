import { createClient } from "@/lib/supabase/server";
import { getTicketsPaginated } from "@/lib/supabase/queries/tickets";
import { getFunctionalTeams, getAllSupportTeams } from "@/lib/supabase/queries/teams";
import { getSupportMembers } from "@/lib/supabase/queries/users";
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
import {
  computeSlaDisplayInfo,
  computeElapsedMinutes,
  formatSlaCountdown,
  formatSlaMinutes,
  getTicketSlaInstance,
} from "@/lib/utils/sla";
import { formatTicketNumber } from "@/lib/utils/format";
import { formatRelativeTime } from "@/lib/utils/date";
import { Pagination } from "@/components/shared/pagination";
import { TicketCategoryDropdown } from "@/components/shared/ticket-category-dropdown";
import { StatusBadgeDropdown } from "@/components/shared/status-badge-dropdown";
import { PriorityBadgeDropdown } from "@/components/shared/priority-badge-dropdown";
import { TemperatureBadgeDropdown } from "@/components/shared/temperature-badge-dropdown";
import { FunctionalTeamDropdown } from "@/components/shared/functional-team-dropdown";
import { SupportTeamDropdown } from "@/components/shared/support-team-dropdown";
import { AssignedUserDropdown } from "@/components/shared/assigned-user-dropdown";
import { SupportLevel, Team } from "@/types/team.types";
import { TicketFilterBar } from "@/components/tickets/ticket-filter-bar";
import { SortableTableHead } from "@/components/tickets/sortable-table-head";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

interface TicketsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    priority?: string;
    category?: string;
    temperature?: string;
    functional_team?: string;
    support_team?: string;
    assigned_to?: string;
    created_from?: string;
    created_to?: string;
    sort?: string;
    dir?: string;
  }>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const supabase = await createClient();

  const params = await searchParams;
  const parsedPage = parseInt(params?.page ?? "1", 10);
  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [
    { data: tickets, totalCount },
    functionalTeams,
    supportTeams,
    supportMembers,
    {
      data: { user },
    },
  ] = await Promise.all([
    getTicketsPaginated(supabase, requestedPage, PAGE_SIZE, {
      search: params.search,
      status: params.status,
      priority: params.priority,
      category: params.category,
      temperature: params.temperature,
      functional_team_id: params.functional_team,
      support_team_id: params.support_team,
      assigned_to: params.assigned_to,
      created_from: params.created_from,
      created_to: params.created_to,
      sort_column: params.sort,
      sort_dir: params.dir as "asc" | "desc" | undefined,
    }),
    getFunctionalTeams(supabase),
    getAllSupportTeams(supabase),
    getSupportMembers(supabase),
    supabase.auth.getUser(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  type ProfileRole = {
    role: "admin" | "support_lead" | "support_member" | "client";
  };
  let profile: ProfileRole | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    profile = data as ProfileRole | null;
  }

  const isSupportAgent =
    profile &&
    ["admin", "support_lead", "support_member"].includes(profile.role);

  return (
    <div className="space-y-4">
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

      <TicketFilterBar
        functionalTeams={functionalTeams.map((t) => ({ value: t.id, label: t.name }))}
        supportTeams={supportTeams.map((t) => ({ value: t.id, label: t.name }))}
        supportMembers={supportMembers.map((m) => ({
          value: m.id,
          label: m.full_name ?? m.email,
        }))}
        showAssignedTo
      />

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead column="ticket_number">Ticket ID</SortableTableHead>
              <SortableTableHead column="title">Title</SortableTableHead>
              <SortableTableHead column="category">Category</SortableTableHead>
              <SortableTableHead column="status">Status</SortableTableHead>
              <SortableTableHead column="priority">Priority</SortableTableHead>
              <TableHead>SLA Response Time</TableHead>
              <TableHead>SLA Resolution Time</TableHead>
              <SortableTableHead column="client_temperature">Temperature</SortableTableHead>
              <TableHead>Functional Team</TableHead>
              <TableHead>Support Team</TableHead>
              <TableHead>Assigned To</TableHead>
              <SortableTableHead column="created_at">Created</SortableTableHead>
              <SortableTableHead column="updated_at">Updated</SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets && tickets.length > 0 ? (
              tickets.map((ticket) => {
                const slaInstance = getTicketSlaInstance(ticket.sla_instance);
                const now = new Date();
                const slaInfo = slaInstance
                  ? computeSlaDisplayInfo(
                      slaInstance,
                      ticket.status,
                      ticket.resolved_at,
                      now,
                    )
                  : null;

                return (
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
                    <TableCell className="text-sm">
                      {slaInfo ? (
                        slaInfo.responseStatus === "met" ? (
                          <span className="text-green-700 font-medium">
                            Met
                          </span>
                        ) : slaInfo.responseStatus === "breached" ? (
                          <span className="text-red-700 font-medium">
                            {formatSlaMinutes(
                              computeElapsedMinutes(
                                ticket.created_at,
                                slaInstance!.responded_at,
                                now,
                              ),
                            )}
                          </span>
                        ) : (
                          <span
                            className={
                              slaInfo.responseMinutesRemaining <= 60
                                ? "text-amber-700"
                                : "text-gray-700"
                            }
                          >
                            {formatSlaCountdown(
                              slaInfo.responseMinutesRemaining,
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {slaInfo ? (
                        slaInfo.resolutionStatus === "met" ? (
                          <span className="text-green-700 font-medium">
                            Met
                          </span>
                        ) : slaInfo.resolutionStatus === "breached" ? (
                          <span className="text-red-700">
                            {formatSlaMinutes(
                              computeElapsedMinutes(
                                ticket.created_at,
                                ticket.resolved_at,
                                now,
                              ),
                            )}
                          </span>
                        ) : slaInfo.resolutionStatus === "at_risk" ? (
                          <span className="text-amber-700">
                            {formatSlaCountdown(
                              slaInfo.resolutionMinutesRemaining,
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-700">
                            {formatSlaCountdown(
                              slaInfo.resolutionMinutesRemaining,
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TemperatureBadgeDropdown
                        ticketId={ticket.id}
                        temperature={ticket.client_temperature}
                        isAssignedUser={
                          !!(user && ticket.assigned_to === user.id)
                        }
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
                    <TableCell>
                      <AssignedUserDropdown
                        ticketId={ticket.id}
                        assignedUser={
                          ticket.assigned_user
                            ? {
                                id: ticket.assigned_user.id,
                                full_name: ticket.assigned_user.full_name,
                                avatar_url:
                                  ticket.assigned_user.avatar_url || null,
                              }
                            : null
                        }
                        isSupportAgent={!!isSupportAgent}
                        isClosed={ticket.status === "closed"}
                        compact
                      />
                    </TableCell>
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
                );
              })
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
