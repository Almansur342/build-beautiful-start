# Scan counting policy

`scan_events`, `user_usage_daily`, `user_usage_monthly`, and the `consume_scan_quota` RPC are authoritative.

- Plan limits are resolved database-side by `get_effective_scan_limits`.
- Unknown, missing, or invalid plans fall back to the Free daily limit.
- Optional `user_quota_overrides` rows can set custom daily or monthly limits for an account.
- Each completed content-load scan creates one random immutable event.
- A queued retry reuses its event ID and never double-counts.
- Full and usable partial scans count.
- Guard-skipped URLs, failed loads that never reach content load, blocked/challenge pages, transient errors, and duplicate retries do not count.
- Dashboard totals/history read counted `scan_events`; today's count reads from `user_usage_daily`.
- Quota exhaustion returns `quota_exceeded` with `used`, `limit`, `remaining`, and `reset_at`.
- The Chrome extension checks quota before starting manual or bulk scans, but final enforcement remains in the RPC.

## Manual verification checklist

- Apply migration `20260725184500_plan_aware_scan_quota.sql` to the target Supabase project before relying on live enforcement.
- Free user scans 1 through 100: each successful counted scan returns `ok: true`, increments `user_usage_daily`, and inserts one `scan_events` row.
- Free user scan 101: returns `quota_exceeded`, inserts no extra `scan_events` row, and does not increment `user_usage_daily`.
- Duplicate `event_id`: returns `duplicate: true`, `counted: false`, and does not increment usage.
- Failed, skipped, blocked, challenge, or retry-required batch statuses return `counted: false`.
- Bulk scan with fewer remaining scans than URLs counts until quota is exhausted, then returns per-event `quota_exceeded` and the extension marks later URLs as quota blocked.
- Manual scan after daily limit is reached does not start and shows the quota reset/upgrade message.
- Dashboard shows used today, remaining today, daily limit, reset time, progress percentage, warning at 80%, and limit-reached text at 100%.
