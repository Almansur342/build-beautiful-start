import { createFileRoute, Link } from "@tanstack/react-router";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { Button } from "@/components/ui/button";
import { Target, Users, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Qrinux LeadLens" },
      { name: "description", content: "The story, mission, and team behind Qrinux LeadLens — an evidence-first lead qualification platform." },
      { property: "og:title", content: "About Qrinux LeadLens" },
      { property: "og:description", content: "Evidence-first lead qualification — the story behind the product." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <BreadcrumbBar title="About" />
      <main className="max-w-4xl mx-auto px-6 py-16 lg:py-24">
        <section className="mb-16">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">About Qrinux</p>
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-6">
            We help teams qualify leads with evidence, not guesswork.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Qrinux LeadLens turns any website into a normalized evidence report — SEO signals,
            tech stack, contact surface, domain age, and accessibility — so sales and marketing
            teams stop wasting hours on prospects that were never a fit.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-6 mb-16">
          {[
            { icon: Target, title: "Mission", body: "Replace lead scoring guesswork with clean, first-party website evidence." },
            { icon: Users, title: "Who we serve", body: "Sales, GTM, and RevOps teams that qualify hundreds of leads a week." },
            { icon: ShieldCheck, title: "Principles", body: "Strict signals over vanity metrics. Every score must be defensible." },
            { icon: Zap, title: "How we build", body: "Ship v1.5.0-style strict logic — measurable accuracy, no black boxes." },
          ].map((c) => (
            <div key={c.title} className="border border-border p-6 bg-background">
              <div className="h-10 w-10 bg-foreground text-background grid place-items-center mb-4">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          ))}
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold tracking-tight mb-6">Our story</h2>
          <div className="prose prose-neutral max-w-none text-muted-foreground leading-relaxed space-y-4">
            <p>
              Qrinux started when our founder spent 40 hours in a single week manually checking
              websites of leads a CRM had marked "hot." Most were dead, half-built, or so
              outdated they hadn't been touched in years. The scoring model was noise.
            </p>
            <p>
              LeadLens is the reverse: it looks at the actual website first — the way a human
              qualifier would — and returns evidence a rep can read in seconds. No opaque
              scores. No made-up firmographics.
            </p>
          </div>
        </section>

        <section className="border-t border-border pt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Want to try it?</h3>
            <p className="text-sm text-muted-foreground mt-1">100 free scans per day. No credit card.</p>
          </div>
          <Link to="/auth">
            <Button className="h-10 px-6">Get started free</Button>
          </Link>
        </section>
      </main>
    </>
  );
}
