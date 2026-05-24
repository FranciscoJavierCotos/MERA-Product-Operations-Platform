"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Task, TaskStats as TaskStatsType } from "@/types/task.types";
import { Profile } from "@/types/user.types";
import { CreateTaskFormData } from "@/lib/validations/task.schema";
import {
  useMyTasks,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useReopenTask,
  useDeleteTask,
} from "@/lib/hooks/use-tasks";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "@/components/tasks/task-list";
import { TaskStats } from "@/components/tasks/task-stats";
import { TaskForm } from "@/components/tasks/task-form";

interface TasksPageClientProps {
  initialTasks: Task[];
  initialStats: TaskStatsType;
  users: Profile[];
  currentUserId: string;
  initialCreateOpen?: boolean;
}

export function TasksPageClient({
  initialTasks,
  initialStats,
  users,
  currentUserId,
  initialCreateOpen = false,
}: TasksPageClientProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Use React Query with initial data
  const { data: allTasks = initialTasks } = useMyTasks(currentUserId);
  const { data: pendingTasks = [] } = useMyTasks(currentUserId, "pending");
  const { data: completedTasks = [] } = useMyTasks(currentUserId, "completed");
  const { data: stats = initialStats, isLoading: statsLoading } =
    useTaskStats(currentUserId);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    if (initialCreateOpen) {
      setIsFormOpen(true);
    }
  }, [initialCreateOpen]);

  const handleCreateTask = (data: CreateTaskFormData) => {
    createTask.mutate({
      title: data.title,
      description: data.description || null,
      ticket_id: data.ticket_id || null,
      assigned_to: data.assigned_to,
      created_by: currentUserId,
      priority: data.priority || "medium",
      action_tag: data.action_tag || "other",
      due_date: data.due_date || null,
    });
    setIsFormOpen(false);
  };

  const handleEditTask = (data: CreateTaskFormData) => {
    if (!editingTask) return;
    updateTask.mutate({
      id: editingTask.id,
      updates: {
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        action_tag: data.action_tag,
        assigned_to: data.assigned_to,
        due_date: data.due_date || null,
      },
    });
    setEditingTask(null);
  };

  const handleComplete = (taskId: string, timeSpentMinutes?: number) => {
    completeTask.mutate({ id: taskId, timeSpentMinutes });
  };

  const handleReopen = (task: Task) => {
    reopenTask.mutate(task.id);
  };

  const handleDelete = (task: Task) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(task.id);
    }
  };

  const getTasksForTab = () => {
    switch (activeTab) {
      case "pending":
        return pendingTasks;
      case "completed":
        return completedTasks;
      default:
        return allTasks;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Tasks</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Manage your tasks and track your progress
        </p>
      </div>

      {/* Stats */}
      <TaskStats stats={stats} isLoading={statsLoading} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Tasks ({allTasks.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({stats.completed})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <TaskList
            tasks={getTasksForTab()}
            onComplete={handleComplete}
            onEdit={setEditingTask}
            onDelete={handleDelete}
            onReopen={handleReopen}
            showFilters={activeTab === "all"}
            toolbarActions={
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            }
            emptyMessage={
              activeTab === "pending"
                ? "No pending tasks - great job!"
                : activeTab === "completed"
                  ? "No completed tasks yet"
                  : "No tasks found. Create your first task to get started."
            }
            isLoading={completeTask.isPending}
          />
        </TabsContent>
      </Tabs>

      {/* Create Task Form */}
      <TaskForm
        users={users}
        currentUserId={currentUserId}
        onSubmit={handleCreateTask}
        isLoading={createTask.isPending}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      {/* Edit Task Form */}
      <TaskForm
        task={editingTask}
        users={users}
        currentUserId={currentUserId}
        onSubmit={handleEditTask}
        isLoading={updateTask.isPending}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      />
    </div>
  );
}
