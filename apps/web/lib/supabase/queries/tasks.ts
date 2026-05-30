/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";
import type {
  Task,
  TaskWithRelations,
  TaskStatus,
  TaskFilters,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStats,
} from "@/types/task.types";

type AnyClient = unknown;

// ── Reads ────────────────────────────────────────────────────────────────────

/** @deprecated */
export async function getTasks(_sb: AnyClient, filters?: TaskFilters) {
  return apiBrowser.get<TaskWithRelations[]>("/tasks", {
    status: filters?.status,
  });
}

/** @deprecated */
export async function getMyTasks(
  _sb: AnyClient,
  _userId: string,
  _status?: TaskStatus,
) {
  return apiBrowser.get<TaskWithRelations[]>("/tasks/me");
}

/** @deprecated */
export async function getTasksByUser(_sb: AnyClient, userId: string) {
  return apiBrowser.get<TaskWithRelations[]>(`/tasks/by-user/${userId}`);
}

/** @deprecated */
export async function getTasksByTicket(_sb: AnyClient, ticketId: string) {
  return apiBrowser.get<TaskWithRelations[]>(`/tasks/by-ticket/${ticketId}`);
}

/** @deprecated */
export async function getUpcomingTasks(
  _sb: AnyClient,
  _userId: string,
  days: number = 7,
) {
  return apiBrowser.get<TaskWithRelations[]>("/tasks/upcoming", { days });
}

/** @deprecated */
export async function getAllPendingTasks(_sb: AnyClient) {
  return apiBrowser.get<TaskWithRelations[]>("/tasks/pending");
}

/** @deprecated */
export async function getTaskById(_sb: AnyClient, id: string) {
  return apiBrowser.get<TaskWithRelations>(`/tasks/${id}`);
}

/** @deprecated */
export async function getTaskStats(_sb: AnyClient, _userId?: string) {
  return apiBrowser.get<TaskStats>("/tasks/stats");
}

// ── Mutations ───────────────────────────────────────────────────────────────

/** @deprecated */
export async function createTask(_sb: AnyClient, task: CreateTaskInput) {
  return apiBrowser.post<Task>("/tasks", task);
}

/** @deprecated */
export async function updateTask(
  _sb: AnyClient,
  id: string,
  updates: UpdateTaskInput,
) {
  return apiBrowser.patch<Task>(`/tasks/${id}`, updates);
}

/** @deprecated */
export async function completeTask(
  _sb: AnyClient,
  id: string,
  timeSpentMinutes?: number,
) {
  return apiBrowser.post<Task>(`/tasks/${id}/complete`, {
    time_spent_minutes: timeSpentMinutes,
  });
}

/** @deprecated */
export async function reopenTask(_sb: AnyClient, id: string) {
  return apiBrowser.post<Task>(`/tasks/${id}/reopen`);
}

/** @deprecated */
export async function deleteTask(_sb: AnyClient, id: string) {
  await apiBrowser.del(`/tasks/${id}`);
}
