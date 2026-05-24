"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { useUnsavedChangesContextOptional } from "@/lib/contexts/unsaved-changes-context";
import { uploadCommentImage } from "@/lib/supabase/queries/comments";
import { RichTextEditor } from "./rich-text-editor";
import { sanitizedHtml } from "@/lib/utils/sanitize";
import { EditButton } from "./ticket-actions";

interface ResolutionCardProps {
  ticketId: string;
  initialResolution: string;
  canEdit: boolean;
}

const isHtmlEmpty = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;

export function ResolutionCard({
  ticketId,
  initialResolution,
  canEdit,
}: ResolutionCardProps) {
  const router = useRouter();
  const supabase = createClient();
  const unsavedChangesContext = useUnsavedChangesContextOptional();
  const [isEditing, setIsEditing] = useState(false);
  const [resolution, setResolution] = useState(initialResolution);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolutionRef = useRef(resolution);
  const initialRef = useRef(initialResolution);

  useEffect(() => {
    resolutionRef.current = resolution;
  }, [resolution]);

  useEffect(() => {
    initialRef.current = initialResolution;
    setResolution(initialResolution);
  }, [initialResolution]);

  useEffect(() => {
    if (!isEditing || !unsavedChangesContext) return;

    unsavedChangesContext.registerHandlers({
      onSave: async () => {
        const current = resolutionRef.current;
        if (isHtmlEmpty(current)) return;
        await updateTicket(supabase, ticketId, { resolution: current });
        setIsEditing(false);
        router.refresh();
      },
      onDiscard: () => {
        setResolution(initialRef.current);
        setIsEditing(false);
      },
    });

    unsavedChangesContext.setHasUnsavedChanges(
      resolutionRef.current !== initialRef.current,
    );

    return () => {
      unsavedChangesContext.unregisterHandlers();
    };
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing || !unsavedChangesContext) return;
    const hasChanges = resolution !== initialResolution;
    if (unsavedChangesContext.hasUnsavedChanges !== hasChanges) {
      unsavedChangesContext.setHasUnsavedChanges(hasChanges);
    }
  }, [resolution]);

  const handleSave = async () => {
    if (isHtmlEmpty(resolution)) {
      setError("Resolution cannot be empty");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await updateTicket(supabase, ticketId, { resolution });
      unsavedChangesContext?.setHasUnsavedChanges(false);
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to update resolution:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save resolution",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setResolution(initialResolution);
    setError(null);
    unsavedChangesContext?.setHasUnsavedChanges(false);
    setIsEditing(false);
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    return uploadCommentImage(supabase, file, ticketId);
  };

  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-emerald-900">Resolution</h2>
          {canEdit && !isEditing && (
            <EditButton onClick={() => setIsEditing(true)} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-2">
            <RichTextEditor
              content={resolution}
              onChange={setResolution}
              onImageUpload={handleImageUpload}
              placeholder="Describe how this ticket was resolved…"
              disabled={isSaving}
            />
            {error && (
              <div className="rounded-md bg-red-50 p-2 text-sm text-red-800">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || isHtmlEmpty(resolution)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : initialResolution && !isHtmlEmpty(initialResolution) ? (
          <div
            className="prose prose-sm max-w-none break-words"
            dangerouslySetInnerHTML={sanitizedHtml(initialResolution)}
          />
        ) : (
          <p className="text-sm text-emerald-900/60 italic">
            No resolution recorded yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
