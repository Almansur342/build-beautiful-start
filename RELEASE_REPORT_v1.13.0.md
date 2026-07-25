# Qrinux LeadLens v1.13.0 Release Report

## Implemented

- Random immutable scan and event IDs; retries reuse queued event IDs.
- Every content-load scan is queued for one-minute batch accounting.
- Partial batch acknowledgement retains transient failures.
- Exponential retry backoff with jitter, retry cap, and 24-hour queue retention.
- Single-flight session refresh and rotated refresh-token persistence.
- Removed collection/export of page cookie names and values.
- Dashboard today/total/recent scans now use user_usage_daily and scan_events.
- Added RLS/read migration for user-owned scan events and updated count RPC.
- Export contact arrays and summary counts use the same normalized contacts.
- Tracking parameters, IP addresses, Cloudflare Ray IDs, and sensitive URL values are redacted.
- Blocked/retry/invalid pages no longer export misleading SEO scores/issues.
- Venue classification receives priority over weak education-keyword matches.
- Removed committed .env files and added environment ignore rules.
- Dashboard download now serves the packaged v1.13.0 extension from /public.

## Verification

- All extension JavaScript syntax: PASS
- Strict extension/package JSON parsing: PASS
- Custom release verification: PASS
- Extension manifest in ZIP version 1.13.0: PASS
- Third-party Render proxy scan: PASS (not found)
- Credentialed related-page fetch scan: PASS (not found)
- Page cookie value collection scan: PASS (not found)
- Extension source maps: PASS (none packaged)
- Extension ZIP SHA-256: b45e26421eec695491d1b512989bb8f369d6795d45585f91495e4ad66f86c752

## Environment limitation

npm ci could not complete in the isolated build environment because dependency download timed out. Therefore npm test, npm run lint, and npm run build were not claimed as executed. The source-level release verifier and extension syntax/package checks passed. Run those three npm commands after extracting on a machine with registry access.

## Database action

Apply all Supabase migrations, including:

supabase/migrations/20260725123000_scan_event_dashboard_source.sql

before relying on the corrected dashboard counters.
