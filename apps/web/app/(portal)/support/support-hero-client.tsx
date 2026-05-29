"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  clientTicketSchema,
  type ClientTicketInput,
} from "@/lib/validations/client-ticket.schema";
import {
  REQUEST_TYPES,
  PRIORITIES,
  DEFAULT_PRIORITY_ID,
  NEW_STATUS_ID,
} from "./options";

type SubmitState = "idle" | "submitting" | "success";

/** A short, human-friendly reference for the confirmation screen. */
function generateReference(): string {
  const code = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MERA-${code}`;
}

const fieldError = "mt-1.5 text-xs text-[hsl(0_85%_72%)]";

export function SupportHeroClient() {
  const [state, setState] = useState<SubmitState>("idle");
  const [reference, setReference] = useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ClientTicketInput>({
    resolver: zodResolver(clientTicketSchema),
    defaultValues: {
      client_name: "",
      client_email: "",
      company: "",
      priority_id: DEFAULT_PRIORITY_ID,
      title: "",
      description: "",
      cc_email: "",
    },
  });

  async function onSubmit(values: ClientTicketInput) {
    setState("submitting");

    // Build the payload in the shape the MERA ticket-create endpoint expects,
    // plus the external markers. `source: "client-portal"` is what lets the
    // backend distinguish these from internal, staff-created tickets.
    const payload = {
      title: values.title,
      description: values.description,
      category_id: values.category_id,
      priority_id: values.priority_id,
      status_id: NEW_STATUS_ID,
      client_name: values.client_name,
      client_email: values.client_email,
      cc_email: values.cc_email ? values.cc_email : null,
      custom_fields: { company: values.company || null },
      source: "client-portal" as const,
      submitted_at: new Date().toISOString(),
    };

    // Simulate an async submission to the API.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    console.log("[MERA] client-portal ticket submission", payload);

    setReference(generateReference());
    setState("success");
  }

  function handleReset() {
    reset();
    setReference("");
    setState("idle");
  }

  return (
    <div className="portal-stagger w-full">
      <Card
        style={{ "--i": 1 } as React.CSSProperties}
        className="cyber-edge relative w-full border-border/70 bg-card/80 backdrop-blur-xl"
      >
        {state === "success" ? (
          <SuccessPanel reference={reference} onReset={handleReset} />
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-xl">Submit a request</CardTitle>
              <CardDescription>
                Tell us what&apos;s going on. We&apos;ll confirm receipt
                instantly and triage within the hour.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-5"
              >
                {/* Identity */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="client_name">Full name</Label>
                    <Input
                      id="client_name"
                      autoComplete="name"
                      placeholder="Jane Doe"
                      className="portal-field mt-1.5"
                      aria-invalid={!!errors.client_name}
                      {...register("client_name")}
                    />
                    {errors.client_name && (
                      <p className={fieldError}>{errors.client_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="client_email">Work email</Label>
                    <Input
                      id="client_email"
                      type="email"
                      autoComplete="email"
                      placeholder="jane@company.com"
                      className="portal-field mt-1.5"
                      aria-invalid={!!errors.client_email}
                      {...register("client_email")}
                    />
                    {errors.client_email && (
                      <p className={fieldError}>
                        {errors.client_email.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Request type + priority */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="category_id">Request type</Label>
                    <Controller
                      control={control}
                      name="category_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ? String(field.value) : undefined}
                          onValueChange={(v) => field.onChange(Number(v))}
                        >
                          <SelectTrigger
                            id="category_id"
                            className="portal-field mt-1.5"
                            aria-invalid={!!errors.category_id}
                          >
                            <SelectValue placeholder="Select a type…" />
                          </SelectTrigger>
                          <SelectContent>
                            {REQUEST_TYPES.map((opt) => {
                              const Icon = opt.icon;
                              return (
                                <SelectItem
                                  key={opt.value}
                                  value={String(opt.value)}
                                >
                                  <span className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-[hsl(188_90%_60%)]" />
                                    {opt.label}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.category_id && (
                      <p className={fieldError}>{errors.category_id.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="priority_id">Priority</Label>
                    <Controller
                      control={control}
                      name="priority_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ? String(field.value) : undefined}
                          onValueChange={(v) => field.onChange(Number(v))}
                        >
                          <SelectTrigger
                            id="priority_id"
                            className="portal-field mt-1.5"
                            aria-invalid={!!errors.priority_id}
                          >
                            <SelectValue placeholder="Select priority…" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITIES.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={String(opt.value)}
                              >
                                <span className="flex items-center justify-between gap-3">
                                  {opt.label}
                                  <span className="text-xs text-muted-foreground">
                                    {opt.hint}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.priority_id && (
                      <p className={fieldError}>{errors.priority_id.message}</p>
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <Label htmlFor="title">Subject</Label>
                  <Input
                    id="title"
                    placeholder="Brief summary of your request"
                    className="portal-field mt-1.5"
                    aria-invalid={!!errors.title}
                    {...register("title")}
                  />
                  {errors.title && (
                    <p className={fieldError}>{errors.title.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Details</Label>
                  <Textarea
                    id="description"
                    rows={5}
                    placeholder="What happened, what you expected, and any steps to reproduce. The more context, the faster we resolve it."
                    className="portal-field mt-1.5 resize-none"
                    aria-invalid={!!errors.description}
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className={fieldError}>{errors.description.message}</p>
                  )}
                </div>

                {/* Optional details */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="company">
                      Company{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="company"
                      autoComplete="organization"
                      placeholder="Acme Inc."
                      className="portal-field mt-1.5"
                      {...register("company")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cc_email">
                      CC email{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="cc_email"
                      type="email"
                      placeholder="teammate@company.com"
                      className="portal-field mt-1.5"
                      aria-invalid={!!errors.cc_email}
                      {...register("cc_email")}
                    />
                    {errors.cc_email && (
                      <p className={fieldError}>{errors.cc_email.message}</p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={state === "submitting"}
                  className="group w-full"
                >
                  {state === "submitting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Submit request
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>

                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Encrypted in transit · Confirmed instantly
                </p>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

function SuccessPanel({
  reference,
  onReset,
}: {
  reference: string;
  onReset: () => void;
}) {
  return (
    <CardContent className="flex flex-col items-center px-6 py-12 text-center">
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full",
          "bg-[hsl(142_65%_45%/0.12)] ring-1 ring-[hsl(142_65%_45%/0.4)]"
        )}
      >
        <svg
          className="portal-check h-8 w-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="hsl(142 70% 55%)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        Request received
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Our team has been notified and will reach out via email shortly. Keep
        your reference handy for any follow-up.
      </p>

      <div className="mt-6 rounded-lg border border-border/70 bg-background/60 px-5 py-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Reference
        </p>
        <p className="mt-0.5 font-mono text-lg font-semibold tracking-wider text-[hsl(188_90%_70%)]">
          {reference}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        className="group mt-8"
      >
        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Submit another request
      </Button>
    </CardContent>
  );
}
