import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Search,
  Database,
  Filter,
  Target,
  Globe,
  Code2,
  Users,
  Clock,
  Accessibility,
  ShieldCheck,
  Circle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Qrinux LeadLens — Evidence-first lead qualification" },
      {
        name: "description",
        content:
          "Qrinux LeadLens scans websites and normalizes evidence for strict SMB lead qualification — SEO, tech stack, contacts, domain age, accessibility and scan quality in one clean workflow.",
      },
      { property: "og:title", content: "Qrinux LeadLens — Evidence-first lead qualification" },
      {
        property: "og:description",
        content:
          "Scan a website, understand the business, filter bad prospects, and focus on real opportunities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/* ---------- small UI primitives ---------- */

function Chip({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "green" | "amber" | "red" | "blue" | "violet";
}) {
  const tones: Record<string, string> = {
    muted: "bg-muted text-muted-foreground border-border",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "green" | "amber" | "blue" | "violet";
}) {
  const dot: Record<string, string> = {
    muted: "bg-foreground/40",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-sky-500",
    violet: "bg-violet-500",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot[tone]}`} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
    </div>
  );
}

/* ---------- Browser-window mockup ---------- */

function BrowserFrame({ children, url }: { children: React.ReactNode; url: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <div className="mx-auto flex max-w-md flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
          <Globe className="h-3 w-3" />
          <span className="truncate">{url}</span>
        </div>
        <div className="w-14" />
      </div>
      {children}
    </div>
  );
}

/* ---------- Sections ---------- */

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
            <span className="text-[11px] font-bold">Q</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">Qrinux LeadLens</span>
          <Chip tone="violet">v1.5.0</Chip>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#evidence" className="hover:text-foreground">Evidence</a>
          <a href="#workflow" className="hover:text-foreground">Workflow</a>
          <a href="#accuracy" className="hover:text-foreground">Accuracy</a>
          <a href="#report" className="hover:text-foreground">Report</a>
        </nav>
        <div className="flex items-center gap-2">
          <a href="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</a>
          <a href="/auth" className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:opacity-90">Get started</a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
          <div>
            <Chip tone="muted">
              <ShieldCheck className="h-3 w-3" /> Strict Qualification v1.5.0
            </Chip>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Qrinux LeadLens
            </h1>
            <p className="mt-5 text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Website evidence, lead qualification, and outreach readiness in one clean workflow.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Scan a website, understand the business, filter bad prospects, and focus on real opportunities.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <a href="#workflow">
                  View Workflow <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
              <a
                href="#evidence"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                See evidence snapshot →
              </a>
            </div>
          </div>

          {/* App mockup */}
          <BrowserFrame url="app.qrinux.com/leadlens/dashboard">
            <div className="bg-background p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Today's session
                  </div>
                  <div className="mt-1 text-sm font-semibold">Batch scan — 12 min ago</div>
                </div>
                <Chip tone="violet">
                  <ShieldCheck className="h-3 w-3" /> Strict v1.5.0
                </Chip>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Websites scanned" value="48" tone="blue" />
                <StatCard label="Full scans" value="13" tone="green" />
                <StatCard label="Partial scans" value="20" tone="amber" />
                <StatCard label="Retry / research" value="15" tone="violet" />
              </div>

              <div className="mt-5 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  <span>Recent records</span>
                  <span>Status</span>
                </div>
                {[
                  { d: "acme-plumbing.co", t: "SMB · Home services", s: "Eligible", tone: "green" as const },
                  { d: "stanford.edu", t: "University", s: "Excluded", tone: "red" as const },
                  { d: "hubspot.com", t: "SaaS platform", s: "Research-only", tone: "amber" as const },
                  { d: "harborcafe.local", t: "Timeout", s: "Retry required", tone: "violet" as const },
                ].map((r) => (
                  <div
                    key={r.d}
                    className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{r.d}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.t}</div>
                    </div>
                    <Chip tone={r.tone}>{r.s}</Chip>
                  </div>
                ))}
              </div>
            </div>
          </BrowserFrame>
        </div>
      </div>
    </section>
  );
}

function Evidence() {
  const items = [
    {
      icon: Search,
      title: "SEO signals",
      lines: ["Title, meta, H1 structure", "OG + Twitter cards", "Sitemap & robots"],
    },
    {
      icon: Code2,
      title: "Tech stack",
      lines: ["Framework · CMS · Analytics", "Payments & booking widgets", "Hosting fingerprint"],
    },
    {
      icon: Users,
      title: "Contacts & social",
      lines: ["Emails · phones · address", "LinkedIn · Facebook · IG", "Trust-scored contacts"],
    },
    {
      icon: Clock,
      title: "Domain age",
      lines: ["Registration date", "Recent transfer flags", "Longevity signal"],
    },
    {
      icon: Accessibility,
      title: "Accessibility preflight",
      lines: ["Alt-text coverage", "Color contrast pass rate", "Landmark structure"],
    },
    {
      icon: ShieldCheck,
      title: "Scan quality",
      lines: ["Coverage · blocked pages", "Render vs. static parity", "Confidence score"],
    },
  ];
  return (
    <section id="evidence" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <Chip tone="muted">Evidence snapshot</Chip>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything captured from a single scan
          </h2>
          <p className="mt-3 text-muted-foreground">
            Normalized signals across identity, technology, contact trust and scan health.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_10px_30px_-20px_rgba(15,23,42,0.25)]"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-muted">
                  <it.icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="text-sm font-semibold">{it.title}</div>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {it.lines.map((l) => (
                  <li key={l} className="flex items-center gap-2">
                    <Circle className="h-1.5 w-1.5 fill-current" strokeWidth={0} />
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    { icon: Globe, label: "Website Scan" },
    { icon: Database, label: "Evidence Capture" },
    { icon: Filter, label: "Business Classification" },
    { icon: ShieldCheck, label: "Strict Gate" },
    { icon: Target, label: "Action" },
  ];
  const outcomes = [
    { icon: Check, tone: "green" as const, title: "Eligible SMB Prospect", desc: "Ready for outreach angles" },
    { icon: Search, tone: "amber" as const, title: "Research-only", desc: "Evidence record, no outreach" },
    { icon: X, tone: "red" as const, title: "Excluded", desc: "Non-SMB, platform, or blocked" },
    { icon: RotateCcw, tone: "violet" as const, title: "Retry Required", desc: "Timeout or incomplete scan" },
  ];
  const toneRing: Record<string, string> = {
    green: "ring-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "ring-amber-200 bg-amber-50 text-amber-700",
    red: "ring-rose-200 bg-rose-50 text-rose-700",
    violet: "ring-violet-200 bg-violet-50 text-violet-700",
  };
  return (
    <section id="workflow" className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <Chip tone="muted">Qualification workflow</Chip>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            From raw page to a decision you can act on
          </h2>
        </div>

        {/* Pipeline */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            {steps.map((s, i) => (
              <div key={s.label} className="flex flex-1 items-center gap-3">
                <div className="flex-1 rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    Step {i + 1}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <s.icon className="h-4 w-4 text-foreground" />
                    <div className="text-sm font-semibold">{s.label}</div>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Outcomes */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {outcomes.map((o) => (
            <div key={o.title} className="rounded-2xl border border-border bg-card p-5">
              <div
                className={`grid h-9 w-9 place-items-center rounded-full ring-1 ${toneRing[o.tone]}`}
              >
                <o.icon className="h-4 w-4" />
              </div>
              <div className="mt-3 text-sm font-semibold">{o.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{o.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Accuracy() {
  const before = [
    "Generic outreach angles shown too often",
    "Big platforms could look like leads",
    "Noisy contacts affected readiness",
    "Retry pages still looked actionable",
  ];
  const after = [
    "Strict qualification before outreach",
    "Large platforms filtered out",
    "Contact trust layer improved",
    "Retry pages blocked from scoring",
  ];
  return (
    <section id="accuracy" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <Chip tone="violet">v1.5.0 accuracy improvement</Chip>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Fewer bad prospects. More real opportunities.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-muted-foreground">Before v1.4.0</div>
              <Chip tone="red">
                <AlertTriangle className="h-3 w-3" /> Noisy
              </Chip>
            </div>
            <ul className="mt-5 space-y-3">
              {before.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                    <X className="h-3 w-3" />
                  </span>
                  <span className="text-foreground/80">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-muted-foreground">After v1.5.0</div>
              <Chip tone="green">
                <ShieldCheck className="h-3 w-3" /> Strict
              </Chip>
            </div>
            <ul className="mt-5 space-y-3">
              {after.map((a) => (
                <li key={a} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-foreground">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Report() {
  const rows = [
    { k: "Final status", v: "Research-only / Non-SMB", tone: "amber" as const },
    { k: "Lead type", v: "Evidence record", tone: "blue" as const },
    { k: "Outreach readiness", v: "Low", tone: "red" as const },
    { k: "Website opportunity", v: "Manual review only", tone: "muted" as const },
    { k: "Recommended action", v: "No generic outreach", tone: "violet" as const },
  ];
  return (
    <section id="report" className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <Chip tone="muted">Report preview</Chip>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            A clear verdict on every record
          </h2>
        </div>

        <div className="mt-10">
          <BrowserFrame url="app.qrinux.com/leadlens/report/scan_9182">
            <div className="grid gap-0 bg-background md:grid-cols-[minmax(0,1fr)_320px]">
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="amber">
                    <AlertTriangle className="h-3 w-3" /> Research-only
                  </Chip>
                  <Chip tone="muted">Scan #9182</Chip>
                  <Chip tone="muted">Confidence 0.82</Chip>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight">
                  northline-media.com
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Media publisher · 40+ contributors · Not an SMB fit
                </p>

                <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
                  {rows.map((r) => (
                    <div
                      key={r.k}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3"
                    >
                      <div className="min-w-0 text-sm text-muted-foreground">{r.k}</div>
                      <Chip tone={r.tone}>{r.v}</Chip>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="border-t border-border bg-muted/40 p-6 md:border-l md:border-t-0">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Evidence highlights
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    { k: "SEO", v: "Strong" },
                    { k: "Tech stack", v: "WordPress + CDN" },
                    { k: "Contacts", v: "12 · trust 0.61" },
                    { k: "Domain age", v: "11 years" },
                    { k: "Accessibility", v: "78% pass" },
                    { k: "Scan quality", v: "Full render" },
                  ].map((e) => (
                    <div key={e.k} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{e.k}</span>
                      <span className="font-medium text-foreground">{e.v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
                  Strict Gate v1.5.0 classified this as a non-SMB publisher and blocked outreach angle generation.
                </div>
              </aside>
            </div>
          </BrowserFrame>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-foreground text-background">
            <span className="text-[10px] font-bold">Q</span>
          </div>
          <span className="text-sm font-medium">
            Qrinux LeadLens <span className="text-muted-foreground">• Evidence-first lead qualification.</span>
          </span>
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Qrinux</div>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Evidence />
      <Workflow />
      <Accuracy />
      <Report />
      <Footer />
    </main>
  );
}
