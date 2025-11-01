"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createTicket } from "@/lib/supabase/queries/tickets";
import { getSupportMembers } from "@/lib/supabase/queries/users";
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

export default function NewTicketPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [assignedTo, setAssignedTo] = useState("");
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
  }, [hasUnsavedChanges, unsavedChangesContext]);

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
      setAssignedTo("");
    };

    unsavedChangesContext.registerHandlers({
      onSave: handleSave,
      onDiscard: handleDiscard,
    });

    return () => {
      unsavedChangesContext.unregisterHandlers();
    };
  }, [unsavedChangesContext]);

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
        assigned_to: assignedTo || undefined,
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
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={loading}
                placeholder="Detailed description of the issue"
                rows={6}
              />
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
                <Label htmlFor="assigned">Assign To</Label>
                <Select
                  value={assignedTo}
                  onValueChange={setAssignedTo}
                  disabled={loading}
                >
                  <SelectTrigger id="assigned">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
