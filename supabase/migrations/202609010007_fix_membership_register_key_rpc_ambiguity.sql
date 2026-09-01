-- Phase 1G: RETURNS TABLE output names are PL/pgSQL variables. Qualify every
-- query column in this RPC so those output variables cannot shadow table fields.

do $$
begin
  if to_regprocedure('public.claim_membership_register_key(text,uuid)') is null then
    raise exception 'Expected function public.claim_membership_register_key(text,uuid) is missing';
  end if;
end;
$$;

create or replace function public.claim_membership_register_key(
  p_register_key text,
  p_user_id uuid
)
returns table (
  result text,
  id uuid,
  user_id uuid,
  type text,
  academic_year_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  joined_at timestamptz,
  membership_register_key_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key public.membership_register_keys%rowtype;
  v_now timestamptz := now();
  v_membership public.memberships%rowtype;
  v_type public.merbership_type;
begin
  select *
  into v_key
  from public.membership_register_keys as membership_register_key
  where membership_register_key.register_key = upper(trim(p_register_key))
  for update;

  if not found then
    result := 'not_found';
    return next;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('membership_officer:' || p_user_id::text)
  );

  if not exists (
    select 1
    from public.academic_years as academic_year
    where academic_year.id = v_key.academic_year_id
      and academic_year.is_current = true
  ) then
    result := 'not_current_year';
    return next;
    return;
  end if;

  if v_key.status <> 'available'::public.membership_register_key_status then
    result := 'unavailable';
    return next;
    return;
  end if;

  if exists (
    select 1
    from public.memberships as membership
    where membership.user_id = p_user_id
      and membership.academic_year_id = v_key.academic_year_id
      and membership.status in (
        'pending'::public.merbership_status,
        'active'::public.merbership_status,
        'suspended'::public.merbership_status
      )
  ) then
    result := 'already_current_member';
    return next;
    return;
  end if;

  select case when exists (
    select 1
    from public.officer_positions as officer
    join public.academic_years as officer_year
      on officer_year.id = officer.academic_year_id
    join public.academic_years as membership_year
      on membership_year.id = v_key.academic_year_id
    where officer.user_id = p_user_id
      and officer_year.start_date <= membership_year.start_date
  ) then 'lifetime'::public.merbership_type
  else 'annual'::public.merbership_type
  end into v_type;

  begin
    insert into public.memberships (
      user_id,
      type,
      academic_year_id,
      status,
      joined_at,
      membership_register_key_id
    )
    values (
      p_user_id,
      v_type,
      v_key.academic_year_id,
      'active'::public.merbership_status,
      v_now,
      v_key.id
    )
    returning * into v_membership;

    update public.membership_register_keys as membership_register_key
    set status = 'claimed'::public.membership_register_key_status,
        claimed_at = v_now
    where membership_register_key.id = v_key.id;
  exception
    when unique_violation then
      result := 'already_current_member';
      return next;
      return;
  end;

  result := 'claimed';
  id := v_membership.id;
  user_id := v_membership.user_id;
  type := v_membership.type;
  academic_year_id := v_membership.academic_year_id;
  status := v_membership.status;
  created_at := v_membership.created_at;
  updated_at := v_membership.updated_at;
  joined_at := v_membership.joined_at;
  membership_register_key_id := v_membership.membership_register_key_id;
  return next;
end;
$$;

revoke all privileges on function public.claim_membership_register_key(text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_membership_register_key(text, uuid) to service_role;
