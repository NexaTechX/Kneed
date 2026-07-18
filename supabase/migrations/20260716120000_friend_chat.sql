-- Friend chat: DMs only between mutual followers (friends).

create or replace function public.are_mutual_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select a is not null
    and b is not null
    and a <> b
    and exists (
      select 1 from public.social_follows
      where follower_id = a and followed_id = b
    )
    and exists (
      select 1 from public.social_follows
      where follower_id = b and followed_id = a
    );
$$;

revoke all on function public.are_mutual_friends(uuid, uuid) from public;
grant execute on function public.are_mutual_friends(uuid, uuid) to authenticated;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  user_low_last_read_at timestamptz,
  user_high_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_low < user_high),
  unique (user_low, user_high)
);

create index if not exists conversations_user_low_idx
  on public.conversations (user_low, last_message_at desc nulls last);
create index if not exists conversations_user_high_idx
  on public.conversations (user_high, last_message_at desc nulls last);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations: participants only
drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant
  on public.conversations for select
  using (auth.uid() = user_low or auth.uid() = user_high);

drop policy if exists conversations_update_participant on public.conversations;
create policy conversations_update_participant
  on public.conversations for update
  using (auth.uid() = user_low or auth.uid() = user_high)
  with check (auth.uid() = user_low or auth.uid() = user_high);

-- Inserts go through get_or_create_dm (security definer). No direct insert policy.

-- Messages: participants can read; friends can send while still mutual
drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_low = auth.uid() or c.user_high = auth.uid())
    )
  );

drop policy if exists messages_insert_friend on public.messages;
create policy messages_insert_friend
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_low = auth.uid() or c.user_high = auth.uid())
        and public.are_mutual_friends(c.user_low, c.user_high)
    )
  );

-- Create or fetch a 1:1 conversation with a friend
create or replace function public.get_or_create_dm(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  lo uuid;
  hi uuid;
  conv_id uuid;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  if p_other_user_id is null or p_other_user_id = me then
    raise exception 'Invalid conversation partner';
  end if;
  if not public.are_mutual_friends(me, p_other_user_id) then
    raise exception 'You can only chat with friends (mutual follows)';
  end if;

  lo := least(me, p_other_user_id);
  hi := greatest(me, p_other_user_id);

  select id into conv_id
  from public.conversations
  where user_low = lo and user_high = hi;

  if conv_id is null then
    insert into public.conversations (user_low, user_high)
    values (lo, hi)
    returning id into conv_id;
  end if;

  return conv_id;
end;
$$;

revoke all on function public.get_or_create_dm(uuid) from public;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

-- Keep conversation preview / sort key in sync
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_at = NEW.created_at,
    last_message_preview = left(NEW.body, 120)
  where id = NEW.conversation_id;
  return NEW;
end;
$$;

drop trigger if exists trg_touch_conversation_on_message on public.messages;
create trigger trg_touch_conversation_on_message
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- Mark conversation read for the current user
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv public.conversations%rowtype;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  select * into conv from public.conversations where id = p_conversation_id;
  if not found then
    raise exception 'Conversation not found';
  end if;
  if me <> conv.user_low and me <> conv.user_high then
    raise exception 'Not a participant';
  end if;

  if me = conv.user_low then
    update public.conversations
    set user_low_last_read_at = now()
    where id = p_conversation_id;
  else
    update public.conversations
    set user_high_last_read_at = now()
    where id = p_conversation_id;
  end if;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Optional in-app notification for new DMs
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'like', 'comment', 'follow', 'purchase', 'booking', 'kyc', 'moderation', 'system', 'message'
  ));

create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv public.conversations%rowtype;
  recipient uuid;
begin
  select * into conv from public.conversations where id = NEW.conversation_id;
  if not found then
    return NEW;
  end if;

  recipient := case
    when conv.user_low = NEW.sender_id then conv.user_high
    else conv.user_low
  end;

  insert into public.notifications (recipient_id, type, actor_id, title, body, data)
  values (
    recipient,
    'message',
    NEW.sender_id,
    'New message',
    left(NEW.body, 120),
    jsonb_build_object('conversation_id', NEW.conversation_id)
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- Realtime for live threads
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
