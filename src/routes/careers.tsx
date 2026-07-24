import { createFileRoute } from "@tanstack/react-router";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — Qrinux LeadLens" },
      { name: "description", content: "Join the Qrinux LeadLens team. Open roles across engineering, design, and go-to-market." },
      { property: "og:title", content: "Careers at Qrinux LeadLens" },
      { property: "og:description", content: "Open roles at Qrinux LeadLens." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CareersPage,
});

const ROLES = [
  { title: "Senior Full-Stack Engineer", team: "Engineering", type: "Full-time", location: "Remote" },
  { title: "Chrome Extension Engineer", team: "Engineering", type: "Full-time", location: "Remote" },
  { title: "Product Designer", team: "Design", type: "Full-time", location: "Remote" },
  { title: "Growth Marketer", team: "GTM", type: "Full-time", location: "Remote" },
  { title: "Customer Success Engineer", team: "Support", type: "Full-time", location: "Remote" },
];

function CareersPage() {
  return (
    <>
      <BreadcrumbBar title="Careers" />
      <main className="max-w-4xl mx-auto px-6 py-16 lg:py-24">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Careers</p>
        <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-6">
          Build the future of lead qualification.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-12 max-w-2xl">
          We are a small, remote-first team that ships fast and thinks in evidence.
          If that sounds like you, we want to hear from you.
        </p>

        <div className="space-y-3">
          {ROLES.map((r) => (
            <a
              key={r.title}
              href={`mailto:careers@qrinux.com?subject=${encodeURIComponent(r.title)}`}
              className="block border border-border p-6 bg-background hover:border-foreground transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{r.team}</div>
                  <h3 className="font-semibold text-lg">{r.title}</h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {r.location}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {r.type}</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-16 border-t border-border pt-10">
          <h2 className="text-xl font-semibold tracking-tight mb-2">Don't see your role?</h2>
          <p className="text-sm text-muted-foreground">
            Write us at{" "}
            <a href="mailto:careers@qrinux.com" className="text-foreground underline">
              careers@qrinux.com
            </a>{" "}
            with your work and why Qrinux.
          </p>
        </div>
      </main>
    </>
  );
}
