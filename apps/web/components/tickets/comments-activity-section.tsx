"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { CommentsSection } from "./comments-section";
import { TicketHistory } from "./ticket-history";
import { MessageSquarePlus, History } from "lucide-react";
import { Loader2 } from "lucide-react";
import type {
  TicketComment,
  TicketHistory as TicketHistoryEntry,
} from "@/types/ticket.types";

interface CommentsActivitySectionProps {
  ticketId: string;
  initialComments: TicketComment[];
  initialHistory: TicketHistoryEntry[];
  currentUserId?: string;
}

type ActivityView = "comments" | "activity";

export function CommentsActivitySection({
  ticketId,
  initialComments,
  initialHistory,
  currentUserId,
}: CommentsActivitySectionProps) {
  const [activeView, setActiveView] = useState<ActivityView>("comments");
  const [isCommentFormOpen, setIsCommentFormOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(initialComments.length);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const handleCountChange = useCallback(
    (count: number) => setCommentsCount(count),
    [],
  );
  const handleLoadingChange = useCallback(
    (loading: boolean) => setIsLoadingComments(loading),
    [],
  );

  const hasHistory = initialHistory.length > 0;

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="border-b bg-gray-50/50 dark:bg-white/[0.02] dark:border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-background/60 dark:border dark:border-border/60 p-1">
            <button
              type="button"
              onClick={() => setActiveView("comments")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                activeView === "comments"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-primary dark:text-white dark:shadow-[0_0_18px_-2px_hsl(var(--primary)/0.6)]"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white",
              )}
            >
              Comments ({commentsCount})
              {isLoadingComments && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveView("activity")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                activeView === "activity"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-primary dark:text-white dark:shadow-[0_0_18px_-2px_hsl(var(--primary)/0.6)]"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white",
              )}
            >
              Activity
            </button>
          </div>

          {activeView === "comments" && !isCommentFormOpen && (
            <Button
              size="sm"
              className="gap-2 shadow-sm"
              onClick={() => setIsCommentFormOpen(true)}
            >
              <MessageSquarePlus className="h-4 w-4" />
              Add Comment
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 flex-1">
        {activeView === "comments" ? (
          <CommentsSection
            ticketId={ticketId}
            initialComments={initialComments}
            currentUserId={currentUserId}
            inline
            isFormOpen={isCommentFormOpen}
            onFormOpenChange={setIsCommentFormOpen}
            onCountChange={handleCountChange}
            onLoadingChange={handleLoadingChange}
          />
        ) : hasHistory ? (
          <TicketHistory
            ticketId={ticketId}
            initialHistory={initialHistory}
            inline
          />
        ) : (
          <div className="text-center py-12">
            <History className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No activity recorded yet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
