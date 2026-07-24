import { createFileRoute } from "@tanstack/react-router";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — Qrinux LeadLens" },
      { name: "description", content: "Product updates, fixes, and improvements to Qrinux LeadLens." },
      { property: "og:title", content: "Qrinux LeadLens Changelog" },
      { property: "og:description", content: "What we shipped, week by week." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ChangelogPage,
});

const RELEASES = [
  {
    v: "v1.5.0",
    date: "Jul 24, 2026",
    title: "Strict qualification signals",
    tag: "Major",
    items: [
      "Strict gating: contact-surface + tech-stack + domain-age all required to pass.",
      "SEO signals now weight page-title + meta-description independently.",
      "Accessibility score contributes to disqualification, not scoring.",
      "New evidence card: last content update.",
    ],
  },
  {
    v: "v1.4.2",
    date: "Jun 30, 2026",
    title: "Extension performance",
    tag: "Patch",
    items: ["30% faster scan pipeline.", "Fixed rare timeout on very large sites."],
  },
  {
    v: "v1.4.0",
    date: "Jun 05, 2026",
    title: "API keys & device binding",
    tag: "Feature",
    items: [
      "Every user gets a personal API key.",
      "One-device-at-a-time binding for the Chrome extension.",
      "Daily scan limits enforced per plan.",
    ],
  },
  {
    v: "v1.3.0",
    date: "May 12, 2026",
    title: "Stripe billing",
    tag: "Feature",
    items: ["Starter and Unlimited plans.", "Invoice history in dashboard.", "Self-serve refund requests."],
  },
];

function ChangelogPage() {
  return (
    <>
      <BreadcrumbBar title="Changelog" />
      <main className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Changelog</p>
        <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-12">
          What we shipped
        </h1>

        <div className="space-y-12">
          {RELEASES.map((r) => (
            <article key={r.v} className="border-l-2 border-foreground pl-6">
              <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{r.v}</span>
                <span>·</span>
                <span>{r.date}</span>
                <span className="ml-auto border border-border px-2 py-0.5 uppercase tracking-wider">{r.tag}</span>
              </div>
              <h2 className="text-xl font-semibold tracking-tight mb-3">{r.title}</h2>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {r.items.map((it) => (
                  <li key={it} className="pl-4 relative before:content-['—'] before:absolute before:left-0">
                    {it}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
