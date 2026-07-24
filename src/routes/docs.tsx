import { createFileRoute, Link } from "@tanstack/react-router";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { Button } from "@/components/ui/button";
import { Download, KeyRound, Chrome, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — Qrinux LeadLens" },
      { name: "description", content: "Install the Chrome extension, grab your API key, and start scanning websites." },
      { property: "og:title", content: "Qrinux LeadLens Documentation" },
      { property: "og:description", content: "Extension installation and API key setup guide." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DocsPage,
});

const STEPS = [
  {
    n: "01",
    icon: Download,
    title: "Download the extension",
    body: "Grab the latest Qrinux LeadLens Chrome extension ZIP from your dashboard's API Key page.",
  },
  {
    n: "02",
    icon: Chrome,
    title: "Enable developer mode",
    body: "Open chrome://extensions, toggle Developer mode (top right), and click Load unpacked. Select the unzipped folder.",
  },
  {
    n: "03",
    icon: KeyRound,
    title: "Paste your API key",
    body: "Open the extension options page. Paste your API key. The first device to use the key gets bound to it.",
  },
  {
    n: "04",
    icon: PlayCircle,
    title: "Start scanning",
    body: "Visit any website and click the LeadLens icon. You get up to 100 free scans per day.",
  },
];

function DocsPage() {
  return (
    <>
      <BreadcrumbBar title="Docs" />
      <main className="max-w-4xl mx-auto px-6 py-16 lg:py-24">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Documentation</p>
        <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-6">
          Install LeadLens in under 2 minutes.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-12 max-w-2xl">
          The Chrome extension is fully sandboxed, works offline for parsing, and only
          calls Qrinux to authorize scans against your daily quota.
        </p>

        <div className="space-y-4 mb-16">
          {STEPS.map((s) => (
            <div key={s.n} className="border border-border bg-background p-6 flex gap-6">
              <div className="text-3xl font-semibold tracking-tight text-muted-foreground/60 w-14 shrink-0">{s.n}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="h-5 w-5" />
                  <h3 className="font-semibold">{s.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="border border-border p-8 bg-background mb-16">
          <h2 className="text-xl font-semibold tracking-tight mb-4">API key rules</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>— One API key per account. Rotate anytime from the dashboard.</li>
            <li>— One device bound per key. Reset device binding from Devices page.</li>
            <li>— Free plan: 100 scans / 24h. Starter: 500. Unlimited: no cap.</li>
            <li>— Keys are hashed at rest; Qrinux staff cannot see your key.</li>
          </ul>
        </section>

        <section className="border-t border-border pt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Ready?</h3>
            <p className="text-sm text-muted-foreground mt-1">Grab your API key and get scanning.</p>
          </div>
          <Link to="/auth">
            <Button className="h-10 px-6">Open dashboard</Button>
          </Link>
        </section>
      </main>
    </>
  );
}
