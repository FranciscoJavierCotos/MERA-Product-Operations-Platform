"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EditableTitle,
  EditableDescription,
  EditButton,
} from "@/components/tickets/ticket-actions";

interface TicketDetailClientProps {
  ticketId: string;
  title: string;
  description: string;
  isCreator: boolean;
}

export function TicketDetailClient({
  ticketId,
  title,
  description,
  isCreator,
}: TicketDetailClientProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            {isCreator ? (
              <EditableTitle
                ticketId={ticketId}
                initialTitle={title}
                isEditing={isEditingTitle}
                onEditEnd={() => setIsEditingTitle(false)}
              />
            ) : (
              <h2 className="text-xl font-semibold">{title}</h2>
            )}
            {isCreator && !isEditingTitle && (
              <EditButton onClick={() => setIsEditingTitle(true)} />
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Description</CardTitle>
            {isCreator && !isEditingDescription && (
              <EditButton onClick={() => setIsEditingDescription(true)} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCreator ? (
            <EditableDescription
              ticketId={ticketId}
              initialDescription={description}
              isEditing={isEditingDescription}
              onEditEnd={() => setIsEditingDescription(false)}
            />
          ) : (
            <p className="text-gray-900 whitespace-pre-wrap">{description}</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
