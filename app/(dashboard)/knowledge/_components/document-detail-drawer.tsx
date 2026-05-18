"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type {
  KbDocumentWithVersion,
  KbDocumentChunk,
  KbDocumentVersion,
} from "@/types/knowledge.types";
import { formatRelativeTime } from "@/lib/utils/date";

interface Props {
  document: KbDocumentWithVersion | null;
  onClose: () => void;
}

export function DocumentDetailDrawer({ document, onClose }: Props) {
  const [versions, setVersions] = useState<KbDocumentVersion[]>([]);
  const [chunks, setChunks] = useState<KbDocumentChunk[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();

    (async () => {
      const [vRes, cRes] = await Promise.all([
        supabase
          .from("kb_document_versions")
          .select("*")
          .eq("document_id", document.id)
          .order("version_number", { ascending: false }),
        document.current_version_id
          ? supabase
              .from("kb_document_chunks")
              .select(
                "id, document_id, document_version_id, chunk_index, content, content_tokens, page_number, metadata, created_at",
              )
              .eq("document_version_id", document.current_version_id)
              .order("chunk_index", { ascending: true })
              .limit(20)
          : Promise.resolve({ data: [] as KbDocumentChunk[] }),
      ]);
      if (cancelled) return;
      setVersions((vRes.data ?? []) as KbDocumentVersion[]);
      setChunks(
        ((cRes as { data: KbDocumentChunk[] | null }).data ?? []) as KbDocumentChunk[],
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [document]);

  return (
    <Dialog
      open={!!document}
      onOpenChange={(v) => !v && onClose()}
    >
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        {document && (
          <>
            <DialogHeader>
              <DialogTitle>{document.title}</DialogTitle>
              {document.description && (
                <DialogDescription>{document.description}</DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Metadata
                </h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-gray-500">Collection</dt>
                  <dd>{document.collection?.name ?? "—"}</dd>
                  <dt className="text-gray-500">AI retrieval</dt>
                  <dd>
                    {document.ai_retrieval_enabled ? (
                      <Badge className="bg-indigo-600 hover:bg-indigo-600">
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </dd>
                  <dt className="text-gray-500">Chunks</dt>
                  <dd>{document.chunk_count}</dd>
                  <dt className="text-gray-500">Updated</dt>
                  <dd>{formatRelativeTime(document.updated_at)}</dd>
                  <dt className="text-gray-500">Tags</dt>
                  <dd className="flex flex-wrap gap-1">
                    {document.tags.length === 0 && "—"}
                    {document.tags.map((t) => (
                      <Badge key={t.id} variant="outline">
                        {t.name}
                      </Badge>
                    ))}
                  </dd>
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Version history
                </h3>
                <div className="border rounded-md divide-y">
                  {versions.length === 0 && (
                    <div className="p-3 text-sm text-gray-500">
                      {loading ? "Loading…" : "No versions."}
                    </div>
                  )}
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 text-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">v{v.version_number}</div>
                        <div className="text-xs text-gray-500">
                          {v.original_filename} ·{" "}
                          {Math.round(v.file_size_bytes / 1024)} KB ·{" "}
                          {v.page_count ?? "?"} pages
                        </div>
                        {v.processing_error && (
                          <div className="text-xs text-red-600 mt-1">
                            {v.processing_error}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {formatRelativeTime(v.created_at)}
                        {v.processed_at && (
                          <div>
                            done {formatRelativeTime(v.processed_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Chunk preview ({chunks.length}{" "}
                  {chunks.length === 20 ? "of many" : "total"})
                </h3>
                {loading && (
                  <div className="text-sm text-gray-500">Loading chunks…</div>
                )}
                {!loading && chunks.length === 0 && (
                  <div className="text-sm text-gray-500">
                    No chunks yet. If status is Pending or Processing, refresh
                    in a moment.
                  </div>
                )}
                <div className="space-y-2">
                  {chunks.map((c) => (
                    <div
                      key={c.id}
                      className="border rounded-md p-3 text-xs bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-1 text-gray-500">
                        <span>
                          Chunk #{c.chunk_index}
                          {c.page_number !== null && ` · page ${c.page_number}`}
                        </span>
                        <span>{c.content_tokens ?? "?"} tokens</span>
                      </div>
                      <div className="whitespace-pre-wrap break-words text-gray-800">
                        {c.content}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
