"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/hooks/use-toast";
import {
  saveRetrievalConfigAction,
  saveCollectionAction,
  archiveCollectionAction,
} from "../actions";
import type {
  KbAuditLog,
  KbCollection,
  KbRetrievalConfig,
  KbSourceWeights,
  KbSourcesEnabled,
} from "@/types/knowledge.types";
import { formatRelativeTime } from "@/lib/utils/date";

interface Props {
  config: KbRetrievalConfig;
  collections: KbCollection[];
  auditLog: KbAuditLog[];
  isAdmin: boolean;
}

export function SettingsTab({ config, collections, auditLog, isAdmin }: Props) {
  return (
    <div className="space-y-6">
      <RetrievalConfigCard config={config} isAdmin={isAdmin} />
      <CollectionsCard collections={collections} isAdmin={isAdmin} />
      {isAdmin && <AuditLogCard log={auditLog} />}
    </div>
  );
}

function RetrievalConfigCard({
  config,
  isAdmin,
}: {
  config: KbRetrievalConfig;
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const weights = config.source_weights as unknown as KbSourceWeights;
  const enabled = config.sources_enabled as unknown as KbSourcesEnabled;
  const [threshold, setThreshold] = useState(config.similarity_threshold);
  const [maxResults, setMaxResults] = useState(config.max_results);
  const [resWeight, setResWeight] = useState(weights.resolution ?? 1);
  const [docWeight, setDocWeight] = useState(weights.document ?? 1);
  const [resEnabled, setResEnabled] = useState(enabled.resolution ?? true);
  const [docEnabled, setDocEnabled] = useState(enabled.document ?? true);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveRetrievalConfigAction({
        similarity_threshold: threshold,
        max_results: maxResults,
        source_weights: { resolution: resWeight, document: docWeight },
        sources_enabled: { resolution: resEnabled, document: docEnabled },
      });
      if (!res.ok) {
        toast({
          title: "Save failed",
          description: res.error,
          variant: "destructive",
        });
      } else {
        toast({ title: "Saved", description: "Retrieval settings updated." });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retrieval Settings</CardTitle>
        <div className="text-sm text-gray-600">
          Tune how the AI Recommendation engine selects results. Changes apply
          immediately to every ticket retrieval.
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium">
              Similarity threshold: {threshold.toFixed(2)}
            </label>
            <input
              type="range"
              min={0.5}
              max={0.95}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              disabled={!isAdmin}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              Results below this cosine similarity score are dropped.
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Max results</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              disabled={!isAdmin}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SourceBlock
            title="Ticket Resolutions"
            enabled={resEnabled}
            onToggle={setResEnabled}
            weight={resWeight}
            onWeight={setResWeight}
            disabled={!isAdmin}
          />
          <SourceBlock
            title="Documentation"
            enabled={docEnabled}
            onToggle={setDocEnabled}
            weight={docWeight}
            onWeight={setDocWeight}
            disabled={!isAdmin}
          />
        </div>

        {isAdmin && (
          <div className="flex justify-end">
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Savingâ€¦" : "Save settings"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SourceBlock({
  title,
  enabled,
  onToggle,
  weight,
  onWeight,
  disabled,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  weight: number;
  onWeight: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="border rounded-md p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{title}</span>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled}
          />
          Enabled
        </label>
      </div>
      <div>
        <label className="text-xs text-gray-600">
          Weight: {weight.toFixed(2)}
        </label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={weight}
          onChange={(e) => onWeight(Number(e.target.value))}
          disabled={disabled || !enabled}
          className="w-full"
        />
      </div>
    </div>
  );
}

function CollectionsCard({
  collections,
  isAdmin,
}: {
  collections: KbCollection[];
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function create() {
    if (!name.trim() || !slug.trim()) return;
    startTransition(async () => {
      const res = await saveCollectionAction({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
      });
      if (!res.ok) {
        toast({
          title: "Save failed",
          description: res.error,
          variant: "destructive",
        });
      } else {
        toast({ title: "Collection created" });
        setName("");
        setSlug("");
        setDescription("");
      }
    });
  }

  function archive(id: string, archived: boolean) {
    startTransition(async () => {
      const res = await archiveCollectionAction(id, !archived);
      if (!res.ok) {
        toast({
          title: "Update failed",
          description: res.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections</CardTitle>
        <div className="text-sm text-gray-600">
          Group documents into logical buckets (e.g. Runbooks, Product Docs).
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div>
              <label className="text-xs font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Runbooks"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Slug</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="runbooks"
              />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium">Description</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button onClick={create} disabled={isPending}>
                Create
              </Button>
            </div>
          </div>
        )}
        <div className="border rounded-md divide-y">
          {collections.length === 0 && (
            <div className="p-3 text-sm text-gray-500">
              No collections yet.
            </div>
          )}
          {collections.map((c) => (
            <div
              key={c.id}
              className="p-3 flex items-center justify-between text-sm"
            >
              <div>
                <div className="font-medium flex items-center gap-2">
                  {c.name}
                  {c.archived_at && <Badge variant="outline">Archived</Badge>}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {c.slug}
                </div>
                {c.description && (
                  <div className="text-xs text-gray-600 mt-1">
                    {c.description}
                  </div>
                )}
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => archive(c.id, !!c.archived_at)}
                >
                  {c.archived_at ? "Unarchive" : "Archive"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AuditLogCard({ log }: { log: KbAuditLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <div className="text-sm text-gray-600">
          Latest changes across the knowledge base.
        </div>
      </CardHeader>
      <CardContent>
        {log.length === 0 ? (
          <div className="text-sm text-gray-500">No activity yet.</div>
        ) : (
          <div className="border rounded-md divide-y">
            {log.map((entry) => (
              <div
                key={entry.id}
                className="p-3 text-sm flex items-center justify-between"
              >
                <div>
                  <span className="font-mono text-xs text-gray-500">
                    {entry.entity_type}
                  </span>
                  <span className="mx-2">Â·</span>
                  <span className="font-medium">{entry.action}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatRelativeTime(entry.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
