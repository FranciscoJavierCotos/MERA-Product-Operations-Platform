"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  RotateCcw,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Task } from "@/types/task.types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TaskPriorityBadge, TaskActionTagBadge } from "./task-badges";

interface TaskItemProps {
  task: Task;
  onComplete: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onReopen?: (task: Task) => void;
  showTicketLink?: boolean;
}

function formatDueDateWithRemaining(dueDate: string): {
  formatted: string;
  remaining: string;
  isOverdue: boolean;
  isDueSoon: boolean;
} {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const formatted = due.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: due.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });

  let remaining: string;
  const isOverdue = diffMs < 0;
  const isDueSoon = diffHours > 0 && diffHours < 24;

  if (isOverdue) {
    const overdueDays = Math.abs(diffDays);
    const overdueHours = Math.abs(diffHours);
    if (overdueHours < 24) {
      remaining = `${overdueHours}h overdue`;
    } else {
      remaining = `${overdueDays}d overdue`;
    }
  } else if (diffHours < 1) {
    const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    remaining = `${diffMinutes}m left`;
  } else if (diffHours < 24) {
    remaining = `${diffHours}h left`;
  } else {
    remaining = `${diffDays}d left`;
  }

  return { formatted, remaining, isOverdue, isDueSoon };
}

export function TaskItem({
  task,
  onComplete,
  onEdit,
  onDelete,
  onReopen,
  showTicketLink = true,
}: TaskItemProps) {
  const [isChecked, setIsChecked] = useState(task.status === "completed");
  const isCompleted = task.status === "completed";

  const handleCheckboxChange = () => {
    if (!isCompleted) {
      setIsChecked(true);
      onComplete(task);
    }
  };

  const handleReopen = () => {
    setIsChecked(false);
    onReopen?.(task);
  };

  const dueDateInfo = task.due_date
    ? formatDueDateWithRemaining(task.due_date)
    : null;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 border rounded-lg transition-colors",
        isCompleted
          ? "bg-gray-50 border-gray-200"
          : "bg-white hover:bg-gray-50",
      )}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          disabled={isCompleted}
          className={cn(
            "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
            isCompleted && "cursor-not-allowed opacity-50",
          )}
          aria-label={`Mark "${task.title}" as ${
            isCompleted ? "incomplete" : "complete"
          }`}
        />
      </div>

      {/* Main content - compact layout */}
      <div className="flex-1 min-w-0">
        {/* Line 1: Title + Description */}
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className={cn(
              "text-sm font-medium truncate",
              isCompleted ? "text-gray-500 line-through" : "text-gray-900",
            )}
          >
            {task.title}
          </h3>
          {task.description && (
            <>
              <span className="text-gray-300">·</span>
              <span
                className={cn(
                  "text-sm truncate",
                  isCompleted ? "text-gray-400" : "text-gray-500",
                )}
              >
                {task.description}
              </span>
            </>
          )}
        </div>

        {/* Line 2: Badges + Meta info */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <TaskPriorityBadge
            priority={task.priority}
            className="text-[10px] px-1.5 py-0"
          />
          <TaskActionTagBadge
            actionTag={task.action_tag}
            className="text-[10px] px-1.5 py-0"
          />

          {/* Due date with remaining time */}
          {dueDateInfo && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium",
                isCompleted
                  ? "text-gray-400"
                  : dueDateInfo.isOverdue
                    ? "text-red-600"
                    : dueDateInfo.isDueSoon
                      ? "text-amber-600"
                      : "text-gray-500",
              )}
            >
              <Calendar className="h-3 w-3" />
              {dueDateInfo.formatted}
              <span className="font-normal">({dueDateInfo.remaining})</span>
            </span>
          )}

          {/* Separator */}
          <span className="text-gray-300 mx-0.5">·</span>

          {/* Assigned user */}
          {task.assigned_user && (
            <div className="flex items-center gap-1">
              <UserAvatar
                name={task.assigned_user.full_name}
                avatarUrl={task.assigned_user.avatar_url}
                className="h-5 w-5"
              />
              <span className="text-xs text-gray-500">
                {task.assigned_user.full_name.split(" ")[0]}
              </span>
            </div>
          )}

          {/* Related ticket */}
          {showTicketLink && task.ticket_id && task.ticket && (
            <>
              <span className="text-gray-300">·</span>
              <Link
                href={`/tickets/${task.ticket_id}`}
                className="text-xs text-blue-600 hover:underline truncate max-w-[200px]"
                onClick={(e) => e.stopPropagation()}
                title={`#${task.ticket.ticket_number} - ${task.ticket.title}`}
              >
                #{task.ticket.ticket_number} - {task.ticket.title}
              </Link>
            </>
          )}

          {/* Time spent (if completed) */}
          {isCompleted &&
            task.time_spent_minutes !== undefined &&
            task.time_spent_minutes > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {task.time_spent_minutes}m
                </span>
              </>
            )}
        </div>
      </div>

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 flex-shrink-0"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isCompleted && onReopen && (
            <DropdownMenuItem onClick={handleReopen}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reopen
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem
              onClick={() => onDelete(task)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
