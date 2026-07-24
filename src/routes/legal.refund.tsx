import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Qrinux LeadLens" },
      { name: "description", content: "How refunds work on Qrinux LeadLens paid plans." },
    ],
  }),
  component: () => (
    <article>
      <h1 className="text-4xl font-semibold tracking-tight">Refund Policy</h1>
      <p className="text-muted-foreground">Last updated: July 24, 2026</p>
      <h2>Eligibility</h2>
      <p>
        You can request a refund for any paid invoice within <b>30 days</b> of payment, from the Billing
        page in your dashboard.
      </p>
      <h2>How to request</h2>
      <ol>
        <li>Go to Dashboard → Billing.</li>
        <li>Find the invoice and click <b>Request refund</b>.</li>
        <li>Describe the reason. Our team reviews within 2 business days.</li>
      </ol>
      <h2>Processing</h2>
      <p>
        Approved refunds are returned to your original payment method within 5–10 business days. You'll
        see the status update to <b>refunded</b> on the Billing page.
      </p>
      <h2>Exclusions</h2>
      <p>
        We do not refund invoices older than 30 days, or refund the Free plan (there's nothing to refund).
        Accounts terminated for policy violations are not eligible.
      </p>
      <h2>Questions?</h2>
      <p>
        Reach us via the in-app Support chat or at{" "}
        <a href="mailto:support@qrinux.com">support@qrinux.com</a>.
      </p>
    </article>
  ),
});
