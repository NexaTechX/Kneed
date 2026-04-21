-- Allow authors to remove their own posts (cascades to grants, reactions, etc.)
drop policy if exists creator_posts_delete_own on public.creator_posts;
create policy creator_posts_delete_own
  on public.creator_posts for delete
  using (creator_id = auth.uid());
