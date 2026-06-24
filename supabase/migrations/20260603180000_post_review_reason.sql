-- Paid-post review reasons + a single atomic review action that notifies the creator.
-- Creators can edit a rejected post and resubmit (handled in the app: saving a paid
-- post sets monetization_status back to 'pending_review').

alter table public.creator_posts
  add column if not exists review_reason text;

create or replace function public.admin_review_monetization(p_post_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  if not public.is_admin_role(array['moderator', 'super_admin']) then
    raise exception 'not authorized';
  end if;

  select creator_id into v_author from public.creator_posts where id = p_post_id;
  if v_author is null then
    raise exception 'post not found';
  end if;

  if p_approve then
    update public.creator_posts
      set monetization_status = 'approved', status = 'published', review_reason = null
      where id = p_post_id;
    insert into public.notifications (recipient_id, type, post_id, title, body)
    values (v_author, 'system', p_post_id, 'Paid post approved', 'Your paid post is now live.');
  else
    update public.creator_posts
      set monetization_status = 'rejected', status = 'rejected', review_reason = p_reason
      where id = p_post_id;
    insert into public.notifications (recipient_id, type, post_id, title, body)
    values (v_author, 'system', p_post_id, 'Paid post needs changes', coalesce(p_reason, 'Your paid post was not approved.'));
  end if;

  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    case when p_approve then 'monetization_approved' else 'monetization_rejected' end,
    'post',
    p_post_id::text,
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

revoke all on function public.admin_review_monetization(uuid, boolean, text) from public;
grant execute on function public.admin_review_monetization(uuid, boolean, text) to authenticated;
