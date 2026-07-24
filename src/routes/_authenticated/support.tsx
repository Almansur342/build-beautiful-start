import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMyMessages, sendMyMessage } from "@/lib/support.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Send, LifeBuoy, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — Qrinux LeadLens" }] }),
  component: SupportPage,
});

function SupportPage() {
  const qc = useQueryClient();
  const fetchMsgs = useServerFn(listMyMessages);
  const send = useServerFn(sendMyMessage);
  const msgs = useQuery({ queryKey: ["support"], queryFn: () => fetchMsgs() });
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const sendMut = useMutation({
    mutationFn: (body: string) => send({ data: { body } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["support"] });
    },
  });

  // Realtime subscription so admin replies land instantly
  useEffect(() => {
    const ch = supabase
      .channel("support_messages_self")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        () => qc.invalidateQueries({ queryKey: ["support"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.data]);

  const handleSend = () => {
    const body = text.trim();
    if (!body) return;
    sendMut.mutate(body);
  };

  return (
    <DashboardShell title="Support" description="Live chat with our team. Typical reply time under 2 hours.">
      <div className="grid lg:grid-cols-[1fr_18rem] gap-6">
        <div className="bg-background border border-border rounded-2xl flex flex-col h-[70vh] overflow-hidden">
          <div className="border-b border-border p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-foreground text-background grid place-items-center">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium">Qrinux Support</div>
              <div className="text-xs text-emerald-700 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online now
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {msgs.isLoading && <div className="text-center text-xs text-muted-foreground">Loading…</div>}
            {msgs.data && msgs.data.length === 0 && (
              <div className="text-center py-16 text-sm text-muted-foreground">
                Send a message to start the conversation.
              </div>
            )}
            {(msgs.data ?? []).map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.sender === "user"
                      ? "bg-foreground text-background rounded-br-sm"
                      : "bg-background border border-border rounded-bl-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div
                    className={`text-[10px] mt-1 ${m.sender === "user" ? "text-background/60" : "text-muted-foreground"}`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border p-3 flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message… (Enter to send, Shift+Enter for a new line)"
              rows={2}
              maxLength={2000}
              className="flex-1 resize-none rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <Button onClick={handleSend} disabled={!text.trim() || sendMut.isPending} size="icon" className="h-10 w-10">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-background border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-3">Other ways to reach us</h3>
            <a
              href="mailto:support@qrinux.com"
              className="flex items-center gap-3 text-sm hover:text-foreground text-muted-foreground"
            >
              <Mail className="h-4 w-4" /> support@qrinux.com
            </a>
          </div>
          <div className="bg-background border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-2">Common topics</h3>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              <li>• API key not working</li>
              <li>• Device binding reset</li>
              <li>• Billing / refund questions</li>
              <li>• Extension install issues</li>
            </ul>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
