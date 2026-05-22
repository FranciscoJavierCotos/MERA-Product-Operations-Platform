"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  EditableDescription,
  EditButton,
} from "@/components/tickets/ticket-actions";
import { ResolutionCard } from "@/components/tickets/resolution-card";
import { LinkedScrumItemCard } from "@/components/tickets/linked-scrum-item-card";
import { TicketLinksSection } from "@/components/tickets/ticket-links-section";
import type {
  LinkTypeRow,
  TicketLinkWithTarget,
} from "@/types/item-link.types";

interface TicketDetailClientProps {
  ticketId: string;
  description: string;
  resolution: string | null;
  showResolution: boolean;
  isCreator: boolean;
  isSupportAgent: boolean;
  isClosed: boolean;
  ticketLinks: TicketLinkWithTarget[];
  linkTypes: LinkTypeRow[];
}

export function TicketDetailClient({
  ticketId,
  description,
  resolution,
  showResolution,
  isCreator,
  isSupportAgent,
  isClosed,
  ticketLinks,
  linkTypes,
}: TicketDetailClientProps) {
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = (isCreator || isSupportAgent) && !isClosed;
  const canEditResolution = isSupportAgent && !isClosed;
  const canEditLinks = isSupportAgent && !isClosed;

  const primary = useMemo(
    () => ticketLinks.find((l) => l.is_primary) ?? null,
    [ticketLinks],
  );
  const excludeIds = useMemo(
    () => ticketLinks.map((l) => l.target_work_item_id),
    [ticketLinks],
  );

  return (
    <div className="flex flex-col gap-6 h-full">
      <LinkedScrumItemCard
        ticketId={ticketId}
        primary={primary}
        linkTypes={linkTypes}
        excludeWorkItemIds={excludeIds}
        canEdit={canEditLinks}
      />

      {ticketLinks.length > 1 && (
        <TicketLinksSection
          ticketId={ticketId}
          links={ticketLinks}
          linkTypes={linkTypes}
          canEdit={canEditLinks}
        />
      )}

      {showResolution && (
        <ResolutionCard
          ticketId={ticketId}
          initialResolution={resolution ?? ""}
          canEdit={canEditResolution}
        />
      )}

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
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
