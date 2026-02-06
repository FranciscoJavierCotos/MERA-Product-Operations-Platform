"use client";

import { useState } from "react";
import { TicketComment } from "@/types/ticket.types";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, formatDateTime } from "@/lib/utils/date";
import {
  Edit2,
  Trash2,
  Clock,
  Loader2,
  MoreHorizontal,
  Link as LinkIcon,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const stripHtmlToText = (html: string): string => {
    const withoutScripts = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");

    const withSpaces = withoutScripts.replace(
      /<(br\s*\/?>|\/p>|\/div>|\/li>|\/h\d>)/gi,
      " ",
    );

    const withoutTags = withSpaces.replace(/<[^>]+>/g, " ");
    return withoutTags
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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

  const shouldShowReadMore = (() => {
    if (isExpanded) return false;
    if (comment.content.includes("<img")) return true;

    const text = stripHtmlToText(comment.content);
    return text.length > 220;
  })();

  // Helper to strip images from content for preview
  const getPreviewContent = (htmlContent: string): string => {
    return htmlContent.replace(/<img\b[^>]*>/gi, "");
  };

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

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#comment-${comment.id}`;
      await navigator.clipboard.writeText(url);

      toast({
        title: "Link copied",
        description: "Comment link has been copied to clipboard.",
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
      {/* Bubble-style comment with all content inside */}
      <div className="flex gap-3" id={`comment-${comment.id}`}>
        <UserAvatar
          name={comment.user?.full_name || "Unknown"}
          avatarUrl={comment.user?.avatar_url}
          className="h-10 w-10 flex-shrink-0"
        />

        {/* Main bubble container - everything is inside */}
        <div className="flex-1 min-w-0 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
          {/* Header with author, time, and action buttons - all inside bubble */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-900">
                {comment.user?.full_name || "Unknown"}
              </span>
              <span className="text-xs text-gray-500">
                {formatDateTime(comment.created_at)} •{" "}
                {formatRelativeTime(comment.created_at)}
              </span>
              {isEdited && (
                <span className="text-xs text-gray-400 italic">(edited)</span>
              )}
              {/* Time worked text in header */}
              {comment.time_worked_minutes != null &&
                comment.time_worked_minutes > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {comment.time_worked_minutes} min worked
                  </span>
                )}
            </div>

            {/* Three-dot dropdown menu - always visible, but Edit/Delete only for owner */}
            {!isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                    aria-label="Comment options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isOwner && (
                    <>
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Comment content */}
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
            <div className="relative">
              <div
                className={`prose prose-sm max-w-none text-gray-700 break-words ${
                  !isExpanded ? "line-clamp-3" : ""
                }`}
                dangerouslySetInnerHTML={{
                  __html: isExpanded
                    ? comment.content
                    : getPreviewContent(comment.content),
                }}
              />
              {/* LinkedIn-style show more/less */}
              {shouldShowReadMore && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="-mt-1 text-sm text-gray-600 hover:text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                  aria-label="Show full comment"
                >
                  ...Read more
                </button>
              )}
              {isExpanded && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="mt-1 text-sm text-gray-600 hover:text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 rounded"
                  aria-label="Show less"
                >
                  ...Read less
                </button>
              )}
            </div>
          )}

          {error && !isEditing && (
            <p className="text-sm text-red-500 mt-3" role="alert">
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
