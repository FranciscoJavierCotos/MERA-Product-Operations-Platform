import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  getTicketById,
  getTicketComments,
} from "@/lib/supabase/queries/tickets";
import { getSupportMembers } from "@/lib/supabase/queries/users";
import {
  getAllSupportTeams,
  getEscalationHistory,
  getFunctionalTeams,
  getTicketCollaborators,
} from "@/lib/supabase/queries/teams";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadgeDropdown } from "@/components/shared/status-badge-dropdown";
import { AssignedUserDropdown } from "@/components/shared/assigned-user-dropdown";
import { PriorityBadgeDropdown } from "@/components/shared/priority-badge-dropdown";
import { TemperatureBadgeDropdown } from "@/components/shared/temperature-badge-dropdown";
import { FunctionalTeamDropdown } from "@/components/shared/functional-team-dropdown";
import { SupportTeamDropdown } from "@/components/shared/support-team-dropdown";
import { TicketCategoryDropdown } from "@/components/shared/ticket-category-dropdown";
import { CcEmailInput } from "@/components/shared/cc-email-input";
import { formatTicketNumber } from "@/lib/utils/format";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import { DeleteButton } from "@/components/tickets/ticket-actions";
import { TicketDetailClient } from "./ticket-detail-client";
import { TimeWorkedButton } from "@/components/tickets/time-worked-button";
import { CommentsSection } from "@/components/tickets/comments-section";
import { TicketTasksSection } from "@/components/tasks/ticket-tasks-section";
import { CollaboratorsSection } from "@/components/tickets/collaborators-section";
import { EscalationHistory } from "@/components/tickets/escalation-history";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Team, SupportLevel } from "@/types/team.types";
import { isUuid } from "@/lib/utils/uuid";

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = await Promise.resolve(params);
  if (!isUuid(id)) notFound();

  const supabase = await createClient();

  const ticketPromise = getTicketById(supabase, id);
  const commentsPromise = getTicketComments(supabase, id);
  const collaboratorsPromise = getTicketCollaborators(supabase, id);
  const escalationHistoryPromise = getEscalationHistory(supabase, id);

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user profile to check role
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

  let ticket = null;
  let comments = null;
  let collaborators = null;
  let escalationHistory = null;
  try {
    [ticket, comments, collaborators, escalationHistory] = await Promise.all([
      ticketPromise,
      commentsPromise,
      collaboratorsPromise,
      escalationHistoryPromise,
    ]);
  } catch (error: unknown) {
    const maybeCode = (error as { code?: string } | null)?.code;
    if (maybeCode === "22P02") notFound();
    throw error;
  }

  const [supportMembers, functionalTeams, supportTeams] = isSupportAgent
    ? await Promise.all([
        getSupportMembers(supabase),
        getFunctionalTeams(supabase),
        getAllSupportTeams(supabase),
      ])
    : [[], [], []];

  if (!ticket) {
    return <div>Ticket not found</div>;
  }

  const isCreator = user && ticket.created_by === user.id;
  const isAssignedUser = user && ticket.assigned_to === user.id;
  const isClosed = ticket.status === "closed";
  const currentSupportLevel: SupportLevel =
    (ticket.support_level as SupportLevel) || "L1";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-gray-900">
            {formatTicketNumber(ticket.ticket_number)}
          </h1>
          <span className="text-2xl font-semibold text-gray-800">
            {ticket.title}
          </span>
        </div>
        {isCreator && <DeleteButton ticketId={ticket.id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* First column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Functional Department
                </h3>
                <div className="mt-2">
                  <FunctionalTeamDropdown
                    ticketId={ticket.id}
                    currentTeam={
                      (ticket.functional_team as Team | undefined) || null
                    }
                    availableTeams={functionalTeams}
                    isSupportAgent={!!isSupportAgent}
                    isClosed={isClosed}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Support Team
                </h3>
                <div className="mt-2">
                  <SupportTeamDropdown
                    ticketId={ticket.id}
                    currentTeam={
                      (ticket.support_team as Team | undefined) || null
                    }
                    currentLevel={currentSupportLevel}
                    availableTeams={supportTeams}
                    isSupportAgent={!!isSupportAgent}
                    isClosed={isClosed}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Assigned To
                </h3>
                <div className="mt-2">
                  <AssignedUserDropdown
                    ticketId={ticket.id}
                    assignedUser={
                      ticket.assigned_user
                        ? {
                            id: ticket.assigned_user.id,
                            full_name: ticket.assigned_user.full_name,
                            avatar_url: ticket.assigned_user.avatar_url || null,
                          }
                        : null
                    }
                    availableSupportMembers={supportMembers}
                    isSupportAgent={!!isSupportAgent}
                    isClosed={isClosed}
                  />
                </div>
              </div>
            </div>

            {/* Second column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Ticket Status
                </h3>
                <div className="mt-2">
                  <StatusBadgeDropdown
                    ticketId={ticket.id}
                    status={ticket.status}
                    isSupportAgent={!!isSupportAgent}
                    isClosed={isClosed}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Ticket Priority
                </h3>
                <div className="mt-2">
                  <PriorityBadgeDropdown
                    ticketId={ticket.id}
                    priority={ticket.priority}
                    isSupportAgent={!!isSupportAgent}
                    isClosed={isClosed}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Client Temperature
                </h3>
                <div className="mt-2">
                  <TemperatureBadgeDropdown
                    ticketId={ticket.id}
                    temperature={ticket.client_temperature}
                    isAssignedUser={!!isAssignedUser}
                    isClosed={isClosed}
                  />
                </div>
              </div>
            </div>

            {/* Third column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Created By
                </h3>
                <p className="mt-2 text-sm">
                  {ticket.creator?.full_name || "Unknown"}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">Created</h3>
                <p className="mt-2 text-sm">
                  {formatDateTime(ticket.created_at)} (
                  {formatRelativeTime(ticket.created_at)})
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">Updated</h3>
                <p className="mt-2 text-sm">
                  {formatDateTime(ticket.updated_at)} (
                  {formatRelativeTime(ticket.updated_at)})
                </p>
              </div>
            </div>

            {/* Fourth column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Category</h3>
                <div className="mt-2">
                  <TicketCategoryDropdown
                    ticketId={ticket.id}
                    category={ticket.category}
                    isSupportAgent={!!isSupportAgent}
                    isClosed={isClosed}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">CC</h3>
                <div className="mt-2">
                  <CcEmailInput
                    ticketId={ticket.id}
                    ccEmail={ticket.cc_email}
                    isSupportAgent={!!isSupportAgent}
                    isClosed={isClosed}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Time Worked
                </h3>
                <div className="mt-2">
                  <TimeWorkedButton
                    ticketId={ticket.id}
                    timeWorkedMinutes={ticket.time_worked_minutes}
                    isClosed={isClosed}
                  />
                </div>
              </div>
            </div>

            {/* Fifth column */}
            <div className="space-y-4">
              <CollaboratorsSection
                ticketId={ticket.id}
                initialCollaborators={collaborators}
                availableFunctionalTeams={functionalTeams}
                availableSupportTeams={supportTeams}
                isSupportAgent={!!isSupportAgent}
                isClosed={isClosed}
              />
            </div>
          </div>

          {ticket.tags && ticket.tags.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {ticket.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="min-w-0 space-y-6">
          <TicketDetailClient
            ticketId={ticket.id}
            description={ticket.description}
            isCreator={!!isCreator}
            isSupportAgent={!!isSupportAgent}
            isClosed={isClosed}
          />

          <TicketTasksSection
            ticketId={ticket.id}
            users={supportMembers || []}
            currentUserId={user?.id || ""}
            isClosed={isClosed}
          />
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <CommentsSection
            ticketId={ticket.id}
            initialComments={comments || []}
            currentUserId={user?.id}
          />
        </div>
      </div>

      {/* Escalation History - only show if there's history */}
      <EscalationHistory
        ticketId={ticket.id}
        initialHistory={escalationHistory}
      />
    </div>
  );
}
