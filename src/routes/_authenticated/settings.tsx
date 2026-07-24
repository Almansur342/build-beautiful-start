import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { getMyDashboardData } from "@/lib/dashboard.functions";
import { updateMyProfile, deleteMyAccount, getAvatarSignedUrl } from "@/lib/profile.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Trash2, Upload, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Qrinux LeadLens" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDash = useServerFn(getMyDashboardData);
  const updateFn = useServerFn(updateMyProfile);
  const delFn = useServerFn(deleteMyAccount);
  const signFn = useServerFn(getAvatarSignedUrl);

  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const p = dash.data?.profile as any;

  const [form, setForm] = useState({
    full_name: "",
    company: "",
    phone: "",
    timezone: "",
    website: "",
    bio: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>("default");
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (p) {
      setForm({
        full_name: p.full_name ?? "",
        company: p.company ?? "",
        phone: p.phone ?? "",
        timezone: p.timezone ?? "",
        website: p.website ?? "",
        bio: p.bio ?? "",
      });
      if (p.avatar_url) {
        signFn({ data: { path: p.avatar_url } }).then((r: any) => setAvatarUrl(r.url)).catch(() => {});
      }
    }
  }, [p, signFn]);

  useEffect(() => {
    if (typeof Notification !== "undefined") setNotifPerm(Notification.permission);
  }, []);

  const saveMut = useMutation({
    mutationFn: () => updateFn({ data: form }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  const delMut = useMutation({
    mutationFn: () => delFn({ data: { confirm: confirmText } }),
    onSuccess: async () => {
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    },
  });

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !p?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${p.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      await updateFn({ data: { avatar_url: path } });
      const signed = await signFn({ data: { path } });
      setAvatarUrl((signed as any).url);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } finally {
      setUploading(false);
    }
  };

  const enableNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      new Notification("Qrinux LeadLens", { body: "Notifications enabled." });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <DashboardShell title="Settings" description="Manage your profile, notifications, and account.">
      {/* Profile */}
      <section className="bg-background border border-border p-6 mb-6">
        <h2 className="font-semibold mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="h-20 w-20 bg-muted border border-border overflow-hidden grid place-items-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-muted-foreground">
                {(form.full_name || p?.email || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer border border-border px-3 py-2 hover:bg-muted">
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/*" onChange={onAvatarChange} className="hidden" disabled={uploading} />
            </label>
            {avatarUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await updateFn({ data: { avatar_url: null } });
                  setAvatarUrl(null);
                  qc.invalidateQueries({ queryKey: ["dashboard"] });
                }}
              >
                Remove
              </Button>
            )}
          </div>
        </div>


        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <TextField label="Email" value={p?.email ?? ""} disabled />
          <TextField label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
          <TextField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <TextField label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <TextField label="Timezone" value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} placeholder="e.g. Asia/Dhaka" />
        </div>
        <div className="mt-4">
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            maxLength={500}
            className="mt-1 w-full border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : "Save changes"}
          </Button>
          {saveMut.isSuccess && <span className="text-sm text-emerald-600">Saved.</span>}
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-background border border-border p-6 mb-6">
        <h2 className="font-semibold mb-2">Notifications</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Get browser notifications for support replies, scan limits, and billing events.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={enableNotifications} disabled={notifPerm === "granted"}>
            <Bell className="h-4 w-4 mr-2" />
            {notifPerm === "granted" ? "Enabled" : notifPerm === "denied" ? "Blocked" : "Enable notifications"}
          </Button>
          <span className="text-xs text-muted-foreground">Status: {notifPerm}</span>
        </div>
      </section>

      {/* Sign out */}
      <section className="bg-background border border-border p-6 mb-6">
        <h2 className="font-semibold mb-1">Sign out</h2>
        <p className="text-sm text-muted-foreground mb-4">End your session on this device.</p>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </section>

      {/* Danger zone */}
      <section className="bg-background border border-red-200 p-6">
        <h2 className="font-semibold text-red-600 mb-1">Delete account</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account, API keys, scan history, subscription, and all data. This action cannot be undone.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <Button
            variant="destructive"
            onClick={() => delMut.mutate()}
            disabled={confirmText !== "DELETE" || delMut.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {delMut.isPending ? "Deleting…" : "Delete my account"}
          </Button>
        </div>
        {delMut.isError && <div className="mt-2 text-sm text-red-600">{(delMut.error as any)?.message}</div>}
      </section>
    </DashboardShell>
  );
}

function TextField({ label, value, onChange, disabled, placeholder }: { label: string; value: string; onChange?: (v: string) => void; disabled?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground disabled:bg-muted disabled:text-muted-foreground"
      />
    </div>
  );
}
