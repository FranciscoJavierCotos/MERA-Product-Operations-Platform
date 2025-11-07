"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  EditableTitleAndDescription,
  EditButton,
} from "@/components/tickets/ticket-actions";

interface TicketDetailClientProps {
  ticketId: string;
  title: string;
  description: string;
  isCreator: boolean;
  isSupportAgent: boolean;
  isClosed: boolean;
}

export function TicketDetailClient({
  ticketId,
  title,
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
          <h2 className="text-xl font-semibold">
            {isEditing ? "Edit Ticket" : title}
          </h2>
          {canEdit && !isEditing && (
            <EditButton onClick={() => setIsEditing(true)} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit ? (
          <EditableTitleAndDescription
            ticketId={ticketId}
            initialTitle={title}
            initialDescription={description}
            isEditing={isEditing}
            onEditEnd={() => setIsEditing(false)}
          />
        ) : (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}
      </CardContent>
    </Card>
  );
}
