import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

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
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-foreground grid place-items-center">
              <span className="text-background font-bold text-sm">Q</span>
            </div>
            <span className="font-semibold">Qrinux LeadLens</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[16rem_1fr] gap-10">
        <aside className="lg:sticky lg:top-8 self-start">
          <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Legal</div>
          <nav className="space-y-1">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === l.to ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"
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
