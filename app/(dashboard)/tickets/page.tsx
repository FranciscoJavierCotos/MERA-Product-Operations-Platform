import { createClient } from "@/lib/supabase/server";
import { getTicketsPaginated } from "@/lib/supabase/queries/tickets";
import { getFunctionalTeams, getAllSupportTeams } from "@/lib/supabase/queries/teams";
import { getSupportMembers } from "@/lib/supabase/queries/users";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { TicketFilterBar } from "@/components/tickets/ticket-filter-bar";
import { ResizableTicketTable, type TicketRow } from "@/components/tickets/resizable-ticket-table";

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
        <ResizableTicketTable
          tickets={tickets as TicketRow[]}
          variant="all"
          isSupportAgent={!!isSupportAgent}
          currentUserId={user?.id ?? null}
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
