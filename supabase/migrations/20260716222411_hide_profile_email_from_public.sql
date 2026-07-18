-- Hide profiles.email from anon/authenticated API clients.
-- Owners still see their email via auth.users (session JWT) in the Settings screen.
-- Edge functions should use auth.users.email (or service_role) — not profiles.email via the user JWT.

revoke select (email) on table public.profiles from anon, authenticated;

comment on column public.profiles.email is
  'Private. Not selectable by anon/authenticated; use auth.users.email for the signed-in user.';
