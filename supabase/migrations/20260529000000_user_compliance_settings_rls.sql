-- Allow organization members to manage their compliance settings.
-- RLS was enabled for user_compliance_settings without a matching org-member policy,
-- which blocks first-time compliance setup inserts in SBX.

drop policy if exists "org members can manage user compliance settings" on public.user_compliance_settings;

create policy "org members can manage user compliance settings"
  on public.user_compliance_settings
  for all
  using (
    -- Owner path
    exists (
      select 1 from public.organizations
      where user_id = auth.uid()
        and id = user_compliance_settings.organization_id
    )
    or
    -- Co-teacher path
    exists (
      select 1 from public.user_organizations
      where user_id = auth.uid()
        and organization_id = user_compliance_settings.organization_id
    )
  )
  with check (
    -- Owner path
    exists (
      select 1 from public.organizations
      where user_id = auth.uid()
        and id = user_compliance_settings.organization_id
    )
    or
    -- Co-teacher path
    exists (
      select 1 from public.user_organizations
      where user_id = auth.uid()
        and organization_id = user_compliance_settings.organization_id
    )
  );
