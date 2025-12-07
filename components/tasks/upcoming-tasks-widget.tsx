"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Task } from "@/types/task.types";
import { formatRelativeTime } from "@/lib/utils/date";
import { Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  TaskPriorityBadge,
  TaskActionTagBadge,
  TaskDueDateBadge,
} from "./task-badges";
import { cn } from "@/lib/utils/cn";

interface UpcomingTasksWidgetProps {
  tasks: Task[];
  onComplete: (task: Task) => void;
  isLoading?: boolean;
  maxItems?: number;
}

export function UpcomingTasksWidget({
  tasks,
  onComplete,
  isLoading,
  maxItems = 5,
}: UpcomingTasksWidgetProps) {
  const displayTasks = tasks.slice(0, maxItems);

  if (isLoading) {
    return <UpcomingTasksSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Upcoming Tasks
        </CardTitle>
        <Link href="/tasks">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {displayTasks.length > 0 ? (
          <div className="space-y-3">
            {displayTasks.map((task) => (
              <UpcomingTaskItem
                key={task.id}
                task={task}
                onComplete={onComplete}
              />
            ))}
            {tasks.length > maxItems && (
              <p className="text-sm text-center text-gray-500 pt-2">
                +{tasks.length - maxItems} more upcoming tasks
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No upcoming tasks</p>
            <p className="text-sm">You&apos;re all caught up!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface UpcomingTaskItemProps {
  task: Task;
  onComplete: (task: Task) => void;
}

function UpcomingTaskItem({ task, onComplete }: UpcomingTaskItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors group">
      <button
        onClick={() => onComplete(task)}
        className="flex-shrink-0 mt-0.5 p-1 rounded-full hover:bg-gray-100 transition-colors"
        title="Mark as complete"
      >
        <CheckCircle2 className="h-5 w-5 text-gray-400 group-hover:text-green-500 transition-colors" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {task.title}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <TaskPriorityBadge priority={task.priority} />
              {task.due_date && <TaskDueDateBadge dueDate={task.due_date} />}
            </div>
          </div>
        </div>

        {task.ticket_id && task.ticket && (
          <Link
            href={`/tickets/${task.ticket_id}`}
            className="text-xs text-blue-600 hover:underline mt-1 inline-block truncate max-w-full"
            title={`#${task.ticket.ticket_number} - ${task.ticket.title}`}
          >
            #{task.ticket.ticket_number} - {task.ticket.title}
          </Link>
        )}
      </div>
    </div>
  );
}

function UpcomingTasksSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 border rounded-lg"
            >
              <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
