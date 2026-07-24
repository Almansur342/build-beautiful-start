import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyDashboardData } from "@/lib/dashboard.functions";
import {
  Shield, Users, CreditCard, MessageSquare, Star, Settings2,
  ArrowLeft, LogOut, Menu, X, LayoutDashboard, RotateCcw,
} from "lucide-react";

export type AdminTab = "overview" | "users" | "plans" | "refunds" | "support" | "feedback";

const ADMIN_NAV: { key: AdminTab; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "users", label: "Users", icon: Users },
  { key: "plans", label: "Plans", icon: CreditCard },
  { key: "refunds", label: "Refunds", icon: RotateCcw },
  { key: "support", label: "Support", icon: MessageSquare },
  { key: "feedback", label: "Feedback", icon: Star },
];

export function AdminShell({
  tab,
  onTab,
  title,
  description,
  children,
  headerRight,
}: {
  tab: AdminTab;
  onTab: (t: AdminTab) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const fetchDash = useServerFn(getMyDashboardData);
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const email = dash.data?.profile?.email;
  const name = dash.data?.profile?.full_name;

  return (
    <div className="min-h-screen bg-neutral-50">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-[#0b1220] text-white z-30">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-emerald-400 grid place-items-center">
              <Shield className="h-4.5 w-4.5 text-[#0b1220]" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-sm">Super Admin</div>
              <div className="text-[10px] text-white/50 uppercase tracking-wider">Qrinux Control</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {ADMIN_NAV.map((item) => {
            const active = tab === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => onTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition text-left ${
                  active
                    ? "bg-emerald-400 text-[#0b1220] font-medium"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          <div className="mt-2 px-3 py-2 text-[11px] text-white/50 truncate">{email}</div>
        </div>
      </aside>

      <div className="lg:hidden fixed inset-x-0 top-0 z-40 bg-[#0b1220] text-white h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-emerald-400 grid place-items-center">
            <Shield className="h-3.5 w-3.5 text-[#0b1220]" />
          </div>
          <span className="font-semibold text-sm">Super Admin</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-[#0b1220] text-white flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
              <span className="font-semibold">Admin</span>
              <button onClick={() => setMobileOpen(false)} className="p-2" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon;
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => { onTab(item.key); setMobileOpen(false); }}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm ${
                      active ? "bg-emerald-400 text-[#0b1220] font-medium" : "text-white/70"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {item.label}
                  </button>
                );
              })}
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70">
                <ArrowLeft className="h-4 w-4" /> Back to app
              </Link>
              <button onClick={signOut} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 w-full text-left">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </nav>
          </div>
        </div>
      )}

      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold mb-2">
                {name ?? "Admin"} · Control panel
              </div>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">{title}</h1>
              {description && <p className="text-muted-foreground mt-1.5">{description}</p>}
            </div>
            {headerRight}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
