import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/docs", label: "Docs" },
  { to: "/changelog", label: "Changelog" },
  { to: "/blog", label: "Blog" },
  { to: "/careers", label: "Careers" },
  { to: "/contact", label: "Contact" },
] as const;

export function PublicNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Hide on dashboard/auth pages
  if (pathname.startsWith("/auth") || isDashboard(pathname)) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 bg-foreground grid place-items-center">
            <span className="text-background font-bold text-sm">Q</span>
          </div>
          <span className="font-semibold tracking-tight">Qrinux LeadLens</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="hover:text-foreground transition"
              activeProps={{ className: "text-foreground font-medium" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {authed ? (
            <Link to="/dashboard">
              <Button className="h-9 px-4">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Link to="/auth">
                <Button className="h-9 px-4">Get started</Button>
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 top-16 z-40 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="md:hidden absolute left-0 right-0 top-16 z-50 border-t border-border bg-background shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-6 py-4 flex flex-col gap-3">
              {LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground py-1"
                >
                  {l.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-border flex gap-2">
                {authed ? (
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="flex-1">
                    <Button className="w-full">Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setOpen(false)} className="flex-1">
                      <Button variant="outline" className="w-full">Sign in</Button>
                    </Link>
                    <Link to="/auth" onClick={() => setOpen(false)} className="flex-1">
                      <Button className="w-full">Get started</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

function isDashboard(p: string) {
  return (
    p.startsWith("/dashboard") ||
    p.startsWith("/api-key") ||
    p.startsWith("/devices") ||
    p.startsWith("/billing") ||
    p.startsWith("/support") ||
    p.startsWith("/settings") ||
    p.startsWith("/admin")
  );
}
