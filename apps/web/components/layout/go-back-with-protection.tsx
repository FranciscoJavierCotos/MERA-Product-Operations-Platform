"use client";

import { useState } from "react";
import { GoBackButton } from "./go-back-button";
import { UnsavedChangesModal } from "@/components/shared/unsaved-changes-modal";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

interface GoBackWithProtectionProps {
  hasUnsavedChanges?: boolean;
  onSave?: () => Promise<void> | void;
  onDiscard?: () => void;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

/**
 * GoBackButton component with unsaved changes protection
 * Use this component when you have forms or editable content
 */
export function GoBackWithProtection({
  hasUnsavedChanges = false,
  onSave,
  onDiscard,
  className,
  variant = "ghost",
  size = "sm",
  showText = true,
}: GoBackWithProtectionProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    showModal,
    requestNavigation,
    handleSaveAndNavigate,
    handleDiscardAndNavigate,
    handleCancel,
  } = useUnsavedChanges({
    enabled: hasUnsavedChanges,
    onSave,
    onDiscard,
  });

  const handleBeforeNavigate = async (): Promise<boolean> => {
    if (!hasUnsavedChanges) {
      return true; // No unsaved changes, proceed
    }

    // Show confirmation modal and wait for user decision
    return new Promise((resolve) => {
      requestNavigation(() => resolve(true));
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await handleSaveAndNavigate();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <GoBackButton
        onBeforeNavigate={handleBeforeNavigate}
        className={className}
        variant={variant}
        size={size}
        showText={showText}
      />

      <UnsavedChangesModal
        open={showModal}
        onSave={handleSave}
        onDiscard={handleDiscardAndNavigate}
        onCancel={handleCancel}
        isSaving={isSaving}
      />
    </>
  );
}
