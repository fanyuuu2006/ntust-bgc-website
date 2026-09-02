-- Keep Academic Year date edits atomic with the persisted Membership type cache.
-- Membership type is derived from officer-year and membership-year start dates.

do $$
begin
  if to_regprocedure('public.recompute_membership_types_for_user(uuid)') is null then
    raise exception 'Expected function public.recompute_membership_types_for_user(uuid) is missing';
  end if;

  if to_regprocedure('public.update_academic_year(uuid, text, timestamp with time zone, timestamp with time zone)') is not null then
    raise exception 'Function public.update_academic_year(uuid, text, timestamptz, timestamptz) already exists';
  end if;
end;
$$;

create function public.update_academic_year(
  p_academic_year_id uuid,
  p_year text,
  p_start_date timestamptz,
  p_end_date timestamptz
)
returns public.academic_years
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academic_year public.academic_years%rowtype;
  v_user_id uuid;
begin
  if p_start_date >= p_end_date then
    raise exception using errcode = 'P0001', message = 'ACADEMIC_YEAR_DATE_RANGE_INVALID';
  end if;

  select *
  into v_academic_year
  from public.academic_years
  where id = p_academic_year_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ACADEMIC_YEAR_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.academic_years
    where year = trim(p_year)
      and id <> p_academic_year_id
  ) then
    raise exception using errcode = 'P0001', message = 'ACADEMIC_YEAR_DUPLICATE';
  end if;

  update public.academic_years
  set year = trim(p_year),
      start_date = p_start_date,
      end_date = p_end_date
  where id = p_academic_year_id
  returning * into v_academic_year;

  -- A changed year can be the officer year for a user's later memberships,
  -- or the membership year compared against any of that user's officer history.
  for v_user_id in
    select distinct affected.user_id
    from (
      select user_id
      from public.officer_positions
      where academic_year_id = p_academic_year_id

      union

      select user_id
      from public.memberships
      where academic_year_id = p_academic_year_id
    ) as affected
    order by affected.user_id
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('membership_officer:' || v_user_id::text)
    );
    perform public.recompute_membership_types_for_user(v_user_id);
  end loop;

  return v_academic_year;
end;
$$;

revoke all privileges on function public.update_academic_year(uuid, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.update_academic_year(uuid, text, timestamptz, timestamptz)
  to service_role;
