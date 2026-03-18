-- Fix portfolio_uploads RLS to allow org OWNERS to insert.
-- The previous policy only checked user_organizations (co-teacher path).
-- Org owners are stored in the organizations table (organizations.user_id),
-- not in user_organizations, so they were blocked by the old policy.

drop policy if exists "org members can manage portfolio uploads" on public.portfolio_uploads;

create policy "org members can manage portfolio uploads"
  on public.portfolio_uploads
  for all
  using (
    -- Owner path
    exists (
      select 1 from public.organizations
      where user_id = auth.uid()
        and id = portfolio_uploads.organization_id
    )
    or
    -- Co-teacher path
    exists (
      select 1 from public.user_organizations
      where user_id = auth.uid()
        and organization_id = portfolio_uploads.organization_id
    )
  )
  with check (
    -- Owner path
    exists (
      select 1 from public.organizations
      where user_id = auth.uid()
        and id = portfolio_uploads.organization_id
    )
    or
    -- Co-teacher path
    exists (
      select 1 from public.user_organizations
      where user_id = auth.uid()
        and organization_id = portfolio_uploads.organization_id
    )
  );
