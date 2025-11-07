"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createTicket } from "@/lib/supabase/queries/tickets";
import { getSupportMembers } from "@/lib/supabase/queries/users";
import { uploadCommentImage } from "@/lib/supabase/queries/comments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Profile } from "@/types/user.types";
import { useUnsavedChangesContext } from "@/lib/contexts/unsaved-changes-context";
import { RichTextEditor } from "@/components/tickets/rich-text-editor";

export default function NewTicketPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [status, setStatus] = useState<
    | "new"
    | "pending_customer"
    | "pending_internal"
    | "escalated"
    | "resolved"
    | "closed"
  >("new");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [supportMembers, setSupportMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const unsavedChangesContext = useUnsavedChangesContext();

  // Track form dirty state
  const hasUnsavedChanges = useMemo(() => {
    return (
      title.trim() !== "" || description.trim() !== "" || assignedTo !== ""
    );
  }, [title, description, assignedTo]);

  // Register/unregister with context
  useEffect(() => {
    unsavedChangesContext.setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges]); // Remove unsavedChangesContext from dependencies

  // Register save/discard handlers for the global back button
  useEffect(() => {
    const handleSave = async () => {
      // Create a synthetic form submission
      const form = document.querySelector("form");
      if (form) {
        const submitEvent = new Event("submit", {
          cancelable: true,
          bubbles: true,
        });
        form.dispatchEvent(submitEvent);
      }
    };

    const handleDiscard = () => {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("new");
      setAssignedTo("");
    };

    unsavedChangesContext.registerHandlers({
      onSave: handleSave,
      onDiscard: handleDiscard,
    });

    return () => {
      unsavedChangesContext.unregisterHandlers();
    };
  }, []); // Empty deps - register once on mount

  useEffect(() => {
    async function loadSupportMembers() {
      try {
        const members = await getSupportMembers(supabase);
        setSupportMembers(members);
      } catch (err) {
        console.error("Error loading support members:", err);
      }
    }
    loadSupportMembers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const ticket = await createTicket(supabase, {
        title,
        description,
        priority,
        status: assignedTo ? status : "new",
        assigned_to: assignedTo || null,
        created_by: session.user.id,
      });

      // Clear unsaved changes flag after successful creation
      unsavedChangesContext.setHasUnsavedChanges(false);

      router.push(`/tickets/${ticket.id}`);
    } catch (err: any) {
      setError(err.message || "An error occurred creating the ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      // Use a temporary ID for upload path before ticket is created
      const tempId = "temp-" + Date.now();
      const url = await uploadCommentImage(supabase, file, tempId);
      return url;
    } catch (error) {
      console.error("Failed to upload image:", error);
      throw error;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
                placeholder="Brief description of the issue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                onImageUpload={handleImageUpload}
                placeholder="Detailed description of the issue"
                disabled={loading}
              />
              {!description.trim() && (
                <p className="text-xs text-red-500">Description is required</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setPriority(value as "low" | "medium" | "high" | "urgent")
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(
                      value as
                        | "new"
                        | "pending_customer"
                        | "pending_internal"
                        | "escalated"
                        | "resolved"
                        | "closed"
                    )
                  }
                  disabled={loading || !assignedTo}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="pending_customer">
                      Pending Customer Side
                    </SelectItem>
                    <SelectItem value="pending_internal">
                      Pending Our Side
                    </SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned">Assign To</Label>
              <Select
                value={assignedTo || "unassigned"}
                onValueChange={(value) => {
                  setAssignedTo(value === "unassigned" ? "" : value);
                  if (value === "unassigned") {
                    setStatus("new");
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger id="assigned">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {supportMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!assignedTo && (
                <p className="text-xs text-gray-500">
                  Status will be set to "New" for unassigned tickets
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Ticket"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
