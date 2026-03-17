-- Fix portfolio_uploads RLS: add WITH CHECK so INSERT is permitted for org members.
-- The original policy only had USING (applies to SELECT/UPDATE/DELETE row filtering)
-- but INSERT requires a WITH CHECK clause.

drop policy if exists "org members can manage portfolio uploads" on public.portfolio_uploads;

create policy "org members can manage portfolio uploads"
  on public.portfolio_uploads
  for all
  using (
    exists (
      select 1 from public.user_organizations
      where user_id       = auth.uid()
        and organization_id = portfolio_uploads.organization_id
    )
  )
  with check (
    exists (
      select 1 from public.user_organizations
      where user_id       = auth.uid()
        and organization_id = portfolio_uploads.organization_id
    )
  );
