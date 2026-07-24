# Qrinux LeadLens v1.5.0 — Strict Qualification Test Report

## Build

- Product: Qrinux LeadLens
- Version: 1.5.0
- Extension platform: Chrome Manifest V3
- Build focus: strict SMB qualification, research-only suppression, safer contact scoring, normalized export decision fields, and retry/blocked scan handling.

## Regression checks completed in this workspace

- JavaScript syntax checked with Node for all files in `js/`: passed.
- JSON parsed for manifest, categories, technologies, and locale message files: 55 files passed.
- Intelligence runtime loaded in Node: passed.
- Runtime evaluated against the provided 48-site normalized export: 15 retry/blocked/failed records, 33 research-only/non-SMB records, 0 eligible SMB outreach records.
- Research-only runtime angles now suppress generic SEO/redesign/contact/conversion outreach and return only `research-only` / `no-generic-outreach` guidance for usable non-SMB scans.
- Failed/blocked scans return only `retry-scan` / `identity-research` guidance.

## Notes

This workspace can check source syntax and deterministic runtime logic, but it cannot fully install and run the Chrome MV3 extension UI/service worker. Before publishing, load the unpacked v1.5.0 folder in Chrome and perform a real browser smoke test: single scan, bulk scan, pause/resume, contacts page, complete JSON export, compact JSONL export, and copy/export buttons.

---

# Qrinux LeadLens v1.4.0 — Accuracy Final Test Report

## Build

- Product: Qrinux LeadLens
- Version: 1.4.0
- Extension platform: Chrome Manifest V3
- Build focus: contact accuracy, normalized evidence export, business classification, outreach-angle guidance, multilingual cookie handling, country flags, UI spacing, and default ignored-domain coverage

## Key implementation checks

### Contact accuracy and data normalization

- Phone records keep the explicit `phone` type.
- Valid phone numbers populate site-level phone rollups.
- Timestamp-like values, integer-limit values, unsupported calling codes, and weak numeric candidates are rejected.
- Suspicious escaped or sentence-fragment email candidates are rejected.
- Complete evidence export stores site-level SEO, technology, domain-age, and CRM objects once instead of copying them into every contact.
- Compact AI export uses schema `leadlens-evidence-v4`.

The supplied 22-site sample was normalized from 75,568,484 bytes to:

- 1,391,416 bytes as formatted normalized JSON — 98.16% reduction
- 980,646 bytes as compact normalized JSON — 98.70% reduction

The normalized sample retained 22 site records, 47 accepted phones, 25 accepted emails, classifications for all 22 sites, and 2–5 outreach angles per site. No known false phone or false email test samples remained.

### Business intelligence and outreach guidance

The local intelligence runtime was tested for:

- IT/digital agency
- Software/SaaS company
- Education/university
- Restaurant/food business
- Convention/event venue
- Media/publisher
- Blocked or incomplete scan handling

The runtime returns a likely business type, estimated organization size, recommended approach, confidence, supporting evidence, and ranked outreach angles. Agency records favor collaboration/white-label angles; large institutions favor vendor/partnership routes; local businesses favor specific service opportunities. Blocked or empty pages receive retry and identity-verification guidance rather than fabricated sales claims.

### Cookie-consent handling

The real content-script cookie engine was exercised against:

- OneTrust-style consent
- French: `Tout accepter`
- German: `Alle akzeptieren`
- Bangla: `সব কুকি গ্রহণ`
- Japanese: `すべて受け入れる`
- Arabic: `قبول الكل`

All six fixtures were clicked and verified as dismissed. The engine also contains selectors for major CMP patterns, scans open shadow roots and accessible same-origin frames, avoids reject/settings/necessary-only actions, and verifies dismissal after clicking.

### Country flags and UI

Browser layout tests confirmed:

- Country badges use image flags rather than platform-dependent emoji glyphs.
- The CRM country selector displays the selected country's image flag.
- The evidence legend has a 16-pixel top margin below the toolbar.
- Desktop page width: no horizontal overflow at 1536 pixels.
- Mobile page width: no horizontal overflow at 390 pixels.
- Outreach cards remain contained on mobile.

### Default ignored domains

The default blacklist is version 3 and contains:

- 416 domains
- 13 groups

It covers major social networks, messaging services, search/maps platforms, marketplaces, travel/booking sites, review directories, job/freelance platforms, cloud/enterprise platforms, large consumer/technology brands, payment providers, and banks. User-added domains remain preserved during default-list upgrades. Agency and education/government groups are not indiscriminately excluded so LeadLens can still classify them and recommend collaboration or institutional routes.

## Automated test results

- Intelligence runtime assertions: 37 passed
- Contacts/export integration assertions: 19 passed
- JavaScript syntax files checked: 16
- JSON files parsed: 55
- Remote executable references: 0
- Inline event handlers: 0
- `eval` / `new Function`: 0
- Cookie CMP selector checks: 9
- Multilingual cookie-term groups checked: 5
- XLSX writer ZIP structure: passed
- XLSX blank-cell handling: passed
- XLSX phone/email preservation: passed

## Manifest and security checks

- Manifest version: 1.4.0
- Manifest V3: confirmed
- Content script order confirmed:
  1. `vendor/public-suffix-data.js`
  2. `js/quality-runtime.js`
  3. `js/intelligence-runtime.js`
  4. `js/content.js`
- No CDN JavaScript or remotely executed code is included.
- Country flag images are loaded as presentation assets from FlagCDN; they are not executable code.

## Dependency disclosure

The exact upstream bundles for `libphonenumber-js`, `tldts`, `validator`, `Zod`, `axe-core`, `@mozilla/readability`, `chrono-node`, `linkedom`, `idb`, `web-vitals`, and Transformers.js are not embedded in this ZIP. The build uses locally implemented deterministic validation, parsing, accessibility preflight, evidence extraction, storage, classification, and outreach-ranking logic with adapter boundaries documented in `DEPENDENCY_NOTES.md`.

The local intelligence runtime is always active, but it is not the exact Transformers.js package and does not claim to be one. Raw evidence is not overwritten by classifications or outreach suggestions.

## Sandbox limitation

The automated Chromium sandbox did not expose the unpacked Manifest V3 service worker or toolbar page, so a complete installed-extension smoke test could not be performed in that environment. Source modules, content-script behavior, cookie handling, contacts/export integration, browser layouts, and generated XLSX files were tested directly. Before public distribution, load the unpacked folder in desktop Chrome and perform one final real-browser smoke scan, restart/resume test, export test, and toolbar/service-worker check.
