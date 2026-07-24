import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";

export const Route = createFileRoute("/legal")({
  component: LegalLayout,
});

const LINKS = [
  { to: "/legal/privacy", label: "Privacy Policy" },
  { to: "/legal/terms", label: "Terms of Service" },
  { to: "/legal/refund", label: "Refund Policy" },
  { to: "/legal/cookies", label: "Cookie Policy" },
] as const;

function LegalLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbBar />
      <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[16rem_1fr] gap-10">
        <aside className="lg:sticky lg:top-24 self-start">
          <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Legal</div>
          <nav className="space-y-1">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`block px-3 py-2 text-sm border-l-2 ${
                  pathname === l.to ? "border-foreground bg-muted font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="prose prose-neutral max-w-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

