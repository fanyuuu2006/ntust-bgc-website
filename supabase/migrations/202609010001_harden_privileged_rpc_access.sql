-- Phase 1A: the application invokes these RPCs only through the server-side
-- service-role client. They must not be callable from browser database roles.

do $$
begin
  if to_regprocedure('public.register_user(text,text,text)') is null then
    raise exception 'Expected function public.register_user(text,text,text) is missing';
  end if;

  if to_regprocedure('public.claim_membership_register_key(text,uuid)') is null then
    raise exception 'Expected function public.claim_membership_register_key(text,uuid) is missing';
  end if;

  if to_regprocedure('public.generate_membership_register_keys(uuid,integer,text,uuid)') is null then
    raise exception 'Expected function public.generate_membership_register_keys(uuid,integer,text,uuid) is missing';
  end if;
end;
$$;

create or replace function public.register_user(
  p_email text,
  p_name text,
  p_password_hash text
)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_user public.users;
begin
  insert into public.users (email, name)
  values (p_email, p_name)
  returning * into new_user;

  insert into public.auth_credentials (user_id, password_hash)
  values (new_user.id, p_password_hash);

  return new_user;
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
    where memberships.user_id = p_user_id
      and memberships.type = 'lifetime'::public.merbership_type
      and memberships.status in (
        'pending'::public.merbership_status,
        'active'::public.merbership_status,
        'suspended'::public.merbership_status
      )
  ) then
    result := 'already_lifetime_member';
    return next;
    return;
  end if;

  if exists (
    select 1
    from public.memberships
    where memberships.user_id = p_user_id
      and memberships.academic_year_id = v_key.academic_year_id
      and memberships.type = 'annual'::public.merbership_type
      and memberships.status in (
        'pending'::public.merbership_status,
        'active'::public.merbership_status,
        'suspended'::public.merbership_status
      )
  ) then
    result := 'already_current_member';
    return next;
    return;
  end if;

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
      'annual'::public.merbership_type,
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

create or replace function public.generate_membership_register_keys(
  p_academic_year_id uuid,
  p_count integer,
  p_secret text,
  p_created_by_user_id uuid
)
returns setof public.membership_register_keys
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academic_year public.academic_years%rowtype;
  v_start_sequence integer;
  v_sequence integer;
  v_register_key text;
  v_digest text;
  v_row public.membership_register_keys%rowtype;
begin
  if p_count < 1 or p_count > 100 then
    raise exception 'INVALID_COUNT';
  end if;

  if p_secret is null or length(trim(p_secret)) < 16 then
    raise exception 'REGISTER_KEY_SECRET_NOT_CONFIGURED';
  end if;

  select *
  into v_academic_year
  from public.academic_years
  where id = p_academic_year_id;

  if not found then
    raise exception 'ACADEMIC_YEAR_NOT_FOUND';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('membership_register_keys:' || p_academic_year_id::text)
  );

  select coalesce(max(sequence_number), 0) + 1
  into v_start_sequence
  from public.membership_register_keys
  where academic_year_id = p_academic_year_id;

  for v_sequence in v_start_sequence..(v_start_sequence + p_count - 1) loop
    v_digest := upper(
      substring(
        encode(
          extensions.hmac(
            v_academic_year.year || 'NTUSTBGC' || lpad(v_sequence::text, 3, '0'),
            p_secret,
            'sha256'::text
          ),
          'hex'
        )
        from 1 for 8
      )
    );
    v_register_key := v_academic_year.year || 'NTUSTBGC' || lpad(v_sequence::text, 3, '0') || v_digest;

    insert into public.membership_register_keys (
      academic_year_id,
      sequence_number,
      register_key,
      status,
      created_by_user_id
    )
    values (
      p_academic_year_id,
      v_sequence,
      v_register_key,
      'available'::public.membership_register_key_status,
      p_created_by_user_id
    )
    returning * into v_row;

    return next v_row;
  end loop;
end;
$$;

revoke all privileges on function public.register_user(text, text, text)
  from public, anon, authenticated;
revoke all privileges on function public.claim_membership_register_key(text, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.generate_membership_register_keys(uuid, integer, text, uuid)
  from public, anon, authenticated;

grant execute on function public.register_user(text, text, text) to service_role;
grant execute on function public.claim_membership_register_key(text, uuid) to service_role;
grant execute on function public.generate_membership_register_keys(uuid, integer, text, uuid) to service_role;
