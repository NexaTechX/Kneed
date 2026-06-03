-- In-app notifications. Rows are written by triggers / SECURITY DEFINER functions /
-- the service role (webhook). Users can only read and mark their own as read.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'follow', 'purchase', 'booking', 'kyc', 'moderation', 'system')),
  actor_id uuid references public.profiles (id) on delete set null,
  post_id uuid references public.creator_posts (id) on delete cascade,
  session_id uuid references public.private_room_sessions (id) on delete cascade,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select
  using (recipient_id = auth.uid());

-- Recipients may only mark their own as read (no other field changes enforced at app layer).
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- No INSERT policy: only triggers, SECURITY DEFINER functions, and the service role write.

-- Triggers for social activity ------------------------------------------------

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.followed_id <> NEW.follower_id then
    insert into public.notifications (recipient_id, type, actor_id, title, body)
    values (NEW.followed_id, 'follow', NEW.follower_id, 'New follower', 'Someone started following you.');
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_follow on public.social_follows;
create trigger trg_notify_follow after insert on public.social_follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select creator_id into v_author from public.creator_posts where id = NEW.post_id;
  if v_author is not null and v_author <> NEW.user_id then
    insert into public.notifications (recipient_id, type, actor_id, post_id, title, body)
    values (v_author, 'like', NEW.user_id, NEW.post_id, 'New reaction', 'Someone reacted to your post.');
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_reaction on public.post_reactions;
create trigger trg_notify_reaction after insert on public.post_reactions
  for each row execute function public.notify_on_reaction();

create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select creator_id into v_author from public.creator_posts where id = NEW.post_id;
  if v_author is not null and v_author <> NEW.user_id then
    insert into public.notifications (recipient_id, type, actor_id, post_id, title, body)
    values (v_author, 'comment', NEW.user_id, NEW.post_id, 'New comment', 'Someone commented on your post.');
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_comment on public.post_comments;
create trigger trg_notify_comment after insert on public.post_comments
  for each row execute function public.notify_on_comment();

-- New private-room booking notifies the booked user.
create or replace function public.notify_on_booking()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, type, actor_id, session_id, title, body)
  values (NEW.booked_user_id, 'booking', NEW.booker_user_id, NEW.id, 'New booking request', 'Someone requested a Private Room session.');
  return NEW;
end; $$;

drop trigger if exists trg_notify_booking on public.private_room_sessions;
create trigger trg_notify_booking after insert on public.private_room_sessions
  for each row execute function public.notify_on_booking();

-- KYC decision notifies the applicant (re-create the existing function with the insert).
create or replace function public.admin_review_kyc(p_application_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if not public.is_admin_role(array['support', 'super_admin']) then
    raise exception 'not authorized';
  end if;

  select user_id into v_user from public.kyc_applications where id = p_application_id;
  if v_user is null then
    raise exception 'application not found';
  end if;

  if p_approve then
    update public.kyc_applications
      set status = 'approved', admin_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_application_id;
    update public.profiles
      set is_kyc_verified = true, kyc_verified_at = now()
      where id = v_user;
    insert into public.notifications (recipient_id, type, title, body)
    values (v_user, 'kyc', 'Verification approved', 'You are verified. Paid posts and Private Room are unlocked.');
  else
    update public.kyc_applications
      set status = 'rejected', admin_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_application_id;
    insert into public.notifications (recipient_id, type, title, body)
    values (v_user, 'kyc', 'Verification needs attention', coalesce(p_reason, 'Your verification was not approved.'));
  end if;

  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    case when p_approve then 'kyc_approved' else 'kyc_rejected' end,
    'kyc_application',
    p_application_id::text,
    jsonb_build_object('user_id', v_user, 'reason', p_reason)
  );
end;
$$;
