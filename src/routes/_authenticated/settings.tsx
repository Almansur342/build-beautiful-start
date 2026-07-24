import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyDashboardData } from "@/lib/dashboard.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Qrinux LeadLens" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const fetchDash = useServerFn(getMyDashboardData);
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const p = dash.data?.profile;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <DashboardShell title="Settings" description="Your account details.">
      <section className="bg-background border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" value={p?.full_name ?? "—"} />
          <Field label="Email" value={p?.email ?? "—"} />
          <Field label="Member since" value={p?.created_at ? new Date(p.created_at).toLocaleDateString() : "—"} />
          <Field label="Account ID" value={p?.id ?? "—"} mono />
        </div>
      </section>

      <section className="bg-background border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-1">Sign out</h2>
        <p className="text-sm text-muted-foreground mb-4">End your session on this device.</p>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </section>
    </DashboardShell>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className={`mt-1 text-sm ${mono ? "font-mono truncate" : ""}`}>{value}</div>
    </div>
  );
}
