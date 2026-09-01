-- Phase 1D: memberships remain academic-year records. Their persisted type is
-- derived from officer-position history for the same user and academic year.

do $$
declare
  conflicting_open_membership_count integer;
  unsupported_lifetime_count integer;
begin
  if to_regclass('public.memberships') is null
    or to_regclass('public.officer_positions') is null
    or to_regclass('public.academic_years') is null then
    raise exception 'Expected membership, officer-position, and academic-year tables are missing';
  end if;

  if to_regprocedure('public.claim_membership_register_key(text,uuid)') is null then
    raise exception 'Expected function public.claim_membership_register_key(text,uuid) is missing';
  end if;

  if to_regclass('public.memberships_one_active_annual_per_year_idx') is null
    or to_regclass('public.memberships_one_active_lifetime_idx') is null then
    raise exception 'Expected legacy membership uniqueness indexes are missing';
  end if;

  if to_regclass('public.memberships_one_open_per_user_year_idx') is not null then
    raise exception 'Target membership uniqueness index already exists';
  end if;

  select count(*) into conflicting_open_membership_count
  from (
    select user_id, academic_year_id
    from public.memberships
    where status in (
      'pending'::public.merbership_status,
      'active'::public.merbership_status,
      'suspended'::public.merbership_status
    )
    group by user_id, academic_year_id
    having count(*) > 1
  ) as conflicts;

  if conflicting_open_membership_count > 0 then
    raise exception 'Cannot enforce one open membership per user and academic year: % conflicts found', conflicting_open_membership_count;
  end if;

  select count(*) into unsupported_lifetime_count
  from public.memberships as membership
  where membership.type = 'lifetime'::public.merbership_type
    and not exists (
      select 1
      from public.officer_positions as officer
      join public.academic_years as officer_year
        on officer_year.id = officer.academic_year_id
      join public.academic_years as membership_year
        on membership_year.id = membership.academic_year_id
      where officer.user_id = membership.user_id
        and officer_year.start_date <= membership_year.start_date
    );

  if unsupported_lifetime_count > 0 then
    raise exception 'Cannot derive % existing lifetime memberships from officer history', unsupported_lifetime_count;
  end if;
end;
$$;

drop index public.memberships_one_active_annual_per_year_idx;
drop index public.memberships_one_active_lifetime_idx;

create unique index memberships_one_open_per_user_year_idx
  on public.memberships (user_id, academic_year_id)
  where status in (
    'pending'::public.merbership_status,
    'active'::public.merbership_status,
    'suspended'::public.merbership_status
  );

create function public.recompute_membership_types_for_user(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.memberships as membership
  set type = case
    when exists (
      select 1
      from public.officer_positions as officer
      join public.academic_years as officer_year
        on officer_year.id = officer.academic_year_id
      join public.academic_years as membership_year
        on membership_year.id = membership.academic_year_id
      where officer.user_id = membership.user_id
        and officer_year.start_date <= membership_year.start_date
    ) then 'lifetime'::public.merbership_type
    else 'annual'::public.merbership_type
  end
  where membership.user_id = p_user_id;
end;
$$;

revoke all privileges on function public.recompute_membership_types_for_user(uuid)
  from public, anon, authenticated, service_role;

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
  from public.membership_register_keys
  where register_key = upper(trim(p_register_key))
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
    from public.academic_years
    where id = v_key.academic_year_id
      and is_current = true
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
    from public.memberships
    where user_id = p_user_id
      and academic_year_id = v_key.academic_year_id
      and status in (
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

    update public.membership_register_keys
    set status = 'claimed'::public.membership_register_key_status,
        claimed_at = v_now
    where id = v_key.id;
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

create function public.create_admin_membership(
  p_user_id uuid,
  p_academic_year_id uuid,
  p_status public.merbership_status,
  p_joined_at timestamptz
)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.memberships%rowtype;
  v_type public.merbership_type;
begin
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'MEMBERSHIP_USER_NOT_FOUND';
  end if;

  if not exists (select 1 from public.academic_years where id = p_academic_year_id) then
    raise exception using errcode = 'P0001', message = 'MEMBERSHIP_ACADEMIC_YEAR_NOT_FOUND';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('membership_officer:' || p_user_id::text)
  );

  select case when exists (
    select 1
    from public.officer_positions as officer
    join public.academic_years as officer_year
      on officer_year.id = officer.academic_year_id
    join public.academic_years as membership_year
      on membership_year.id = p_academic_year_id
    where officer.user_id = p_user_id
      and officer_year.start_date <= membership_year.start_date
  ) then 'lifetime'::public.merbership_type
  else 'annual'::public.merbership_type
  end into v_type;

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
    p_academic_year_id,
    p_status,
    coalesce(p_joined_at, now()),
    null
  )
  returning * into v_membership;

  return v_membership;
end;
$$;

create function public.update_admin_membership(
  p_membership_id uuid,
  p_academic_year_id uuid,
  p_status public.merbership_status,
  p_joined_at timestamptz
)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.memberships%rowtype;
begin
  select *
  into v_membership
  from public.memberships
  where id = p_membership_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'MEMBERSHIP_NOT_FOUND';
  end if;

  if not exists (select 1 from public.academic_years where id = p_academic_year_id) then
    raise exception using errcode = 'P0001', message = 'MEMBERSHIP_ACADEMIC_YEAR_NOT_FOUND';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('membership_officer:' || v_membership.user_id::text)
  );

  update public.memberships
  set academic_year_id = p_academic_year_id,
      status = p_status,
      joined_at = coalesce(p_joined_at, v_membership.joined_at)
  where id = p_membership_id
  returning * into v_membership;

  perform public.recompute_membership_types_for_user(v_membership.user_id);

  select *
  into v_membership
  from public.memberships
  where id = p_membership_id;

  return v_membership;
end;
$$;

revoke all privileges on function public.claim_membership_register_key(text, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.create_admin_membership(uuid, uuid, public.merbership_status, timestamptz)
  from public, anon, authenticated;
revoke all privileges on function public.update_admin_membership(uuid, uuid, public.merbership_status, timestamptz)
  from public, anon, authenticated;

grant execute on function public.claim_membership_register_key(text, uuid) to service_role;
grant execute on function public.create_admin_membership(uuid, uuid, public.merbership_status, timestamptz) to service_role;
grant execute on function public.update_admin_membership(uuid, uuid, public.merbership_status, timestamptz) to service_role;
