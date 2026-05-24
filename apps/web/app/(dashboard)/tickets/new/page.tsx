"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiBrowser } from "@/lib/api-client-browser";
import { uploadCommentImage } from "@/lib/supabase/queries/comments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/user.types";
import type { Team } from "@/types/team.types";
import { L1_SUPPORT_DESK_ID } from "@/types/team.types";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
} from "@/types/ticket.types";
import { useUnsavedChangesContext } from "@/lib/contexts/unsaved-changes-context";
import { RichTextEditor } from "@/components/tickets/rich-text-editor";

export default function NewTicketPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [ccEmail, setCcEmail] = useState("");
  const [priorityId, setPriorityId] = useState<number | null>(null);
  const [statusId, setStatusId] = useState<number | null>(null);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [functionalTeamId, setFunctionalTeamId] = useState<string>("");

  const [statuses, setStatuses] = useState<TicketStatusRow[]>([]);
  const [priorities, setPriorities] = useState<TicketPriorityRow[]>([]);
  const [categories, setCategories] = useState<TicketCategoryRow[]>([]);
  const [functionalTeams, setFunctionalTeams] = useState<Team[]>([]);
  const [supportMembers, setSupportMembers] = useState<Profile[]>([]);
  const [defaultStatusId, setDefaultStatusId] = useState<number>(1);
  const [defaultPriorityId, setDefaultPriorityId] = useState<number>(2);
  const [l1SupportLevelId, setL1SupportLevelId] = useState<number>(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const unsavedChangesContext = useUnsavedChangesContext();

  const hasUnsavedChanges = useMemo(() => {
    return (
      title.trim() !== "" ||
      description.trim() !== "" ||
      categoryId !== null ||
      ccEmail.trim() !== "" ||
      assignedTo !== "" ||
      functionalTeamId !== ""
    );
  }, [title, description, categoryId, ccEmail, assignedTo, functionalTeamId]);

  useEffect(() => {
    unsavedChangesContext.setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleSave = async () => {
      const form = document.querySelector("form");
      if (form) {
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    };
    const handleDiscard = () => {
      setTitle("");
      setDescription("");
      setCategoryId(null);
      setCcEmail("");
      setPriorityId(null);
      setStatusId(null);
      setAssignedTo("");
      setFunctionalTeamId("");
    };
    unsavedChangesContext.registerHandlers({ onSave: handleSave, onDiscard: handleDiscard });
    return () => { unsavedChangesContext.unregisterHandlers(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadData() {
      try {
        const [members, teams, fetchedStatuses, fetchedPriorities, fetchedCategories, supportLevels] =
          await Promise.all([
            apiBrowser.get<Profile[]>("/users/support"),
            apiBrowser.get<Team[]>("/teams/functional"),
            apiBrowser.get<TicketStatusRow[]>("/lookup/statuses"),
            apiBrowser.get<TicketPriorityRow[]>("/lookup/priorities"),
            apiBrowser.get<TicketCategoryRow[]>("/lookup/categories"),
            apiBrowser.get<{ id: number; name: string }[]>("/lookup/support-levels"),
          ]);
        setSupportMembers(members);
        setFunctionalTeams(teams);
        setStatuses(fetchedStatuses);
        setPriorities(fetchedPriorities);
        setCategories(fetchedCategories);

        const newStatus = fetchedStatuses.find((s) => s.name === "new");
        const mediumPriority = fetchedPriorities.find((p) => p.name === "medium");
        const l1Level = supportLevels.find((sl) => sl.name === "L1");

        if (newStatus) { setDefaultStatusId(newStatus.id); setStatusId(newStatus.id); }
        if (mediumPriority) { setDefaultPriorityId(mediumPriority.id); setPriorityId(mediumPriority.id); }
        if (l1Level) setL1SupportLevelId(l1Level.id);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    }
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!functionalTeamId) {
        setError("Please select a functional department");
        setLoading(false);
        return;
      }

      if (!categoryId) {
        setError("Please select a category");
        setLoading(false);
        return;
      }

      if (!priorityId) {
        setError("Please select a priority");
        setLoading(false);
        return;
      }

      const resolvedStatusId = assignedTo ? (statusId ?? defaultStatusId) : defaultStatusId;

      const ticket = await apiBrowser.post<{ id: string }>("/tickets", {
        title,
        description,
        category_id: categoryId,
        cc_email: ccEmail.trim() ? ccEmail.trim().toLowerCase() : null,
        priority_id: priorityId,
        status_id: resolvedStatusId,
        assigned_to: assignedTo || null,
        functional_team_id: functionalTeamId,
        team_id: L1_SUPPORT_DESK_ID,
        support_level_id: l1SupportLevelId,
      });

      unsavedChangesContext.setHasUnsavedChanges(false);
      router.push(`/tickets/${ticket.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred creating the ticket";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const tempId = "temp-" + Date.now();
    return uploadCommentImage(supabase, file, tempId);
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

            <div className="space-y-2">
              <Label htmlFor="functional-team">Functional Department *</Label>
              <Select
                value={functionalTeamId || "none"}
                onValueChange={(value) =>
                  setFunctionalTeamId(value === "none" ? "" : value)
                }
                disabled={loading}
              >
                <SelectTrigger id="functional-team">
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select department...
                  </SelectItem>
                  {functionalTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!functionalTeamId && (
                <p className="text-xs text-gray-500">
                  Select the business area this ticket relates to
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={categoryId?.toString() ?? "none"}
                  onValueChange={(value) =>
                    setCategoryId(value === "none" ? null : parseInt(value, 10))
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select category...
                    </SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cc">CC</Label>
                <Input
                  id="cc"
                  type="email"
                  value={ccEmail}
                  onChange={(e) => setCcEmail(e.target.value)}
                  disabled={loading}
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={priorityId?.toString() ?? ""}
                  onValueChange={(value) => setPriorityId(parseInt(value, 10))}
                  disabled={loading}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={statusId?.toString() ?? ""}
                  onValueChange={(value) => setStatusId(parseInt(value, 10))}
                  disabled={loading || !assignedTo}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.label}
                      </SelectItem>
                    ))}
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
                    setStatusId(defaultStatusId);
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
                  Status will be set to &quot;New&quot; for unassigned tickets
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
