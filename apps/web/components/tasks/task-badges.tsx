"use client";

import { cn } from "@/lib/utils/cn";
import {
  TaskPriority,
  TaskActionTag,
  ACTION_TAG_LABELS,
} from "@/types/task.types";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function TaskPriorityBadge({
  priority,
  className,
}: TaskPriorityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        PRIORITY_STYLES[priority],
        className
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

interface TaskActionTagBadgeProps {
  actionTag: TaskActionTag;
  className?: string;
}

const ACTION_TAG_STYLES: Record<TaskActionTag, string> = {
  meeting: "bg-purple-100 text-purple-700 border-purple-200",
  pending_customer: "bg-amber-100 text-amber-700 border-amber-200",
  for_review: "bg-blue-100 text-blue-700 border-blue-200",
  send_email: "bg-cyan-100 text-cyan-700 border-cyan-200",
  follow_up: "bg-teal-100 text-teal-700 border-teal-200",
  internal_review: "bg-indigo-100 text-indigo-700 border-indigo-200",
  documentation: "bg-green-100 text-green-700 border-green-200",
  testing: "bg-pink-100 text-pink-700 border-pink-200",
  deployment: "bg-rose-100 text-rose-700 border-rose-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

export function TaskActionTagBadge({
  actionTag,
  className,
}: TaskActionTagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        ACTION_TAG_STYLES[actionTag],
        className
      )}
    >
      {ACTION_TAG_LABELS[actionTag]}
    </span>
  );
}

interface TaskDueDateBadgeProps {
  dueDate: string;
  isCompleted?: boolean;
  className?: string;
}

export function TaskDueDateBadge({
  dueDate,
  isCompleted,
  className,
}: TaskDueDateBadgeProps) {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const isOverdue = diffMs < 0 && !isCompleted;
  const isDueSoon = diffHours > 0 && diffHours < 24 && !isCompleted;

  let badgeClass = "bg-gray-100 text-gray-700 border-gray-200";
  let label = formatDueDate(due);

  if (isCompleted) {
    badgeClass = "bg-gray-100 text-gray-500 border-gray-200";
  } else if (isOverdue) {
    badgeClass = "bg-red-100 text-red-700 border-red-200";
    label = "Overdue";
  } else if (isDueSoon) {
    badgeClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
    label = "Due Soon";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        badgeClass,
        className
      )}
      title={due.toLocaleString()}
    >
      {label}
    </span>
  );
}

function formatDueDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `In ${diffDays} days`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
