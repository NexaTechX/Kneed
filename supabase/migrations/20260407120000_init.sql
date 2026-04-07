-- Knead initial schema, RLS, search RPC, storage buckets

-- Extensions
create extension if not exists "uuid-ossp";

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'client' check (role in ('client', 'provider')),
  full_name text not null default '',
  avatar_url text,
  phone text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Providers (id = profile id for users who are providers)
create table public.providers (
  id uuid primary key references public.profiles (id) on delete cascade,
  license_number text not null default '',
  license_image text,
  years_exp integer not null default 0,
  bio text,
  studio_address text,
  travel_radius_miles numeric not null default 10,
  lat double precision,
  lng double precision,
  is_verified boolean not null default false,
  average_rating numeric not null default 0 check (average_rating >= 0 and average_rating <= 5),
  total_reviews integer not null default 0,
  created_at timestamptz not null default now()
);

create index providers_lat_lng_idx on public.providers (lat, lng) where lat is not null and lng is not null;

alter table public.providers enable row level security;

create policy "providers_select"
  on public.providers for select
  using (is_verified = true or auth.uid() = id);

create policy "providers_insert_own"
  on public.providers for insert
  with check (auth.uid() = id);

create policy "providers_update_own"
  on public.providers for update
  using (auth.uid() = id);

-- Services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  type text not null check (type in ('swedish', 'deep_tissue', 'sports', 'thai', 'prenatal')),
  duration_min integer not null check (duration_min in (30, 60, 90, 120)),
  price_cents integer not null check (price_cents >= 0),
  location_type text not null check (location_type in ('studio', 'mobile', 'both')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index services_provider_idx on public.services (provider_id);

alter table public.services enable row level security;

create policy "services_select"
  on public.services for select
  using (
    is_active = true
    or exists (
      select 1 from public.providers p
      where p.id = services.provider_id and p.id = auth.uid()
    )
  );

create policy "services_manage_own"
  on public.services for all
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

-- Availability (weekly template)
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  unique (provider_id, day_of_week)
);

alter table public.availability enable row level security;

create policy "availability_select"
  on public.availability for select
  using (
    is_active = true
    or provider_id = auth.uid()
  );

create policy "availability_manage_own"
  on public.availability for all
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

-- Bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.providers (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  scheduled_at timestamptz not null,
  location_type text not null check (location_type in ('studio', 'mobile')),
  address text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'disputed')),
  price_cents integer not null,
  platform_fee_cents integer not null,
  total_cents integer not null,
  notes text,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancellation_reason text
);

create unique index bookings_provider_slot_active
  on public.bookings (provider_id, scheduled_at)
  where status is distinct from 'cancelled';

create index bookings_client_idx on public.bookings (client_id);
create index bookings_provider_idx on public.bookings (provider_id);
create index bookings_scheduled_idx on public.bookings (scheduled_at);

alter table public.bookings enable row level security;

create policy "bookings_select_client"
  on public.bookings for select
  using (client_id = auth.uid());

create policy "bookings_select_provider"
  on public.bookings for select
  using (provider_id = auth.uid());

create policy "bookings_insert_client"
  on public.bookings for insert
  with check (client_id = auth.uid());

create policy "bookings_update_client"
  on public.bookings for update
  using (client_id = auth.uid());

create policy "bookings_update_provider"
  on public.bookings for update
  using (provider_id = auth.uid());

-- Reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.providers (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

alter table public.reviews enable row level security;

create policy "reviews_select"
  on public.reviews for select
  using (true);

create policy "reviews_insert_own_completed"
  on public.reviews for insert
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.client_id = auth.uid()
        and b.status = 'completed'
    )
  );

-- New user -> profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (new.id, coalesce(new.email, ''), 'client', '');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update provider aggregates on new review (optional helper)
create or replace function public.refresh_provider_rating(p_provider uuid)
returns void
language plpgsql
as $$
declare
  avg_r numeric;
  cnt integer;
begin
  select coalesce(avg(rating::numeric), 0), count(*)::integer
    into avg_r, cnt
  from public.reviews
  where provider_id = p_provider;

  update public.providers
  set average_rating = round(avg_r::numeric, 2),
      total_reviews = cnt
  where id = p_provider;
end;
$$;

create or replace function public.on_review_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_provider_rating(new.provider_id);
  return new;
end;
$$;

drop trigger if exists trg_review_insert on public.reviews;
create trigger trg_review_insert
after insert on public.reviews
for each row execute function public.on_review_insert();

-- Haversine search (miles). Requires provider lat/lng.
create or replace function public.search_providers(
  user_lat double precision,
  user_lng double precision,
  radius_miles double precision,
  filter_service_type text default null
)
returns table (
  provider_id uuid,
  distance_miles double precision,
  min_price_cents bigint,
  full_name text,
  average_rating numeric,
  total_reviews integer,
  is_verified boolean
)
language sql
stable
as $$
  select
    p.id as provider_id,
    (
      3959 * acos(
        least(1::double precision, greatest(-1::double precision,
          cos(radians(user_lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(user_lng))
          + sin(radians(user_lat)) * sin(radians(p.lat))
        ))
      )
    )::double precision as distance_miles,
    min(s.price_cents)::bigint as min_price_cents,
    pr.full_name,
    p.average_rating,
    p.total_reviews,
    p.is_verified
  from public.providers p
  join public.profiles pr on pr.id = p.id
  join public.services s on s.provider_id = p.id and s.is_active = true
  where p.is_verified = true
    and p.lat is not null
    and p.lng is not null
    and (filter_service_type is null or s.type = filter_service_type)
  group by p.id, pr.full_name, p.average_rating, p.total_reviews, p.is_verified, p.lat, p.lng
  having (
    3959 * acos(
      least(1::double precision, greatest(-1::double precision,
        cos(radians(user_lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(user_lng))
        + sin(radians(user_lat)) * sin(radians(p.lat))
      ))
    )
  ) <= radius_miles;
$$;

-- Realtime (Supabase project must have supabase_realtime publication)
alter table public.bookings replica identity full;
alter publication supabase_realtime add table public.bookings;

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('licenses', 'licenses', false), ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_upload_own"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_update_own"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "licenses_upload_own"
  on storage.objects for insert
  with check (bucket_id = 'licenses' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "licenses_read_own"
  on storage.objects for select
  using (bucket_id = 'licenses' and auth.uid()::text = (storage.foldername(name))[1]);
