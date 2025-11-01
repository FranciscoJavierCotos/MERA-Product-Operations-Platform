import { createClient } from "@/lib/supabase/server";
import { getTasksByUser } from "@/lib/supabase/queries/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils/date";
import Link from "next/link";

export default async function TasksPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const tasks = await getTasksByUser(supabase, session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="mt-2 text-sm text-gray-700">
          Tasks assigned to you ({tasks?.length || 0})
        </p>
      </div>

      <div className="grid gap-4">
        {tasks && tasks.length > 0 ? (
          tasks.map((task: any) => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  <Badge
                    variant={
                      task.status === "completed" ? "default" : "outline"
                    }
                  >
                    {task.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {task.description && (
                    <p className="text-sm text-gray-700">{task.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {task.ticket ? (
                        <Link
                          href={`/tickets/${task.ticket_id}`}
                          className="text-blue-600 hover:underline"
                        >
                          Related to #{task.ticket.ticket_number}
                        </Link>
                      ) : (
                        "No related ticket"
                      )}
                    </span>
                    <span>Created {formatRelativeTime(task.created_at)}</span>
                  </div>
                  {task.due_date && (
                    <p className="text-sm text-gray-500">
                      Due: {formatRelativeTime(task.due_date)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-gray-500">
                No tasks assigned to you
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
