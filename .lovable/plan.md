## Scope

বড় কাজ, তাই ভাগ করে দিচ্ছি। সব একই turn-এ implement করব।

### 1. Global Public Navbar
- নতুন `src/components/public-nav.tsx` — sticky top nav, সব public page-এ দেখাবে।
- Links: Home, Features, Pricing, Blog, Contact, About, Careers, Changelog, Docs, Login/Dashboard।
- `__root.tsx` থেকে conditional render — `_authenticated/*` এবং `/auth` route-এ hide, বাকি সব public route-এ show।
- Mobile drawer সহ।

### 2. নতুন পোর্টফোলিও পেজ
- `about.tsx` — mission, team, story
- `careers.tsx` — open roles
- `changelog.tsx` — version history (v1.5.0 highlight)
- `docs.tsx` — extension installation + API docs summary
- প্রত্যেকটায় নিজস্ব `head()` metadata।

### 3. Breadcrumb + Back Button
- `src/components/breadcrumb-bar.tsx` — pathname parse করে auto breadcrumb + "← Back" button (`router.history.back()`)।
- সব sub-page-এ (legal/*, blog/*, about, careers, changelog, docs, contact) top-এ বসবে। Home এবং dashboard-এ না।

### 4. PWA + Push Notifications
- `public/manifest.webmanifest` — Qrinux LeadLens branding, standalone display, icons।
- `public/icon-192.png`, `public/icon-512.png` — generate করব।
- `__root.tsx` head-এ manifest + theme-color + apple-touch-icon link।
- **Notifications**: browser Notification API — support chat-এ নতুন reply এলে `new Notification(...)` fire করবে (permission prompt সহ)। কোন service worker না — PWA skill অনুযায়ী manifest-only installability।

### 5. Live Chat = Ticketing System
- Schema update: `support_messages` টেবিলে `ticket_id`, `subject`, `status` (open/pending/resolved/closed), `priority` কলাম যোগ। নতুন `support_tickets` টেবিল (id, user_id, subject, status, priority, created_at, updated_at)। Migration + RLS + GRANT।
- Dashboard `/support` redesign: বাঁয়ে ticket list (unread badge, status pill), ডানে selected ticket-এর chat pane। "New Ticket" button — subject + first message নিয়ে ticket create।
- Real-time Supabase subscription — নতুন message এলে unread count + Notification API notify।
- Admin panel-এ ticket assignment/status change।

### 6. User Profile Setup (Dashboard)
- `/dashboard/settings` refactor — full profile: full_name, avatar upload (Supabase Storage bucket `avatars`), company, phone, timezone, bio। `profiles` টেবিলে column যোগ (migration)।
- Avatar upload with preview, save button।

### 7. Account Delete
- Settings-এর নিচে danger zone — "Delete Account" button, confirmation modal ("DELETE" টাইপ করতে হবে)।
- নতুন server function `deleteMyAccount` (`requireSupabaseAuth`) — `supabaseAdmin.auth.admin.deleteUser(userId)` call করবে, cascade-এ profile/keys/logs delete হবে।
- Delete-এর পর sign out + redirect to `/`।

### Technical highlights
- Migration: `support_tickets` টেবিল + `profiles` extra columns + storage bucket `avatars` (public read, authenticated write own folder)।
- সব নতুন page-এ Salleist style মেনে zero border-radius, mint accent, Inter font।
- Build verify করব শেষে।

### বাদ যাচ্ছে
- Full docs site এখনই না — summary page দিব।
- Push notifications-এর জন্য service worker + FCM এই turn-এ যোগ করছি না (Lovable preview-এ conflict করে); browser Notification API দিয়ে in-session real-time notification দিচ্ছি — user যদি চায় পরে full web-push যোগ করব।

শুরু করব?