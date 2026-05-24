"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/lib/hooks/use-toast";
import { Search, RefreshCw, Archive, Check } from "lucide-react";
import type { KbResolutionRow } from "@/types/knowledge.types";
import {
  toggleResolutionAiAction,
  archiveResolutionAction,
  reembedResolutionAction,
} from "../actions";
import { formatTicketNumber } from "@/lib/utils/format";
import { formatRelativeTime } from "@/lib/utils/date";

interface Props {
  rows: KbResolutionRow[];
  isAdmin: boolean;
}

type AiFilter = "all" | "enabled" | "disabled";
type ArchiveFilter = "active" | "archived" | "all";

export function ResolutionsTab({ rows, isAdmin }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [aiFilter, setAiFilter] = useState<AiFilter>("all");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (
        search &&
        !`${r.title} ${r.resolution_plain ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ) {
        return false;
      }
      if (aiFilter === "enabled" && !r.ai_retrieval_enabled) return false;
      if (aiFilter === "disabled" && r.ai_retrieval_enabled) return false;
      if (archiveFilter === "active" && r.archived_at) return false;
      if (archiveFilter === "archived" && !r.archived_at) return false;
      return true;
    });
  }, [rows, search, aiFilter, archiveFilter]);

  function runAction<T>(
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string } & T>,
  ) {
    startTransition(async () => {
      try {
        const res = await fn();
        if (!res.ok) {
          toast({
            title: `${label} failed`,
            description: res.error ?? "Unknown error",
            variant: "destructive",
          });
        } else {
          toast({ title: label, description: "Done." });
        }
      } catch (e) {
        toast({
          title: `${label} failed`,
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ticket Resolutions</CardTitle>
        <div className="text-sm text-gray-600">
          Resolved tickets stored as 768-dim embeddings. Toggle, archive, or
          regenerate them to control what the AI can retrieve.
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-8"
              placeholder="Search title or resolution textâ€¦"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <FilterPill
            label="All"
            active={aiFilter === "all"}
            onClick={() => setAiFilter("all")}
          />
          <FilterPill
            label="AI enabled"
            active={aiFilter === "enabled"}
            onClick={() => setAiFilter("enabled")}
          />
          <FilterPill
            label="AI disabled"
            active={aiFilter === "disabled"}
            onClick={() => setAiFilter("disabled")}
          />
          <span className="text-gray-300 mx-1">|</span>
          <FilterPill
            label="Active"
            active={archiveFilter === "active"}
            onClick={() => setArchiveFilter("active")}
          />
          <FilterPill
            label="Archived"
            active={archiveFilter === "archived"}
            onClick={() => setArchiveFilter("archived")}
          />
          <FilterPill
            label="All"
            active={archiveFilter === "all"}
            onClick={() => setArchiveFilter("all")}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Resolved</TableHead>
              <TableHead>Embedding</TableHead>
              <TableHead>AI</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-gray-500 py-8"
                >
                  No resolutions match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.ticket_id}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/tickets/${r.ticket_id}`}
                    className="text-primary hover:underline"
                  >
                    {formatTicketNumber(r.ticket_number)}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[280px] truncate">
                  {r.title}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {r.category ?? "â€”"}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {r.resolved_at ? formatRelativeTime(r.resolved_at) : "â€”"}
                </TableCell>
                <TableCell>
                  {r.has_embedding ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      <Check className="h-3 w-3 mr-1" />
                      Indexed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-700">
                      Regenerating
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={r.ai_retrieval_enabled ? "default" : "secondary"}
                    className={
                      r.ai_retrieval_enabled
                        ? "bg-primary hover:bg-primary-700"
                        : ""
                    }
                  >
                    {r.ai_retrieval_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {r.archived_at && (
                    <Badge variant="outline" className="ml-2">
                      Archived
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          runAction("Toggle AI", () =>
                            toggleResolutionAiAction({
                              ticket_id: r.ticket_id,
                              ai_retrieval_enabled: !r.ai_retrieval_enabled,
                            }),
                          )
                        }
                      >
                        {r.ai_retrieval_enabled ? "Disable AI" : "Enable AI"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          runAction("Re-embed", () =>
                            reembedResolutionAction(r.ticket_id),
                          )
                        }
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Re-embed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          runAction(
                            r.archived_at ? "Unarchive" : "Archive",
                            () =>
                              archiveResolutionAction({
                                ticket_id: r.ticket_id,
                                archive: !r.archived_at,
                              }),
                          )
                        }
                      >
                        <Archive className="h-3 w-3 mr-1" />
                        {r.archived_at ? "Unarchive" : "Archive"}
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? "bg-primary text-white border-primary"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
