import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Qrinux LeadLens" },
      { name: "description", content: "How Qrinux LeadLens collects, uses, and protects your data." },
    ],
  }),
  component: () => (
    <article>
      <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: July 24, 2026</p>
      <h2>What we collect</h2>
      <p>
        We collect the minimum information required to run Qrinux LeadLens: your email address, sign-in
        provider, hashed API key metadata, device fingerprint, and normalized website evidence you scan.
        We do not store full HTML, screenshots, or PII of scanned websites.
      </p>
      <h2>How we use it</h2>
      <ul>
        <li>To authenticate your account and enforce daily scan quotas.</li>
        <li>To bind your API key to a single device for security.</li>
        <li>To provide invoices and process refunds through Stripe.</li>
        <li>To respond to support conversations.</li>
      </ul>
      <h2>Sharing</h2>
      <p>
        We share data only with sub-processors required to run the service: Stripe for payments,
        Supabase for authentication and storage, and Google/Apple for social sign-in when you use them.
        We never sell your data.
      </p>
      <h2>Retention</h2>
      <p>
        Scan evidence is retained for as long as your account is active. You can request full deletion
        by emailing <a href="mailto:privacy@qrinux.com">privacy@qrinux.com</a>.
      </p>
      <h2>Your rights</h2>
      <p>
        You may access, export, or delete your account data at any time. Contact us at{" "}
        <a href="mailto:privacy@qrinux.com">privacy@qrinux.com</a>.
      </p>
    </article>
  ),
});
