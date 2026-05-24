"use client";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/lib/hooks/use-navigation";
import { cn } from "@/lib/utils/cn";
import { useUnsavedChangesContextOptional } from "@/lib/contexts/unsaved-changes-context";
import { UnsavedChangesModal } from "@/components/shared/unsaved-changes-modal";

interface GoBackButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
  onBeforeNavigate?: () => Promise<boolean> | boolean; // Return false to cancel navigation
}

export function GoBackButton({
  className,
  variant = "ghost",
  size = "sm",
  showText = true,
  onBeforeNavigate,
}: GoBackButtonProps) {
  const { goBack, canGoBack, getPreviousPath } = useNavigation();
  const unsavedChangesContext = useUnsavedChangesContextOptional();
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleClick = async () => {
    // Allow parent component to intercept navigation
    if (onBeforeNavigate) {
      const shouldProceed = await onBeforeNavigate();
      if (!shouldProceed) {
        return;
      }
    }

    // Check for unsaved changes
    if (unsavedChangesContext?.hasUnsavedChanges) {
      setShowModal(true);
      return;
    }

    goBack();
  };

  const handleSave = async () => {
    if (unsavedChangesContext?.onSave) {
      setIsSaving(true);
      try {
        await unsavedChangesContext.onSave();
        // Clear unsaved changes flag after successful save
        unsavedChangesContext.setHasUnsavedChanges(false);
        setShowModal(false);
        goBack();
      } catch (error) {
        console.error("Failed to save:", error);
        // Keep modal open on error
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDiscard = () => {
    if (unsavedChangesContext?.onDiscard) {
      unsavedChangesContext.onDiscard();
    }
    // Clear unsaved changes flag after discard
    unsavedChangesContext?.setHasUnsavedChanges(false);
    setShowModal(false);
    goBack();
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  const previousPath = getPreviousPath();
  const isDisabled = !canGoBack;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          "gap-2",
          isDisabled && "cursor-not-allowed opacity-50",
          className
        )}
        aria-label={
          isDisabled
            ? "No previous page"
            : previousPath
            ? `Go back to ${previousPath}`
            : "Go back"
        }
        title={
          isDisabled
            ? "No previous page to return to"
            : previousPath
            ? `Return to ${previousPath}`
            : "Go back to previous page"
        }
      >
        <ArrowLeft className="h-4 w-4" />
        {showText && <span>Back</span>}
      </Button>

      {unsavedChangesContext && (
        <UnsavedChangesModal
          open={showModal}
          onSave={handleSave}
          onDiscard={handleDiscard}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}
    </>
  );
}
