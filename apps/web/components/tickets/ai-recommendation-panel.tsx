"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, Ticket as TicketIcon } from "lucide-react";
import { useToast } from "@/lib/hooks/use-toast";
import { recommendForTicketAction } from "@/app/(dashboard)/knowledge/actions";

interface Match {
  source_type: "resolution" | "document";
  source_id: string;
  chunk_id: string | null;
  title: string;
  snippet: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

interface Props {
  ticketId: string;
}

export function AiRecommendationPanel({ ticketId }: Props) {
  const { toast } = useToast();
  const [results, setResults] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await recommendForTicketAction(ticketId);
      if (!res.ok) {
        setError(res.error ?? "Unknown error");
        toast({
          title: "Retrieval failed",
          description: res.error,
          variant: "destructive",
        });
        return;
      }
      setResults((res.results ?? []) as Match[]);
    });
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Research
          </CardTitle>
          <Button onClick={run} disabled={isPending} size="sm">
            {isPending
              ? "Searchingâ€¦"
              : results === null
                ? "Search"
                : "Refresh"}
          </Button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Searches resolved tickets and uploaded documentation for content
          similar to this ticket&apos;s description.
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-red-600 mb-3">{error}</div>
        )}
        {results === null && !error && (
          <div className="text-sm text-gray-500">
            Click <strong>Search</strong> to retrieve relevant past resolutions
            and documentation.
          </div>
        )}
        {results !== null && results.length === 0 && (
          <div className="text-sm text-gray-500">
            No matches above the current similarity threshold. Try lowering it
            in AI Knowledge â†’ Settings.
          </div>
        )}
        {results !== null && results.length > 0 && (
          <ul className="space-y-3">
            {results.map((r, i) => (
              <li
                key={`${r.source_id}-${r.chunk_id ?? "res"}-${i}`}
                className="border rounded-md p-3 bg-gray-50"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.source_type === "resolution" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        <TicketIcon className="h-3 w-3 mr-1" />
                        Resolution
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                        <FileText className="h-3 w-3 mr-1" />
                        Document
                      </Badge>
                    )}
                    <span className="font-medium truncate">{r.title}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                    {(Number(r.similarity) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">
                  {r.snippet}
                </p>
                <div className="mt-2">
                  {r.source_type === "resolution" ? (
                    <Link
                      href={`/tickets/${r.source_id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Open ticket â†’
                    </Link>
                  ) : (
                    <Link
                      href={`/knowledge`}
                      className="text-xs text-primary hover:underline"
                    >
                      Open in Knowledge Center â†’
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
