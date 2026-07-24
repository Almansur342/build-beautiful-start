# Qrinux LeadLens 1.5.0 — Strict Qualification and Research-Only Gate Release

## What changed

- Added a strict first-step qualification gate before website opportunity, services, channels, or outreach copy are shown.
- Every record is now treated as one of four practical states: eligible SMB prospect, research-only/non-SMB, excluded, or retry-required.
- Generic SEO/redesign outreach angles are suppressed for platforms, marketplaces, SaaS products, documentation products, media/publishers, universities, government/public-sector sites, large brands, hosted app pages, and known non-prospect domains.
- Retry, timeout, blocked, and empty scans return only retry/identity-verification guidance.
- Research-only records return `research-only` and `no-generic-outreach` angles instead of conversion, SEO, contact-path, or redesign sales angles.
- The local runtime now has a `platform` classification for marketplace/product/platform records that were previously falling back to `General business`.
- Known non-SMB domains from the July 24, 2026 test export were added to the research-only/skip list, including Alibaba, MSI, Avast, Hatena, SAPO, LiveJournal, Trip, KAYAK, JD, Telegram, Netlify-hosted pages, Read the Docs, Apache, Arch Linux, Frontiers, Kazinform, RIA, Onet, ITmedia, ERR, UEFA, Niconico, LibreTexts, Telegraph, Narod, LigaZakon, Banggood, Seesaa, ANTARA, Czech Television, Linternaute, and major university/government domains.
- Direct email scoring is stricter: direct emails must be on-domain, valid enough, and not privacy/legal/press/support/manual-review mailboxes before they count as a direct outreach channel.
- Normalized exports now include `eligibility`, `verdict`, `outreachReadiness`, and `websiteOpportunity` inside `businessIntelligence`, not just classification and outreach angles.
- Compact evidence schema updated to `leadlens-evidence-v5`.

## Expected behavior on the 48-site accuracy sample

- 15 records are retry/blocked/failed and should not be scored for outreach.
- 33 records are research-only/non-SMB and should not receive generic outreach angles.
- 0 records are treated as outreach-ready SMB prospects from this sample.

---

# Qrinux LeadLens 1.4.0 — Accuracy and Outreach Intelligence Release

## Data accuracy

- Phone contacts keep the explicit `phone` type through scanning, storage, UI, rollups, and exports.
- Added conservative international phone validation, country-code length checks, timestamp/ID rejection, repeated-sequence rejection, and contextual checks for plain numeric candidates.
- Existing noisy values such as timestamps, integer-limit values, and page IDs are removed during upgrade/export cleanup.
- Email candidates are checked again at ingestion and export time. Escaped-code fragments, placeholder values, sentence fragments, and unrelated `found@`/`is@` values are removed.
- `allPhones`, `allEmails`, and `allSocials` now align with the cleaned contact records.

## Business intelligence and outreach

- Added an always-on local intelligence runtime. It does not overwrite website evidence.
- Classifies likely business type using page text, title/description, schema, domain signals, technologies, and multilingual terms.
- Estimates organization size as micro, small, medium, large, or enterprise without inventing an employee count.
- Produces 2–5 evidence-backed outreach angles when a usable scan is available.
- IT/digital agencies receive collaboration, white-label, referral, or specialist-delivery angles.
- Software/SaaS companies receive product, integration, implementation, and conversion angles.
- Large organizations receive vendor, procurement, department-level, or partnership guidance instead of a generic small-business pitch.
- Local businesses can receive SEO, conversion, booking, contact-path, accessibility, security, mobile, local visibility, performance, and modernization angles.
- Blocked, failed, or empty scans receive retry/identity-verification guidance rather than unsupported sales claims.
- `Unknown` is no longer the normal classification fallback; available evidence is used to provide the most likely category with confidence and supporting reasons.

## Scan quality and consent

- Challenge/blocked-page detection now checks page title and concise page evidence and avoids incidental challenge words on complete websites.
- Contact-only bulk placeholders are treated as retry-required rather than successful evidence scans.
- Cookie acceptance now checks major CMP selectors, same-origin iframes, and open shadow roots.
- Added multilingual Accept/Allow/Agree matching, including English, French, German, Spanish, Italian, Portuguese, Dutch, Nordic languages, Eastern European languages, Turkish, Greek, Hungarian, Indonesian, Thai, Vietnamese, Bangla, Hindi, Urdu, Hebrew, Korean, Chinese, Japanese, and Arabic.
- Cookie clicks are verified after the action. Reject, settings, preference, and necessary-only controls are excluded.

## Export and storage

- Complete evidence export is normalized: site-level SEO, technology, domain-age, CRM, and business-intelligence objects are stored once per site.
- Contact rows carry only contact-specific values and source references.
- Compact AI export uses `leadlens-evidence-v4` and includes classification and outreach angles.
- The original 22-site sample shrank from 75,568,484 bytes to 980,646 bytes in compact normalized form, a 98.70% reduction, without removing unique site evidence.
- Full restore-ready browser backup remains available separately.
- Existing IndexedDB pagination, summary-first rendering, bounded detail cache, pause/resume, retry, and restart recovery remain enabled.

## UI

- Country chips now use image flags rather than operating-system emoji glyphs.
- The CRM country selector displays the selected country flag and updates it when the country changes.
- Added spacing between the top toolbar/filter region and the Verified Evidence / Rule-based Review Aid / Manual CRM cards.
- Added responsive outreach-angle cards to the expanded lead view.
- Mobile overflow containment remains enabled.

## Default domain exclusions

- Expanded the default ignore library with major global social networks, messaging platforms, search portals, marketplaces, review/directory sites, job/freelance platforms, large technology companies, media/consumer brands, payment platforms, banks, travel/booking platforms, and large retail sites.
- User-added exclusions are preserved during migration.
- Agency domains and government/education domains are not globally excluded by default so they can still be classified for collaboration or institutional outreach.

## Safety boundaries

- Captured evidence, local classifications, outreach suggestions, and manual CRM data remain visually and structurally separate.
- No classification or outreach angle changes the raw captured evidence.
- Loading observations are presented as browser observations and complexity signals, not universal performance claims.
- Employee count, revenue, budget, and decision-maker identity remain blank unless explicitly supported by captured evidence.
