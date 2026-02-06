"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  EditableDescription,
  EditButton,
} from "@/components/tickets/ticket-actions";

interface TicketDetailClientProps {
  ticketId: string;
  description: string;
  isCreator: boolean;
  isSupportAgent: boolean;
  isClosed: boolean;
}

export function TicketDetailClient({
  ticketId,
  description,
  isCreator,
  isSupportAgent,
  isClosed,
}: TicketDetailClientProps) {
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = (isCreator || isSupportAgent) && !isClosed;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Details</h2>
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
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}
      </CardContent>
    </Card>
  );
}
