"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  inline?: boolean;
  isFormOpen?: boolean;
  onFormOpenChange?: (open: boolean) => void;
  onCountChange?: (count: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function CommentsSection({
  ticketId,
  initialComments,
  currentUserId,
  inline = false,
  isFormOpen: isFormOpenProp,
  onFormOpenChange,
  onCountChange,
  onLoadingChange,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<TicketComment[]>(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpenInternal, setIsFormOpenInternal] = useState(false);

  const isCommentFormOpen =
    isFormOpenProp !== undefined ? isFormOpenProp : isFormOpenInternal;

  const setIsCommentFormOpen = useCallback(
    (open: boolean) => {
      if (onFormOpenChange) {
        onFormOpenChange(open);
      } else {
        setIsFormOpenInternal(open);
      }
    },
    [onFormOpenChange],
  );

  const setCommentsAndNotify = useCallback(
    (newComments: TicketComment[]) => {
      setComments(newComments);
      onCountChange?.(newComments.length);
    },
    [onCountChange],
  );

  const setLoadingAndNotify = useCallback(
    (loading: boolean) => {
      setIsLoading(loading);
      onLoadingChange?.(loading);
    },
    [onLoadingChange],
  );

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setCommentsAndNotify(initialComments);
  }, [initialComments, setCommentsAndNotify]);

  const refreshComments = useCallback(async () => {
    try {
      setLoadingAndNotify(true);
      setError(null);
      const updatedComments = await getCommentsByTicket(supabase, ticketId);
      setCommentsAndNotify(updatedComments);
    } catch (err) {
      console.error("Failed to refresh comments:", err);
      setError("Failed to load comments");
    } finally {
      setLoadingAndNotify(false);
    }
  }, [supabase, ticketId, setCommentsAndNotify, setLoadingAndNotify]);

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
            await refreshComments();
          } else if (payload.eventType === "UPDATE") {
            await refreshComments();
          } else if (payload.eventType === "DELETE") {
            setCommentsAndNotify(
              comments.filter((c) => c.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshComments, supabase, ticketId, comments, setCommentsAndNotify]);

  const handleCommentCreated = async () => {
    await refreshComments();
    setIsCommentFormOpen(false);
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

  function renderContent() {
    return (
      <>
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
      </>
    );
  }

  if (inline) {
    return renderContent();
  }

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
      <CardContent className="pt-6">{renderContent()}</CardContent>
    </Card>
  );
}
