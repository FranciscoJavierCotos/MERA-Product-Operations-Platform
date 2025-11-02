"use client";

import { useState, useEffect } from "react";
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

  const supabase = createClient();

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, supabase]);

  const refreshComments = async () => {
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
  };

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Comments ({comments.length})
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </CardTitle>
          {!isCommentFormOpen && (
            <Button
              onClick={() => setIsCommentFormOpen(true)}
              size="sm"
              className="gap-2"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Add Comment
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isCommentFormOpen && (
          <div className="pb-4 border-b">
            <CommentForm
              ticketId={ticketId}
              onCommentCreated={handleCommentCreated}
              onCancel={handleCancelComment}
            />
          </div>
        )}

        {error && (
          <div
            className="text-sm text-red-500 bg-red-50 p-3 rounded-lg"
            role="alert"
          >
            {error}
          </div>
        )}

        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment, index) => (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  currentUserId={currentUserId}
                  onCommentUpdated={handleCommentUpdated}
                  onCommentDeleted={handleCommentDeleted}
                />
                {index < comments.length - 1 && <Separator className="my-4" />}
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
