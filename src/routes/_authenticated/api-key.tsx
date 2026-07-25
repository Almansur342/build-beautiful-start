import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { generateMyApiKey, listMyApiKeys, resetMyDeviceBinding } from "@/lib/apiKeys.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import extensionAsset from "@/assets/qrinux-leadlens.zip.asset.json";
import { Copy, Download, KeyRound, RefreshCw, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/api-key")({
  head: () => ({ meta: [{ title: "API Key — Qrinux LeadLens" }] }),
  component: ApiKeyPage,
});

function ApiKeyPage() {
  const qc = useQueryClient();
  const fetchKeys = useServerFn(listMyApiKeys);
  const genKey = useServerFn(generateMyApiKey);
  const resetDev = useServerFn(resetMyDeviceBinding);
  const keys = useQuery({ queryKey: ["apiKeys"], queryFn: () => fetchKeys() });
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMut = useMutation({
    mutationFn: () => genKey(),
    onSuccess: (r) => {
      setFreshKey(r.plaintext);
      qc.invalidateQueries({ queryKey: ["apiKeys"] });
      toast.success("API key generated. Copy it now — it won't be shown again.");
    },
    onError: (e: any) => {
      toast.error(`Could not generate API key: ${e?.message || "Unknown error"}`);
    },
  });
  const resetMut = useMutation({
    mutationFn: () => resetDev(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["apiKeys"] });
      toast.success("Device binding reset. Next scan will bind to the new device.");
    },
    onError: (e: any) => toast.error(`Reset failed: ${e?.message || "Unknown error"}`),
  });

  const activeKey = (keys.data ?? []).find((k) => !k.revoked_at);

  const downloadExtension = () => {
    const a = document.createElement("a");
    a.href = extensionAsset.url;
    a.download = "qrinux-leadlens-v1.5.4.zip";
    a.click();
  };

  return (
    <DashboardShell title="API Key" description="One key per account, locked to the first device that uses it.">
      <section className="bg-background border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-foreground text-background grid place-items-center">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Your API key</h2>
              <p className="text-sm text-muted-foreground">Generate once. Regenerating invalidates the old key.</p>
            </div>
          </div>
          <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
            {activeKey ? "Regenerate key" : "Generate API key"}
          </Button>
        </div>

        {freshKey ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-900 mb-2">
              <AlertTriangle className="h-4 w-4" /> Copy your API key now — it will not be shown again.
            </div>
            <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-2 font-mono text-sm break-all">
              <span className="flex-1">{freshKey}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(freshKey);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                <Copy className="w-4 h-4 mr-1" /> {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : activeKey ? (
          <div className="bg-muted/50 border border-border rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Active key</p>
            <p className="font-mono mt-1">{activeKey.key_prefix}••••••••••••••••</p>
            {activeKey.device_fingerprint && (
              <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">
                  Locked to device • bound {new Date(activeKey.bound_at!).toLocaleString()}
                </span>
                <Button size="sm" variant="outline" onClick={() => resetMut.mutate()} disabled={resetMut.isPending}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Reset device binding
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-muted/30 border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            No API key yet. Generate one to start scanning.
          </div>
        )}
      </section>

      <section className="bg-background border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-foreground text-background grid place-items-center">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Install the Chrome extension</h2>
              <p className="text-sm text-muted-foreground">Six steps and you're scanning.</p>
            </div>
          </div>
          <Button onClick={downloadExtension} variant="outline">
            <Download className="w-4 h-4 mr-2" /> Download extension
          </Button>
        </div>
        <ol className="space-y-3 text-sm">
          <Step n={1}>Click <b>Download extension</b> above to get the ZIP.</Step>
          <Step n={2}>Unzip the file on your computer.</Step>
          <Step n={3}>Open <code className="font-mono bg-muted px-1.5 py-0.5 rounded">chrome://extensions</code> in Chrome.</Step>
          <Step n={4}>Turn on <b>Developer mode</b> (top-right toggle).</Step>
          <Step n={5}>Click <b>Load unpacked</b> and select the unzipped folder.</Step>
          <Step n={6}>Open the extension's <b>Options</b> page and paste your API key.</Step>
        </ol>
      </section>
    </DashboardShell>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background text-xs font-semibold grid place-items-center">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
