"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, History, Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/lib/hooks/use-toast";
import { formatRelativeTime } from "@/lib/utils/date";
import type {
  CompanyHealthHistoryEntry,
  CompanyHealthStatus,
} from "@/types/company.types";
import { updateCompanyHealthAction } from "../../actions";

interface CompanyHealthPanelProps {
  companyId: string;
  currentStatus: CompanyHealthStatus | null;
  healthNote: string | null;
  healthUpdatedAt: string | null;
  healthStatuses: CompanyHealthStatus[];
  initialHistory: CompanyHealthHistoryEntry[];
}

// 5-segment meter filled up to `level`.
function HealthMeter({
  level,
  statuses,
}: {
  level: number;
  statuses: CompanyHealthStatus[];
}) {
  const segments = statuses.length > 0 ? statuses.length : 5;
  return (
    <div className="flex items-center gap-1.5" aria-label={`Health level ${level} of ${segments}`}>
      {Array.from({ length: segments }).map((_, i) => {
        const filled = i < level;
        return (
          <div
            key={i}
            className={cn(
              "h-2.5 flex-1 rounded-full transition-colors",
              filled
                ? level <= 1
                  ? "bg-red-500"
                  : level === 2
                    ? "bg-orange-500"
                    : level === 3
                      ? "bg-yellow-500"
                      : level === 4
                        ? "bg-green-500"
                        : "bg-emerald-500"
                : "bg-gray-200 dark:bg-gray-700",
            )}
          />
        );
      })}
    </div>
  );
}

export function CompanyHealthPanel({
  companyId,
  currentStatus,
  healthNote,
  healthUpdatedAt,
  healthStatuses,
  initialHistory,
}: CompanyHealthPanelProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [statusId, setStatusId] = useState<number>(currentStatus?.id ?? 3);
  const [note, setNote] = useState<string>(healthNote ?? "");

  const level = currentStatus?.level ?? 3;
  const emoji = currentStatus?.emoji ?? "🟡";
  const label = currentStatus?.label ?? "Neutral";

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await updateCompanyHealthAction(companyId, {
        health_status_id: statusId,
        health_note: note.trim() ? note.trim() : null,
      });
      if (!result.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Health updated" });
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-gray-400" />
            Account Health
          </CardTitle>
          <CardDescription>How the relationship feels</CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            setStatusId(currentStatus?.id ?? 3);
            setNote(healthNote ?? "");
            setOpen(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
          Update
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              <span aria-hidden className="text-base">{emoji}</span>
              {label}
            </span>
            {healthUpdatedAt && (
              <span className="text-xs text-gray-400">
                {formatRelativeTime(healthUpdatedAt)}
              </span>
            )}
          </div>
          <HealthMeter level={level} statuses={healthStatuses} />
        </div>

        {healthNote && (
          <p className="text-sm text-gray-600 dark:text-gray-400 rounded-md bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
            {healthNote}
          </p>
        )}

        {/* History timeline */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            History
          </h4>
          {initialHistory.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No changes recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {initialHistory.map((h) => (
                <li key={h.id} className="text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {h.from_status && (
                      <>
                        <span aria-hidden>{h.from_status.emoji}</span>
                        <span className="text-gray-500">{h.from_status.label}</span>
                        <span className="text-gray-400">→</span>
                      </>
                    )}
                    <span aria-hidden>{h.to_status?.emoji}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {h.to_status?.label}
                    </span>
                  </div>
                  {h.note && (
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">{h.note}</p>
                  )}
                  <p className="text-gray-400 mt-0.5">
                    {h.changed_by_user?.full_name ?? "Someone"} ·{" "}
                    {formatRelativeTime(h.changed_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      {/* Update dialog */}
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update account health</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Health status</Label>
              <Select
                value={String(statusId)}
                onValueChange={(v) => setStatusId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {healthStatuses.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.emoji} {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="health-note">Note</Label>
              <Textarea
                id="health-note"
                rows={3}
                placeholder="What changed in the relationship?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
