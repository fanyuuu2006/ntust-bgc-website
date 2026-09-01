-- Phase 1D: officer-position mutations and the derived membership type cache
-- must share one transaction boundary.

do $$
begin
  if to_regprocedure('public.recompute_membership_types_for_user(uuid)') is null then
    raise exception 'Expected function public.recompute_membership_types_for_user(uuid) is missing';
  end if;
end;
$$;

create function public.create_officer_position(
  p_user_id uuid,
  p_academic_year_id uuid,
  p_title text
)
returns public.officer_positions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_position public.officer_positions%rowtype;
begin
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'OFFICER_USER_NOT_FOUND';
  end if;

  if not exists (select 1 from public.academic_years where id = p_academic_year_id) then
    raise exception using errcode = 'P0001', message = 'OFFICER_ACADEMIC_YEAR_NOT_FOUND';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception using errcode = 'P0001', message = 'OFFICER_TITLE_REQUIRED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('membership_officer:' || p_user_id::text)
  );

  insert into public.officer_positions (user_id, academic_year_id, title)
  values (p_user_id, p_academic_year_id, trim(p_title))
  returning * into v_position;

  perform public.recompute_membership_types_for_user(p_user_id);

  return v_position;
end;
$$;

create function public.update_officer_position(
  p_officer_position_id uuid,
  p_academic_year_id uuid,
  p_title text
)
returns public.officer_positions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_position public.officer_positions%rowtype;
begin
  select *
  into v_position
  from public.officer_positions
  where id = p_officer_position_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'OFFICER_POSITION_NOT_FOUND';
  end if;

  if not exists (select 1 from public.academic_years where id = p_academic_year_id) then
    raise exception using errcode = 'P0001', message = 'OFFICER_ACADEMIC_YEAR_NOT_FOUND';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception using errcode = 'P0001', message = 'OFFICER_TITLE_REQUIRED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('membership_officer:' || v_position.user_id::text)
  );

  update public.officer_positions
  set academic_year_id = p_academic_year_id,
      title = trim(p_title)
  where id = p_officer_position_id
  returning * into v_position;

  perform public.recompute_membership_types_for_user(v_position.user_id);

  return v_position;
end;
$$;

create function public.delete_officer_position(
  p_officer_position_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_position public.officer_positions%rowtype;
begin
  select *
  into v_position
  from public.officer_positions
  where id = p_officer_position_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'OFFICER_POSITION_NOT_FOUND';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('membership_officer:' || v_position.user_id::text)
  );

  delete from public.officer_positions
  where id = p_officer_position_id;

  perform public.recompute_membership_types_for_user(v_position.user_id);
end;
$$;

revoke all privileges on function public.create_officer_position(uuid, uuid, text)
  from public, anon, authenticated;
revoke all privileges on function public.update_officer_position(uuid, uuid, text)
  from public, anon, authenticated;
revoke all privileges on function public.delete_officer_position(uuid)
  from public, anon, authenticated;

grant execute on function public.create_officer_position(uuid, uuid, text) to service_role;
grant execute on function public.update_officer_position(uuid, uuid, text) to service_role;
grant execute on function public.delete_officer_position(uuid) to service_role;
