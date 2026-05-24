"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  EditableDescription,
  EditButton,
} from "@/components/tickets/ticket-actions";
import { ResolutionCard } from "@/components/tickets/resolution-card";
import { sanitizedHtml } from "@/lib/utils/sanitize";

interface TicketDetailClientProps {
  ticketId: string;
  description: string;
  resolution: string | null;
  showResolution: boolean;
  isCreator: boolean;
  isSupportAgent: boolean;
  isClosed: boolean;
}

export function TicketDetailClient({
  ticketId,
  description,
  resolution,
  showResolution,
  isCreator,
  isSupportAgent,
  isClosed,
}: TicketDetailClientProps) {
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = (isCreator || isSupportAgent) && !isClosed;
  const canEditResolution = isSupportAgent && !isClosed;

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* 1. Description */}
      <Card className="flex-1 min-h-[280px]">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Description</h2>
            {canEdit && !isEditing && (
              <EditButton onClick={() => setIsEditing(true)} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit ? (
            <EditableDescription
              ticketId={ticketId}
              initialDescription={description}
              isEditing={isEditing}
              onEditEnd={() => setIsEditing(false)}
            />
          ) : (
            <div
              className="prose prose-sm max-w-none break-words"
              dangerouslySetInnerHTML={sanitizedHtml(description)}
            />
          )}
        </CardContent>
      </Card>

      {/* 2. Resolution (when ticket is in a final status) */}
      {showResolution && (
        <ResolutionCard
          ticketId={ticketId}
          initialResolution={resolution ?? ""}
          canEdit={canEditResolution}
        />
      )}
    </div>
  );
}
