-- Adult creator MVP foundation: creator content, social graph, private rooms, custodial wallets, and admin operations.

-- Expand roles to support creator/admin while preserving existing client/provider roles.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('client', 'provider', 'creator', 'admin'));

alter table public.profiles
  add column if not exists is_age_verified boolean not null default false,
  add column if not exists accepted_content_policy_at timestamptz,
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'under_review', 'suspended', 'banned'));

-- Creator-specific profile state.
create table if not exists public.creators (
  id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null default '',
  headline text,
  bio text,
  cover_image_url text,
  is_kyc_verified boolean not null default false,
  kyc_verified_at timestamptz,
  can_publish_sensitive boolean not null default false,
  is_discoverable boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.creators enable row level security;

drop policy if exists creators_select on public.creators;
create policy creators_select
  on public.creators for select
  using (is_discoverable = true or id = auth.uid());

drop policy if exists creators_insert_own on public.creators;
create policy creators_insert_own
  on public.creators for insert
  with check (id = auth.uid());

drop policy if exists creators_update_own on public.creators;
create policy creators_update_own
  on public.creators for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Social follows (client<->creator and user<->user).
create table if not exists public.social_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index if not exists social_follows_followed_idx on public.social_follows (followed_id, created_at desc);
alter table public.social_follows enable row level security;

drop policy if exists social_follows_select on public.social_follows;
create policy social_follows_select
  on public.social_follows for select
  using (true);

drop policy if exists social_follows_insert_own on public.social_follows;
create policy social_follows_insert_own
  on public.social_follows for insert
  with check (follower_id = auth.uid());

drop policy if exists social_follows_delete_own on public.social_follows;
create policy social_follows_delete_own
  on public.social_follows for delete
  using (follower_id = auth.uid());

-- Creator posts with creator-controlled monetization.
-- Access grants table must exist before creator_posts select policy references it.
create table if not exists public.post_access_grants (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('purchase', 'subscription', 'manual')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.post_access_grants enable row level security;

create table if not exists public.creator_posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  title text,
  body text,
  media_type text check (media_type in ('none', 'image', 'video')),
  media_url text,
  thumbnail_url text,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  is_paid boolean not null default false,
  price_cents integer not null default 0 check (price_cents >= 0),
  status text not null default 'published' check (status in ('published', 'removed', 'flagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_paid = false and price_cents = 0) or (is_paid = true and price_cents > 0))
);

alter table public.post_access_grants
  drop constraint if exists post_access_grants_post_id_fkey;

alter table public.post_access_grants
  add constraint post_access_grants_post_id_fkey
  foreign key (post_id) references public.creator_posts (id) on delete cascade;

drop policy if exists post_access_grants_select_own on public.post_access_grants;
create policy post_access_grants_select_own
  on public.post_access_grants for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.creator_posts cp
      where cp.id = post_id and cp.creator_id = auth.uid()
    )
  );

create index if not exists creator_posts_feed_idx on public.creator_posts (status, visibility, created_at desc);
create index if not exists creator_posts_creator_idx on public.creator_posts (creator_id, created_at desc);
alter table public.creator_posts enable row level security;

drop policy if exists creator_posts_select on public.creator_posts;
create policy creator_posts_select
  on public.creator_posts for select
  using (
    status = 'published'
    and (
      visibility = 'public'
      or creator_id = auth.uid()
      or exists (
        select 1
        from public.post_access_grants pag
        where pag.post_id = creator_posts.id and pag.user_id = auth.uid()
      )
    )
  );

drop policy if exists creator_posts_insert_own_verified on public.creator_posts;
create policy creator_posts_insert_own_verified
  on public.creator_posts for insert
  with check (
    creator_id = auth.uid()
    and exists (
      select 1
      from public.creators c
      where c.id = auth.uid()
        and c.is_kyc_verified = true
    )
  );

drop policy if exists creator_posts_update_own on public.creator_posts;
create policy creator_posts_update_own
  on public.creator_posts for update
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

-- Basic engagement.
create table if not exists public.post_reactions (
  post_id uuid not null references public.creator_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null default 'like' check (reaction in ('like', 'love', 'fire')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_reactions enable row level security;

drop policy if exists post_reactions_select on public.post_reactions;
create policy post_reactions_select on public.post_reactions for select using (true);

drop policy if exists post_reactions_insert_own on public.post_reactions;
create policy post_reactions_insert_own
  on public.post_reactions for insert
  with check (user_id = auth.uid());

drop policy if exists post_reactions_delete_own on public.post_reactions;
create policy post_reactions_delete_own
  on public.post_reactions for delete
  using (user_id = auth.uid());

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.creator_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at desc);
alter table public.post_comments enable row level security;

drop policy if exists post_comments_select on public.post_comments;
create policy post_comments_select on public.post_comments for select using (true);

drop policy if exists post_comments_insert_own on public.post_comments;
create policy post_comments_insert_own
  on public.post_comments for insert
  with check (user_id = auth.uid());

drop policy if exists post_comments_delete_own on public.post_comments;
create policy post_comments_delete_own
  on public.post_comments for delete
  using (user_id = auth.uid());

-- Private room requests / bookings.
create table if not exists public.private_room_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  duration_min integer not null check (duration_min between 10 and 240),
  notes text,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'paid', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists private_room_sessions_creator_idx on public.private_room_sessions (creator_id, created_at desc);
alter table public.private_room_sessions enable row level security;

drop policy if exists private_room_sessions_select on public.private_room_sessions;
create policy private_room_sessions_select
  on public.private_room_sessions for select
  using (requester_id = auth.uid() or creator_id = auth.uid());

drop policy if exists private_room_sessions_insert_requester on public.private_room_sessions;
create policy private_room_sessions_insert_requester
  on public.private_room_sessions for insert
  with check (requester_id = auth.uid());

drop policy if exists private_room_sessions_update_participants on public.private_room_sessions;
create policy private_room_sessions_update_participants
  on public.private_room_sessions for update
  using (requester_id = auth.uid() or creator_id = auth.uid())
  with check (requester_id = auth.uid() or creator_id = auth.uid());

-- Platform-held custodial wallet model.
create table if not exists public.wallet_accounts (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  owner_type text not null default 'user' check (owner_type in ('user', 'creator', 'platform')),
  available_cents bigint not null default 0,
  pending_cents bigint not null default 0,
  lifetime_earned_cents bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.wallet_accounts enable row level security;

drop policy if exists wallet_accounts_select_own on public.wallet_accounts;
create policy wallet_accounts_select_own
  on public.wallet_accounts for select
  using (owner_id = auth.uid());

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  direction text not null check (direction in ('credit', 'debit')),
  entry_type text not null
    check (entry_type in ('purchase', 'tip', 'subscription', 'private_room', 'fee', 'refund', 'withdrawal', 'adjustment')),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'posted' check (status in ('pending', 'posted', 'reversed')),
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_owner_idx on public.wallet_transactions (owner_id, created_at desc);
alter table public.wallet_transactions enable row level security;

drop policy if exists wallet_transactions_select_own on public.wallet_transactions;
create policy wallet_transactions_select_own
  on public.wallet_transactions for select
  using (owner_id = auth.uid());

-- Purchases/subscriptions.
create table if not exists public.content_purchases (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.creator_posts (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  creator_id uuid not null references public.creators (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  net_cents integer not null check (net_cents >= 0),
  status text not null default 'paid' check (status in ('paid', 'refunded', 'disputed')),
  created_at timestamptz not null default now(),
  unique (post_id, buyer_id)
);

alter table public.content_purchases enable row level security;

drop policy if exists content_purchases_select_parties on public.content_purchases;
create policy content_purchases_select_parties
  on public.content_purchases for select
  using (buyer_id = auth.uid() or creator_id = auth.uid());

create table if not exists public.creator_subscriptions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  subscriber_id uuid not null references public.profiles (id) on delete cascade,
  price_cents integer not null check (price_cents > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  unique (creator_id, subscriber_id)
);

alter table public.creator_subscriptions enable row level security;

drop policy if exists creator_subscriptions_select_parties on public.creator_subscriptions;
create policy creator_subscriptions_select_parties
  on public.creator_subscriptions for select
  using (subscriber_id = auth.uid() or creator_id = auth.uid());

-- Withdrawal request lifecycle (admin approval).
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  destination text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
  admin_reason text,
  payout_reference text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists withdrawal_requests_creator_idx on public.withdrawal_requests (creator_id, created_at desc);
alter table public.withdrawal_requests enable row level security;

drop policy if exists withdrawal_requests_select_creator on public.withdrawal_requests;
create policy withdrawal_requests_select_creator
  on public.withdrawal_requests for select
  using (creator_id = auth.uid());

drop policy if exists withdrawal_requests_insert_creator on public.withdrawal_requests;
create policy withdrawal_requests_insert_creator
  on public.withdrawal_requests for insert
  with check (creator_id = auth.uid());

-- Admin roles and operations.
create table if not exists public.admin_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null check (role in ('support', 'moderator', 'finance', 'super_admin')),
  granted_at timestamptz not null default now()
);

alter table public.admin_roles enable row level security;

drop policy if exists admin_roles_select_own on public.admin_roles;
create policy admin_roles_select_own
  on public.admin_roles for select
  using (user_id = auth.uid());

create or replace function public.is_admin_role(allowed text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.admin_roles ar
    where ar.user_id = auth.uid()
      and ar.role = any(allowed)
  );
$$;

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'profile', 'session', 'message')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.moderation_reports enable row level security;

drop policy if exists moderation_reports_insert_own on public.moderation_reports;
create policy moderation_reports_insert_own
  on public.moderation_reports for insert
  with check (reporter_id = auth.uid());

drop policy if exists moderation_reports_select_own_or_admin on public.moderation_reports;
create policy moderation_reports_select_own_or_admin
  on public.moderation_reports for select
  using (reporter_id = auth.uid() or public.is_admin_role(array['moderator', 'super_admin']));

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

drop policy if exists admin_audit_logs_select_admin on public.admin_audit_logs;
create policy admin_audit_logs_select_admin
  on public.admin_audit_logs for select
  using (public.is_admin_role(array['support', 'moderator', 'finance', 'super_admin']));

-- Storage buckets for creator content.
insert into storage.buckets (id, name, public)
values ('creator-media-public', 'creator-media-public', true),
       ('creator-media-private', 'creator-media-private', false)
on conflict (id) do nothing;

drop policy if exists creator_media_public_read on storage.objects;
create policy creator_media_public_read
  on storage.objects for select
  using (bucket_id = 'creator-media-public');

drop policy if exists creator_media_public_upload_own on storage.objects;
create policy creator_media_public_upload_own
  on storage.objects for insert
  with check (bucket_id = 'creator-media-public' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists creator_media_private_upload_own on storage.objects;
create policy creator_media_private_upload_own
  on storage.objects for insert
  with check (bucket_id = 'creator-media-private' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists creator_media_private_select_own on storage.objects;
create policy creator_media_private_select_own
  on storage.objects for select
  using (bucket_id = 'creator-media-private' and auth.uid()::text = (storage.foldername(name))[1]);
