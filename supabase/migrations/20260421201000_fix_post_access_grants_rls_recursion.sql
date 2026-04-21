-- Infinite recursion: creator_posts SELECT referenced post_access_grants, and
-- post_access_grants SELECT used EXISTS (SELECT ... FROM creator_posts), which
-- re-evaluated creator_posts RLS. INSERT ... RETURNING triggers SELECT on the new row.
--
-- Break the cycle: check post ownership in a SECURITY DEFINER function so the inner
-- read does not apply RLS (function runs as owner).

create or replace function public.auth_is_creator_of_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.creator_posts
    where id = p_post_id
      and creator_id = auth.uid()
  );
$$;

comment on function public.auth_is_creator_of_post(uuid) is
  'True if the current user owns the post; used by RLS to avoid creator_posts ↔ post_access_grants recursion.';

grant execute on function public.auth_is_creator_of_post(uuid) to authenticated;

drop policy if exists post_access_grants_select_own on public.post_access_grants;
create policy post_access_grants_select_own
  on public.post_access_grants for select
  using (
    user_id = auth.uid()
    or public.auth_is_creator_of_post(post_id)
  );
