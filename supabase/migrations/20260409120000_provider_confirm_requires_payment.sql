-- Providers may only move a booking from pending -> confirmed after the client has paid.

create or replace function public.enforce_provider_confirm_requires_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status = 'confirmed'
     and old.status is distinct from 'confirmed'
     and old.status = 'pending'
     and auth.uid() = old.provider_id
  then
    if old.payment_status is distinct from 'paid' then
      raise exception 'Client must pay before you can confirm this booking';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bookings_provider_confirm_paid on public.bookings;
create trigger trg_bookings_provider_confirm_paid
  before update on public.bookings
  for each row
  execute function public.enforce_provider_confirm_requires_payment();
