-- Manual KYC: creators submit identity documents; admins approve/reject.
-- Approval flips profiles.is_kyc_verified, which gates paid posts + Private Room.

-- 1) Applications table
create table if not exists public.kyc_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  full_legal_name text not null,
  dob date not null,
  id_doc_path text not null,
  selfie_path text,
  admin_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists kyc_applications_user_idx on public.kyc_applications (user_id, created_at desc);
create index if not exists kyc_applications_status_idx on public.kyc_applications (status, created_at desc);
-- At most one in-flight application per user.
create unique index if not exists kyc_applications_one_pending
  on public.kyc_applications (user_id)
  where status = 'pending';

alter table public.kyc_applications enable row level security;

drop policy if exists kyc_applications_select_own_or_admin on public.kyc_applications;
create policy kyc_applications_select_own_or_admin
  on public.kyc_applications for select
  using (user_id = auth.uid() or public.is_admin_role(array['support', 'super_admin']));

drop policy if exists kyc_applications_insert_own on public.kyc_applications;
create policy kyc_applications_insert_own
  on public.kyc_applications for insert
  with check (user_id = auth.uid() and status = 'pending');

-- 2) Admin review (atomic): sets application status and, on approval, the profile flag.
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
  else
    update public.kyc_applications
      set status = 'rejected', admin_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_application_id;
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

revoke all on function public.admin_review_kyc(uuid, boolean, text) from public;
grant execute on function public.admin_review_kyc(uuid, boolean, text) to authenticated;

-- 3) Private storage bucket for identity documents (never public).
insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

drop policy if exists kyc_documents_upload_own on storage.objects;
create policy kyc_documents_upload_own
  on storage.objects for insert
  with check (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists kyc_documents_select_own_or_admin on storage.objects;
create policy kyc_documents_select_own_or_admin
  on storage.objects for select
  using (
    bucket_id = 'kyc-documents'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin_role(array['support', 'super_admin'])
    )
  );
