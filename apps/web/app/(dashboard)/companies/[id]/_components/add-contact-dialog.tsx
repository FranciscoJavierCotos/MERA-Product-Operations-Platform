"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  companyContactSchema,
  type CompanyContactFormData,
} from "@/lib/validations/company.schema";

interface AddContactDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: CompanyContactFormData) => void;
  isPending: boolean;
}

export function AddContactDialog({
  open,
  onClose,
  onAdd,
  isPending,
}: AddContactDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyContactFormData>({
    resolver: zodResolver(companyContactSchema),
    defaultValues: {
      full_name: "",
      email: "",
      title: "",
      phone: "",
      is_primary: false,
    },
  });

  const isPrimary = watch("is_primary");

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = (data: CompanyContactFormData) => {
    onAdd(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name">Full name</Label>
            <Input id="contact-name" {...register("full_name")} />
            {errors.full_name && (
              <p className="text-xs text-red-600">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-title">Title</Label>
              <Input id="contact-title" placeholder="e.g. IT Manager" {...register("title")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" placeholder="+1-555-0100" {...register("phone")} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch
              checked={!!isPrimary}
              onCheckedChange={(c) => setValue("is_primary", c === true)}
            />
            Primary contact
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
