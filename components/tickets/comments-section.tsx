"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";
import { TicketComment } from "@/types/ticket.types";
import { createClient } from "@/lib/supabase/client";
import { getCommentsByTicket } from "@/lib/supabase/queries/comments";
import { Loader2, MessageSquarePlus } from "lucide-react";

interface CommentsSectionProps {
  ticketId: string;
  initialComments: TicketComment[];
  currentUserId?: string;
}

export function CommentsSection({
  ticketId,
  initialComments,
  currentUserId,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<TicketComment[]>(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCommentFormOpen, setIsCommentFormOpen] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const refreshComments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedComments = await getCommentsByTicket(supabase, ticketId);
      setComments(updatedComments);
    } catch (err) {
      console.error("Failed to refresh comments:", err);
      setError("Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, ticketId]);

  // Set up real-time subscription for new comments
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-comments-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_comments",
          filter: `ticket_id=eq.${ticketId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch the new comment with user data
            await refreshComments();
          } else if (payload.eventType === "UPDATE") {
            // Update the comment in the list
            await refreshComments();
          } else if (payload.eventType === "DELETE") {
            // Remove the comment from the list
            setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshComments, supabase, ticketId]);

  const handleCommentCreated = async () => {
    await refreshComments();
    setIsCommentFormOpen(false); // Close form after successful comment
  };

  const handleCommentUpdated = async () => {
    await refreshComments();
  };

  const handleCommentDeleted = async () => {
    await refreshComments();
  };

  const handleCancelComment = () => {
    setIsCommentFormOpen(false);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b bg-gray-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            Comments ({comments.length})
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </CardTitle>
          {!isCommentFormOpen && (
            <Button
              onClick={() => setIsCommentFormOpen(true)}
              size="sm"
              className="gap-2 shadow-sm"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Add Comment
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isCommentFormOpen && (
          <div className="pb-6 mb-6 border-b">
            <CommentForm
              ticketId={ticketId}
              onCommentCreated={handleCommentCreated}
              onCancel={handleCancelComment}
            />
          </div>
        )}

        {error && (
          <div
            className="text-sm text-red-500 bg-red-50 p-3 rounded-lg mb-6"
            role="alert"
          >
            {error}
          </div>
        )}

        {comments.length > 0 ? (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  currentUserId={currentUserId}
                  onCommentUpdated={handleCommentUpdated}
                  onCommentDeleted={handleCommentDeleted}
                />
              </div>
            ))}
          </div>
        ) : (
          !isLoading &&
          !isCommentFormOpen && (
            <div className="text-center py-12">
              <MessageSquarePlus className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-4">
                No comments yet. Start the conversation!
              </p>
              <Button
                onClick={() => setIsCommentFormOpen(true)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <MessageSquarePlus className="h-4 w-4" />
                Add First Comment
              </Button>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
