import { createClient } from "@/lib/supabase/server";
import { getMyTicketsPaginated } from "@/lib/supabase/queries/tickets";
import { getFunctionalTeams, getAllSupportTeams } from "@/lib/supabase/queries/teams";
import {
  getTicketStatuses,
  getTicketPriorities,
  getTicketCategories,
  getTicketTemperatures,
  getTicketSupportLevels,
} from "@/lib/supabase/queries/lookup";
import { Pagination } from "@/components/shared/pagination";
import { TicketFilterBar } from "@/components/tickets/ticket-filter-bar";
import { ResizableTicketTable, type TicketRow } from "@/components/tickets/resizable-ticket-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

interface MyTicketsPageProps {
  searchParams: Promise<{
    page?: string;
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

  const [
    statuses,
    priorities,
    categories,
    temperatures,
    supportLevels,
    functionalTeams,
    supportTeams,
  ] = await Promise.all([
    getTicketStatuses(supabase),
    getTicketPriorities(supabase),
    getTicketCategories(supabase),
    getTicketTemperatures(supabase),
    getTicketSupportLevels(supabase),
    getFunctionalTeams(supabase),
    getAllSupportTeams(supabase),
  ]);

  const statusId = statuses.find((s) => s.name === params.status)?.id;
  const priorityId = priorities.find((p) => p.name === params.priority)?.id;
  const categoryId = categories.find((c) => c.name === params.category)?.id;
  const temperatureId = temperatures.find((t) => t.name === params.temperature)?.id;

  const { data: tickets, totalCount } = await getMyTicketsPaginated(
    supabase,
    user.id,
    requestedPage,
    PAGE_SIZE,
    {
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
      sort_dir: params.dir as "asc" | "desc" | undefined,
    }
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
        <p className="mt-2 text-sm text-gray-700">
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <ResizableTicketTable
          tickets={tickets as TicketRow[]}
          variant="my"
          isSupportAgent={!!isSupportAgent}
          currentUserId={user.id}
          statuses={statuses}
          priorities={priorities}
          categories={categories}
          temperatures={temperatures}
          supportLevels={supportLevels}
        />
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
