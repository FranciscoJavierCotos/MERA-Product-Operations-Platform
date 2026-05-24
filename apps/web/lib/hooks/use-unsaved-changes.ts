"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

export interface UnsavedChangesOptions {
  enabled?: boolean;
  onSave?: () => Promise<void> | void;
  onDiscard?: () => void;
}

interface UnsavedChangesState {
  hasUnsavedChanges: boolean;
  showModal: boolean;
  pendingNavigation: (() => void) | null;
}

export function useUnsavedChanges(options: UnsavedChangesOptions = {}) {
  const { enabled = true, onSave, onDiscard } = options;

  const [state, setState] = useState<UnsavedChangesState>({
    hasUnsavedChanges: false,
    showModal: false,
    pendingNavigation: null,
  });

  const pathname = usePathname();
  const initialPathname = useRef(pathname);

  // Set form as dirty
  const setHasUnsavedChanges = useCallback((hasChanges: boolean) => {
    setState((prev) => ({ ...prev, hasUnsavedChanges: hasChanges }));
  }, []);

  // Mark form as dirty
  const markAsDirty = useCallback(() => {
    setHasUnsavedChanges(true);
  }, [setHasUnsavedChanges]);

  // Mark form as clean
  const markAsClean = useCallback(() => {
    setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  // Request navigation with confirmation
  const requestNavigation = useCallback(
    (navigateFn: () => void) => {
      if (!enabled || !state.hasUnsavedChanges) {
        // No unsaved changes, proceed with navigation
        navigateFn();
        return;
      }

      // Show confirmation modal
      setState((prev) => ({
        ...prev,
        showModal: true,
        pendingNavigation: navigateFn,
      }));
    },
    [enabled, state.hasUnsavedChanges]
  );

  // Handle save and navigate
  const handleSaveAndNavigate = useCallback(async () => {
    if (onSave) {
      try {
        await onSave();
        markAsClean();

        // Execute pending navigation
        if (state.pendingNavigation) {
          state.pendingNavigation();
        }

        // Close modal
        setState((prev) => ({
          ...prev,
          showModal: false,
          pendingNavigation: null,
        }));
      } catch (error) {
        console.error("Failed to save:", error);
        // Don't navigate if save fails
        // Keep modal open to allow retry or discard
      }
    }
  }, [onSave, markAsClean, state.pendingNavigation]);

  // Handle discard and navigate
  const handleDiscardAndNavigate = useCallback(() => {
    if (onDiscard) {
      onDiscard();
    }

    markAsClean();

    // Execute pending navigation
    if (state.pendingNavigation) {
      state.pendingNavigation();
    }

    // Close modal
    setState((prev) => ({
      ...prev,
      showModal: false,
      pendingNavigation: null,
    }));
  }, [onDiscard, markAsClean, state.pendingNavigation]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showModal: false,
      pendingNavigation: null,
    }));
  }, []);

  // Warn on browser back/forward/refresh
  useEffect(() => {
    if (!enabled || !state.hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, state.hasUnsavedChanges]);

  // Reset on pathname change (if user navigates away without using our buttons)
  useEffect(() => {
    if (pathname !== initialPathname.current) {
      markAsClean();
      initialPathname.current = pathname;
    }
  }, [pathname, markAsClean]);

  return {
    hasUnsavedChanges: state.hasUnsavedChanges,
    showModal: state.showModal,
    setHasUnsavedChanges,
    markAsDirty,
    markAsClean,
    requestNavigation,
    handleSaveAndNavigate,
    handleDiscardAndNavigate,
    handleCancel,
  };
}

// Helper hook for form integration
export function useFormDirtyTracking(defaultValues?: Record<string, any>) {
  const [isDirty, setIsDirty] = useState(false);
  const initialValues = useRef(defaultValues);

  const trackChanges = useCallback((currentValues: Record<string, any>) => {
    const hasChanges =
      JSON.stringify(initialValues.current) !== JSON.stringify(currentValues);
    setIsDirty(hasChanges);
    return hasChanges;
  }, []);

  const reset = useCallback(
    (newValues?: Record<string, any>) => {
      initialValues.current = newValues || defaultValues;
      setIsDirty(false);
    },
    [defaultValues]
  );

  return {
    isDirty,
    trackChanges,
    reset,
  };
}
