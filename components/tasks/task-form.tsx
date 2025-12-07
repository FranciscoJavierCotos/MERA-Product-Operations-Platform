"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Plus } from "lucide-react";
import {
  Task,
  TaskPriority,
  TaskActionTag,
  TASK_PRIORITIES,
  TASK_ACTION_TAGS,
  ACTION_TAG_LABELS,
} from "@/types/task.types";
import { Profile } from "@/types/user.types";
import {
  createTaskSchema,
  CreateTaskFormData,
} from "@/lib/validations/task.schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskFormProps {
  task?: Task | null;
  ticketId?: string;
  users: Profile[];
  currentUserId: string;
  onSubmit: (data: CreateTaskFormData) => void;
  onClose?: () => void;
  isLoading?: boolean;
  triggerButton?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TaskForm({
  task,
  ticketId,
  users,
  currentUserId,
  onSubmit,
  onClose,
  isLoading,
  triggerButton,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: TaskFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? controlledOnOpenChange || (() => {})
    : setInternalOpen;

  const isEditing = !!task;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      action_tag: "other",
      assigned_to: currentUserId,
      ticket_id: ticketId,
      due_date: null,
    },
  });

  const priority = watch("priority");
  const actionTag = watch("action_tag");
  const assignedTo = watch("assigned_to");

  // Reset form when dialog opens/closes or task changes
  useEffect(() => {
    if (open) {
      if (task) {
        reset({
          title: task.title,
          description: task.description || "",
          priority: task.priority,
          action_tag: task.action_tag,
          assigned_to: task.assigned_to,
          ticket_id: task.ticket_id || ticketId,
          due_date: task.due_date || null,
        });
      } else {
        reset({
          title: "",
          description: "",
          priority: "medium",
          action_tag: "other",
          assigned_to: currentUserId,
          ticket_id: ticketId,
          due_date: null,
        });
      }
    }
  }, [open, task, ticketId, currentUserId, reset]);

  const handleFormSubmit = (data: CreateTaskFormData) => {
    onSubmit(data);
    handleClose();
  };

  const handleClose = () => {
    reset();
    setOpen(false);
    onClose?.();
  };

  const priorityLabels: Record<TaskPriority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the task details below."
              : ticketId
              ? "Create a new task linked to this ticket."
              : "Create a new standalone task."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Enter task title"
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Enter task description (optional)"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Priority & Action Tag */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(value: TaskPriority) =>
                  setValue("priority", value)
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityLabels[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Action Tag</Label>
              <Select
                value={actionTag}
                onValueChange={(value: TaskActionTag) =>
                  setValue("action_tag", value)
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action tag" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_ACTION_TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {ACTION_TAG_LABELS[tag]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned To & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Assigned To <span className="text-red-500">*</span>
              </Label>
              <Select
                value={assignedTo}
                onValueChange={(value) => setValue("assigned_to", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assigned_to && (
                <p className="text-sm text-red-600">
                  {errors.assigned_to.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="due_date"
                  type="datetime-local"
                  {...register("due_date")}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Saving..."
                : isEditing
                ? "Update Task"
                : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TaskFormTriggerProps {
  children?: React.ReactNode;
  ticketId?: string;
  users: Profile[];
  currentUserId: string;
  onSubmit: (data: CreateTaskFormData) => void;
  isLoading?: boolean;
}

export function TaskFormTrigger({
  children,
  ticketId,
  users,
  currentUserId,
  onSubmit,
  isLoading,
}: TaskFormTriggerProps) {
  return (
    <TaskForm
      ticketId={ticketId}
      users={users}
      currentUserId={currentUserId}
      onSubmit={onSubmit}
      isLoading={isLoading}
      triggerButton={
        children || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        )
      }
    />
  );
}
