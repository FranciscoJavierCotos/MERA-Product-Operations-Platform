"use client";

import { useState } from "react";
import { TicketComment } from "@/types/ticket.types";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils/date";
import { Edit2, Trash2, Clock, Loader2 } from "lucide-react";
import { RichTextEditor } from "./rich-text-editor";
import { createClient } from "@/lib/supabase/client";
import { updateComment, deleteComment } from "@/lib/supabase/queries/comments";
import { uploadCommentImage } from "@/lib/supabase/queries/comments";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CommentItemProps {
  comment: TicketComment;
  currentUserId?: string;
  onCommentUpdated: () => void;
  onCommentDeleted: () => void;
}

export function CommentItem({
  comment,
  currentUserId,
  onCommentUpdated,
  onCommentDeleted,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const supabase = createClient();
  const isOwner = currentUserId === comment.user_id;
  const isEdited =
    new Date(comment.updated_at).getTime() >
    new Date(comment.created_at).getTime() + 1000;

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const url = await uploadCommentImage(supabase, file, comment.ticket_id);
      return url;
    } catch (error) {
      console.error("Failed to upload image:", error);
      throw error;
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(comment.content);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateComment(supabase, comment.id, editedContent);
      setIsEditing(false);
      onCommentUpdated();

      toast({
        title: "Comment updated",
        description: "Your changes have been saved.",
      });
    } catch (err) {
      console.error("Failed to update comment:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update comment";
      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteComment(supabase, comment.id);
      setShowDeleteDialog(false);
      onCommentDeleted();

      toast({
        title: "Comment deleted",
        description: "The comment has been removed.",
      });
    } catch (err) {
      console.error("Failed to delete comment:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete comment";
      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Bubble-style comment container with proper spacing and rounded corners */}
      <div className="flex gap-3" id={`comment-${comment.id}`}>
        <UserAvatar
          name={comment.user?.full_name || "Unknown"}
          avatarUrl={comment.user?.avatar_url}
          className="h-10 w-10 flex-shrink-0 mt-1"
        />
        <div className="flex-1 min-w-0">
          {/* Header section with author info and metadata */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-900">
                {comment.user?.full_name || "Unknown"}
              </span>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(comment.created_at)}
              </span>
              {isEdited && (
                <span className="text-xs text-gray-400 italic">(edited)</span>
              )}
            </div>

            {/* Edit/Delete buttons - always visible when user owns the comment */}
            {isOwner && !isEditing && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEdit}
                  className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  aria-label="Edit comment"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Comment bubble with background and padding */}
          <div className="bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
            {isEditing ? (
              <div className="space-y-3">
                <RichTextEditor
                  content={editedContent}
                  onChange={setEditedContent}
                  onImageUpload={handleImageUpload}
                  placeholder="Edit your comment..."
                  disabled={isSubmitting}
                />
                {error && (
                  <p className="text-sm text-red-500" role="alert">
                    {error}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={isSubmitting || !editedContent.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="prose prose-sm max-w-none text-gray-700 break-words"
                dangerouslySetInnerHTML={{ __html: comment.content }}
              />
            )}
          </div>

          {/* Time worked badge - displayed below the bubble */}
          {comment.time_worked_minutes && comment.time_worked_minutes > 0 && (
            <div className="mt-2 ml-1">
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                <Clock className="h-3 w-3" />
                {comment.time_worked_minutes} min worked
              </span>
            </div>
          )}

          {error && !isEditing && (
            <p className="text-sm text-red-500 mt-2 ml-1" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Comment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
