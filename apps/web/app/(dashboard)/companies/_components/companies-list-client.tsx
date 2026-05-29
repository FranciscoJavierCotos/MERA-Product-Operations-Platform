"use client";

import { useState, useTransition } from "react";
import {
  Building2,
  Search,
  Plus,
  Smile,
  Meh,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/lib/hooks/use-toast";
import type { CompanyFormData } from "@/lib/validations/company.schema";
import type { Company } from "@/types/company.types";
import { healthSentiment } from "@/types/company.types";
import type { Profile } from "@/types/user.types";
import { CompanyCard } from "./company-card";
import { CompanyForm } from "./company-form";
import {
  createCompanyAction,
  updateCompanyAction,
  deleteCompanyAction,
} from "../actions";

interface CompaniesListClientProps {
  initialCompanies: Company[];
  profiles: Profile[];
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        No {label} companies found.
      </p>
    </div>
  );
}

function CompanyGrid({
  companies,
  emptyLabel,
  onEdit,
  onDelete,
}: {
  companies: Company[];
  emptyLabel: string;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
}) {
  if (companies.length === 0) return <EmptyState label={emptyLabel} />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {companies.map((c) => (
        <CompanyCard key={c.id} company={c} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

export function CompaniesListClient({
  initialCompanies,
  profiles,
}: CompaniesListClientProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const filtered = search.trim()
    ? initialCompanies.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.industry?.toLowerCase().includes(search.toLowerCase()) ||
          c.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : initialCompanies;

  const healthy = filtered.filter(
    (c) => healthSentiment(c.healthStatus?.name) === "healthy",
  );
  const neutral = filtered.filter(
    (c) => healthSentiment(c.healthStatus?.name) === "neutral",
  );
  const attention = filtered.filter(
    (c) => healthSentiment(c.healthStatus?.name) === "attention",
  );

  const openAddDialog = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEditDialog = (c: Company) => {
    setEditing(c);
    setDialogOpen(true);
  };
  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (data: CompanyFormData) => {
    startTransition(async () => {
      const result = editing
        ? await updateCompanyAction({ id: editing.id, ...data })
        : await createCompanyAction(data);

      if (!result.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({
        title: editing ? "Company updated" : "Company created",
        description: `"${data.name}" ${editing ? "updated" : "created"} successfully.`,
      });
      closeDialog();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteCompanyAction(deleteTarget.id);
      if (!result.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Company deleted" });
      }
      setDeleteTarget(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search companies…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openAddDialog} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            All
            <Badge variant="secondary" className="ml-1">{filtered.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="healthy" className="gap-1.5">
            <Smile className="h-3.5 w-3.5" />
            Healthy
            <Badge variant="secondary" className="ml-1">{healthy.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="neutral" className="gap-1.5">
            <Meh className="h-3.5 w-3.5" />
            Neutral
            <Badge variant="secondary" className="ml-1">{neutral.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="attention" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Needs Attention
            <Badge variant="secondary" className="ml-1">{attention.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <CompanyGrid companies={filtered} emptyLabel="" onEdit={openEditDialog} onDelete={setDeleteTarget} />
        </TabsContent>
        <TabsContent value="healthy" className="mt-4">
          <CompanyGrid companies={healthy} emptyLabel="healthy" onEdit={openEditDialog} onDelete={setDeleteTarget} />
        </TabsContent>
        <TabsContent value="neutral" className="mt-4">
          <CompanyGrid companies={neutral} emptyLabel="neutral" onEdit={openEditDialog} onDelete={setDeleteTarget} />
        </TabsContent>
        <TabsContent value="attention" className="mt-4">
          <CompanyGrid companies={attention} emptyLabel="at-risk" onEdit={openEditDialog} onDelete={setDeleteTarget} />
        </TabsContent>
      </Tabs>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Company" : "New Company"}</DialogTitle>
          </DialogHeader>
          <CompanyForm
            initialValues={editing ?? undefined}
            profiles={profiles}
            onSubmit={handleSubmit}
            isPending={isPending}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete company?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete{" "}
            <span className="font-medium">{deleteTarget?.name}</span>? Contacts and
            health history will be removed; tickets and projects will be detached.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
