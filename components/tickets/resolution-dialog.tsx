"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { uploadCommentImage } from "@/lib/supabase/queries/comments";
import { RichTextEditor } from "./rich-text-editor";
import type { TicketStatusRow } from "@/types/ticket.types";

interface ResolutionDialogProps {
  open: boolean;
  onClose: () => void;
  ticketId: string;
  targetStatus: TicketStatusRow | null;
  initialResolution?: string;
  onSubmitted?: () => void;
}

const isHtmlEmpty = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;

export function ResolutionDialog({
  open,
  onClose,
  ticketId,
  targetStatus,
  initialResolution = "",
  onSubmitted,
}: ResolutionDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [resolution, setResolution] = useState(initialResolution);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResolution(initialResolution);
      setError(null);
    }
  }, [open, initialResolution]);

  const handleSubmit = async () => {
    if (!targetStatus) return;
    if (isHtmlEmpty(resolution)) {
      setError("Resolution is required to mark this ticket as " + targetStatus.label);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await updateTicket(supabase, ticketId, {
        status_id: targetStatus.id,
        resolution,
      });
      onSubmitted?.();
      onClose();
      router.refresh();
    } catch (err) {
      console.error("Failed to set resolution:", err);
      setError(err instanceof Error ? err.message : "Failed to save resolution");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    return uploadCommentImage(supabase, file, ticketId);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {targetStatus
              ? `Mark ticket as ${targetStatus.label}`
              : "Resolve ticket"}
          </DialogTitle>
          <DialogDescription>
            A resolution is required before this ticket can be{" "}
            {targetStatus?.label.toLowerCase() ?? "closed"}. Describe how it was
            solved — this entry powers the AI suggestions on future tickets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <RichTextEditor
            content={resolution}
            onChange={setResolution}
            onImageUpload={handleImageUpload}
            placeholder="Describe the resolution…"
            disabled={isSubmitting}
          />
          {error && (
            <div className="rounded-md bg-red-50 p-2 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isHtmlEmpty(resolution)}
          >
            {isSubmitting
              ? "Saving…"
              : targetStatus
                ? `Save & set to ${targetStatus.label}`
                : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
