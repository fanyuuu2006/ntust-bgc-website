-- Academic Year boundaries are inclusive calendar dates, not instants.
-- The explicit mapping below is the reviewed normalization of the complete
-- Production dataset. Abort rather than infer if any audited row changed.

do $$
declare
  mismatch_count integer;
begin
  with expected(id, year, start_date, end_date) as (
    values
      ('5a289639-49df-4b45-83ee-d4b2a8e8379b'::uuid, '101', '2012-09-03 00:00:00+00'::timestamptz, '2013-09-01 00:00:00+00'::timestamptz),
      ('3bc43a3c-916e-4518-a1ec-41294374149b'::uuid, '111', '2022-09-05 00:00:00+00'::timestamptz, '2023-09-03 00:00:00+00'::timestamptz),
      ('2ab6021e-14d6-46d9-b473-686c408a13cd'::uuid, '112', '2023-09-04 00:00:00+00'::timestamptz, '2024-09-01 00:00:00+00'::timestamptz),
      ('c7bcc771-0252-412a-b94a-f9b0afe42a67'::uuid, '113', '2024-09-01 16:00:00+00'::timestamptz, '2025-08-31 15:59:59+00'::timestamptz),
      ('670e8d27-ecca-40ee-b3eb-5e14d0f2d91f'::uuid, '114', '2025-08-31 16:00:00+00'::timestamptz, '2026-09-06 15:59:59+00'::timestamptz),
      ('896618cc-84b0-4f2c-8375-11b12264a1b7'::uuid, '115', '2026-09-07 00:00:00+00'::timestamptz, '2027-09-05 00:00:00+00'::timestamptz)
  )
  select count(*) into mismatch_count
  from expected
  full outer join public.academic_years actual using (id)
  where expected.id is null
     or actual.id is null
     or expected.year is distinct from actual.year
     or expected.start_date is distinct from actual.start_date
     or expected.end_date is distinct from actual.end_date;

  if mismatch_count <> 0 then
    raise exception using errcode = 'P0001', message = 'ACADEMIC_YEAR_PREFLIGHT_MISMATCH';
  end if;

  if to_regprocedure('public.update_academic_year(uuid, text, timestamp with time zone, timestamp with time zone)') is null then
    raise exception using errcode = 'P0001', message = 'ACADEMIC_YEAR_UPDATE_RPC_MISSING';
  end if;
end;
$$;

drop function public.update_academic_year(uuid, text, timestamptz, timestamptz);

alter table public.academic_years
  add column start_date_date date,
  add column end_date_date date;

update public.academic_years
set start_date_date = cast(case year
      when '101' then '2012-09-03'
      when '111' then '2022-09-05'
      when '112' then '2023-09-04'
      when '113' then '2024-09-02'
      when '114' then '2025-09-01'
      when '115' then '2026-09-07'
    end as date),
    end_date_date = cast(case year
      when '101' then '2013-09-01'
      when '111' then '2023-09-03'
      when '112' then '2024-09-01'
      when '113' then '2025-08-31'
      when '114' then '2026-09-06'
      when '115' then '2027-09-05'
    end as date);

do $$
begin
  if exists (
    select 1 from public.academic_years
    where start_date_date is null
       or end_date_date is null
       or start_date_date >= end_date_date
  ) then
    raise exception using errcode = 'P0001', message = 'ACADEMIC_YEAR_NORMALIZATION_INVALID';
  end if;
end;
$$;

alter table public.academic_years
  drop column start_date,
  drop column end_date;

alter table public.academic_years
  rename column start_date_date to start_date;
alter table public.academic_years
  rename column end_date_date to end_date;

alter table public.academic_years
  alter column start_date set not null,
  alter column end_date set not null,
  add constraint academic_years_date_range_check check (start_date < end_date);

create function public.update_academic_year(
  p_academic_year_id uuid,
  p_year text,
  p_start_date date,
  p_end_date date
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

  select * into v_academic_year
  from public.academic_years
  where id = p_academic_year_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ACADEMIC_YEAR_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.academic_years
    where year = trim(p_year) and id <> p_academic_year_id
  ) then
    raise exception using errcode = 'P0001', message = 'ACADEMIC_YEAR_DUPLICATE';
  end if;

  update public.academic_years
  set year = trim(p_year), start_date = p_start_date, end_date = p_end_date
  where id = p_academic_year_id
  returning * into v_academic_year;

  for v_user_id in
    select distinct affected.user_id
    from (
      select user_id from public.officer_positions where academic_year_id = p_academic_year_id
      union
      select user_id from public.memberships where academic_year_id = p_academic_year_id
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

revoke all privileges on function public.update_academic_year(uuid, text, date, date)
  from public, anon, authenticated;
grant execute on function public.update_academic_year(uuid, text, date, date)
  to service_role;
