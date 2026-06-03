-- Paid/private post media now lives in the private bucket `creator-media-private`
-- (the app stores the object PATH in creator_posts.media_url for such posts).
-- The owner can already read their own objects. This adds read access for users who
-- have purchased/been granted access to the post that the object backs, so their
-- signed-URL requests succeed. Free media stays in the public bucket and is unaffected.

drop policy if exists creator_media_private_select_granted on storage.objects;
create policy creator_media_private_select_granted
  on storage.objects for select
  using (
    bucket_id = 'creator-media-private'
    and exists (
      select 1
      from public.creator_posts cp
      join public.post_access_grants pag on pag.post_id = cp.id
      where cp.media_url = storage.objects.name
        and pag.user_id = auth.uid()
    )
  );
