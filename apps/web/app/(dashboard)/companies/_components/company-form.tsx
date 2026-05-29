"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  companySchema,
  type CompanyFormData,
} from "@/lib/validations/company.schema";
import type { Company } from "@/types/company.types";
import type { Profile } from "@/types/user.types";

const NONE = "__none__";

export function CompanyForm({
  initialValues,
  profiles,
  onSubmit,
  isPending,
  onCancel,
}: {
  initialValues?: Partial<Company>;
  profiles: Profile[];
  onSubmit: (data: CompanyFormData) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      industry: initialValues?.industry ?? "",
      website: initialValues?.website ?? "",
      account_owner_id: initialValues?.account_owner_id ?? null,
    },
  });

  const accountOwnerId = watch("account_owner_id");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="company-name">Company name</Label>
        <Input
          id="company-name"
          placeholder="e.g. Acme Corporation"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="company-industry">Industry</Label>
          <Input
            id="company-industry"
            placeholder="e.g. Manufacturing"
            {...register("industry")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="company-website">Website</Label>
          <Input
            id="company-website"
            placeholder="https://example.com"
            {...register("website")}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="company-desc">Description</Label>
        <Textarea
          id="company-desc"
          rows={2}
          placeholder="Optional description"
          {...register("description")}
        />
      </div>

      <div className="space-y-1">
        <Label>Account owner</Label>
        <Select
          value={accountOwnerId ?? NONE}
          onValueChange={(v) =>
            setValue("account_owner_id", v === NONE ? null : v)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
