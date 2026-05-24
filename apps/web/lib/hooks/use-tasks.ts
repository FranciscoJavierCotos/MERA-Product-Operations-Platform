"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  getMyTasks,
  getTasksByTicket,
  getUpcomingTasks,
  getAllPendingTasks,
  createTask,
  updateTask,
  completeTask,
  reopenTask,
  deleteTask,
  getTaskStats,
} from "@/lib/supabase/queries/tasks";
import {
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStats,
} from "@/types/task.types";
import { useToast } from "@/lib/hooks/use-toast";

// Query Keys
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...taskKeys.lists(), filters] as const,
  myTasks: (userId: string, status?: TaskStatus) =>
    [...taskKeys.all, "my", userId, status] as const,
  ticketTasks: (ticketId: string) =>
    [...taskKeys.all, "ticket", ticketId] as const,
  upcoming: (userId: string, days?: number) =>
    [...taskKeys.all, "upcoming", userId, days] as const,
  allPending: () => [...taskKeys.all, "allPending"] as const,
  stats: (userId?: string) => [...taskKeys.all, "stats", userId] as const,
  detail: (id: string) => [...taskKeys.all, "detail", id] as const,
};

/**
 * Hook to get current user's tasks
 */
export function useMyTasks(userId: string, status?: TaskStatus) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.myTasks(userId, status),
    queryFn: () => getMyTasks(supabase, userId, status),
    enabled: !!userId,
  });
}

/**
 * Hook to get tasks for a specific ticket
 */
export function useTicketTasks(ticketId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.ticketTasks(ticketId),
    queryFn: () => getTasksByTicket(supabase, ticketId),
    enabled: !!ticketId,
  });
}

/**
 * Hook to get upcoming tasks for a user
 */
export function useUpcomingTasks(userId: string, days: number = 7) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.upcoming(userId, days),
    queryFn: () => getUpcomingTasks(supabase, userId, days),
    enabled: !!userId,
  });
}

/**
 * Hook to get all pending tasks (admin only)
 */
export function useAllPendingTasks() {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.allPending(),
    queryFn: () => getAllPendingTasks(supabase),
  });
}

/**
 * Hook to get task statistics
 */
export function useTaskStats(userId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.stats(userId),
    queryFn: () => getTaskStats(supabase, userId),
  });
}

/**
 * Hook to create a new task
 */
export function useCreateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskData: CreateTaskInput) => createTask(supabase, taskData),
    onSuccess: (data) => {
      // Invalidate all task queries
      queryClient.invalidateQueries({ queryKey: taskKeys.all });

      toast({
        title: "Task created",
        description: `"${data.title}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to update a task
 */
export function useUpdateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskInput }) =>
      updateTask(supabase, id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueriesData({
        queryKey: taskKeys.all,
      });

      // Optimistically update only task list queries (arrays)
      queryClient.setQueriesData({ queryKey: taskKeys.all }, (old: unknown) => {
        // Only update if it's an array of tasks
        if (!old || !Array.isArray(old)) return old;
        return old.map((task: Task) =>
          task.id === id ? { ...task, ...updates } : task
        );
      });

      return { previousTasks };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * Hook to complete a task with optional time tracking
 */
export function useCompleteTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      timeSpentMinutes,
    }: {
      id: string;
      timeSpentMinutes?: number;
    }) => completeTask(supabase, id, timeSpentMinutes),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousTasks = queryClient.getQueriesData({
        queryKey: taskKeys.all,
      });

      // Optimistically update — guard non-array cache entries (e.g. TaskStats)
      queryClient.setQueriesData(
        { queryKey: taskKeys.all },
        (old: Task[] | unknown) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: "completed" as const,
                  completed_at: new Date().toISOString(),
                }
              : task
          );
        }
      );

      return { previousTasks };
    },
    onSuccess: (data) => {
      toast({
        title: "Task completed",
        description: `"${data.title}" has been marked as complete.`,
      });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast({
        title: "Error completing task",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * Hook to reopen a completed task
 */
export function useReopenTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => reopenTask(supabase, id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });

      toast({
        title: "Task reopened",
        description: `"${data.title}" has been reopened.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error reopening task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to delete a task
 */
export function useDeleteTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteTask(supabase, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousTasks = queryClient.getQueriesData({
        queryKey: taskKeys.all,
      });

      // Optimistically remove — guard non-array cache entries (e.g. TaskStats)
      queryClient.setQueriesData(
        { queryKey: taskKeys.all },
        (old: Task[] | unknown) => {
          if (!old || !Array.isArray(old)) return old;
          return old.filter((task) => task.id !== id);
        }
      );

      return { previousTasks };
    },
    onSuccess: () => {
      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully.",
      });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
