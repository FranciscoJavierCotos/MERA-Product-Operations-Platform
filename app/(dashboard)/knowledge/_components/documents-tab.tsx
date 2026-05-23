"use client";

import { useMemo, useRef, useState, useTransition } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  RefreshCw,
  Archive,
  Trash2,
  FileText,
  Search,
} from "lucide-react";
import type {
  KbCollection,
  KbDocumentWithVersion,
  KbTag,
} from "@/types/knowledge.types";
import {
  uploadDocumentAction,
  archiveDocumentAction,
  deleteDocumentAction,
  reprocessVersionAction,
} from "../actions";
import { formatRelativeTime } from "@/lib/utils/date";
import { DocumentDetailDrawer } from "./document-detail-drawer";

interface Props {
  documents: KbDocumentWithVersion[];
  collections: KbCollection[];
  tags: KbTag[];
  isAdmin: boolean;
}

const STATUS_BADGE: Record<
  number,
  { label: string; className: string }
> = {
  1: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  2: { label: "Processing", className: "bg-blue-100 text-blue-800" },
  3: { label: "Ready", className: "bg-emerald-100 text-emerald-800" },
  4: { label: "Failed", className: "bg-red-100 text-red-800" },
  5: { label: "Archived", className: "bg-gray-100 text-gray-700" },
};

export function DocumentsTab({
  documents,
  collections,
  tags,
  isAdmin,
}: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<string>("all");
  const [archivedFilter, setArchivedFilter] = useState<"active" | "archived" | "all">("active");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState<KbDocumentWithVersion | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (search && !d.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (collectionFilter !== "all" && d.collection_id !== collectionFilter)
        return false;
      if (archivedFilter === "active" && d.archived_at) return false;
      if (archivedFilter === "archived" && !d.archived_at) return false;
      return true;
    });
  }, [documents, search, collectionFilter, archivedFilter]);

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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Documentation</CardTitle>
              <div className="text-sm text-gray-600 mt-1">
                PDF documents ingested into the knowledge base. Each upload is
                chunked and embedded automatically.
              </div>
            </div>
            {isAdmin && (
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-8"
                placeholder="Search documents…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="text-sm border rounded-md px-2 py-1.5 bg-white"
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
            >
              <option value="all">All collections</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="text-sm border rounded-md px-2 py-1.5 bg-white"
              value={archivedFilter}
              onChange={(e) =>
                setArchivedFilter(
                  e.target.value as "active" | "archived" | "all",
                )
              }
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Collection</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Updated</TableHead>
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
                    No documents yet.
                    {isAdmin && (
                      <>
                        {" "}
                        <button
                          className="text-primary hover:underline"
                          onClick={() => setUploadOpen(true)}
                        >
                          Upload the first one.
                        </button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((d) => {
                const status = d.current_version?.status_id ?? 1;
                const badge = STATUS_BADGE[status] ?? STATUS_BADGE[1];
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <button
                        className="text-primary hover:underline flex items-center gap-2 text-left"
                        onClick={() => setDetailDoc(d)}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate max-w-[280px]">
                          {d.title}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {d.collection?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-gray-600">
                      v{d.current_version?.version_number ?? "?"}
                    </TableCell>
                    <TableCell>
                      <Badge className={badge.className}>{badge.label}</Badge>
                      {d.archived_at && (
                        <Badge variant="outline" className="ml-2">
                          Archived
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {d.chunk_count}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatRelativeTime(d.updated_at)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {isAdmin && (
                        <>
                          {d.current_version && status !== 2 && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() =>
                                runAction("Reprocess", () =>
                                  reprocessVersionAction(
                                    d.current_version!.id,
                                  ),
                                )
                              }
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Reprocess
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() =>
                              runAction(
                                d.archived_at ? "Unarchive" : "Archive",
                                () =>
                                  archiveDocumentAction(d.id, !d.archived_at),
                              )
                            }
                          >
                            <Archive className="h-3 w-3 mr-1" />
                            {d.archived_at ? "Unarchive" : "Archive"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (
                                !confirm(
                                  `Delete "${d.title}"? This removes all versions and chunks. This cannot be undone.`,
                                )
                              )
                                return;
                              runAction("Delete", () =>
                                deleteDocumentAction(d.id),
                              );
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UploadDocumentDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        collections={collections}
        tags={tags}
      />

      <DocumentDetailDrawer
        document={detailDoc}
        onClose={() => setDetailDoc(null)}
      />
    </>
  );
}

function UploadDocumentDialog({
  open,
  onClose,
  collections,
  tags,
}: {
  open: boolean;
  onClose: () => void;
  collections: KbCollection[];
  tags: KbTag[];
}) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await uploadDocumentAction(fd);
      if (!res.ok) {
        toast({
          title: "Upload failed",
          description: res.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Uploaded",
          description: "Processing started. Refresh in a few seconds to see chunks.",
        });
        formRef.current?.reset();
        setFileName(null);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Upload PDF Document</DialogTitle>
          <DialogDescription>
            Text is extracted, chunked (~800 tokens with 100-token overlap),
            and embedded with Gemini for retrieval. Up to 50 MB.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input name="title" required minLength={3} maxLength={200} />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input name="description" maxLength={2000} />
          </div>
          <div>
            <label className="text-sm font-medium">Collection</label>
            <select
              name="collection_id"
              className="w-full border rounded-md px-2 py-2 bg-white"
              defaultValue=""
            >
              <option value="">— None —</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {tags.length > 0 && (
            <div>
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {tags.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-1 text-xs border rounded-full px-2 py-1 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      name="tag_ids"
                      value={t.id}
                      className="h-3 w-3"
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">PDF file *</label>
            <Input
              type="file"
              name="file"
              accept="application/pdf"
              required
              onChange={(e) =>
                setFileName(e.target.files?.[0]?.name ?? null)
              }
            />
            {fileName && (
              <div className="text-xs text-gray-500 mt-1">{fileName}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
