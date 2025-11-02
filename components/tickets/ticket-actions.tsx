"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { updateTicket, deleteTicket } from "@/lib/supabase/queries/tickets";
import { Ticket, TicketStatus } from "@/types/ticket.types";
import { useUnsavedChangesContextOptional } from "@/lib/contexts/unsaved-changes-context";

interface DeleteButtonProps {
  ticketId: string;
}

export function DeleteButton({ ticketId }: DeleteButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteTicket(supabase, ticketId);
      router.push("/tickets");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete ticket:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete ticket. You may not have permission."
      );
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        className="h-8 w-8"
        onClick={() => setShowDeleteDialog(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this ticket? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface EditableTitleProps {
  ticketId: string;
  initialTitle: string;
  onEditStart?: () => void;
  isEditing: boolean;
  onEditEnd?: () => void;
}

export function EditableTitle({
  ticketId,
  initialTitle,
  onEditStart,
  isEditing,
  onEditEnd,
}: EditableTitleProps) {
  const router = useRouter();
  const supabase = createClient();
  const unsavedChangesContext = useUnsavedChangesContextOptional();
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);

  // Use ref to keep track of the current title value for handlers
  const titleRef = useRef(title);
  const initialTitleRef = useRef(initialTitle);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    initialTitleRef.current = initialTitle;
  }, [initialTitle]);

  // Register handlers when editing starts, unregister when editing ends
  useEffect(() => {
    if (!isEditing || !unsavedChangesContext) return;

    // Register save and discard handlers
    unsavedChangesContext.registerHandlers({
      onSave: async () => {
        const currentTitle = titleRef.current;
        if (currentTitle.trim()) {
          await updateTicket(supabase, ticketId, { title: currentTitle });
          onEditEnd?.();
          router.refresh();
        }
      },
      onDiscard: () => {
        setTitle(initialTitleRef.current);
        onEditEnd?.();
      },
    });

    // Set initial state
    const hasChanges = titleRef.current !== initialTitleRef.current;
    unsavedChangesContext.setHasUnsavedChanges(hasChanges);

    // Cleanup when editing ends
    return () => {
      unsavedChangesContext.unregisterHandlers();
    };
  }, [isEditing]); // Only depend on isEditing

  // Update hasUnsavedChanges when title changes (but don't re-register handlers)
  useEffect(() => {
    if (!isEditing || !unsavedChangesContext) return;

    const hasChanges = title !== initialTitle;
    if (unsavedChangesContext.hasUnsavedChanges !== hasChanges) {
      unsavedChangesContext.setHasUnsavedChanges(hasChanges);
    }
  }, [title]); // Only depend on title

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await updateTicket(supabase, ticketId, { title });
      if (unsavedChangesContext) {
        unsavedChangesContext.setHasUnsavedChanges(false);
      }
      onEditEnd?.();
      router.refresh();
    } catch (error) {
      console.error("Failed to update title:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(initialTitle);
    if (unsavedChangesContext) {
      unsavedChangesContext.setHasUnsavedChanges(false);
    }
    onEditEnd?.();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 text-xl font-semibold"
          disabled={isSaving}
          autoFocus
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || !title.trim()}
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return <h2 className="text-xl font-semibold">{initialTitle}</h2>;
}

interface EditButtonProps {
  onClick: () => void;
}

export function EditButton({ onClick }: EditButtonProps) {
  return (
    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClick}>
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

interface EditableDescriptionProps {
  ticketId: string;
  initialDescription: string;
  onEditStart?: () => void;
  isEditing: boolean;
  onEditEnd?: () => void;
}

export function EditableDescription({
  ticketId,
  initialDescription,
  onEditStart,
  isEditing,
  onEditEnd,
}: EditableDescriptionProps) {
  const router = useRouter();
  const supabase = createClient();
  const unsavedChangesContext = useUnsavedChangesContextOptional();
  const [description, setDescription] = useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);

  // Use ref to keep track of the current description value for handlers
  const descriptionRef = useRef(description);
  const initialDescriptionRef = useRef(initialDescription);

  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);

  useEffect(() => {
    initialDescriptionRef.current = initialDescription;
  }, [initialDescription]);

  // Register handlers when editing starts, unregister when editing ends
  useEffect(() => {
    if (!isEditing || !unsavedChangesContext) return;

    // Register save and discard handlers
    unsavedChangesContext.registerHandlers({
      onSave: async () => {
        const currentDescription = descriptionRef.current;
        if (currentDescription.trim()) {
          await updateTicket(supabase, ticketId, {
            description: currentDescription,
          });
          onEditEnd?.();
          router.refresh();
        }
      },
      onDiscard: () => {
        setDescription(initialDescriptionRef.current);
        onEditEnd?.();
      },
    });

    // Set initial state
    const hasChanges = descriptionRef.current !== initialDescriptionRef.current;
    unsavedChangesContext.setHasUnsavedChanges(hasChanges);

    // Cleanup when editing ends
    return () => {
      unsavedChangesContext.unregisterHandlers();
    };
  }, [isEditing]); // Only depend on isEditing

  // Update hasUnsavedChanges when description changes (but don't re-register handlers)
  useEffect(() => {
    if (!isEditing || !unsavedChangesContext) return;

    const hasChanges = description !== initialDescription;
    if (unsavedChangesContext.hasUnsavedChanges !== hasChanges) {
      unsavedChangesContext.setHasUnsavedChanges(hasChanges);
    }
  }, [description]); // Only depend on description

  const handleSave = async () => {
    if (!description.trim()) return;

    setIsSaving(true);
    try {
      await updateTicket(supabase, ticketId, { description });
      if (unsavedChangesContext) {
        unsavedChangesContext.setHasUnsavedChanges(false);
      }
      onEditEnd?.();
      router.refresh();
    } catch (error) {
      console.error("Failed to update description:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDescription(initialDescription);
    if (unsavedChangesContext) {
      unsavedChangesContext.setHasUnsavedChanges(false);
    }
    onEditEnd?.();
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          disabled={isSaving}
          className="resize-none"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !description.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <p className="text-gray-900 whitespace-pre-wrap">{initialDescription}</p>
  );
}

interface EditableStatusProps {
  ticketId: string;
  initialStatus: TicketStatus;
  isEditing: boolean;
  onEditEnd?: () => void;
  isClosed: boolean;
}

export function EditableStatus({
  ticketId,
  initialStatus,
  isEditing,
  onEditEnd,
  isClosed,
}: EditableStatusProps) {
  const router = useRouter();
  const supabase = createClient();
  const unsavedChangesContext = useUnsavedChangesContextOptional();
  const [status, setStatus] = useState(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  const statusRef = useRef(status);
  const initialStatusRef = useRef(initialStatus);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    initialStatusRef.current = initialStatus;
  }, [initialStatus]);

  useEffect(() => {
    if (!isEditing || !unsavedChangesContext) return;

    unsavedChangesContext.registerHandlers({
      onSave: async () => {
        const currentStatus = statusRef.current;
        await updateTicket(supabase, ticketId, { status: currentStatus });
        onEditEnd?.();
        router.refresh();
      },
      onDiscard: () => {
        setStatus(initialStatusRef.current);
        onEditEnd?.();
      },
    });

    const hasChanges = statusRef.current !== initialStatusRef.current;
    unsavedChangesContext.setHasUnsavedChanges(hasChanges);

    return () => {
      unsavedChangesContext.unregisterHandlers();
    };
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing || !unsavedChangesContext) return;

    const hasChanges = status !== initialStatus;
    if (unsavedChangesContext.hasUnsavedChanges !== hasChanges) {
      unsavedChangesContext.setHasUnsavedChanges(hasChanges);
    }
  }, [status]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTicket(supabase, ticketId, { status });
      if (unsavedChangesContext) {
        unsavedChangesContext.setHasUnsavedChanges(false);
      }
      onEditEnd?.();
      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setStatus(initialStatus);
    if (unsavedChangesContext) {
      unsavedChangesContext.setHasUnsavedChanges(false);
    }
    onEditEnd?.();
  };

  const getStatusLabel = (status: TicketStatus) => {
    switch (status) {
      case "new":
        return "New";
      case "pending_customer":
        return "Pending Customer Side";
      case "pending_internal":
        return "Pending Our Side";
      case "escalated":
        return "Escalated";
      case "resolved":
        return "Resolved";
      case "closed":
        return "Closed";
      default:
        return status;
    }
  };

  if (isEditing && !isClosed) {
    return (
      <div className="flex items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as TicketStatus)}
          disabled={isSaving}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="pending_customer">
              Pending Customer Side
            </SelectItem>
            <SelectItem value="pending_internal">Pending Our Side</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return <span>{getStatusLabel(initialStatus)}</span>;
}
