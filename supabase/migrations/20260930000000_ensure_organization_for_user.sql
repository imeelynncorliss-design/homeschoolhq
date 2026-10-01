-- Roadmap item 1.1: create an organization for a brand-new user at first
-- login/signup instead of during forced onboarding, without creating a
-- duplicate org for a user who already owns one, already belongs to one as
-- a co-teacher/aide, or has a pending invite waiting for them.
--
-- Race-safety: login and the OAuth/email-confirmation callback can both run
-- for the same brand-new user close together. A per-user Postgres advisory
-- lock (auto-released at transaction end) serializes concurrent callers so
-- only one organization is ever created, without a unique constraint on
-- user_organizations.user_id (a user can legitimately hold more than one
-- membership row).
--
-- Identity is derived from the caller's own session (auth.uid()/auth.jwt())
-- rather than accepted as parameters, so a caller can never act on behalf of
-- another user.

create or replace function public.ensure_organization_for_user(
  p_placeholder_name text default 'My Homeschool',
  p_referral_source text default null,
  p_force_create boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text := auth.jwt() ->> 'email';
  v_org_id  uuid;
  v_org_name text;
  v_invite_code text;
  v_email_confirmed_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Serialize concurrent calls for the same user for the life of this transaction.
  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- 1. Already an owner/admin.
  select organization_id into v_org_id
    from user_organizations
    where user_id = v_user_id
    limit 1;
  if found then
    return jsonb_build_object('organization_id', v_org_id, 'source', 'existing_owner');
  end if;

  -- 2. Already an accepted co-teacher/aide.
  select organization_id into v_org_id
    from family_collaborators
    where user_id = v_user_id
    limit 1;
  if found then
    return jsonb_build_object('organization_id', v_org_id, 'source', 'collaborator');
  end if;

  -- 3. Has a pending, unredeemed invite by email (unless explicitly overridden).
  -- Only trust this email match once Supabase has confirmed the address --
  -- otherwise an unconfirmed signup using someone else's email could ride
  -- along on that person's pending invite before ownership of the address
  -- is actually verified.
  if not p_force_create then
    select email_confirmed_at into v_email_confirmed_at
      from auth.users
      where id = v_user_id;

    if v_email_confirmed_at is not null then
      select ci.organization_id, o.name, ci.code into v_org_id, v_org_name, v_invite_code
        from collaborator_invites ci
        join organizations o on o.id = ci.organization_id
        where lower(ci.email) = lower(coalesce(v_email, ''))
          and ci.status = 'pending'
          and ci.expires_at > now()
        order by ci.invited_at desc
        limit 1;
      if found then
        return jsonb_build_object(
          'organization_id', null,
          'source', 'pending_invite',
          'invite_organization_id', v_org_id,
          'invite_organization_name', v_org_name,
          'invite_code', v_invite_code
        );
      end if;
    end if;
  end if;

  -- 4. Genuinely new (or explicitly starting their own org over a pending invite).
  insert into organizations (user_id, name, referral_source)
    values (v_user_id, p_placeholder_name, p_referral_source)
    returning id into v_org_id;

  insert into user_organizations (user_id, organization_id, role)
    values (v_user_id, v_org_id, 'admin');

  return jsonb_build_object('organization_id', v_org_id, 'source', 'created');
end;
$$;

revoke execute on function public.ensure_organization_for_user(text, text, boolean) from public;
revoke execute on function public.ensure_organization_for_user(text, text, boolean) from anon;
grant execute on function public.ensure_organization_for_user(text, text, boolean) to authenticated;
