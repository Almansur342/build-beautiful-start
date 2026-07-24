# Qrinux LeadLens — Full SaaS Build Plan

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud (Supabase under the hood) and create these tables:

- `profiles` — id (FK auth.users), email, full_name, avatar_url, created_at
- `user_roles` — user_id, role (`super_admin` | `user`) — separate table for security
- `plans` — id, name, price_usd, daily_scan_limit (null = unlimited), validity_days, stripe_price_id, is_active
- `subscriptions` — user_id, plan_id, status, current_period_end, stripe_subscription_id
- `api_keys` — id, user_id, key_hash, key_prefix, device_fingerprint (nullable), bound_at, last_used_at, revoked_at
- `scan_logs` — id, user_id, api_key_id, website_url, scanned_at (indexed for daily count)
- `app_settings` — key/value store (e.g. `free_daily_limit=100`) — editable by super admin

RLS: users see only their rows; super_admin bypasses via `has_role()` security-definer function.

## 2. Authentication

- Email + password (default)
- Google Sign-In (via managed Lovable broker)
- Apple Sign-In (via `configure_social_auth`)
- GitHub — **Note:** Lovable Cloud doesn't support GitHub natively. Will implement email+Google+Apple now; GitHub will need a manual Supabase dashboard step later (I'll document it).

Auth route: `/auth` (public). Protected routes under `_authenticated/`.

Trigger auto-creates `profiles` row and assigns default `user` role on signup.

## 3. Payment Plans (Stripe via Lovable Payments)

| Plan | Price | Daily Limit | Validity |
|------|-------|-------------|----------|
| Free | $0 | 100 scans/day | forever |
| Starter | $1/mo | 500 scans/day | 30 days |
| Unlimited | $5/mo | unlimited | 30 days |

Stripe checkout in user dashboard; webhook updates `subscriptions` and rotates `api_keys` validity.

## 4. Server API endpoints (public, called by the Chrome extension)

Under `src/routes/api/public/`:

- `POST /api/public/scan/authorize` — body `{ api_key, device_fingerprint, website_url }` → returns `{ ok: true, remaining }` or `{ ok:false, reason }`
  - Validates API key hash
  - **First-use device lock**: if `device_fingerprint` is null on the key, bind it; if set and different, reject with `device_mismatch`
  - Checks daily scan count vs plan limit (or free limit from `app_settings`)
  - Inserts row in `scan_logs`
- `GET /api/public/extension/version` — for future updates

## 5. User Dashboard (`/dashboard`)

- API key card: show masked key (`qlk_••••1234`), copy button, "Regenerate", "Reset device binding"
- Today's usage: `X / limit` with progress bar
- Current plan + "Upgrade" button (Stripe checkout)
- **Download extension** card: big button downloads `qrinux-leadlens.zip` from `/public/`
- Install instructions (chrome://extensions → Dev mode → Load unpacked)
- Recent scan history (last 20)

## 6. Super Admin Panel (`/admin`)

Gated by `has_role(uid, 'super_admin')`.

- Users table: search, view usage, revoke API key, reset device, change plan manually, ban
- Plans editor: edit price / daily limit / validity
- Global settings: toggle "free tier enabled", edit `free_daily_limit` (default 100)
- Scan analytics: total scans today, top users
- Manually promote a user to super_admin

First super admin: bootstrapped via a one-time migration granting the role to a specified email (I'll ask you which email).

## 7. Chrome Extension changes (minimal, per your rule)

I will NOT touch the existing scanning logic. Only add:

- New `apikey.js` module + tiny popup screen "Enter your API key" (stored in `chrome.storage.local`)
- Before every scan, call `POST /api/public/scan/authorize` — if not `ok`, show reason and abort
- Device fingerprint = stable hash of `navigator.userAgent + installId` (generated once, stored in `chrome.storage.local`)
- Rebuild the zip and place it at `public/qrinux-leadlens.zip` so the dashboard can serve it

Everything else in the extension stays byte-identical.

## 8. Design

Keep the current light, minimal Qrinux visual system across landing → auth → dashboard → admin. No new AI-blob aesthetic.

---

## Technical section

- Stack: TanStack Start + Lovable Cloud (Supabase) + Stripe (Lovable Payments) + shadcn/ui
- API key format: `qlk_` + 40 hex chars; store SHA-256 hash only in DB; show plaintext once on generate
- Daily limit check: `SELECT count(*) FROM scan_logs WHERE user_id=? AND scanned_at >= today_utc`
- Server fns for dashboard, server routes under `/api/public/*` for the extension (bypasses auth on published site; secured by API key hash)
- Device binding = "First-use lock" mode with user-side "Reset device" button
- Extension zipped via `nix run nixpkgs#zip` into `public/qrinux-leadlens.zip` and served with a fetch+blob download

---

## Questions before I start

1. **Super admin email?** Which email should be granted `super_admin` on first migration? (You'll sign up with this email after auth is live.)
2. **Stripe plans confirm** — Free 100/day, $1 → 500/day (30d), $5 → unlimited (30d) — ঠিক আছে?
3. **GitHub login** — Lovable Cloud-এ built-in নেই। এখন Email + Google + Apple দিয়ে শুরু করি, GitHub পরে ম্যানুয়াল সেটআপে যোগ করব — ঠিক আছে?

উত্তর দিলেই বিল্ড শুরু করছি।