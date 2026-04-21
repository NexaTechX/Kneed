-- Admins can read all withdrawal requests and moderation data for operations.

drop policy if exists withdrawal_requests_select_own on public.withdrawal_requests;
create policy withdrawal_requests_select_own
  on public.withdrawal_requests for select
  using (user_id = auth.uid() or public.is_admin_role(array['finance', 'super_admin', 'support']));

drop policy if exists withdrawal_requests_insert_own on public.withdrawal_requests;
create policy withdrawal_requests_insert_own
  on public.withdrawal_requests for insert
  with check (user_id = auth.uid());

create policy withdrawal_requests_update_admin
  on public.withdrawal_requests for update
  using (public.is_admin_role(array['finance', 'super_admin']))
  with check (true);
