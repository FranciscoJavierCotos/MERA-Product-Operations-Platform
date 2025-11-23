import { createClient } from "@/lib/supabase/server";
import {
  getTicketById,
  getTicketComments,
} from "@/lib/supabase/queries/tickets";
import { getTasksByTicket } from "@/lib/supabase/queries/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadgeDropdown } from "@/components/shared/status-badge-dropdown";
import { AssignedUserDropdown } from "@/components/shared/assigned-user-dropdown";
import { PriorityBadgeDropdown } from "@/components/shared/priority-badge-dropdown";
import { TemperatureBadgeDropdown } from "@/components/shared/temperature-badge-dropdown";
import { formatTicketNumber } from "@/lib/utils/format";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import { DeleteButton } from "@/components/tickets/ticket-actions";
import { TicketDetailClient } from "./ticket-detail-client";
import { TimeWorkedButton } from "@/components/tickets/time-worked-button";
import { CommentsSection } from "@/components/tickets/comments-section";
import { UserAvatar } from "@/components/shared/user-avatar";

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const ticket = await getTicketById(supabase, params.id);
  const comments = await getTicketComments(supabase, params.id);
  const tasks = await getTasksByTicket(supabase, params.id);

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

  if (!ticket) {
    return <div>Ticket not found</div>;
  }

  const isCreator = user && ticket.created_by === user.id;
  const isSupportAgent =
    profile &&
    ["admin", "support_lead", "support_member"].includes(profile.role);
  const isAssignedUser = user && ticket.assigned_to === user.id;
  const isClosed = ticket.status === "closed";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">
            {formatTicketNumber(ticket.ticket_number)}
          </h1>
          <StatusBadgeDropdown
            ticketId={ticket.id}
            status={ticket.status}
            isSupportAgent={!!isSupportAgent}
            isClosed={isClosed}
          />
          <PriorityBadgeDropdown
            ticketId={ticket.id}
            priority={ticket.priority}
            isSupportAgent={!!isSupportAgent}
            isClosed={isClosed}
          />
          <TemperatureBadgeDropdown
            ticketId={ticket.id}
            temperature={ticket.client_temperature}
            isAssignedUser={!!isAssignedUser}
            isClosed={isClosed}
          />
        </div>
        {isCreator && <DeleteButton ticketId={ticket.id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Assigned To</h3>
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
                isSupportAgent={!!isSupportAgent}
                isClosed={isClosed}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">Created By</h3>
              <div className="mt-2 flex items-center gap-2">
                {ticket.creator && ticket.creator.role !== "client" && (
                  <UserAvatar
                    name={ticket.creator.full_name}
                    avatarUrl={ticket.creator.avatar_url}
                    className="h-5 w-5"
                  />
                )}
                <p className="text-sm">
                  {ticket.creator?.full_name || "Unknown"}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">Created</h3>
              <p className="mt-2 text-sm">
                {formatDateTime(ticket.created_at)} (
                {formatRelativeTime(ticket.created_at)})
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">Time Worked</h3>
              <div className="mt-2">
                <TimeWorkedButton
                  ticketId={ticket.id}
                  timeWorkedMinutes={ticket.time_worked_minutes}
                  isClosed={isClosed}
                />
              </div>
            </div>
          </div>

          {ticket.tags && ticket.tags.length > 0 && (
            <div>
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

      <TicketDetailClient
        ticketId={ticket.id}
        title={ticket.title}
        description={ticket.description}
        isCreator={!!isCreator}
        isSupportAgent={!!isSupportAgent}
        isClosed={isClosed}
      />

      {tasks && tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tasks ({tasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-500">
                        Assigned to {task.assigned_user?.full_name}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      task.status === "completed" ? "default" : "outline"
                    }
                  >
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <CommentsSection
        ticketId={params.id}
        initialComments={comments || []}
        currentUserId={user?.id}
      />
    </div>
  );
}
