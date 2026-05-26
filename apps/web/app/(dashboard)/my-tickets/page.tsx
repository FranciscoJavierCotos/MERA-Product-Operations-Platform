import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api-client";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
  TicketTemperatureRow,
  TicketSupportLevelRow,
} from "@/types/ticket.types";
import type { Team } from "@/types/team.types";
import type { PaginatedTickets } from "@/lib/supabase/queries/tickets";
import { TicketFilterBar } from "@/components/tickets/ticket-filter-bar";
import { TicketsTableShell } from "@/components/tickets/tickets-table-shell";
import type { TicketRow } from "@/components/tickets/resizable-ticket-table";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

function resolvePageSize(raw: string | undefined): number {
  const n = parseInt(raw ?? "", 10);
  if (Number.isFinite(n) && ALLOWED_PAGE_SIZES.includes(n)) return n;
  return DEFAULT_PAGE_SIZE;
}

interface MyTicketsPageProps {
  searchParams: Promise<{
    page?: string;
    page_size?: string;
    search?: string;
    status?: string;
    priority?: string;
    category?: string;
    temperature?: string;
    functional_team?: string;
    support_team?: string;
    created_from?: string;
    created_to?: string;
    sort?: string;
    dir?: string;
  }>;
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
  const profile = await api.get<ProfileRole | null>(`/users/${user.id}`);
  const isSupportAgent =
    profile &&
    ["admin", "support_lead", "support_member"].includes(profile.role);

  const params = await searchParams;
  const parsedPage = parseInt(params?.page ?? "1", 10);
  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = resolvePageSize(params?.page_size);

  const [
    statuses,
    priorities,
    categories,
    temperatures,
    supportLevels,
    functionalTeams,
    supportTeams,
  ] = await Promise.all([
    api.get<TicketStatusRow[]>("/lookup/statuses"),
    api.get<TicketPriorityRow[]>("/lookup/priorities"),
    api.get<TicketCategoryRow[]>("/lookup/categories"),
    api.get<TicketTemperatureRow[]>("/lookup/temperatures"),
    api.get<TicketSupportLevelRow[]>("/lookup/support-levels"),
    api.get<Team[]>("/teams/functional"),
    api.get<Team[]>("/teams/support"),
  ]);

  const statusId = statuses.find((s) => s.name === params.status)?.id;
  const priorityId = priorities.find((p) => p.name === params.priority)?.id;
  const categoryId = categories.find((c) => c.name === params.category)?.id;
  const temperatureId = temperatures.find((t) => t.name === params.temperature)?.id;

  const { data: tickets, totalCount } = await api.get<PaginatedTickets>(
    "/tickets/me/paginated",
    {
      page: requestedPage,
      pageSize,
      search: params.search,
      status_id: statusId,
      priority_id: priorityId,
      category_id: categoryId,
      temperature_id: temperatureId,
      functional_team_id: params.functional_team,
      support_team_id: params.support_team,
      created_from: params.created_from,
      created_to: params.created_to,
      sort_column: params.sort,
      sort_dir: params.dir,
    },
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Tickets</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Tickets assigned to you ({totalCount})
        </p>
      </div>

      <TicketFilterBar
        statuses={statuses}
        priorities={priorities}
        categories={categories}
        temperatures={temperatures}
        functionalTeams={functionalTeams.map((t) => ({ value: t.id, label: t.name }))}
        supportTeams={supportTeams.map((t) => ({ value: t.id, label: t.name }))}
      />

      <div className="bg-white dark:bg-card shadow rounded-lg overflow-hidden">
        <TicketsTableShell
          tickets={tickets as TicketRow[]}
          variant="my"
          isSupportAgent={!!isSupportAgent}
          currentUserId={user.id}
          statuses={statuses}
          priorities={priorities}
          categories={categories}
          temperatures={temperatures}
          supportLevels={supportLevels}
          pagination={{
            currentPage,
            totalPages,
            totalCount,
            pageSize,
            rangeStart,
            rangeEnd,
          }}
        />
      </div>
    </div>
  );
}
