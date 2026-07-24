import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { submitFeedback, listMyFeedback } from "@/lib/feedback.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Star, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — Qrinux LeadLens" },
      { name: "description", content: "Share your feedback with the Qrinux team." },
    ],
  }),
  component: FeedbackPage,
});

const CATEGORIES = ["Extension", "Dashboard", "Billing", "Support", "Other"];

function FeedbackPage() {
  const qc = useQueryClient();
  const submitFn = useServerFn(submitFeedback);
  const fetchFn = useServerFn(listMyFeedback);
  const list = useQuery({ queryKey: ["my-feedback"], queryFn: () => fetchFn() });

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [category, setCategory] = useState("Extension");
  const [message, setMessage] = useState("");

  const mut = useMutation({
    mutationFn: () => submitFn({ data: { rating, category, message } }),
    onSuccess: () => {
      setRating(0);
      setMessage("");
      qc.invalidateQueries({ queryKey: ["my-feedback"] });
    },
  });

  return (
    <DashboardShell title="Feedback" description="Tell us how Qrinux is working for you. Your rating helps shape what we build next.">
      <div className="grid lg:grid-cols-[1fr_20rem] gap-6">
        <section className="bg-background shadow-sm p-8">
          <div className="text-sm font-semibold mb-1">How would you rate your experience?</div>
          <div className="text-sm text-muted-foreground mb-6">Tap a star, then leave a note if you'd like.</div>

          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = (hover || rating) >= n;
              return (
                <button
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="p-1 transition"
                  aria-label={`${n} star`}
                >
                  <Star className={`h-10 w-10 transition ${filled ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} />
                </button>
              );
            })}
            <span className="ml-3 text-sm text-muted-foreground">
              {rating ? `${rating} / 5` : "Not rated"}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Category</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`text-xs px-3 py-1.5 transition ${
                      category === c ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="What worked well? What could be better?"
                className="mt-2 w-full bg-neutral-100 focus:bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => mut.mutate()} disabled={!rating || mut.isPending}>
                {mut.isPending ? "Sending…" : "Send feedback"}
              </Button>
              {mut.isSuccess && (
                <span className="text-sm text-emerald-600 inline-flex items-center gap-1">
                  <Check className="h-4 w-4" /> Thanks — feedback received.
                </span>
              )}
              {mut.isError && <span className="text-sm text-red-600">{(mut.error as any)?.message}</span>}
            </div>
          </div>
        </section>

        <aside className="bg-background shadow-sm p-6">
          <div className="text-sm font-semibold mb-4">Your recent feedback</div>
          {list.isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {list.data && list.data.length === 0 && (
            <div className="text-sm text-muted-foreground">Nothing yet. Send your first rating.</div>
          )}
          <div className="space-y-4">
            {(list.data ?? []).map((r: any) => (
              <div key={r.id} className="pb-4 border-b border-border/40 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((n) => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} />
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                {r.category && <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{r.category}</div>}
                {r.message && <div className="text-sm text-foreground/80 whitespace-pre-wrap">{r.message}</div>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
