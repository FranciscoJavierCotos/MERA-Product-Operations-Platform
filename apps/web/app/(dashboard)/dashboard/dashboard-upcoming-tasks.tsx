"use client";

import { useState } from "react";
import { Task } from "@/types/task.types";
import { useUpcomingTasks, useCompleteTask } from "@/lib/hooks/use-tasks";
import { UpcomingTasksWidget } from "@/components/tasks/upcoming-tasks-widget";
import { CompleteTaskDialog } from "@/components/tasks/complete-task-dialog";

interface DashboardUpcomingTasksProps {
  userId: string;
  initialTasks: Task[];
}

export function DashboardUpcomingTasks({
  userId,
  initialTasks,
}: DashboardUpcomingTasksProps) {
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);

  const { data: tasks = initialTasks, isLoading } = useUpcomingTasks(userId, 7);
  const completeTask = useCompleteTask();

  const handleComplete = (task: Task) => {
    if (task.ticket_id) {
      setTaskToComplete(task);
    } else {
      completeTask.mutate({ id: task.id, timeSpentMinutes: undefined });
    }
  };

  const handleCompleteWithTime = (
    taskId: string,
    timeSpentMinutes?: number
  ) => {
    completeTask.mutate({ id: taskId, timeSpentMinutes });
    setTaskToComplete(null);
  };

  return (
    <>
      <UpcomingTasksWidget
        tasks={tasks}
        onComplete={handleComplete}
        isLoading={isLoading}
      />
      <CompleteTaskDialog
        task={taskToComplete}
        open={!!taskToComplete}
        onOpenChange={(open) => !open && setTaskToComplete(null)}
        onComplete={handleCompleteWithTime}
        isLoading={completeTask.isPending}
      />
    </>
  );
}
