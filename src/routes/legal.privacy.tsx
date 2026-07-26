import { createFileRoute } from "@tanstack/react-router";
import { LegalArticle, LegalSection } from "@/components/legal-article";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Qrinux LeadLens" },
      { name: "description", content: "How Qrinux LeadLens collects, uses, and protects your data." },
      { property: "og:title", content: "Privacy Policy — Qrinux LeadLens" },
      { property: "og:description", content: "How we handle data, sub-processors, retention, and your rights." },
    ],
  }),
  component: () => (
    <LegalArticle
      eyebrow="Privacy"
      title="Your data, in plain language."
      lede="We collect the minimum needed to run the product, keep it safe, and hand it back to you whenever you ask."
      updated="July 24, 2026"
    >
      <LegalSection number="01" title="What we collect">
        <p>
          To operate Qrinux LeadLens we store your email address, sign-in provider, hashed
          API key metadata, device fingerprint, and the normalized website evidence you
          scan. We do not store full HTML, screenshots, or personal data belonging to the
          websites you scan.
        </p>
      </LegalSection>

      <LegalSection number="02" title="How we use it">
        <ul>
          <li>Authenticate your account and enforce daily scan quotas.</li>
          <li>Bind your API key to a single device to prevent key sharing.</li>
          <li>Respond to support conversations you initiate.</li>
        </ul>
      </LegalSection>

      <LegalSection number="03" title="Sub-processors we share with">
        <p>
          We share data only with the providers required to run the service:
          <b> Supabase</b> for authentication and storage, and
          <b> Google or Apple</b> for social sign-in when you choose them. We never sell
          your data to third parties.
        </p>
      </LegalSection>

      <LegalSection number="04" title="Retention">
        <p>
          Scan evidence is retained for as long as your account is active. You can request
          full account deletion by emailing{" "}
          <a href="mailto:privacy@qrinux.com">privacy@qrinux.com</a> — we remove your
          records within 30 days.
        </p>
      </LegalSection>

      <LegalSection number="05" title="Your rights">
        <p>
          You may access, export, or delete your account data at any time from the
          dashboard, or by writing to{" "}
          <a href="mailto:privacy@qrinux.com">privacy@qrinux.com</a>.
        </p>
      </LegalSection>
    </LegalArticle>
  ),
});
