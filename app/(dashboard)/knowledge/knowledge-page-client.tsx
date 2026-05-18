"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type {
  KbCollection,
  KbDocumentWithVersion,
  KbResolutionRow,
  KbRetrievalConfig,
  KbTag,
  KbAuditLog,
} from "@/types/knowledge.types";
import { ResolutionsTab } from "./_components/resolutions-tab";
import { DocumentsTab } from "./_components/documents-tab";
import { SettingsTab } from "./_components/settings-tab";

interface Props {
  isAdmin: boolean;
  resolutions: KbResolutionRow[];
  documents: KbDocumentWithVersion[];
  collections: KbCollection[];
  tags: KbTag[];
  retrievalConfig: KbRetrievalConfig;
  auditLog: KbAuditLog[];
}

export function KnowledgePageClient({
  isAdmin,
  resolutions,
  documents,
  collections,
  tags,
  retrievalConfig,
  auditLog,
}: Props) {
  const [tab, setTab] = useState("resolutions");

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList>
        <TabsTrigger value="resolutions">
          Resolutions ({resolutions.length})
        </TabsTrigger>
        <TabsTrigger value="documents">
          Documents ({documents.length})
        </TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="resolutions" className="mt-4">
        <ResolutionsTab rows={resolutions} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <DocumentsTab
          documents={documents}
          collections={collections}
          tags={tags}
          isAdmin={isAdmin}
        />
      </TabsContent>

      <TabsContent value="settings" className="mt-4">
        <SettingsTab
          config={retrievalConfig}
          collections={collections}
          auditLog={auditLog}
          isAdmin={isAdmin}
        />
      </TabsContent>
    </Tabs>
  );
}
