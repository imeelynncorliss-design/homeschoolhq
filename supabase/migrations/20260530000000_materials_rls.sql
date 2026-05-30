-- Allow organization members to manage materials.
-- RLS was enabled for materials without a matching org-member policy,
-- which blocks saving resources from Materials and from lesson material linking.

drop policy if exists "org members can manage materials" on public.materials;

create policy "org members can manage materials"
  on public.materials
  for all
  using (
    -- Organization owner path
    exists (
      select 1 from public.organizations
      where user_id = auth.uid()
        and id = materials.organization_id
    )
    or
    -- Organization member path
    exists (
      select 1 from public.user_organizations
      where user_id = auth.uid()
        and organization_id = materials.organization_id
    )
    or
    -- Co-teacher/collaborator path
    exists (
      select 1 from public.family_collaborators
      where user_id = auth.uid()
        and organization_id = materials.organization_id
    )
  )
  with check (
    -- Organization owner path
    exists (
      select 1 from public.organizations
      where user_id = auth.uid()
        and id = materials.organization_id
    )
    or
    -- Organization member path
    exists (
      select 1 from public.user_organizations
      where user_id = auth.uid()
        and organization_id = materials.organization_id
    )
    or
    -- Co-teacher/collaborator path
    exists (
      select 1 from public.family_collaborators
      where user_id = auth.uid()
        and organization_id = materials.organization_id
    )
  );
