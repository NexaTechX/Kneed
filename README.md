# Knead

A mobile-first **creator content platform** built with Expo (React Native) and Supabase. Creators publish posts to a feed, monetize selected posts as pay-per-view (PPV), offer paid private-room sessions, and withdraw earnings from a custodial wallet. Clients follow creators, engage with posts, pay with Paystack to unlock content or book sessions, and admins moderate content and approve payouts.

> Currency is NGN by default (Paystack). Override the display currency with `EXPO_PUBLIC_DISPLAY_CURRENCY`.

## Stack

- **App:** Expo SDK 54, React Native 0.81, React 19, [expo-router](app/) (file-based, typed routes)
- **State/data:** Zustand ([stores/authStore.ts](stores/authStore.ts)) for auth, TanStack Query for server state
- **Backend:** Supabase — Postgres + Row Level Security, Auth, Storage, Edge Functions (Deno)
- **Payments:** Paystack via Supabase Edge Functions
- **Notifications:** Expo push (tokens stored in `public.push_tokens`)
- **Tests:** Vitest

## Roles

`client` · `creator` · `admin` (the legacy `provider` role was migrated to `client`). Admin privileges come from a row in `public.admin_roles` (`support` / `moderator` / `finance` / `super_admin`).

## App structure ([app/](app/))

Routing is gated by [hooks/useEntryRedirect.ts](hooks/useEntryRedirect.ts): no session → `(auth)/welcome`; no profile name → onboarding; admin → `admin-web`; otherwise → the client feed.

- **`(auth)`** — welcome, login, register, forgot-password, terms, privacy (legal screens are placeholders)
- **`(onboarding)`** — role-select, profile-setup
- **`(client)/(tabs)`** — `feed` (Home), `private-room` (Private), `profile`
- **`(client)`** (non-tab) — `create-post`, `edit-post`, `post-comments`, `wallet`
- **`admin-web.tsx`** — web admin console (moderation, withdrawals)

## Data model (see [supabase/migrations/](supabase/migrations/) and [types/database.ts](types/database.ts))

- **`profiles`** — unified identity: role, onboarding state, age/KYC verification, account status, and creator fields (headline, bio, cover image, private-room rate/location)
- **`creator_posts`** — feed posts. Free posts publish immediately; **paid (PPV) posts require KYC and go through admin monetization review** (`monetization_status`: `pending_review` → `approved`/`rejected`). RLS enforces this with separate insert policies.
- **`post_access_grants`** — per-user unlock records (`purchase` or `manual`); drives read access to paid posts
- **`social_follows`**, **`post_reactions`**, **`post_comments`** — social graph and engagement
- **`private_room_sessions`** — bidirectional bookings between two users
- **Wallet:** `wallet_accounts` (custodial), `wallet_transactions`, `content_purchases`, `withdrawal_requests` (admin-approved payouts)
- **Moderation/admin:** `admin_roles`, `moderation_reports`, `admin_audit_logs`, plus the `is_admin_role()` SQL helper
- **Storage buckets:** `creator-media-public` (public) and `creator-media-private` (owner-only reads)

### Platform fees

- **PPV content:** platform keeps **40%** of gross — enforced both in the webhook and by a Postgres `check` constraint on `content_purchases`.
- **Private room sessions:** platform keeps **10%** of gross (applied in the webhook).

## Payments (Paystack)

1. The app calls the `paystack-initialize` Edge Function ([lib/paystack.ts](lib/paystack.ts)) for a PPV unlock or a private-room session and opens the returned checkout URL in a web browser.
2. On success, Paystack calls the `paystack-webhook` Edge Function ([supabase/functions/paystack-webhook/index.ts](supabase/functions/paystack-webhook/index.ts)), which verifies the `x-paystack-signature` HMAC, then — using the service role — records the purchase, grants post access, credits the creator's wallet (net of fees), and sends a push notification.

Clients can never set `payment_status`/access themselves; all financial state changes happen server-side via the webhook + service role. The webhook is idempotent (duplicate charges are ignored).

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy [`.env.example`](.env.example) to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Supabase dashboard → Settings → API). Until these are set to real values the app runs against safe placeholders and Supabase calls won't work (see [lib/supabase.ts](lib/supabase.ts)).

   Optional: `EXPO_PUBLIC_DISPLAY_CURRENCY` (default `NGN`) and `EXPO_PUBLIC_PROXIMITY_THRESHOLD_METERS` (default `100`).

3. **Database**

   Apply the migrations in [`supabase/migrations/`](supabase/migrations/) to your Supabase project (SQL editor or `supabase db push`). They run in order and also create the storage buckets and RLS policies. Grant yourself admin access by inserting a row into `public.admin_roles`.

4. **Paystack**

   - In Supabase: **Project Settings → Edge Functions → Secrets**, add `PAYSTACK_SECRET_KEY`. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
   - Deploy the functions:

     ```bash
     supabase functions deploy paystack-initialize
     supabase functions deploy paystack-webhook
     ```

   - In the Paystack dashboard, set the webhook URL to:

     `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/paystack-webhook`

   - `paystack-webhook` must run **without JWT verification** (it uses the HMAC signature instead) — this is set in [`supabase/config.toml`](supabase/config.toml).

5. **Push notifications**

   Physical device required. For production builds, set `expo.extra.eas.projectId` in [`app.json`](app.json) (from [expo.dev](https://expo.dev)) so `getExpoPushTokenAsync` can run. Tokens are stored in `public.push_tokens`.

6. **Run**

   ```bash
   npx expo start
   ```

## Scripts

- `npm start` — start Expo
- `npm run start:clean` — start with cache cleared
- `npm run android` / `npm run ios` / `npm run web` — open on a target
- `npm test` — run the Vitest suite

## Notes

- The Terms and Privacy screens under `(auth)` are placeholders — replace with counsel-reviewed copy before production.
- Security relies heavily on Postgres RLS. Review the policies in the migrations before going live, especially around paid content access and wallet/withdrawal flows.
