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
import type { Company } from "@/types/company.types";
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
  const [teamId, setTeamId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");

  const [statuses, setStatuses] = useState<TicketStatusRow[]>([]);
  const [priorities, setPriorities] = useState<TicketPriorityRow[]>([]);
  const [categories, setCategories] = useState<TicketCategoryRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [supportMembers, setSupportMembers] = useState<Profile[]>([]);
  const [defaultStatusId, setDefaultStatusId] = useState<number>(1);
  const [defaultPriorityId, setDefaultPriorityId] = useState<number>(2);
  const [supportLevelIds, setSupportLevelIds] = useState<Record<string, number>>({ L1: 1, L2: 2, L3: 3 });

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
      teamId !== ""
    );
  }, [title, description, categoryId, ccEmail, assignedTo, teamId]);

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
      setTeamId("");
    };
    unsavedChangesContext.registerHandlers({ onSave: handleSave, onDiscard: handleDiscard });
    return () => { unsavedChangesContext.unregisterHandlers(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadData() {
      try {
        const [members, fetchedTeams, fetchedStatuses, fetchedPriorities, fetchedCategories, supportLevels, fetchedCompanies] =
          await Promise.all([
            apiBrowser.get<Profile[]>("/users/support"),
            apiBrowser.get<Team[]>("/teams"),
            apiBrowser.get<TicketStatusRow[]>("/lookup/statuses"),
            apiBrowser.get<TicketPriorityRow[]>("/lookup/priorities"),
            apiBrowser.get<TicketCategoryRow[]>("/lookup/categories"),
            apiBrowser.get<{ id: number; name: string }[]>("/lookup/support-levels"),
            apiBrowser.get<Company[]>("/companies"),
          ]);
        setSupportMembers(members);
        setTeams(fetchedTeams);
        setStatuses(fetchedStatuses);
        setPriorities(fetchedPriorities);
        setCategories(fetchedCategories);
        setCompanies(fetchedCompanies);

        const newStatus = fetchedStatuses.find((s) => s.name === "new");
        const mediumPriority = fetchedPriorities.find((p) => p.name === "medium");
        const levelMap: Record<string, number> = {};
        for (const sl of supportLevels) levelMap[sl.name] = sl.id;
        if (Object.keys(levelMap).length > 0) setSupportLevelIds(levelMap);

        if (newStatus) { setDefaultStatusId(newStatus.id); setStatusId(newStatus.id); }
        if (mediumPriority) { setDefaultPriorityId(mediumPriority.id); setPriorityId(mediumPriority.id); }
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

      if (!teamId) {
        setError("Please select a team");
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

      const selectedTeam = teams.find((t) => t.id === teamId);
      const levelKey = selectedTeam?.support_level ?? "L1";
      const resolvedSupportLevelId = supportLevelIds[levelKey] ?? supportLevelIds.L1 ?? 1;

      const ticket = await apiBrowser.post<{ id: string }>("/tickets", {
        title,
        description,
        category_id: categoryId,
        cc_email: ccEmail.trim() ? ccEmail.trim().toLowerCase() : null,
        priority_id: priorityId,
        status_id: resolvedStatusId,
        assigned_to: assignedTo || null,
        team_id: teamId,
        company_id: companyId || null,
        support_level_id: resolvedSupportLevelId,
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
              <Label htmlFor="team">Team *</Label>
              <Select
                value={teamId || "none"}
                onValueChange={(value) =>
                  setTeamId(value === "none" ? "" : value)
                }
                disabled={loading}
              >
                <SelectTrigger id="team">
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select team...
                  </SelectItem>
                  {teams.filter((t) => t.team_type === "support").length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-blue-600">Support</div>
                      {teams
                        .filter((t) => t.team_type === "support")
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                            {team.support_level ? ` (${team.support_level})` : ""}
                          </SelectItem>
                        ))}
                    </>
                  )}
                  {teams.filter((t) => t.team_type === "business").length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-purple-600">Business</div>
                      {teams
                        .filter((t) => t.team_type === "business")
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                    </>
                  )}
                  {teams.filter((t) => t.team_type === "engineering").length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-red-600">Engineering</div>
                      {teams
                        .filter((t) => t.team_type === "engineering")
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {!teamId && (
                <p className="text-xs text-gray-500">
                  Select the team this ticket should be routed to
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Select
                value={companyId || "none"}
                onValueChange={(value) =>
                  setCompanyId(value === "none" ? "" : value)
                }
                disabled={loading}
              >
                <SelectTrigger id="company">
                  <SelectValue placeholder="No company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No company</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Optionally associate this ticket with a client company
              </p>
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
