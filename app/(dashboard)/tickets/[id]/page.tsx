import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  getTicketById,
  getTicketComments,
  getTicketHistory,
  getMyTicketNavigation,
} from "@/lib/supabase/queries/tickets";
import { getSupportMembers } from "@/lib/supabase/queries/users";
import {
  getAllSupportTeams,
  getFunctionalTeams,
  getTicketCollaborators,
} from "@/lib/supabase/queries/teams";
import { getSlaInstance } from "@/lib/supabase/queries/slas";

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
import { TicketTasksSection } from "@/components/tasks/ticket-tasks-section";
import { CollaboratorsSection } from "@/components/tickets/collaborators-section";
import { CommentsActivitySection } from "@/components/tickets/comments-activity-section";
import { Team, SupportLevel } from "@/types/team.types";
import { isUuid } from "@/lib/utils/uuid";
import { TicketNavigationButtons } from "@/components/tickets/ticket-navigation-buttons";
import { SlaDetailBlock } from "@/components/tickets/sla-detail-block";

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
  const ticketHistoryPromise = getTicketHistory(supabase, id);
  const slaInstancePromise = getSlaInstance(supabase, id);

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
  let ticketHistory = null;
  let slaInstance = null;
  let myTicketNavigation = {
    firstTicketId: null,
    previousTicketId: null,
    nextTicketId: null,
  };

  try {
    [ticket, comments, collaborators, ticketHistory, slaInstance, myTicketNavigation] =
      await Promise.all([
        ticketPromise,
        commentsPromise,
        collaboratorsPromise,
        ticketHistoryPromise,
        slaInstancePromise,
        user
          ? getMyTicketNavigation(supabase, user.id, id)
          : Promise.resolve(myTicketNavigation),
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
        <div className="flex items-center gap-1">
          <TicketNavigationButtons
            firstTicketId={myTicketNavigation.firstTicketId}
            previousTicketId={myTicketNavigation.previousTicketId}
            nextTicketId={myTicketNavigation.nextTicketId}
          />
          {isCreator && <DeleteButton ticketId={ticket.id} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {/* First column — SLA */}
            <div className="space-y-4">
              <SlaDetailBlock
                instance={slaInstance}
                ticketStatus={ticket.status}
                resolvedAt={ticket.resolved_at}
                createdAt={ticket.created_at}
              />
            </div>

            {/* Second column */}
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

            {/* Third column */}
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

            {/* Fourth column */}
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

            {/* Fifth column — Category, CC, Time Worked */}
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

            {/* Sixth column — Collaborators */}
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
        <div className="min-w-0">
          <TicketDetailClient
            ticketId={ticket.id}
            description={ticket.description}
            isCreator={!!isCreator}
            isSupportAgent={!!isSupportAgent}
            isClosed={isClosed}
          />
        </div>

        <div className="min-w-0">
          <TicketTasksSection
            ticketId={ticket.id}
            users={supportMembers || []}
            currentUserId={user?.id || ""}
            isClosed={isClosed}
          />
        </div>
      </div>

      <CommentsActivitySection
        ticketId={ticket.id}
        initialComments={comments || []}
        initialHistory={ticketHistory || []}
        currentUserId={user?.id}
      />
    </div>
  );
}
