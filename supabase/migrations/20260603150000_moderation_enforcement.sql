-- Moderation enforcement: hide content from suspended/banned creators, and give
-- moderators atomic actions to take down posts and change account status.

-- 0) Allow reporting individual comments.
alter table public.moderation_reports drop constraint if exists moderation_reports_target_type_check;
alter table public.moderation_reports
  add constraint moderation_reports_target_type_check
  check (target_type in ('post', 'profile', 'session', 'message', 'comment'));

-- 1) Feed visibility now also requires the author to be in good standing.
--    (Authors still see their own posts regardless of status.)
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
      and exists (
        select 1 from public.profiles au
        where au.id = creator_posts.creator_id and au.account_status = 'active'
      )
    )
  );

-- 2) Take down a post (moderator/super_admin).
create or replace function public.admin_remove_post(p_post_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_role(array['moderator', 'super_admin']) then
    raise exception 'not authorized';
  end if;

  update public.creator_posts set status = 'removed' where id = p_post_id;

  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'post_removed', 'post', p_post_id::text, jsonb_build_object('reason', p_reason));
end;
$$;

revoke all on function public.admin_remove_post(uuid, text) from public;
grant execute on function public.admin_remove_post(uuid, text) to authenticated;

-- 3) Change a user's account status (moderator/super_admin).
create or replace function public.admin_set_account_status(p_user_id uuid, p_status text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_role(array['moderator', 'super_admin']) then
    raise exception 'not authorized';
  end if;
  if p_status not in ('active', 'under_review', 'suspended', 'banned') then
    raise exception 'invalid status';
  end if;

  update public.profiles set account_status = p_status where id = p_user_id;

  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'account_status_change', 'profile', p_user_id::text, jsonb_build_object('status', p_status, 'reason', p_reason));
end;
$$;

revoke all on function public.admin_set_account_status(uuid, text, text) from public;
grant execute on function public.admin_set_account_status(uuid, text, text) to authenticated;
