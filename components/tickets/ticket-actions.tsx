"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Save,
  X,
  MoreHorizontal,
  Link as LinkIcon,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { updateTicket, deleteTicket } from "@/lib/supabase/queries/tickets";
import { Ticket } from "@/types/ticket.types";
import { useUnsavedChangesContextOptional } from "@/lib/contexts/unsaved-changes-context";
import { RichTextEditor } from "./rich-text-editor";
import { uploadCommentImage } from "@/lib/supabase/queries/comments";
import { useToast } from "@/hooks/use-toast";

interface DeleteButtonProps {
  ticketId: string;
}

export function DeleteButton({ ticketId }: DeleteButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
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

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/tickets/${ticketId}`;
      await navigator.clipboard.writeText(url);

      toast({
        title: "Link copied",
        description: "Ticket link has been copied to clipboard.",
      });
    } catch (err) {
      console.error("Failed to copy link:", err);
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Ticket options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleCopyLink}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

interface EditableTitleAndDescriptionProps {
  ticketId: string;
  initialTitle: string;
  initialDescription: string;
  isEditing: boolean;
  onEditEnd?: () => void;
}

export function EditableTitleAndDescription({
  ticketId,
  initialTitle,
  initialDescription,
  isEditing,
  onEditEnd,
}: EditableTitleAndDescriptionProps) {
  const router = useRouter();
  const supabase = createClient();
  const unsavedChangesContext = useUnsavedChangesContextOptional();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);

  // Use refs to keep track of current values for handlers
  const titleRef = useRef(title);
  const descriptionRef = useRef(description);
  const initialTitleRef = useRef(initialTitle);
  const initialDescriptionRef = useRef(initialDescription);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);

  useEffect(() => {
    initialTitleRef.current = initialTitle;
  }, [initialTitle]);

  useEffect(() => {
    initialDescriptionRef.current = initialDescription;
  }, [initialDescription]);

  // Register handlers when editing starts, unregister when editing ends
  useEffect(() => {
    if (!isEditing || !unsavedChangesContext) return;

    // Register save and discard handlers
    unsavedChangesContext.registerHandlers({
      onSave: async () => {
        const currentTitle = titleRef.current;
        const currentDescription = descriptionRef.current;
        if (currentTitle.trim() && currentDescription.trim()) {
          await updateTicket(supabase, ticketId, {
            title: currentTitle,
            description: currentDescription,
          });
          onEditEnd?.();
          router.refresh();
        }
      },
      onDiscard: () => {
        setTitle(initialTitleRef.current);
        setDescription(initialDescriptionRef.current);
        onEditEnd?.();
      },
    });

    // Set initial state
    const hasChanges =
      titleRef.current !== initialTitleRef.current ||
      descriptionRef.current !== initialDescriptionRef.current;
    unsavedChangesContext.setHasUnsavedChanges(hasChanges);

    // Cleanup when editing ends
    return () => {
      unsavedChangesContext.unregisterHandlers();
    };
  }, [isEditing]); // Only depend on isEditing

  // Update hasUnsavedChanges when title or description changes
  useEffect(() => {
    if (!isEditing || !unsavedChangesContext) return;

    const hasChanges =
      title !== initialTitle || description !== initialDescription;
    if (unsavedChangesContext.hasUnsavedChanges !== hasChanges) {
      unsavedChangesContext.setHasUnsavedChanges(hasChanges);
    }
  }, [title, description]); // Depend on both title and description

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) return;

    setIsSaving(true);
    try {
      await updateTicket(supabase, ticketId, { title, description });
      if (unsavedChangesContext) {
        unsavedChangesContext.setHasUnsavedChanges(false);
      }
      onEditEnd?.();
      router.refresh();
    } catch (error) {
      console.error("Failed to update ticket:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(initialTitle);
    setDescription(initialDescription);
    if (unsavedChangesContext) {
      unsavedChangesContext.setHasUnsavedChanges(false);
    }
    onEditEnd?.();
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const url = await uploadCommentImage(supabase, file, ticketId);
      return url;
    } catch (error) {
      console.error("Failed to upload image:", error);
      throw error;
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base"
            disabled={isSaving}
            autoFocus
            placeholder="Enter ticket title..."
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Description
          </label>
          <RichTextEditor
            content={description}
            onChange={setDescription}
            onImageUpload={handleImageUpload}
            placeholder="Enter ticket description..."
            disabled={isSaving}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !description.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
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
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: initialDescription }}
    />
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

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const url = await uploadCommentImage(supabase, file, ticketId);
      return url;
    } catch (error) {
      console.error("Failed to upload image:", error);
      throw error;
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <RichTextEditor
          content={description}
          onChange={setDescription}
          onImageUpload={handleImageUpload}
          placeholder="Enter ticket description..."
          disabled={isSaving}
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
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: initialDescription }}
    />
  );
}

