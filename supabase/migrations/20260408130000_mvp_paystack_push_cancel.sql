-- Paystack payment fields, push tokens, client cancel 24h enforcement

alter table public.bookings
  add column if not exists paystack_reference text,
  add column if not exists payment_status text not null default 'unpaid';

alter table public.bookings
  drop constraint if exists bookings_payment_status_check;

alter table public.bookings
  add constraint bookings_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'failed'));

-- Client cancellations must be >= 24h before scheduled time (providers exempt)
create or replace function public.enforce_client_cancel_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and auth.uid() = old.client_id
     and new.status = 'cancelled'
     and old.status is distinct from 'cancelled'
  then
    if extract(epoch from (old.scheduled_at - now())) / 3600 < 24 then
      raise exception 'Cancellations must be at least 24 hours before the session';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bookings_client_cancel_window on public.bookings;
create trigger trg_bookings_client_cancel_window
  before update on public.bookings
  for each row
  execute function public.enforce_client_cancel_window();

-- Device push tokens (Expo)
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "push_tokens_select_own"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "push_tokens_insert_own"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

create policy "push_tokens_update_own"
  on public.push_tokens for update
  using (auth.uid() = user_id);
