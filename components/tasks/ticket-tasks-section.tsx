"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Task } from "@/types/task.types";
import { Profile } from "@/types/user.types";
import { CreateTaskFormData } from "@/lib/validations/task.schema";
import { Plus, ListTodo } from "lucide-react";
import { TaskItem } from "./task-item";
import { TaskForm } from "./task-form";
import { CompleteTaskDialog } from "./complete-task-dialog";
import {
  useTicketTasks,
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useReopenTask,
  useDeleteTask,
} from "@/lib/hooks/use-tasks";

interface TicketTasksSectionProps {
  ticketId: string;
  users: Profile[];
  currentUserId: string;
  isClosed?: boolean;
}

export function TicketTasksSection({
  ticketId,
  users,
  currentUserId,
  isClosed,
}: TicketTasksSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useTicketTasks(ticketId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const deleteTask = useDeleteTask();

  const handleCreateTask = (data: CreateTaskFormData) => {
    createTask.mutate({
      title: data.title,
      description: data.description,
      ticket_id: ticketId,
      assigned_to: data.assigned_to,
      created_by: currentUserId,
      priority: data.priority || "medium",
      action_tag: data.action_tag || "other",
      due_date: data.due_date,
    });
    setIsFormOpen(false);
  };

  const handleEditTask = (data: CreateTaskFormData) => {
    if (!editingTask) return;
    updateTask.mutate({
      id: editingTask.id,
      updates: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        action_tag: data.action_tag,
        assigned_to: data.assigned_to,
        due_date: data.due_date,
      },
    });
    setEditingTask(null);
  };

  const handleComplete = (task: Task) => {
    // Always show dialog for ticket-linked tasks
    setTaskToComplete(task);
  };

  const handleCompleteWithTime = (
    taskId: string,
    timeSpentMinutes?: number,
  ) => {
    completeTask.mutate({ id: taskId, timeSpentMinutes });
    setTaskToComplete(null);
  };

  const handleReopen = (task: Task) => {
    reopenTask.mutate(task.id);
  };

  const handleDelete = (task: Task) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(task.id);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <Card className={cn("h-full", tasks.length <= 1 ? "min-h-[280px]" : undefined)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          Tasks ({tasks.length})
        </CardTitle>
        {!isClosed && (
          <Button size="sm" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-14 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-3">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Pending ({pendingTasks.length})
                </h4>
                {pendingTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onEdit={isClosed ? undefined : setEditingTask}
                    onDelete={isClosed ? undefined : handleDelete}
                    showTicketLink={false}
                  />
                ))}
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Completed ({completedTasks.length})
                </h4>
                {completedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onReopen={isClosed ? undefined : handleReopen}
                    onDelete={isClosed ? undefined : handleDelete}
                    showTicketLink={false}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2 text-gray-500">
            <ListTodo className="h-6 w-6 mx-auto mb-1 text-gray-300" />
            <p className="text-sm">No tasks for this ticket</p>
            {!isClosed && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsFormOpen(true)}
                className="mt-1 h-auto p-0"
              >
                Add the first task
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Create Task Form */}
      <TaskForm
        ticketId={ticketId}
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
        ticketId={ticketId}
        users={users}
        currentUserId={currentUserId}
        onSubmit={handleEditTask}
        isLoading={updateTask.isPending}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      />

      {/* Complete Task Dialog */}
      <CompleteTaskDialog
        task={taskToComplete}
        open={!!taskToComplete}
        onOpenChange={(open) => !open && setTaskToComplete(null)}
        onComplete={handleCompleteWithTime}
        isLoading={completeTask.isPending}
      />
    </Card>
  );
}
