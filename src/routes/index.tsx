import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import heroChip from "@/assets/hero-chip.jpg";
import productShot from "@/assets/product-shot.jpg";
import founderPhoto from "@/assets/founder.jpg";
import {
  ArrowRight,
  Check,
  X,
  Play,
  ChevronDown,
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
  Star,
  Zap,
  Sparkles,
  Building2,
  Mail,
  BarChart3,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Qrinux LeadLens — Evidence-first lead qualification" },
      {
        name: "description",
        content:
          "Scan any website, capture normalized evidence, and qualify leads in seconds. Strict v1.5.0 signals for SEO, tech stack, contacts, domain age and accessibility.",
      },
      { property: "og:title", content: "Qrinux LeadLens — Evidence-first lead qualification" },
      { property: "og:description", content: "Scan a website. Understand the business. Skip the bad prospects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/* =============================================================
   NAV
   ============================================================= */
function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-foreground grid place-items-center">
            <span className="text-background font-bold text-sm">Q</span>
          </div>
          <span className="font-semibold tracking-tight">Qrinux LeadLens</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#capabilities" className="hover:text-foreground">Capabilities</a>
          <a href="#integrations" className="hover:text-foreground">Integrations</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Sign in</Link>
          <Link to="/auth">
            <Button className="rounded-full h-9 px-4">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* =============================================================
   HERO
   ============================================================= */
function Hero() {
  const avatars = [
    "https://i.pravatar.cc/64?img=12",
    "https://i.pravatar.cc/64?img=32",
    "https://i.pravatar.cc/64?img=47",
    "https://i.pravatar.cc/64?img=68",
    "https://i.pravatar.cc/64?img=15",
  ];
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        {/* Trusted by strip */}
        <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-3 py-1.5 mb-8">
          <div className="flex -space-x-2">
            {avatars.map((src, i) => (
              <img key={i} src={src} alt="" className="h-6 w-6 rounded-full border-2 border-background object-cover" />
            ))}
          </div>
          <span className="text-xs font-medium text-muted-foreground">Trusted by 2,400+ sales teams</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
          Qualify leads in <span className="italic font-serif text-muted-foreground">seconds</span>,<br />
          not weeks.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Qrinux LeadLens scans any website and captures normalized evidence — SEO, tech stack,
          contacts, domain age, accessibility — so you focus on real opportunities.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="rounded-full h-12 px-6 text-base">
              Start free — 100 scans/day <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <a href="#how" className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-70">
            <Play className="h-4 w-4" /> Watch demo
          </a>
        </div>

        {/* Chip visual */}
        <div className="mt-16 relative mx-auto max-w-3xl">
          <div className="absolute inset-0 -z-10 bg-gradient-radial from-accent/40 via-transparent to-transparent blur-3xl" />
          <img
            src={heroChip}
            alt="Qrinux chip"
            width={1200}
            height={900}
            className="mx-auto w-full max-w-2xl select-none pointer-events-none"
          />
        </div>
      </div>
    </section>
  );
}

/* =============================================================
   PRODUCT SHOTS
   ============================================================= */
function ProductShots() {
  return (
    <section className="max-w-7xl mx-auto px-6 pb-24">
      <div className="rounded-3xl border border-border bg-card p-3 sm:p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.2)]">
        <img src={productShot} alt="Qrinux LeadLens dashboard" className="w-full rounded-2xl" loading="lazy" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 text-center">
        {[
          { n: "2.4M+", l: "Websites scanned" },
          { n: "94%", l: "Qualification accuracy" },
          { n: "38", l: "Evidence signals" },
          { n: "<3s", l: "Avg. scan time" },
        ].map((s) => (
          <div key={s.l}>
            <div className="text-3xl font-semibold tracking-tight">{s.n}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============================================================
   CAPABILITIES — alternating card + image
   ============================================================= */
function Capabilities() {
  const rows = [
    {
      tag: "Evidence Capture",
      title: "Every signal, normalized.",
      body: "SEO health, tech stack, contact channels, domain age, HTTPS, mobile, sitemap, accessibility — captured on every scan into a clean schema.",
      icon: Database,
    },
    {
      tag: "Strict Qualification",
      title: "v1.5.0 gates out bad prospects.",
      body: "Hard rules for e-commerce, marketplaces, government, and dead sites. Only the leads worth working land in your queue.",
      icon: Filter,
    },
    {
      tag: "Action-ready Output",
      title: "Eligible, Research, Excluded, Retry.",
      body: "Every scan resolves to one of four verdicts with the underlying reasons attached — no guessing, no manual triage.",
      icon: Target,
    },
  ];
  return (
    <section id="capabilities" className="bg-muted/40 border-y border-border">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-2xl mb-16">
          <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Capabilities</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">Built to filter noise, not just collect it.</h2>
        </div>

        <div className="space-y-6">
          {rows.map((r, i) => {
            const Icon = r.icon;
            const flip = i % 2 === 1;
            return (
              <div key={r.title} className={`grid md:grid-cols-2 gap-6 items-stretch`}>
                <div className={`rounded-3xl border border-border bg-card p-8 md:p-10 flex flex-col justify-between ${flip ? "md:order-2" : ""}`}>
                  <div>
                    <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground">{r.tag}</div>
                    <h3 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">{r.title}</h3>
                    <p className="mt-4 text-muted-foreground max-w-md">{r.body}</p>
                  </div>
                  <div className="mt-8 flex items-center gap-2 text-sm font-medium">
                    Learn more <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
                <CapabilityVisual variant={i} icon={Icon} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CapabilityVisual({ variant, icon: Icon }: { variant: number; icon: React.ElementType }) {
  if (variant === 0) {
    return (
      <div className="rounded-3xl border border-border bg-gradient-to-br from-accent/60 to-accent/20 p-8 flex items-center justify-center">
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground">northline-media.com</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Eligible</span>
          </div>
          {[
            ["SEO score", "82"],
            ["Tech stack", "WordPress • GA4"],
            ["Contacts", "hello@ • +1-503…"],
            ["Domain age", "6y 4m"],
            ["Accessibility", "AA-partial"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-sm py-1.5 border-t border-border">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === 1) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {[
            { l: "E-commerce", v: "Excluded", tone: "bg-rose-50 text-rose-700 border-rose-200" },
            { l: "Marketplace", v: "Excluded", tone: "bg-rose-50 text-rose-700 border-rose-200" },
            { l: "Local SMB", v: "Eligible", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { l: "Broken site", v: "Retry", tone: "bg-amber-50 text-amber-700 border-amber-200" },
          ].map((c) => (
            <div key={c.l} className={`border rounded-xl p-4 ${c.tone}`}>
              <div className="text-xs opacity-80">{c.l}</div>
              <div className="text-base font-semibold mt-1">{c.v}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-border bg-foreground text-background p-8 flex items-center justify-center">
      <div className="w-full max-w-sm space-y-3">
        {[
          { l: "Scan", d: "48 sites" },
          { l: "Capture", d: "38 signals each" },
          { l: "Classify", d: "v1.5.0 strict" },
          { l: "Action", d: "13 eligible" },
        ].map((s, i) => (
          <div key={s.l} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full border border-background/30 grid place-items-center text-xs">{i + 1}</div>
            <div className="flex-1 border-b border-background/10 pb-3">
              <div className="font-medium">{s.l}</div>
              <div className="text-xs opacity-60">{s.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============================================================
   BUILD FOR EVERYONE
   ============================================================= */
function BuildFor() {
  const groups = [
    { icon: Users, label: "Sales reps" },
    { icon: BarChart3, label: "SDR teams" },
    { icon: Building2, label: "Agencies" },
    { icon: Mail, label: "Cold outreach" },
    { icon: Layers, label: "Ops leaders" },
    { icon: Zap, label: "Founders" },
  ];
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Built for everyone</div>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">Whoever hunts leads, we sharpen the funnel.</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="rounded-3xl border border-border bg-muted/40 p-4">
          <img src={productShot} alt="LeadLens dashboard" className="rounded-2xl border border-border" loading="lazy" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {groups.map((g) => {
            const Icon = g.icon;
            return (
              <div key={g.label} className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/60 grid place-items-center">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{g.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =============================================================
   EASY INTEGRATION — detected technologies
   ============================================================= */
function Integrations() {
  const techs: { name: string; slug: string; color: string }[] = [
    { name: "WordPress", slug: "wordpress", color: "21759B" },
    { name: "Shopify", slug: "shopify", color: "7AB55C" },
    { name: "Webflow", slug: "webflow", color: "146EF5" },
    { name: "Wix", slug: "wix", color: "0C6EFC" },
    { name: "Squarespace", slug: "squarespace", color: "000000" },
    { name: "Ghost", slug: "ghost", color: "15171A" },
    { name: "React", slug: "react", color: "61DAFB" },
    { name: "Next.js", slug: "nextdotjs", color: "000000" },
    { name: "Vue", slug: "vuedotjs", color: "4FC08D" },
    { name: "Angular", slug: "angular", color: "DD0031" },
    { name: "Svelte", slug: "svelte", color: "FF3E00" },
    { name: "Astro", slug: "astro", color: "BC52EE" },
    { name: "Google Analytics", slug: "googleanalytics", color: "E37400" },
    { name: "Google Tag Manager", slug: "googletagmanager", color: "246FDB" },
    { name: "HubSpot", slug: "hubspot", color: "FF7A59" },
    { name: "Mailchimp", slug: "mailchimp", color: "FFE01B" },
    { name: "Intercom", slug: "intercom", color: "1F8DED" },
    { name: "Segment", slug: "segment", color: "52BD95" },
    { name: "Stripe", slug: "stripe", color: "635BFF" },
    { name: "PayPal", slug: "paypal", color: "003087" },
    { name: "Klaviyo", slug: "klaviyo", color: "1B1B1B" },
    { name: "Cloudflare", slug: "cloudflare", color: "F38020" },
    { name: "AWS", slug: "amazonwebservices", color: "232F3E" },
    { name: "Vercel", slug: "vercel", color: "000000" },
    { name: "Framer", slug: "framer", color: "0055FF" },
    { name: "Elementor", slug: "elementor", color: "92003B" },
    { name: "WooCommerce", slug: "woocommerce", color: "96588A" },
    { name: "Magento", slug: "magento", color: "EE672F" },
    { name: "Salesforce", slug: "salesforce", color: "00A1E0" },
    { name: "Zendesk", slug: "zendesk", color: "03363D" },
  ];
  return (
    <section id="integrations" className="bg-muted/40 border-y border-border">
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Easy integration</div>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight max-w-2xl mx-auto">
          Detects 3000+ technologies out of the box.
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Every scan fingerprints the site's stack, marketing tools, analytics, and payment layer so you
          personalize outreach with real context.
        </p>
        <div className="mt-12 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
          {techs.map((t) => (
            <div
              key={t.slug}
              title={t.name}
              className="rounded-2xl border border-border bg-card h-20 grid place-items-center transition hover:shadow-sm"
            >
              <img
                src={`https://cdn.simpleicons.org/${t.slug}/${t.color}`}
                alt={`${t.name} logo`}
                loading="lazy"
                className="h-8 w-auto max-w-[60%] object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =============================================================
   HOW IT WORKS — video
   ============================================================= */
function HowItWorks() {
  return (
    <section id="how" className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">How it works</div>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">See LeadLens in action.</h2>
      </div>
      <div className="rounded-3xl bg-foreground text-background aspect-video max-w-5xl mx-auto grid place-items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-gradient-radial from-accent/60 to-transparent" />
        <button className="relative z-10 h-20 w-20 rounded-full bg-background/10 border border-background/20 grid place-items-center backdrop-blur">
          <Play className="h-8 w-8 fill-current" />
        </button>
        <div className="absolute bottom-6 left-6 text-sm opacity-70">2 min product walkthrough</div>
      </div>
    </section>
  );
}

/* =============================================================
   FEATURE COMPARISON
   ============================================================= */
function Comparison() {
  const rows = [
    ["Website evidence capture", true, false, false],
    ["Normalized signals schema", true, false, false],
    ["Strict qualification gates", true, false, false],
    ["Tech stack detection", true, true, true],
    ["Contact discovery", true, true, false],
    ["Domain age & trust", true, false, false],
    ["Accessibility signals", true, false, false],
    ["Chrome extension workflow", true, false, false],
    ["Device-locked API keys", true, false, false],
    ["Transparent pricing", true, false, true],
  ];
  return (
    <section className="bg-muted/40 border-y border-border">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Feature comparison</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">The other tools weren't built for this.</h2>
        </div>
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-4 bg-muted/60 text-sm font-medium">
            <div className="p-4"></div>
            <div className="p-4 text-center">Qrinux</div>
            <div className="p-4 text-center text-muted-foreground">Generic scrapers</div>
            <div className="p-4 text-center text-muted-foreground">Prospecting DBs</div>
          </div>
          {rows.map(([label, a, b, c], i) => (
            <div key={i} className="grid grid-cols-4 text-sm border-t border-border">
              <div className="p-4">{label as string}</div>
              <Cell v={a as boolean} highlight />
              <Cell v={b as boolean} />
              <Cell v={c as boolean} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function Cell({ v, highlight }: { v: boolean; highlight?: boolean }) {
  return (
    <div className={`p-4 text-center ${highlight ? "bg-accent/20" : ""}`}>
      {v ? <Check className="h-4 w-4 inline text-emerald-600" /> : <X className="h-4 w-4 inline text-muted-foreground" />}
    </div>
  );
}

/* =============================================================
   FOUNDER
   ============================================================= */
function Founder() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="grid md:grid-cols-5 gap-10 items-center">
        <div className="md:col-span-2">
          <img src={founderPhoto} alt="Founder" className="w-full rounded-3xl border border-border" loading="lazy" />
        </div>
        <div className="md:col-span-3">
          <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">From the founder</div>
          <blockquote className="text-2xl sm:text-3xl font-medium leading-snug tracking-tight">
            "I built LeadLens because every SDR I know wastes half their day on prospects that were never
            going to close. Evidence-first qualification changes that — you stop guessing and start closing."
          </blockquote>
          <div className="mt-6">
            <div className="font-semibold">Arif Rahman</div>
            <div className="text-sm text-muted-foreground">Founder & CEO, Qrinux</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =============================================================
   METRICS
   ============================================================= */
function Metrics() {
  return (
    <section className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
        {[
          { n: "6.2×", l: "Faster prospect qualification" },
          { n: "41%", l: "More replies from personalized outreach" },
          { n: "12hrs", l: "Saved per SDR per week" },
        ].map((m) => (
          <div key={m.l}>
            <div className="text-5xl sm:text-6xl font-semibold tracking-tight">{m.n}</div>
            <div className="text-sm opacity-70 mt-2">{m.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============================================================
   PRICING
   ============================================================= */
function Pricing() {
  const plans = [
    { name: "Free", price: "$0", period: "forever", limit: "100 scans / day", cta: "Start free", features: ["Evidence capture", "Strict qualification", "Chrome extension", "Community support"] },
    { name: "Starter", price: "$1", period: "/month", limit: "500 scans / day", cta: "Get Starter", features: ["Everything in Free", "500 scans per day", "30-day validity", "Email support"], popular: true },
    { name: "Unlimited", price: "$5", period: "/month", limit: "Unlimited scans", cta: "Get Unlimited", features: ["Everything in Starter", "Unlimited daily scans", "Priority support", "Early features"] },
  ];
  return (
    <section id="pricing" className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Pricing</div>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">Simple pricing that scales with you.</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`rounded-3xl border p-8 flex flex-col ${p.popular ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              {p.popular && <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">Popular</span>}
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-semibold tracking-tight">{p.price}</span>
              <span className={`text-sm ${p.popular ? "opacity-70" : "text-muted-foreground"}`}>{p.period}</span>
            </div>
            <p className={`mt-2 text-sm ${p.popular ? "opacity-80" : "text-muted-foreground"}`}>{p.limit}</p>
            <ul className="mt-6 space-y-3 text-sm flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4" /> {f}
                </li>
              ))}
            </ul>
            <Link to="/auth" className="mt-8">
              <Button
                className={`w-full rounded-full h-11 ${p.popular ? "bg-background text-foreground hover:bg-background/90" : ""}`}
                variant={p.popular ? "default" : "outline"}
              >
                {p.cta}
              </Button>
            </Link>
          </div>
        ))}
      </div>

      {/* Pricing comparison */}
      <div className="mt-16 rounded-3xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-4 bg-muted/60 text-sm font-medium">
          <div className="p-4"></div>
          <div className="p-4 text-center">Free</div>
          <div className="p-4 text-center">Starter</div>
          <div className="p-4 text-center">Unlimited</div>
        </div>
        {[
          ["Daily scan limit", "100", "500", "∞"],
          ["Evidence signals", "All", "All", "All"],
          ["Strict v1.5.0 gates", "✓", "✓", "✓"],
          ["Device binding", "✓", "✓", "✓"],
          ["Validity", "Forever", "30 days", "30 days"],
          ["Priority support", "—", "—", "✓"],
        ].map((r, i) => (
          <div key={i} className="grid grid-cols-4 text-sm border-t border-border">
            {r.map((c, j) => (
              <div key={j} className={`p-4 ${j === 0 ? "" : "text-center"}`}>{c}</div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============================================================
   MORE BENEFITS
   ============================================================= */
function MoreBenefits() {
  const items = [
    { icon: ShieldCheck, title: "Device-locked keys", body: "Each API key binds to the first device that uses it — no sharing, no leaks." },
    { icon: Clock, title: "Fresh evidence", body: "Every scan pulls live data. No stale prospect lists from last quarter." },
    { icon: Sparkles, title: "Strict v1.5.0 logic", body: "Continuously tuned exclusion rules for e-com, marketplace, gov, and dead sites." },
    { icon: Globe, title: "Works anywhere", body: "Chrome extension + REST API for anywhere you already work." },
    { icon: Code2, title: "Structured output", body: "Every scan resolves to a normalized JSON record ready for your CRM." },
    { icon: Accessibility, title: "Accessibility signals", body: "Track how prospects treat inclusive design — a real quality proxy." },
  ];
  return (
    <section className="bg-muted/40 border-y border-border">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">More benefits</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">Everything you need to move fast, and nothing you don't.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="h-10 w-10 rounded-xl bg-accent/60 grid place-items-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{it.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{it.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =============================================================
   HAPPY CLIENTS
   ============================================================= */
function HappyClients() {
  const t = [
    { q: "We stopped burning outreach hours on marketplaces and franchisees. Reply rates jumped 38% in a month.", n: "Priya S.", r: "Head of Growth, Northline" },
    { q: "The verdict-first workflow is the killer feature. Eligible, Research, Excluded — no more triage meetings.", n: "David M.", r: "SDR Manager, Craftlane" },
    { q: "Fastest tool I've onboarded in 2 years. My team was scanning 100 sites/day inside an hour.", n: "Sara T.", r: "Founder, Mesh Partners" },
    { q: "Evidence-first means less arguing with the pipeline. Deals are cleaner, forecasts are honest.", n: "Marcus V.", r: "VP Sales, Southport" },
  ];
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Happy clients</div>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">Loved by teams who hate wasted time.</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {t.map((x, i) => (
          <div key={i} className="rounded-3xl border border-border bg-card p-8">
            <div className="flex gap-0.5 text-amber-500 mb-4">
              {[...Array(5)].map((_, k) => <Star key={k} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="text-lg leading-relaxed">"{x.q}"</p>
            <div className="mt-6 flex items-center gap-3">
              <img src={`https://i.pravatar.cc/64?img=${20 + i}`} alt="" className="h-10 w-10 rounded-full" />
              <div>
                <div className="font-semibold text-sm">{x.n}</div>
                <div className="text-xs text-muted-foreground">{x.r}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============================================================
   BLOG
   ============================================================= */
export const BLOG_POSTS = [
  { slug: "evidence-first-qualification", title: "Why evidence-first qualification beats prospect lists", excerpt: "Static lists rot. Website evidence tells you what a business is doing right now.", date: "Jul 12, 2026", readTime: "6 min read" },
  { slug: "v1-5-0-strict-gates", title: "Inside the v1.5.0 strict qualification gates", excerpt: "How we filter out marketplaces, e-com, dead sites, and franchise portals automatically.", date: "Jun 28, 2026", readTime: "8 min read" },
  { slug: "chrome-extension-workflow", title: "Building a Chrome extension SDRs actually use", excerpt: "The design decisions behind a zero-friction scan-and-qualify workflow.", date: "Jun 05, 2026", readTime: "5 min read" },
];
function Blog() {
  return (
    <section className="bg-muted/40 border-y border-border">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">From the blog</div>
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">Sharper prospecting, one read at a time.</h2>
          </div>
          <Link to="/blog" className="text-sm font-medium inline-flex items-center gap-1">All posts <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {BLOG_POSTS.map((p) => (
            <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="group rounded-3xl border border-border bg-card overflow-hidden">
              <div className="aspect-[16/10] bg-gradient-to-br from-accent/60 to-muted" />
              <div className="p-6">
                <div className="text-xs text-muted-foreground">{p.date} • {p.readTime}</div>
                <h3 className="mt-2 font-semibold text-lg group-hover:underline">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =============================================================
   FAQ
   ============================================================= */
function Faq() {
  const items = [
    { q: "How many scans can I run for free?", a: "Every account gets 100 scans per 24 hours on the Free plan. Paid plans lift the daily limit or remove it entirely." },
    { q: "How does device binding work?", a: "The first device that uses your API key gets locked to it. You can reset the binding from your dashboard if you switch machines." },
    { q: "Do you store the pages you scan?", a: "Only the normalized evidence. We do not store full page HTML, screenshots, or PII beyond the fields you configure." },
    { q: "Can I cancel anytime?", a: "Yes. Paid plans are month-to-month and can be canceled from your dashboard in one click." },
    { q: "Is there an API?", a: "Yes. Every scan runs through the same API the Chrome extension uses. Bring your key, get JSON back." },
    { q: "Which browsers are supported?", a: "The extension targets Chrome and Chromium-based browsers (Edge, Brave, Arc)." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
      <div className="text-center mb-12">
        <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">FAQ</div>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">Common questions.</h2>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {items.map((it, i) => (
          <button key={i} onClick={() => setOpen(open === i ? null : i)} className="w-full text-left py-5 flex items-start justify-between gap-6">
            <div>
              <div className="font-medium">{it.q}</div>
              {open === i && <div className="mt-3 text-sm text-muted-foreground max-w-xl">{it.a}</div>}
            </div>
            <ChevronDown className={`h-5 w-5 mt-0.5 transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
        ))}
      </div>
    </section>
  );
}

/* =============================================================
   CTA + FOOTER
   ============================================================= */
function CTA() {
  return (
    <section className="max-w-7xl mx-auto px-6 pb-24">
      <div className="rounded-3xl bg-foreground text-background p-12 md:p-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-gradient-radial from-accent/60 to-transparent" />
        <div className="relative">
          <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight">Stop chasing bad prospects.</h2>
          <p className="mt-4 opacity-80 max-w-xl mx-auto">Start free with 100 scans per day. Upgrade when you're ready.</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-full h-12 px-6 bg-background text-foreground hover:bg-background/90">
                Get started free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-foreground grid place-items-center"><span className="text-background font-bold text-sm">Q</span></div>
              <span className="font-semibold">Qrinux LeadLens</span>
            </div>
            <p className="text-sm text-muted-foreground mt-4 max-w-xs">
              Evidence-first lead qualification for teams that want verdicts, not vibes.
            </p>
            <a href="mailto:hello@qrinux.com" className="mt-4 inline-block text-sm hover:text-foreground text-muted-foreground">hello@qrinux.com</a>
          </div>
          <FooterCol title="Product" links={[
            { label: "Pricing", href: "#pricing" },
            { label: "How it works", href: "#how" },
            { label: "FAQ", href: "#faq" },
          ]} />
          <FooterCol title="Company" links={[
            { label: "Contact", to: "/contact" },
            { label: "Blog", to: "/blog" },
            { label: "Sign in", to: "/auth" },
          ]} />
          <FooterCol title="Legal" links={[
            { label: "Privacy Policy", to: "/legal/privacy" },
            { label: "Terms of Service", to: "/legal/terms" },
            { label: "Refund Policy", to: "/legal/refund" },
            { label: "Cookies", to: "/legal/cookies" },
          ]} />
        </div>
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Qrinux LeadLens. All rights reserved.</span>
          <span>Made for teams that qualify with evidence.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ label: string; href?: string; to?: string }> }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider font-medium text-foreground mb-4">{title}</div>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) =>
          l.to ? (
            <li key={l.label}><Link to={l.to as any} className="text-muted-foreground hover:text-foreground">{l.label}</Link></li>
          ) : (
            <li key={l.label}><a href={l.href} className="text-muted-foreground hover:text-foreground">{l.label}</a></li>
          ),
        )}
      </ul>
    </div>
  );
}

/* =============================================================
   PAGE
   ============================================================= */
function Index() {
  return (
    <div className="min-h-screen bg-background">
      
      <Hero />
      <ProductShots />
      <Capabilities />
      <BuildFor />
      <Integrations />
      <HowItWorks />
      <Comparison />
      <Founder />
      <Metrics />
      <Pricing />
      <MoreBenefits />
      <HappyClients />
      <Blog />
      <Faq />
      <CTA />
      <Footer />
    </div>
  );
}
