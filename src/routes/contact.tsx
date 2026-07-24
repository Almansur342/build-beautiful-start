import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, LifeBuoy } from "lucide-react";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Qrinux LeadLens" },
      { name: "description", content: "Reach the Qrinux LeadLens team." },
      { property: "og:title", content: "Contact Qrinux LeadLens" },
      { property: "og:description", content: "Reach the Qrinux LeadLens team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbBar title="Contact" />
      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Contact</div>
        <h1 className="text-5xl font-semibold tracking-tight">Let's talk.</h1>
        <p className="text-lg text-muted-foreground mt-3 max-w-2xl">
          Questions about qualification logic, custom plans, or an integration? Pick the fastest route.
        </p>

        <div className="mt-12 grid md:grid-cols-3 gap-4">
          <Card icon={Mail} title="Email" line="support@qrinux.com" href="mailto:support@qrinux.com" />
          <Card icon={LifeBuoy} title="Live chat" line="Available inside the dashboard" href="/support" internal />
          <Card icon={MessageCircle} title="Sales" line="sales@qrinux.com" href="mailto:sales@qrinux.com" />
        </div>

        <div className="mt-16 bg-muted/40 border border-border rounded-2xl p-8">
          <h2 className="text-xl font-semibold">Where we are</h2>
          <p className="text-muted-foreground mt-2">
            Qrinux LeadLens • Remote-first team • Contact for a demo or a partnership.
          </p>
        </div>
      </main>
    </div>
  );
}

function Card({ icon: Icon, title, line, href, internal }: { icon: any; title: string; line: string; href: string; internal?: boolean }) {
  const inner = (
    <div className="bg-background border border-border rounded-2xl p-6 hover:border-foreground transition">
      <div className="h-10 w-10 rounded-xl bg-foreground text-background grid place-items-center mb-4">
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{line}</div>
    </div>
  );
  if (internal) return <Link to={href as any}>{inner}</Link>;
  return <a href={href}>{inner}</a>;
}
