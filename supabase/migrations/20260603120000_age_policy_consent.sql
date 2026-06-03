-- 18+ age affirmation + content-policy consent.
-- Self-attested gate recorded server-side so the timestamp is trustworthy and
-- clients cannot backdate consent. Required before a user can reach the feed.

create or replace function public.record_age_and_policy_consent()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set
    is_age_verified = true,
    accepted_content_policy_at = now()
  where id = auth.uid();
$$;

revoke all on function public.record_age_and_policy_consent() from public;
grant execute on function public.record_age_and_policy_consent() to authenticated;

comment on function public.record_age_and_policy_consent() is
  '18+ affirmation + content-policy acceptance for the calling user (sets is_age_verified and accepted_content_policy_at).';
