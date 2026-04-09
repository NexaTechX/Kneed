-- Clients cannot set payment_status to paid (only webhooks / service role can)
create or replace function public.prevent_client_set_paid_directly()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and auth.uid() = old.client_id
     and new.payment_status = 'paid'
     and old.payment_status is distinct from 'paid'
  then
    raise exception 'Payment confirmation must come from Paystack';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bookings_client_payment_guard on public.bookings;
create trigger trg_bookings_client_payment_guard
  before update on public.bookings
  for each row
  execute function public.prevent_client_set_paid_directly();
