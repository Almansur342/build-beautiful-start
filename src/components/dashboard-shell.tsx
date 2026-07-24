import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyDashboardData } from "@/lib/dashboard.functions";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  KeyRound,
  Laptop,
  Receipt,
  LifeBuoy,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/api-key", label: "API Key", icon: KeyRound },
  { to: "/devices", label: "Devices", icon: Laptop },
  { to: "/billing", label: "Billing", icon: Receipt },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchDash = useServerFn(getMyDashboardData);
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isSuperAdmin = dash.data?.isSuperAdmin;
  const email = dash.data?.profile?.email;
  const name = dash.data?.profile?.full_name;
  const initials = (name ?? email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-foreground text-background z-30">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-background grid place-items-center">
              <span className="text-foreground font-bold text-sm">Q</span>
            </div>
            <span className="font-semibold">Qrinux</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-background text-foreground font-medium"
                    : "text-background/70 hover:text-background hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {isSuperAdmin && (
            <>
              <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-wider text-background/40">Admin</div>
              <Link
                to="/admin"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  pathname === "/admin"
                    ? "bg-background text-foreground font-medium"
                    : "text-background/70 hover:text-background hover:bg-white/5"
                }`}
              >
                <Shield className="h-4 w-4" /> Admin Panel
              </Link>
            </>
          )}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="h-9 w-9 rounded-full bg-background text-foreground grid place-items-center text-xs font-semibold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{name ?? "Account"}</div>
              <div className="text-xs text-background/60 truncate">{email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start mt-2 text-background/70 hover:text-background hover:bg-white/5"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed inset-x-0 top-0 z-40 bg-foreground text-background h-14 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-background grid place-items-center">
            <span className="text-foreground font-bold text-xs">Q</span>
          </div>
          <span className="font-semibold text-sm">Qrinux</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="p-2" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-foreground text-background flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
              <span className="font-semibold">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-2" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                      active ? "bg-background text-foreground font-medium" : "text-background/70"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {item.label}
                  </Link>
                );
              })}
              {isSuperAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-background/70"
                >
                  <Shield className="h-4 w-4" /> Admin Panel
                </Link>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-background/70 w-full text-left"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <header className="hidden lg:flex bg-background border-b border-border h-16 items-center px-8 sticky top-0 z-20">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{title}</span>
          </div>
        </header>
        <div className="p-6 lg:p-10 max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-muted-foreground mt-1.5">{description}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
