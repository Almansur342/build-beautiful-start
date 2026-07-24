import { createFileRoute } from "@tanstack/react-router";
import { LegalArticle, LegalSection } from "@/components/legal-article";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Qrinux LeadLens" },
      { name: "description", content: "How we use cookies and similar technologies." },
      { property: "og:title", content: "Cookie Policy — Qrinux LeadLens" },
      { property: "og:description", content: "Essential, analytics, and payments cookies — nothing more." },
    ],
  }),
  component: () => (
    <LegalArticle
      eyebrow="Cookies"
      title="A tiny handful of cookies."
      lede="We use cookies to keep you signed in, count anonymous usage, and let Stripe run checkout. That's it."
      updated="July 24, 2026"
    >
      <LegalSection number="01" title="What cookies are">
        <p>
          Cookies are small text files stored on your device to keep you signed in and
          remember preferences between visits.
        </p>
      </LegalSection>

      <LegalSection number="02" title="What we set">
        <ul>
          <li>
            <b>Essential:</b> session cookies for authentication, managed by Supabase.
          </li>
          <li>
            <b>Analytics:</b> anonymous usage counters — no cross-site tracking, no ads.
          </li>
          <li>
            <b>Payments:</b> Stripe sets its own cookies on checkout pages under its
            domain.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="03" title="Managing cookies">
        <p>
          You can clear cookies from your browser at any time. Clearing essential cookies
          will sign you out of Qrinux LeadLens.
        </p>
      </LegalSection>
    </LegalArticle>
  ),
});
