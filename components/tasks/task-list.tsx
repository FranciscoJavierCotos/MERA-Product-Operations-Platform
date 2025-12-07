"use client";

import { useState, useMemo } from "react";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskActionTag,
} from "@/types/task.types";
import { TaskItem } from "./task-item";
import { CompleteTaskDialog } from "./complete-task-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  onComplete: (taskId: string, timeSpentMinutes?: number) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onReopen?: (task: Task) => void;
  showFilters?: boolean;
  showTicketLinks?: boolean;
  emptyMessage?: string;
  isLoading?: boolean;
}

type SortOption = "due_date" | "priority" | "created_at";

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function TaskList({
  tasks,
  onComplete,
  onEdit,
  onDelete,
  onReopen,
  showFilters = true,
  showTicketLinks = true,
  emptyMessage = "No tasks found",
  isLoading,
}: TaskListProps) {
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("due_date");

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((task) => task.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((task) => task.priority === priorityFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "due_date":
          // Tasks with no due date come last
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return (
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
        case "priority":
          return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        case "created_at":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, search, statusFilter, priorityFilter, sortBy]);

  const handleComplete = (task: Task) => {
    // If task is linked to a ticket, show the time tracking dialog
    if (task.ticket_id) {
      setTaskToComplete(task);
    } else {
      // For standalone tasks, complete without time tracking
      onComplete(task.id, undefined);
    }
  };

  const handleCompleteWithTime = (
    taskId: string,
    timeSpentMinutes?: number
  ) => {
    onComplete(taskId, timeSpentMinutes);
    setTaskToComplete(null);
  };

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">
                  Pending ({pendingCount})
                </SelectItem>
                <SelectItem value="completed">
                  Completed ({completedCount})
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="created_at">Created</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-3">
        {filteredAndSortedTasks.length > 0 ? (
          filteredAndSortedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
              onReopen={onReopen}
              showTicketLink={showTicketLinks}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            {search || statusFilter !== "all" || priorityFilter !== "all"
              ? "No tasks match your filters"
              : emptyMessage}
          </div>
        )}
      </div>

      {/* Complete task dialog */}
      <CompleteTaskDialog
        task={taskToComplete}
        open={!!taskToComplete}
        onOpenChange={(open) => !open && setTaskToComplete(null)}
        onComplete={handleCompleteWithTime}
        isLoading={isLoading}
      />
    </div>
  );
}
