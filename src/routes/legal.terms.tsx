import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Qrinux LeadLens" },
      { name: "description", content: "Terms governing the use of Qrinux LeadLens." },
    ],
  }),
  component: () => (
    <article>
      <h1 className="text-4xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: July 24, 2026</p>
      <h2>Acceptance</h2>
      <p>
        By creating an account or using the Qrinux LeadLens Chrome extension, you agree to these Terms.
        If you don't agree, please don't use the service.
      </p>
      <h2>Accounts</h2>
      <p>
        You're responsible for maintaining the confidentiality of your API key. Your API key locks to the
        first device that uses it. You can reset the binding from the dashboard when needed.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Do not scan sites you're not authorized to research.</li>
        <li>Do not circumvent daily scan quotas or device binding.</li>
        <li>Do not resell access to your API key.</li>
      </ul>
      <h2>Payments</h2>
      <p>
        Paid plans are billed monthly through Stripe. Refunds follow our{" "}
        <a href="/legal/refund">Refund Policy</a>.
      </p>
      <h2>Termination</h2>
      <p>
        We may suspend accounts that violate these Terms. You can cancel your subscription anytime from
        the Billing page.
      </p>
      <h2>Liability</h2>
      <p>
        The service is provided "as is" without warranty. Qrinux LeadLens is not liable for indirect
        damages arising from use of the service.
      </p>
    </article>
  ),
});
