-- Service details and media support

alter table public.services
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do nothing;

create policy "service_images_public_read"
  on storage.objects for select
  using (bucket_id = 'service-images');

create policy "service_images_upload_own"
  on storage.objects for insert
  with check (bucket_id = 'service-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "service_images_update_own"
  on storage.objects for update
  using (bucket_id = 'service-images' and auth.uid()::text = (storage.foldername(name))[1]);
