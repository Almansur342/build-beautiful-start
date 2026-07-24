import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Qrinux LeadLens" },
      { name: "description", content: "How we use cookies and similar technologies." },
    ],
  }),
  component: () => (
    <article>
      <h1 className="text-4xl font-semibold tracking-tight">Cookie Policy</h1>
      <p className="text-muted-foreground">Last updated: July 24, 2026</p>
      <h2>What are cookies</h2>
      <p>
        Cookies are small text files stored on your device to keep you signed in and remember preferences.
      </p>
      <h2>What we use</h2>
      <ul>
        <li><b>Essential:</b> session cookies for authentication (managed by Supabase).</li>
        <li><b>Analytics:</b> anonymous usage counters — no cross-site tracking.</li>
        <li><b>Payments:</b> Stripe sets its own cookies on checkout pages.</li>
      </ul>
      <h2>Managing cookies</h2>
      <p>
        You can clear cookies in your browser settings. Clearing essential cookies will sign you out of
        Qrinux LeadLens.
      </p>
    </article>
  ),
});
