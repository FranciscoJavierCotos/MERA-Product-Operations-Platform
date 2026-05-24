"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { getEscalationHistory } from "@/lib/supabase/queries/teams";
import {
  EscalationHistory as EscalationHistoryType,
  SUPPORT_LEVEL_CONFIG,
} from "@/types/team.types";
import { formatRelativeTime } from "@/lib/utils/date";
import { ArrowRight, History } from "lucide-react";

interface EscalationHistoryProps {
  ticketId: string;
  initialHistory?: EscalationHistoryType[];
}

export function EscalationHistory({
  ticketId,
  initialHistory,
}: EscalationHistoryProps) {
  const supabase = useMemo(() => createClient(), []);
  const [history, setHistory] = useState<EscalationHistoryType[]>(
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
        const data = await getEscalationHistory(supabase, ticketId);
        setHistory(data);
      } catch (err) {
        console.error("Error loading escalation history:", err);
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
            Escalation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return null; // Don't show card if no history
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Escalation History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0"
            >
              {entry.user && (
                <UserAvatar
                  name={entry.user.full_name}
                  avatarUrl={entry.user.avatar_url}
                  className="h-8 w-8 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {entry.user?.full_name || "System"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(entry.created_at)}
                  </span>
                </div>

                {/* Support Level Change */}
                {entry.from_support_level && entry.to_support_level && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-gray-500">Level:</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        SUPPORT_LEVEL_CONFIG[entry.from_support_level].color
                      }`}
                    >
                      {SUPPORT_LEVEL_CONFIG[entry.from_support_level].label}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        SUPPORT_LEVEL_CONFIG[entry.to_support_level].color
                      }`}
                    >
                      {SUPPORT_LEVEL_CONFIG[entry.to_support_level].label}
                    </Badge>
                  </div>
                )}

                {/* Support Team Change */}
                {entry.from_team || entry.to_team ? (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">Team:</span>
                    <span className="text-xs">
                      {entry.from_team?.name || "None"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="text-xs font-medium">
                      {entry.to_team?.name || "None"}
                    </span>
                  </div>
                ) : null}

                {/* Functional Team Change */}
                {entry.from_functional_team || entry.to_functional_team ? (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">Department:</span>
                    <span className="text-xs">
                      {entry.from_functional_team?.name || "None"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="text-xs font-medium">
                      {entry.to_functional_team?.name || "None"}
                    </span>
                  </div>
                ) : null}

                {/* Notes */}
                {entry.notes && (
                  <p className="text-xs text-gray-600 mt-2 italic">
                    &quot;{entry.notes}&quot;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
