# Knead

Expo (React Native) app for clients to discover massage providers, book sessions, pay with Paystack, and leave reviews. Providers manage availability, services, bookings, and listing location.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy [`.env.example`](.env.example) to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

3. **Database**

   Apply migrations in [`supabase/migrations/`](supabase/migrations/) to your Supabase project (SQL editor or `supabase db push` with the CLI).

4. **Paystack (optional but recommended for payments)**

   - In the Supabase dashboard: **Project Settings → Edge Functions → Secrets**, add `PAYSTACK_SECRET_KEY` (your Paystack secret key). `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically for Edge Functions.
   - Deploy from the repo (or use the Supabase MCP / dashboard):

     ```bash
     supabase functions deploy paystack-initialize
     supabase functions deploy paystack-webhook
     ```

   - In the Paystack dashboard, set the webhook URL to:

     `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/paystack-webhook`

   - The `paystack-webhook` function must run **without JWT verification** (Paystack uses the `x-paystack-signature` HMAC instead). This matches [`supabase/config.toml`](supabase/config.toml).

5. **Push notifications**

   Physical device required. For production builds, set `expo.extra.eas.projectId` in `app.json` (from [expo.dev](https://expo.dev)) so `getExpoPushTokenAsync` can run. Tokens are stored in `public.push_tokens` (see migrations).

6. **Run**

   ```bash
   npx expo start
   ```

## MVP behavior (high level)

- **Clients:** sign up, discover (GPS + filters), book with studio or visit address, Pay with Paystack, cancel (24h rule enforced in the database), review after completion.
- **Providers:** weekly schedule, services, **Bookings** tab (accept / decline / mark complete), profile listing address (geocoded for search), earnings summary.
- **Security:** Row Level Security is defined in migrations; clients cannot mark `payment_status` as `paid` directly (webhook / service role only).

## Legal placeholders

Terms and Privacy screens under `(auth)` are placeholders—replace with counsel-reviewed copy before production.
