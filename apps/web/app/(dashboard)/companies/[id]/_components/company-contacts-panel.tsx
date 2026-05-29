"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Star, Mail, Phone, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiBrowser } from "@/lib/api-client-browser";
import { useToast } from "@/lib/hooks/use-toast";
import type { CompanyContact } from "@/types/company.types";
import type { CompanyContactFormData } from "@/lib/validations/company.schema";
import { AddContactDialog } from "./add-contact-dialog";

interface CompanyContactsPanelProps {
  companyId: string;
  initialContacts: CompanyContact[];
}

export function CompanyContactsPanel({
  companyId,
  initialContacts,
}: CompanyContactsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const queryKey = ["company-contacts", companyId] as const;

  const { data: contacts = initialContacts } = useQuery({
    queryKey,
    queryFn: () =>
      apiBrowser.get<CompanyContact[]>(`/companies/${companyId}/contacts`),
    initialData: initialContacts,
  });

  const addMutation = useMutation({
    mutationFn: (input: CompanyContactFormData) =>
      apiBrowser.post<CompanyContact>(`/companies/${companyId}/contacts`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setAddOpen(false);
      toast({ title: "Contact added" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add contact", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (contactId: string) =>
      apiBrowser.del(`/companies/${companyId}/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setRemovingId(null);
      toast({ title: "Contact removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove contact", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Contacts</CardTitle>
            <CardDescription>
              {contacts.length} {contacts.length === 1 ? "contact" : "contacts"} at this company
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add contact
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {contacts.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              No contacts yet. Add someone to get started.
            </div>
          ) : (
            <ul className="divide-y dark:divide-gray-800">
              {contacts.map((contact) => (
                <li key={contact.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {contact.full_name}
                      {contact.is_primary && (
                        <Star className="inline h-3 w-3 ml-1 text-amber-500 fill-amber-500" />
                      )}
                      {contact.title && (
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          {contact.title}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-primary truncate">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </a>
                      {contact.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-red-500"
                    onClick={() => setRemovingId(contact.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddContactDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        isPending={addMutation.isPending}
        onAdd={(data) => addMutation.mutate(data)}
      />

      <Dialog open={!!removingId} onOpenChange={(open) => !open && setRemovingId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove contact?</DialogTitle>
            <DialogDescription>
              This contact will be removed from the company.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => removingId && removeMutation.mutate(removingId)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
