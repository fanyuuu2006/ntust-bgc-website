-- Run with psql using ON_ERROR_STOP. This fixture is rollback-only.
begin;

do $$
declare
  v_suffix text := txid_current()::text;
  v_officer_user_id uuid;
  v_membership_user_id uuid;
  v_officer_year_id uuid;
  v_officer_membership_year_id uuid;
  v_membership_officer_year_id uuid;
  v_membership_year_id uuid;
  v_type public.merbership_type;
begin
  -- Case A: moving an officer year after a later Membership removes lifetime eligibility.
  insert into public.users (name, email)
  values ('Academic year verification officer', 'verification-officer-' || v_suffix || '@example.invalid')
  returning id into v_officer_user_id;

  insert into public.academic_years (year, start_date, end_date, is_current)
  values ('verification-officer-' || v_suffix, '2027-01-01 00:00:00+00', '2030-12-31 23:59:59+00', false)
  returning id into v_officer_year_id;
  insert into public.academic_years (year, start_date, end_date, is_current)
  values ('verification-officer-membership-' || v_suffix, '2028-01-01 00:00:00+00', '2031-12-31 23:59:59+00', false)
  returning id into v_officer_membership_year_id;

  insert into public.officer_positions (user_id, academic_year_id, title)
  values (v_officer_user_id, v_officer_year_id, 'Verification officer');
  insert into public.memberships (user_id, academic_year_id, type, status, joined_at)
  values (v_officer_user_id, v_officer_membership_year_id, 'lifetime', 'active', now());

  perform public.update_academic_year(
    v_officer_year_id,
    'verification-officer-' || v_suffix,
    '2029-01-01 00:00:00+00',
    '2030-12-31 23:59:59+00'
  );

  select type into v_type
  from public.memberships
  where user_id = v_officer_user_id and academic_year_id = v_officer_membership_year_id;
  if v_type <> 'annual'::public.merbership_type then
    raise exception 'Case A failed: expected annual, got %', v_type;
  end if;

  -- Case B: moving a Membership year before prior officer history removes lifetime eligibility.
  insert into public.users (name, email)
  values ('Academic year verification membership', 'verification-membership-' || v_suffix || '@example.invalid')
  returning id into v_membership_user_id;

  insert into public.academic_years (year, start_date, end_date, is_current)
  values ('verification-membership-officer-' || v_suffix, '2027-01-01 00:00:00+00', '2030-12-31 23:59:59+00', false)
  returning id into v_membership_officer_year_id;
  insert into public.academic_years (year, start_date, end_date, is_current)
  values ('verification-membership-' || v_suffix, '2028-01-01 00:00:00+00', '2031-12-31 23:59:59+00', false)
  returning id into v_membership_year_id;

  insert into public.officer_positions (user_id, academic_year_id, title)
  values (v_membership_user_id, v_membership_officer_year_id, 'Verification officer');
  insert into public.memberships (user_id, academic_year_id, type, status, joined_at)
  values (v_membership_user_id, v_membership_year_id, 'lifetime', 'active', now());

  perform public.update_academic_year(
    v_membership_year_id,
    'verification-membership-' || v_suffix,
    '2026-01-01 00:00:00+00',
    '2026-12-31 23:59:59+00'
  );

  select type into v_type
  from public.memberships
  where user_id = v_membership_user_id and academic_year_id = v_membership_year_id;
  if v_type <> 'annual'::public.merbership_type then
    raise exception 'Case B failed: expected annual, got %', v_type;
  end if;
end;
$$;

rollback;
