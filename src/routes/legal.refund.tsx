import { createFileRoute } from "@tanstack/react-router";
import { LegalArticle, LegalSection } from "@/components/legal-article";

export const Route = createFileRoute("/legal/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Qrinux LeadLens" },
      { name: "description", content: "How refunds work on Qrinux LeadLens paid plans." },
      { property: "og:title", content: "Refund Policy — Qrinux LeadLens" },
      { property: "og:description", content: "30-day, no-drama refunds from the Billing page." },
    ],
  }),
  component: () => (
    <LegalArticle
      eyebrow="Refunds"
      title="30 days, no drama."
      lede="If LeadLens isn't the right fit, request a refund from Billing and we'll return it to your original payment method."
      updated="July 24, 2026"
    >
      <LegalSection number="01" title="Eligibility">
        <p>
          You can request a refund for any paid invoice within <b>30 days</b> of payment,
          directly from the Billing page in your dashboard.
        </p>
      </LegalSection>

      <LegalSection number="02" title="How to request">
        <ol>
          <li>Open <b>Dashboard → Billing</b>.</li>
          <li>
            Find the invoice and click <b>Request refund</b>.
          </li>
          <li>Describe the reason. Our team reviews within two business days.</li>
        </ol>
      </LegalSection>

      <LegalSection number="03" title="Processing">
        <p>
          Approved refunds are returned to your original payment method within 5–10
          business days. You will see the status update to <b>refunded</b> on the Billing
          page and receive a confirmation email.
        </p>
      </LegalSection>

      <LegalSection number="04" title="Exclusions">
        <p>
          We do not refund invoices older than 30 days, and there is nothing to refund on
          the Free plan. Accounts terminated for policy violations are not eligible.
        </p>
      </LegalSection>

      <LegalSection number="05" title="Questions?">
        <p>
          Reach us via the in-app Support chat or at{" "}
          <a href="mailto:support@qrinux.com">support@qrinux.com</a>.
        </p>
      </LegalSection>
    </LegalArticle>
  ),
});
