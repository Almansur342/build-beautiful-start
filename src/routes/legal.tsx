import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { ScrollText, FileText, Cookie, Mail, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/legal")({
  component: LegalLayout,
});

const LINKS = [
  { to: "/legal/privacy", label: "Privacy Policy", icon: ShieldCheck },
  { to: "/legal/terms", label: "Terms of Service", icon: FileText },
  { to: "/legal/cookies", label: "Cookie Policy", icon: Cookie },
] as const;

function LegalLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = LINKS.find((l) => l.to === pathname);

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbBar title={current?.label ?? "Legal"} />

      {/* Hero band */}
      <section className="border-b border-border bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.13),_transparent_32rem),linear-gradient(to_bottom,_#fafaf7,_#fff)]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-muted-foreground">
            <ScrollText className="h-3.5 w-3.5" /> Legal & policies
          </div>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl md:text-6xl font-semibold tracking-tight leading-[1.02]">
            The fine print,{" "}
            <span className="italic font-serif text-muted-foreground">without the fog.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-muted-foreground text-lg">
            Plain-language policies that describe how Qrinux LeadLens handles your data,
            payments, and account. Written to be read.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-14 grid lg:grid-cols-[17rem_1fr] gap-12">
        <aside className="lg:sticky lg:top-24 self-start">
          <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-4">
            Documents
          </div>
          <nav className="space-y-1">
            {LINKS.map((l) => {
              const Icon = l.icon;
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm border-l-2 transition-colors ${
                    active
                      ? "border-foreground bg-muted font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" /> Have a question?
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Our team responds to legal and privacy inquiries within two business days.
            </p>
            <a
              href="mailto:legal@qrinux.com"
              className="mt-3 inline-block text-xs font-medium underline underline-offset-4"
            >
              legal@qrinux.com
            </a>
          </div>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
