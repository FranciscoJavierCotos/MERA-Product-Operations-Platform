"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { useToast } from "@/hooks/use-toast";
import { X, Save, Pencil } from "lucide-react";

interface CcEmailInputProps {
  ticketId: string;
  ccEmail: string | null | undefined;
  isSupportAgent: boolean;
  isClosed: boolean;
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export function CcEmailInput({
  ticketId,
  ccEmail,
  isSupportAgent,
  isClosed,
}: CcEmailInputProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [value, setValue] = useState(ccEmail ?? "");

  useEffect(() => {
    if (isEditing) return;
    setValue(ccEmail ?? "");
  }, [ccEmail, isEditing]);

  const canEdit = isSupportAgent && !isClosed;

  const handleSave = async () => {
    if (!canEdit || isSaving) return;

    const next = value.trim() === "" ? null : normalizeEmail(value);

    setIsSaving(true);
    try {
      await updateTicket(supabase, ticketId, { cc_email: next });
      toast({
        title: "Updated",
        description: "CC email has been updated.",
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update CC email:", error);
      toast({
        title: "Error",
        description: "Failed to update CC email.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!canEdit) {
    return <span className="text-sm">{ccEmail || "-"}</span>;
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm truncate" title={ccEmail || ""}>
          {ccEmail || "-"}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setIsEditing(true)}
          aria-label="Edit CC email"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="name@company.com"
        disabled={isSaving}
        className="h-8"
      />
      <Button
        type="button"
        size="icon"
        className="h-8 w-8"
        onClick={() => void handleSave()}
        disabled={isSaving}
        aria-label="Save CC email"
      >
        <Save className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8"
        onClick={() => {
          setValue(ccEmail ?? "");
          setIsEditing(false);
        }}
        disabled={isSaving}
        aria-label="Cancel"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
