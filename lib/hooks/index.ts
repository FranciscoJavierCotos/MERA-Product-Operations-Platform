// Navigation and state management hooks
export { useNavigation } from "./use-navigation";
export {
  useUnsavedChanges,
  useFormDirtyTracking,
  type UnsavedChangesOptions,
} from "./use-unsaved-changes";

// Task hooks
export {
  useMyTasks,
  useTicketTasks,
  useUpcomingTasks,
  useAllPendingTasks,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useReopenTask,
  useDeleteTask,
  taskKeys,
} from "./use-tasks";
