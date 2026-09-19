-- Phase 1B: serialize current-year changes and enforce at most one current year.

do $$
declare
  current_year_count integer;
begin
  if to_regclass('public.academic_years') is null then
    raise exception 'Expected table public.academic_years is missing';
  end if;

  if to_regclass('public.academic_years_one_current_year_idx') is not null
    and not exists (
      select 1
      from pg_catalog.pg_index as index_
      join pg_catalog.pg_class as index_relation
        on index_relation.oid = index_.indexrelid
      join pg_catalog.pg_am as access_method
        on access_method.oid = index_relation.relam
      where index_.indexrelid = 'public.academic_years_one_current_year_idx'::regclass
        and index_.indrelid = 'public.academic_years'::regclass
        and index_.indisunique
        and index_.indisvalid
        and index_.indisready
        and index_.indnkeyatts = 1
        and index_.indnatts = 1
        and index_.indexprs is null
        and pg_catalog.pg_get_indexdef(index_.indexrelid, 1, true) = 'is_current'
        and pg_catalog.pg_get_expr(index_.indpred, index_.indrelid, true) = 'is_current = true'
        and access_method.amname = 'btree'
    ) then
    raise exception 'Index public.academic_years_one_current_year_idx has an unexpected definition';
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

create unique index if not exists academic_years_one_current_year_idx
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
