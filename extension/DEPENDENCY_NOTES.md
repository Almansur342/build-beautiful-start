# Qrinux LeadLens v1.5.0 — Dependency Notes

## Included local components

- Existing Wappalyzer-style technology rules and local icon library.
- Embedded public-suffix data and deterministic domain parser.
- `LeadLensQuality` local quality runtime.
- `LeadLensIntelligence` local classification, size-estimation, outreach-ranking, phone/email validation, and scan-quality runtime.
- Browser-native DOM parsing, Web APIs, IndexedDB, and extension storage.

## Third-party package status

The exact upstream bundles requested during planning—`libphonenumber-js`, `tldts`, `validator`, `Zod`, `axe-core`, `@mozilla/readability`, `chrono-node`, `linkedom`, `idb`, `web-vitals`, and `@huggingface/transformers`—are **not embedded in this ZIP**. They were not represented as installed because the build environment could not retrieve and audit the package artifacts reliably.

The extension contains local deterministic implementations and adapter boundaries for the same capability areas. It does not load executable JavaScript from a CDN. A future package-vendor build should only replace these adapters after the exact package files, licenses, hashes, Manifest V3 behavior, memory use, and browser tests are verified.

## Local intelligence behavior

The local intelligence runtime is always active. It uses captured text, schema, domain, technology, SEO, accessibility, contact, and page-structure evidence to rank candidate classifications and outreach angles. It is not a generative model and does not invent missing business facts.

## Network use

- The extension scans URLs selected by the user and may request related public pages, robots.txt, sitemap, and RDAP/domain-age endpoints.
- Country flags are displayed as images from FlagCDN. Failure to load a flag does not affect scanning or stored country data.
- No remote executable code is permitted by the extension CSP.
