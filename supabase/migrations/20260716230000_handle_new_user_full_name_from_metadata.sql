-- Prefer full_name from auth signup metadata. Never trust role from user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    'client',
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), '')
  );
  return new;
end;
$$;
