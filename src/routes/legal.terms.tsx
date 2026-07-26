import { createFileRoute } from "@tanstack/react-router";
import { LegalArticle, LegalSection } from "@/components/legal-article";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Qrinux LeadLens" },
      { name: "description", content: "Terms governing the use of Qrinux LeadLens." },
      { property: "og:title", content: "Terms of Service — Qrinux LeadLens" },
      { property: "og:description", content: "The ground rules for using Qrinux LeadLens." },
    ],
  }),
  component: () => (
    <LegalArticle
      eyebrow="Terms"
      title="The ground rules for using LeadLens."
      lede="Short, readable terms that describe what you agree to when you use the extension and dashboard."
      updated="July 24, 2026"
    >
      <LegalSection number="01" title="Acceptance">
        <p>
          By creating an account or installing the Qrinux LeadLens Chrome extension, you
          agree to these Terms. If you do not agree, please stop using the service.
        </p>
      </LegalSection>

      <LegalSection number="02" title="Accounts & API keys">
        <p>
          You are responsible for keeping your API key confidential. Your key locks to the
          first device that uses it — you can reset the binding from the dashboard whenever
          needed. Do not share, resell, or expose your key in public code.
        </p>
      </LegalSection>

      <LegalSection number="03" title="Acceptable use">
        <ul>
          <li>Do not scan sites you are not authorized to research.</li>
          <li>Do not circumvent daily scan quotas or device binding.</li>
          <li>Do not resell, rent, or sublicense access to your API key.</li>
          <li>Do not use the service for automated abuse, scraping at scale, or spam.</li>
        </ul>
      </LegalSection>

      <LegalSection number="05" title="Termination">
        <p>
          We may suspend accounts that violate these Terms or place the service or other
          users at risk. You may terminate your account at any time from Settings.
        </p>
      </LegalSection>

      <LegalSection number="06" title="Liability">
        <p>
          The service is provided <b>as is</b>, without warranty of any kind. Qrinux
          LeadLens is not liable for indirect, incidental, or consequential damages arising
          from your use of the service.
        </p>
      </LegalSection>
    </LegalArticle>
  ),
});
