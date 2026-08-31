-- Phase 1B: serialize current-year changes and enforce at most one current year.

do $$
declare
  current_year_count integer;
begin
  if to_regclass('public.academic_years') is null then
    raise exception 'Expected table public.academic_years is missing';
  end if;

  if to_regclass('public.academic_years_one_current_year_idx') is not null then
    raise exception 'Index public.academic_years_one_current_year_idx already exists';
  end if;

  if to_regprocedure('public.set_current_academic_year(uuid)') is not null then
    raise exception 'Function public.set_current_academic_year(uuid) already exists';
  end if;

  select count(*)
  into current_year_count
  from public.academic_years
  where is_current = true;

  if current_year_count > 1 then
    raise exception 'Cannot enforce one current academic year: % current rows exist', current_year_count;
  end if;
end;
$$;

create unique index academic_years_one_current_year_idx
  on public.academic_years ((is_current))
  where is_current = true;

create function public.set_current_academic_year(
  p_academic_year_id uuid
)
returns public.academic_years
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_year public.academic_years%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('academic_years:set_current')
  );

  select *
  into target_year
  from public.academic_years
  where id = p_academic_year_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ACADEMIC_YEAR_NOT_FOUND';
  end if;

  if target_year.is_current then
    return target_year;
  end if;

  update public.academic_years
  set is_current = false
  where is_current = true;

  update public.academic_years
  set is_current = true
  where id = target_year.id
  returning * into target_year;

  return target_year;
end;
$$;

revoke all privileges on function public.set_current_academic_year(uuid)
  from public, anon, authenticated;
grant execute on function public.set_current_academic_year(uuid) to service_role;
