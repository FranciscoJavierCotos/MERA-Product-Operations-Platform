"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentsSection } from "./comments-section";
import { TicketHistory } from "./ticket-history";
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

  const hasHistory = initialHistory.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeView === "comments" ? "default" : "outline"}
          onClick={() => setActiveView("comments")}
        >
          Comments
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeView === "activity" ? "default" : "outline"}
          onClick={() => setActiveView("activity")}
        >
          Activity
        </Button>
      </div>

      {activeView === "comments" ? (
        <CommentsSection
          ticketId={ticketId}
          initialComments={initialComments}
          currentUserId={currentUserId}
        />
      ) : hasHistory ? (
        <TicketHistory ticketId={ticketId} initialHistory={initialHistory} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No activity yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
