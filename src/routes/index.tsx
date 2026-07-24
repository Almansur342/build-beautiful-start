import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import heroChip from "@/assets/hero-chip.jpg";
import productShot from "@/assets/product-shot.jpg";
import founderPhoto from "@/assets/founder.png.asset.json";
import blogEvidenceImg from "@/assets/blog-evidence.jpg";
import blogGatesImg from "@/assets/blog-gates.jpg";
import blogExtensionImg from "@/assets/blog-extension.jpg";

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
const ALL_TECHS: { name: string; slug: string; color: string }[] = [
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
  { name: "Nuxt", slug: "nuxtdotjs", color: "00DC82" },
  { name: "Remix", slug: "remix", color: "000000" },
  { name: "Gatsby", slug: "gatsby", color: "663399" },
  { name: "Vite", slug: "vite", color: "646CFF" },
  { name: "Node.js", slug: "nodedotjs", color: "339933" },
  { name: "Deno", slug: "deno", color: "000000" },
  { name: "Bun", slug: "bun", color: "000000" },
  { name: "TypeScript", slug: "typescript", color: "3178C6" },
  { name: "JavaScript", slug: "javascript", color: "F7DF1E" },
  { name: "Tailwind", slug: "tailwindcss", color: "06B6D4" },
  { name: "Bootstrap", slug: "bootstrap", color: "7952B3" },
  { name: "Sass", slug: "sass", color: "CC6699" },
  { name: "Google Analytics", slug: "googleanalytics", color: "E37400" },
  { name: "Google Tag Manager", slug: "googletagmanager", color: "246FDB" },
  { name: "Google Ads", slug: "googleads", color: "4285F4" },
  { name: "Meta", slug: "meta", color: "0467DF" },
  { name: "Facebook", slug: "facebook", color: "1877F2" },
  { name: "Instagram", slug: "instagram", color: "E4405F" },
  { name: "LinkedIn", slug: "linkedin", color: "0A66C2" },
  { name: "TikTok", slug: "tiktok", color: "000000" },
  { name: "YouTube", slug: "youtube", color: "FF0000" },
  { name: "X", slug: "x", color: "000000" },
  { name: "Pinterest", slug: "pinterest", color: "BD081C" },
  { name: "HubSpot", slug: "hubspot", color: "FF7A59" },
  { name: "Mailchimp", slug: "mailchimp", color: "FFE01B" },
  { name: "Klaviyo", slug: "klaviyo", color: "1B1B1B" },
  { name: "Intercom", slug: "intercom", color: "1F8DED" },
  { name: "Zendesk", slug: "zendesk", color: "03363D" },
  { name: "Segment", slug: "segment", color: "52BD95" },
  { name: "Salesforce", slug: "salesforce", color: "00A1E0" },
  { name: "Pipedrive", slug: "pipedrive", color: "000000" },
  { name: "Notion", slug: "notion", color: "000000" },
  { name: "Airtable", slug: "airtable", color: "18BFFF" },
  { name: "Slack", slug: "slack", color: "4A154B" },
  { name: "Discord", slug: "discord", color: "5865F2" },
  { name: "Zoom", slug: "zoom", color: "0B5CFF" },
  { name: "Calendly", slug: "calendly", color: "006BFF" },
  { name: "Zapier", slug: "zapier", color: "FF4A00" },
  { name: "Make", slug: "make", color: "6D00CC" },
  { name: "Stripe", slug: "stripe", color: "635BFF" },
  { name: "PayPal", slug: "paypal", color: "003087" },
  { name: "Square", slug: "square", color: "000000" },
  { name: "Braintree", slug: "braintree", color: "000000" },
  { name: "Klarna", slug: "klarna", color: "FFA8CD" },
  { name: "Cloudflare", slug: "cloudflare", color: "F38020" },
  { name: "AWS", slug: "amazonwebservices", color: "232F3E" },
  { name: "Google Cloud", slug: "googlecloud", color: "4285F4" },
  { name: "Azure", slug: "microsoftazure", color: "0078D4" },
  { name: "Vercel", slug: "vercel", color: "000000" },
  { name: "Netlify", slug: "netlify", color: "00C7B7" },
  { name: "Render", slug: "render", color: "46E3B7" },
  { name: "Heroku", slug: "heroku", color: "430098" },
  { name: "DigitalOcean", slug: "digitalocean", color: "0080FF" },
  { name: "Framer", slug: "framer", color: "0055FF" },
  { name: "Figma", slug: "figma", color: "F24E1E" },
  { name: "Elementor", slug: "elementor", color: "92003B" },
  { name: "WooCommerce", slug: "woocommerce", color: "96588A" },
  { name: "Magento", slug: "magento", color: "EE672F" },
  { name: "BigCommerce", slug: "bigcommerce", color: "121118" },
  { name: "PrestaShop", slug: "prestashop", color: "DF0067" },
  { name: "Contentful", slug: "contentful", color: "2478CC" },
  { name: "Sanity", slug: "sanity", color: "F03E2F" },
  { name: "Strapi", slug: "strapi", color: "4945FF" },
  { name: "Drupal", slug: "drupal", color: "0678BE" },
  { name: "Joomla", slug: "joomla", color: "5091CD" },
  { name: "Django", slug: "django", color: "092E20" },
  { name: "Flask", slug: "flask", color: "000000" },
  { name: "Rails", slug: "rubyonrails", color: "CC0000" },
  { name: "Laravel", slug: "laravel", color: "FF2D20" },
  { name: "Spring", slug: "spring", color: "6DB33F" },
  { name: ".NET", slug: "dotnet", color: "512BD4" },
  { name: "Go", slug: "go", color: "00ADD8" },
  { name: "Rust", slug: "rust", color: "000000" },
  { name: "Python", slug: "python", color: "3776AB" },
  { name: "PostgreSQL", slug: "postgresql", color: "4169E1" },
  { name: "MySQL", slug: "mysql", color: "4479A1" },
  { name: "MongoDB", slug: "mongodb", color: "47A248" },
  { name: "Redis", slug: "redis", color: "DC382D" },
  { name: "Supabase", slug: "supabase", color: "3ECF8E" },
  { name: "Firebase", slug: "firebase", color: "DD2C00" },
  { name: "Algolia", slug: "algolia", color: "003DFF" },
  { name: "Elasticsearch", slug: "elasticsearch", color: "005571" },
  { name: "GitHub", slug: "github", color: "181717" },
  { name: "GitLab", slug: "gitlab", color: "FC6D26" },
  { name: "Bitbucket", slug: "bitbucket", color: "0052CC" },
  { name: "Docker", slug: "docker", color: "2496ED" },
  { name: "Kubernetes", slug: "kubernetes", color: "326CE5" },
  { name: "Sentry", slug: "sentry", color: "362D59" },
  { name: "Datadog", slug: "datadog", color: "632CA6" },
  { name: "New Relic", slug: "newrelic", color: "008C99" },
  { name: "Hotjar", slug: "hotjar", color: "FD3A5C" },
  { name: "Mixpanel", slug: "mixpanel", color: "7856FF" },
  { name: "Amplitude", slug: "amplitude", color: "1E61F0" },
  { name: "Plausible", slug: "plausibleanalytics", color: "5850EC" },
  { name: "Fathom", slug: "fathom", color: "9187FF" },
  { name: "Twilio", slug: "twilio", color: "F22F46" },
  { name: "SendGrid", slug: "sendgrid", color: "1A82E2" },
  { name: "Mailgun", slug: "mailgun", color: "F06B66" },
  { name: "Postmark", slug: "postmark", color: "FFDE00" },
  { name: "Auth0", slug: "auth0", color: "EB5424" },
  { name: "Okta", slug: "okta", color: "007DC1" },
  { name: "Clerk", slug: "clerk", color: "6C47FF" },
  { name: "Cloudinary", slug: "cloudinary", color: "3448C5" },
  { name: "Imgix", slug: "imgix", color: "000000" },
  { name: "Contentstack", slug: "contentstack", color: "6C5CE7" },
  { name: "Typeform", slug: "typeform", color: "262627" },
  { name: "Trello", slug: "trello", color: "0052CC" },
  { name: "Asana", slug: "asana", color: "F06A6A" },
  { name: "Jira", slug: "jira", color: "0052CC" },
  { name: "Linear", slug: "linear", color: "5E6AD2" },
  { name: "ClickUp", slug: "clickup", color: "7B68EE" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Integrations() {
  const GRID = 30; // 5 cols x 6 rows on md
  const [visible, setVisible] = React.useState(() => shuffle(ALL_TECHS).slice(0, GRID));
  const [flipping, setFlipping] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    const interval = setInterval(() => {
      // pick 3-5 random slots to swap
      const swapCount = 3 + Math.floor(Math.random() * 3);
      const slots = new Set<number>();
      while (slots.size < swapCount) slots.add(Math.floor(Math.random() * GRID));
      setFlipping(slots);
      setTimeout(() => {
        setVisible((prev) => {
          const next = [...prev];
          const usedSlugs = new Set(prev.map((t) => t.slug));
          const pool = ALL_TECHS.filter((t) => !usedSlugs.has(t.slug));
          const shuffled = shuffle(pool);
          let pi = 0;
          slots.forEach((idx) => {
            if (shuffled[pi]) next[idx] = shuffled[pi++];
          });
          return next;
        });
        setFlipping(new Set());
      }, 350);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

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
          {visible.map((t, idx) => {
            const isFlipping = flipping.has(idx);
            return (
              <div
                key={idx}
                title={t.name}
                className="border border-border bg-card h-20 grid place-items-center transition hover:shadow-sm overflow-hidden"
              >
                <img
                  src={`https://cdn.simpleicons.org/${t.slug}/${t.color}`}
                  alt={`${t.name} logo`}
                  loading="lazy"
                  className={`h-8 w-auto max-w-[60%] object-contain transition-all duration-300 ${
                    isFlipping ? "opacity-0 scale-75 blur-sm" : "opacity-100 scale-100 blur-0"
                  }`}
                />
              </div>
            );
          })}
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
          <img src={founderPhoto.url} alt="Founder" className="w-full rounded-3xl border border-border" loading="lazy" />
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
   HAPPY CLIENTS — infinite right-to-left marquee
   ============================================================= */
function HappyClients() {
  const t = [
    { q: "We stopped burning outreach hours on marketplaces and franchisees. Reply rates jumped 38% in a month.", n: "Priya S.", r: "Head of Growth, Northline" },
    { q: "The verdict-first workflow is the killer feature. Eligible, Research, Excluded — no more triage meetings.", n: "David M.", r: "SDR Manager, Craftlane" },
    { q: "Fastest tool I've onboarded in 2 years. My team was scanning 100 sites/day inside an hour.", n: "Sara T.", r: "Founder, Mesh Partners" },
    { q: "Evidence-first means less arguing with the pipeline. Deals are cleaner, forecasts are honest.", n: "Marcus V.", r: "VP Sales, Southport" },
    { q: "LeadLens cut our research time by half. The strict gates are like having a senior SDR pre-qualify every lead.", n: "Elena R.", r: "RevOps, Brightbound" },
    { q: "I love that the API key is device-locked. No more worrying about credentials floating around the team.", n: "James K.", r: "Engineering Lead, Stacklane" },
    { q: "The Chrome extension fits our workflow so cleanly we forgot it was a new tool after day one.", n: "Aisha N.", r: "Sales Director, Forma" },
    { q: "Finally, a qualification tool that tells us what to skip, not just what to chase.", n: "Tom B.", r: "CEO, Quarry Studio" },
  ];
  const track = [...t, ...t];
  return (
    <section className="py-24 overflow-hidden">
      <style>{`
        @keyframes clientMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .client-marquee {
          display: flex;
          gap: 1.5rem;
          width: max-content;
          animation: clientMarquee 45s linear infinite;
        }
        .client-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-6 mb-14">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Happy clients</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">Loved by teams who hate wasted time.</h2>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="client-marquee">
          {track.map((x, i) => (
            <div
              key={i}
              className="w-[340px] sm:w-[420px] shrink-0 border border-border bg-card p-7 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.12)] flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-0.5 text-amber-500 mb-4">
                  {[...Array(5)].map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-base sm:text-lg leading-relaxed text-foreground">"{x.q}"</p>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <img
                  src={`https://i.pravatar.cc/64?img=${20 + (i % t.length)}`}
                  alt={x.n}
                  className="h-11 w-11 object-cover border border-border"
                />
                <div>
                  <div className="font-semibold text-sm">{x.n}</div>
                  <div className="text-xs text-muted-foreground">{x.r}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =============================================================
   BLOG
   ============================================================= */



export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  thumbnail: string;
  content: Array<{ type: "p" | "h2" | "quote" | "list"; text?: string; items?: string[] }>;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "evidence-first-qualification",
    title: "Why evidence-first qualification beats prospect lists",
    excerpt: "Static lists rot. Website evidence tells you what a business is doing right now.",
    date: "Jul 12, 2026",
    readTime: "6 min read",
    category: "Strategy",
    thumbnail: blogEvidenceImg,
    content: [
      { type: "p", text: "Every SDR has stared at a prospect list that looked great on Monday and felt worthless by Friday. Website evidence changes the shape of that problem. Instead of trusting a static CSV, you look at what a business is actually doing right now — its stack, its channels, its accessibility, its freshness — and let those signals decide." },
      { type: "h2", text: "The signals that actually matter" },
      { type: "p", text: "The Qrinux LeadLens schema normalizes 38 signals across five families: SEO health, technology stack, contact discovery, trust markers, and quality indicators. Each signal is captured on every scan and evaluated against the v1.5.0 strict gates before a verdict is emitted." },
      { type: "list", items: ["SEO health — freshness, indexability, structured data", "Technology stack — CMS, analytics, payments, marketing tools", "Contact discovery — email patterns, forms, verified handles", "Trust markers — HTTPS, policy pages, business identity", "Quality indicators — accessibility, performance, mobile posture"] },
      { type: "h2", text: "Verdicts, not vibes" },
      { type: "p", text: "Every scan ends in one of four verdicts: Eligible, Research-only, Excluded, or Retry. Reps stop arguing whether a lead is 'good' and start working the ones the system agrees are worth working. That single change is worth the whole workflow." },
      { type: "quote", text: "Prospect lists describe what a business was. Evidence describes what it is." },
      { type: "p", text: "If your team still opens the week with a static CSV, you're one refresh cycle behind the market. Evidence-first qualification closes that gap on every scan." },
    ],
  },
  {
    slug: "v1-5-0-strict-gates",
    title: "Inside the v1.5.0 strict qualification gates",
    excerpt: "How we filter out marketplaces, e-com, dead sites, and franchise portals automatically.",
    date: "Jun 28, 2026",
    readTime: "8 min read",
    category: "Product",
    thumbnail: blogGatesImg,
    content: [
      { type: "p", text: "The v1.5.0 release moves LeadLens from soft scoring to strict gates. Where earlier versions produced a score you had to interpret, the new logic answers a simpler question: should a human touch this lead at all?" },
      { type: "h2", text: "Four gates, one verdict" },
      { type: "p", text: "Each scan runs through four exclusion gates before any positive signals are counted. If any gate trips, the verdict drops to Excluded and no further evaluation happens." },
      { type: "list", items: ["Marketplace gate — filters directory-style aggregators", "E-commerce gate — routes shops to a separate pipeline", "Dead-site gate — catches abandoned domains and parked pages", "Franchise gate — deprioritizes locations owned by parent brands"] },
      { type: "h2", text: "Why strictness beats scoring" },
      { type: "p", text: "A score of 74 doesn't tell a rep what to do. A verdict does. Strict gates trade a small amount of recall for a large improvement in rep confidence — and reps who trust the system actually use it." },
    ],
  },
  {
    slug: "chrome-extension-workflow",
    title: "Building a Chrome extension SDRs actually use",
    excerpt: "The design decisions behind a zero-friction scan-and-qualify workflow.",
    date: "Jun 05, 2026",
    readTime: "5 min read",
    category: "Engineering",
    thumbnail: blogExtensionImg,
    content: [
      { type: "p", text: "The best qualification tool is the one open in the tab a rep is already looking at. That's why LeadLens ships as a Chrome extension first and a dashboard second." },
      { type: "h2", text: "Zero-friction scans" },
      { type: "p", text: "One click captures the page, normalizes the evidence, hits the API, and returns a verdict — all before the rep has time to think about switching tools. The extension never asks for a form to be filled out; the URL is the input." },
      { type: "h2", text: "Device-locked keys" },
      { type: "p", text: "Every API key binds to the first device that activates it. Sharing a key between machines fails cleanly. This is why free plans can offer 100 scans/day without abuse — the key can't multiply." },
      { type: "quote", text: "The extension disappears into the workflow. That's the whole point." },
    ],
  },
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
            <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="group border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-[16/10] overflow-hidden bg-muted">
                <img src={p.thumbnail} alt={p.title} width={1600} height={1000} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-foreground text-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">{p.category}</span>
                  <span>{p.date} · {p.readTime}</span>
                </div>
                <h3 className="mt-3 font-semibold text-lg group-hover:underline">{p.title}</h3>
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
