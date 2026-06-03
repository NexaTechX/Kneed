-- Allow moderators to update report lifecycle states and persist audit entries.

drop policy if exists moderation_reports_update_admin on public.moderation_reports;
create policy moderation_reports_update_admin
  on public.moderation_reports for update
  using (public.is_admin_role(array['moderator', 'super_admin']))
  with check (
    status in ('open', 'reviewing', 'resolved', 'dismissed')
  );

drop policy if exists admin_audit_logs_insert_admin on public.admin_audit_logs;
create policy admin_audit_logs_insert_admin
  on public.admin_audit_logs for insert
  with check (
    actor_id = auth.uid()
    and public.is_admin_role(array['support', 'moderator', 'finance', 'super_admin'])
  );
