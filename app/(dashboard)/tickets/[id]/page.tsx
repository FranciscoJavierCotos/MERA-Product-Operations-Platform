import { createClient } from "@/lib/supabase/server";
import {
  getTicketById,
  getTicketComments,
} from "@/lib/supabase/queries/tickets";
import { getTasksByTicket } from "@/lib/supabase/queries/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatTicketNumber } from "@/lib/utils/format";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import { Separator } from "@/components/ui/separator";

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const ticket = await getTicketById(supabase, params.id);
  const comments = await getTicketComments(supabase, params.id);
  const tasks = await getTasksByTicket(supabase, params.id);

  if (!ticket) {
    return <div>Ticket not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {formatTicketNumber(ticket.ticket_number)}
            </h1>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <p className="mt-2 text-sm text-gray-700">
            Created {formatRelativeTime(ticket.created_at)} by{" "}
            {ticket.creator?.full_name || "Unknown"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{ticket.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Description
            </h3>
            <p className="text-gray-900 whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Assigned To</h3>
              <div className="mt-2 flex items-center gap-2">
                {ticket.assigned_user ? (
                  <>
                    <UserAvatar
                      name={ticket.assigned_user.full_name}
                      avatarUrl={ticket.assigned_user.avatar_url}
                      className="h-6 w-6"
                    />
                    <span className="text-sm">
                      {ticket.assigned_user.full_name}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Unassigned</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">Created</h3>
              <p className="mt-2 text-sm">
                {formatDateTime(ticket.created_at)}
              </p>
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

      <Card>
        <CardHeader>
          <CardTitle>Comments ({comments?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comments && comments.length > 0 ? (
              comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <UserAvatar
                    name={comment.user?.full_name || "Unknown"}
                    avatarUrl={comment.user?.avatar_url}
                    className="h-8 w-8"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {comment.user?.full_name || "Unknown"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No comments yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
