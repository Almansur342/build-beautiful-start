import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyApiKeys, resetMyDeviceBinding } from "@/lib/apiKeys.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Laptop, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({ meta: [{ title: "Devices — Qrinux LeadLens" }] }),
  component: DevicesPage,
});

function DevicesPage() {
  const qc = useQueryClient();
  const fetchKeys = useServerFn(listMyApiKeys);
  const resetDev = useServerFn(resetMyDeviceBinding);
  const keys = useQuery({ queryKey: ["apiKeys"], queryFn: () => fetchKeys() });

  const resetMut = useMutation({
    mutationFn: () => resetDev(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apiKeys"] }),
  });

  return (
    <DashboardShell title="Devices" description="Your API key binds to the first device that uses it — one key, one machine at a time.">
      <div className="space-y-3">
        {(keys.data ?? []).length === 0 && (
          <div className="bg-background border border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
            No API keys yet. Generate one to see device info here.
          </div>
        )}
        {(keys.data ?? []).map((k) => {
          const bound = !!k.device_fingerprint;
          const active = !k.revoked_at;
          return (
            <div key={k.id} className="bg-background border border-border rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-muted grid place-items-center">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {bound ? "Bound device" : "Awaiting first scan"}
                    {active ? (
                      <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Revoked
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    Key {k.key_prefix}•••• • {bound ? `bound ${new Date(k.bound_at!).toLocaleString()}` : "not bound yet"}
                  </div>
                  {k.last_used_at && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Last used {new Date(k.last_used_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              {active && bound && (
                <Button size="sm" variant="outline" onClick={() => resetMut.mutate()} disabled={resetMut.isPending}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reset binding
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-muted/40 border border-border rounded-2xl p-6 text-sm">
        <h3 className="font-semibold mb-2">How device binding works</h3>
        <ul className="space-y-1.5 text-muted-foreground list-disc pl-5">
          <li>The first Chrome install that uses your key gets locked to it.</li>
          <li>Attempts from another device are rejected with a clear error.</li>
          <li>Reset the binding here to move to a new machine — instant, no support needed.</li>
        </ul>
      </div>
    </DashboardShell>
  );
}
