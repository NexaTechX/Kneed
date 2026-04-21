-- Full reshape: remove legacy massage marketplace; unified social + optional PPV (admin review); private room; profiles KYC.

-- 1) Realtime: remove bookings (ignore if not in publication)
do $$
begin
  begin
    alter publication supabase_realtime drop table public.bookings;
  exception
    when undefined_object then null;
    when undefined_table then null;
  end;
end $$;

-- 2) Drop triggers on bookings
drop trigger if exists trg_bookings_client_cancel_window on public.bookings;
drop trigger if exists trg_bookings_client_payment_guard on public.bookings;
drop trigger if exists trg_bookings_provider_confirm_paid on public.bookings;

-- 3) Drop review trigger
drop trigger if exists trg_review_insert on public.reviews;

-- 4) Drop dependent tables (order matters)
drop table if exists public.reviews cascade;
drop table if exists public.bookings cascade;
drop table if exists public.services cascade;
drop table if exists public.availability cascade;
drop table if exists public.providers cascade;

-- 5) Drop legacy functions
drop function if exists public.search_providers(double precision, double precision, double precision, text);
drop function if exists public.refresh_provider_rating(uuid);
drop function if exists public.on_review_insert();
drop function if exists public.enforce_client_cancel_window();
drop function if exists public.enforce_provider_confirm_requires_payment();
drop function if exists public.prevent_client_set_paid_directly();

-- 6) Roles: migrate provider -> client, drop provider from enum
update public.profiles set role = 'client' where role = 'provider';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('client', 'creator', 'admin'));

-- 7) Unified KYC + optional profile fields (from creators)
alter table public.profiles
  add column if not exists is_kyc_verified boolean not null default false,
  add column if not exists kyc_verified_at timestamptz,
  add column if not exists gender text,
  add column if not exists headline text,
  add column if not exists creator_bio text,
  add column if not exists cover_image_url text,
  add column if not exists private_room_lat double precision,
  add column if not exists private_room_lng double precision,
  add column if not exists private_room_rate_cents integer not null default 0 check (private_room_rate_cents >= 0),
  add column if not exists private_room_location_updated_at timestamptz;

-- Copy KYC + bio from creators when present
update public.profiles p
set
  is_kyc_verified = coalesce(c.is_kyc_verified, p.is_kyc_verified),
  kyc_verified_at = coalesce(c.kyc_verified_at, p.kyc_verified_at),
  headline = coalesce(c.headline, p.headline),
  creator_bio = coalesce(c.bio, p.creator_bio),
  cover_image_url = coalesce(c.cover_image_url, p.cover_image_url)
from public.creators c
where c.id = p.id;

-- 8) Subscriptions removed
drop table if exists public.creator_subscriptions cascade;

-- 9) post_access_grants: remove subscription from source
update public.post_access_grants set source = 'manual' where source = 'subscription';
alter table public.post_access_grants drop constraint if exists post_access_grants_source_check;
alter table public.post_access_grants
  add constraint post_access_grants_source_check
  check (source in ('purchase', 'manual'));

-- 10) wallet_transactions: drop subscription from entry_type
update public.wallet_transactions set entry_type = 'adjustment' where entry_type = 'subscription';
alter table public.wallet_transactions drop constraint if exists wallet_transactions_entry_type_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_entry_type_check
  check (entry_type in ('purchase', 'tip', 'private_room', 'fee', 'refund', 'withdrawal', 'adjustment'));

-- 11) creator_posts: monetization columns + status expansion
alter table public.creator_posts drop constraint if exists creator_posts_status_check;
alter table public.creator_posts
  add column if not exists monetization_status text not null default 'none'
    check (monetization_status in ('none', 'pending_review', 'approved', 'rejected'));

-- Backfill existing rows
update public.creator_posts
set monetization_status = case
  when is_paid = true then 'approved'
  else 'none'
end
where monetization_status = 'none';

alter table public.creator_posts
  add constraint creator_posts_status_check
  check (status in ('draft', 'published', 'removed', 'flagged', 'rejected'));

-- Backfill status: was only published/removed/flagged
update public.creator_posts set status = 'published' where status is not null and status not in ('draft', 'published', 'removed', 'flagged', 'rejected');

-- 12) Repoint creator_posts FK to profiles (creator_id = author profile id)
alter table public.creator_posts drop constraint if exists creator_posts_creator_id_fkey;
alter table public.creator_posts
  add constraint creator_posts_creator_id_fkey
  foreign key (creator_id) references public.profiles (id) on delete cascade;

-- 13) content_purchases FK to profiles
alter table public.content_purchases drop constraint if exists content_purchases_creator_id_fkey;
alter table public.content_purchases
  add constraint content_purchases_creator_id_fkey
  foreign key (creator_id) references public.profiles (id) on delete cascade;

-- 14) withdrawal_requests: user_id instead of creator_id (drop FK before rename)
alter table public.withdrawal_requests drop constraint if exists withdrawal_requests_creator_id_fkey;
alter table public.withdrawal_requests rename column creator_id to user_id;
drop index if exists withdrawal_requests_creator_idx;
create index if not exists withdrawal_requests_user_idx on public.withdrawal_requests (user_id, created_at desc);
alter table public.withdrawal_requests
  add constraint withdrawal_requests_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

drop policy if exists withdrawal_requests_select_creator on public.withdrawal_requests;
create policy withdrawal_requests_select_own
  on public.withdrawal_requests for select
  using (user_id = auth.uid());

drop policy if exists withdrawal_requests_insert_creator on public.withdrawal_requests;
create policy withdrawal_requests_insert_own
  on public.withdrawal_requests for insert
  with check (user_id = auth.uid());

-- 15) private_room_sessions: bidirectional users
alter table public.private_room_sessions drop constraint if exists private_room_sessions_creator_id_fkey;
alter table public.private_room_sessions drop constraint if exists private_room_sessions_requester_id_fkey;

alter table public.private_room_sessions rename column creator_id to booked_user_id;
alter table public.private_room_sessions rename column requester_id to booker_user_id;

alter table public.private_room_sessions
  add constraint private_room_sessions_booked_fkey
  foreign key (booked_user_id) references public.profiles (id) on delete cascade;

alter table public.private_room_sessions
  add constraint private_room_sessions_booker_fkey
  foreign key (booker_user_id) references public.profiles (id) on delete cascade;

alter table public.private_room_sessions
  add column if not exists platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  add column if not exists payee_net_cents integer not null default 0 check (payee_net_cents >= 0);

drop index if exists private_room_sessions_creator_idx;
create index if not exists private_room_sessions_booked_idx on public.private_room_sessions (booked_user_id, created_at desc);

drop policy if exists private_room_sessions_select on public.private_room_sessions;
create policy private_room_sessions_select
  on public.private_room_sessions for select
  using (booker_user_id = auth.uid() or booked_user_id = auth.uid());

drop policy if exists private_room_sessions_insert_requester on public.private_room_sessions;
create policy private_room_sessions_insert_booker
  on public.private_room_sessions for insert
  with check (booker_user_id = auth.uid());

drop policy if exists private_room_sessions_update_participants on public.private_room_sessions;
create policy private_room_sessions_update_participants
  on public.private_room_sessions for update
  using (booker_user_id = auth.uid() or booked_user_id = auth.uid())
  with check (booker_user_id = auth.uid() or booked_user_id = auth.uid());

-- 16) Drop creators table (extended fields copied to profiles)
drop table if exists public.creators cascade;

-- 17) RLS: creator_posts — replace policies
drop policy if exists creator_posts_select on public.creator_posts;
create policy creator_posts_select
  on public.creator_posts for select
  using (
    creator_id = auth.uid()
    or exists (
      select 1 from public.post_access_grants pag
      where pag.post_id = creator_posts.id and pag.user_id = auth.uid()
    )
    or (
      status = 'published'
      and (
        (is_paid = false and monetization_status = 'none')
        or (is_paid = true and monetization_status = 'approved')
      )
    )
  );

create policy creator_posts_select_admin
  on public.creator_posts for select
  using (public.is_admin_role(array['moderator', 'super_admin']));

drop policy if exists creator_posts_insert_own_verified on public.creator_posts;
create policy creator_posts_insert_free
  on public.creator_posts for insert
  with check (
    creator_id = auth.uid()
    and is_paid = false
    and price_cents = 0
    and monetization_status = 'none'
    and status = 'published'
  );

create policy creator_posts_insert_paid_kyc
  on public.creator_posts for insert
  with check (
    creator_id = auth.uid()
    and is_paid = true
    and price_cents > 0
    and monetization_status = 'pending_review'
    and status = 'draft'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_kyc_verified = true
    )
  );

drop policy if exists creator_posts_update_own on public.creator_posts;
create policy creator_posts_update_own
  on public.creator_posts for update
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create policy creator_posts_update_admin
  on public.creator_posts for update
  using (public.is_admin_role(array['moderator', 'super_admin']))
  with check (true);

-- 18) content_purchases: enforce 40% platform fee
update public.content_purchases
set
  platform_fee_cents = round(amount_cents * 0.4)::integer,
  net_cents = amount_cents - round(amount_cents * 0.4)::integer;

alter table public.content_purchases drop constraint if exists content_purchases_fee_split_check;
alter table public.content_purchases
  add constraint content_purchases_fee_split_check
  check (
    platform_fee_cents = round(amount_cents * 0.4)::integer
    and net_cents = amount_cents - platform_fee_cents
  );

comment on constraint content_purchases_fee_split_check on public.content_purchases is 'Platform takes 40% on PPV.';
