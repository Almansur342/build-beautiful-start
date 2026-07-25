# Scan counting policy

`scan_events` and `user_usage_daily` are authoritative.

- Each completed content-load scan creates one random immutable event.
- A queued retry reuses its event ID and never double-counts.
- Full and usable partial scans count.
- Guard-skipped URLs, failed loads that never reach content load, and duplicate retries do not count.
- Dashboard totals/history read from `scan_events`; today's count reads from `user_usage_daily`.
