"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/lib/hooks/use-navigation";
import { cn } from "@/lib/utils/cn";

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

  const handleClick = async () => {
    // Allow parent component to intercept navigation
    if (onBeforeNavigate) {
      const shouldProceed = await onBeforeNavigate();
      if (!shouldProceed) {
        return;
      }
    }

    goBack();
  };

  const previousPath = getPreviousPath();
  const isDisabled = !canGoBack;

  return (
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
  );
}
