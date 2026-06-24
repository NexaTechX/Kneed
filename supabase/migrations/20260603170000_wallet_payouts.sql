-- Structured payout details (saved on the profile) + a minimum withdrawal floor.
-- Actual payouts remain a manual finance operation (see README "Payouts"): finance
-- approves, transfers via Paystack, then marks the request paid with a reference.

alter table public.profiles
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_number text,
  add column if not exists payout_account_name text;

-- Minimum withdrawal: NGN 1,000 (100000 kobo). NOT VALID so any legacy rows are untouched.
alter table public.withdrawal_requests drop constraint if exists withdrawal_requests_min_amount;
alter table public.withdrawal_requests
  add constraint withdrawal_requests_min_amount check (amount_cents >= 100000) not valid;

-- Finance marks an approved request as paid with a payout reference (idempotent: only from approved).
create or replace function public.admin_mark_withdrawal_paid(p_id uuid, p_reference text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_role(array['finance', 'super_admin']) then
    raise exception 'not authorized';
  end if;

  update public.withdrawal_requests
    set status = 'paid', payout_reference = p_reference, reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id and status = 'approved';

  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'withdrawal_paid', 'withdrawal_request', p_id::text, jsonb_build_object('reference', p_reference));
end;
$$;

revoke all on function public.admin_mark_withdrawal_paid(uuid, text) from public;
grant execute on function public.admin_mark_withdrawal_paid(uuid, text) to authenticated;
