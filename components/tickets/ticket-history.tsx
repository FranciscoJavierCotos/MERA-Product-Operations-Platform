"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { getTicketHistory } from "@/lib/supabase/queries/tickets";
import type { TicketHistory } from "@/types/ticket.types";
import { formatDateTime } from "@/lib/utils/date";
import { ArrowRight, History } from "lucide-react";

interface TicketHistoryProps {
  ticketId: string;
  initialHistory?: TicketHistory[];
}

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  status: "Status",
  priority: "Priority",
  assigned_to: "Assigned To",
  team_id: "Support Team",
  functional_team_id: "Functional Department",
  support_level: "Support Level",
  category: "Category",
  cc_email: "CC Email",
  client_temperature: "Client Temperature",
  time_worked_minutes: "Time Worked (min)",
  tags: "Tags",
};


const normalizeValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "None";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const resolveValue = (
  value?: string | null,
  label?: string | null,
) => {
  if (label && label.length > 0) return label;
  return normalizeValue(value);
};


export function TicketHistory({
  ticketId,
  initialHistory,
}: TicketHistoryProps) {
  const supabase = useMemo(() => createClient(), []);
  const [history, setHistory] = useState<TicketHistory[]>(
    initialHistory ?? [],
  );
  const [isLoading, setIsLoading] = useState(!initialHistory);
  const didInitFromProps = useRef(false);

  useEffect(() => {
    if (didInitFromProps.current) return;
    didInitFromProps.current = true;
    if (initialHistory) {
      setHistory(initialHistory);
      setIsLoading(false);
    }
  }, [initialHistory]);

  useEffect(() => {
    if (initialHistory) return;

    async function loadHistory() {
      setIsLoading(true);
      try {
        const data = await getTicketHistory(supabase, ticketId);
        setHistory(data);
      } catch (err) {
        console.error("Error loading ticket history:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [initialHistory, supabase, ticketId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Ticket History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="border-slate-200/70 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Ticket History
          </CardTitle>
          <span className="rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
            {history.length} {history.length === 1 ? "event" : "events"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-slate-100">
          {history.map((entry) => {
            const fieldLabel = entry.field_name
              ? FIELD_LABELS[entry.field_name] || entry.field_name
              : "Ticket";
            const oldLabel = entry.metadata?.old_label as string | undefined;
            const newLabel = entry.metadata?.new_label as string | undefined;

            return (
              <div key={entry.id} className="py-4">
                <div className="flex items-start gap-3">
                  {entry.user && (
                    <UserAvatar
                      name={entry.user.full_name}
                      avatarUrl={entry.user.avatar_url}
                      className="h-9 w-9 flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {entry.user?.full_name || "System"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-800">
                        {fieldLabel}
                      </span>
                      {entry.action === "ticket_created" ? (
                        <span className="ml-2 text-slate-500">created</span>
                      ) : (
                        <span className="ml-2 inline-flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                            {resolveValue(entry.old_value, oldLabel)}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                          <span className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white">
                            {resolveValue(entry.new_value, newLabel)}
                          </span>
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
