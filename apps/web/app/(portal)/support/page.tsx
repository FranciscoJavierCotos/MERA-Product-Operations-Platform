import type { Metadata } from "next";
import { Clock, ShieldCheck, Layers, Activity, LifeBuoy } from "lucide-react";
import { SupportHeroClient } from "./support-hero-client";

export const metadata: Metadata = {
  title: "MERA Support — Submit a request",
  description:
    "Submit a support request to the MERA product operations team. Technical issues, feature requests, configuration changes, and questions — triaged fast, with owned SLAs.",
};

/**
 * Trust metrics shown in the left rail. Illustrative portal marketing copy —
 * easy to edit in one place. Conveys speed + reliability.
 */
const TRUST_STATS = [
  { icon: Clock, value: "< 2h", label: "Median first response" },
  { icon: ShieldCheck, value: "98.7%", label: "Resolution rate" },
  { icon: Layers, value: "L1–L3", label: "Tiered escalation" },
  { icon: Activity, value: "24/7", label: "Platform monitoring" },
] as const;

export default function SupportPortalPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 lg:px-10 lg:py-16">
      {/* Top bar — wordmark + reassurance pill */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(243_75%_45%)] shadow-lg shadow-primary/30">
            <LifeBuoy className="h-5 w-5 text-primary-foreground" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            MERA
            <span className="ml-1.5 font-normal text-muted-foreground">
              Support
            </span>
          </span>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="portal-pulse absolute inline-flex h-2 w-2 rounded-full bg-[hsl(142_65%_45%)]" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(142_65%_45%)]" />
          </span>
          All systems operational
        </div>
      </header>

      {/* Hero grid — copy on the left, the form (the hero) on the right */}
      <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1fr_minmax(440px,520px)] lg:gap-16 lg:py-16">
        {/* Left rail — staggered reveal */}
        <section className="portal-stagger max-w-xl">
          <span
            style={{ "--i": 0 } as React.CSSProperties}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-[hsl(234_89%_82%)]"
          >
            Product Operations · Client Portal
          </span>

          <h1
            style={{ "--i": 1 } as React.CSSProperties}
            className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Tell us what you need.
            <span className="block bg-gradient-to-r from-foreground to-[hsl(188_95%_70%)] bg-clip-text text-transparent">
              We&apos;re already on it.
            </span>
          </h1>

          <p
            style={{ "--i": 2 } as React.CSSProperties}
            className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Real engineers, owned SLAs, no black-box queue. Submit a request and
            our team triages it within the hour — then tracks it through to
            resolution.
          </p>

          {/* Trust stats */}
          <dl
            style={{ "--i": 3 } as React.CSSProperties}
            className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/40 sm:grid-cols-4"
          >
            {TRUST_STATS.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="flex flex-col gap-2 bg-card/70 p-4 backdrop-blur"
              >
                <Icon
                  className="h-4 w-4 text-[hsl(188_90%_60%)]"
                  aria-hidden
                />
                <dt className="cyber-number text-2xl font-semibold [font-variant-numeric:tabular-nums]">
                  {value}
                </dt>
                <dd className="text-xs leading-tight text-muted-foreground">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Right — the form is the hero */}
        <SupportHeroClient />
      </div>

      <footer className="border-t border-border/60 pt-6 text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} MERA · This portal is for authorized
          client requests. For account access issues, contact your account
          manager.
        </p>
      </footer>
    </main>
  );
}
