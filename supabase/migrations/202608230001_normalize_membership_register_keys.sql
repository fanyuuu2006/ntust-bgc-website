-- Normalize membership register keys into their own domain table.
-- memberships = actual user membership.
-- membership_register_keys = credential that can create one membership.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'membership_register_key_status'
  ) then
    create type membership_register_key_status as enum (
      'available',
      'claimed',
      'revoked',
      'expired'
    );
  end if;
end $$;

create table if not exists membership_register_keys (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years(id) on delete restrict,
  sequence_number integer not null check (sequence_number > 0),
  register_key text not null,
  status membership_register_key_status not null default 'available',
  created_by_user_id uuid null references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz null,
  revoked_at timestamptz null,
  constraint membership_register_keys_register_key_key unique (register_key),
  constraint membership_register_keys_year_sequence_key unique (
    academic_year_id,
    sequence_number
  ),
  constraint membership_register_keys_status_timestamps_check check (
    (status = 'claimed' and claimed_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null and claimed_at is null)
    or (status in ('available', 'expired') and claimed_at is null and revoked_at is null)
  )
);

create index if not exists membership_register_keys_year_status_created_idx
  on membership_register_keys (academic_year_id, status, created_at desc);

create index if not exists membership_register_keys_created_by_user_id_idx
  on membership_register_keys (created_by_user_id)
  where created_by_user_id is not null;

alter table memberships
  add column if not exists membership_register_key_id uuid null
    references membership_register_keys(id) on delete set null;

-- Backfill register-key rows from the old memberships.register_key source.
-- This block is intentionally conditional so the migration can be re-run after
-- memberships.register_key has already been removed.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'memberships'
      and column_name = 'register_key'
  ) then
    insert into membership_register_keys (
      academic_year_id,
      sequence_number,
      register_key,
      status,
      created_at,
      updated_at,
      claimed_at
    )
    select
      source.academic_year_id,
      source.sequence_number,
      source.register_key,
      case
        when source.user_id is null and source.status = 'pending' then 'available'::membership_register_key_status
        else 'claimed'::membership_register_key_status
      end as status,
      source.created_at,
      source.updated_at,
      case
        when source.user_id is null and source.status = 'pending' then null
        else coalesce(source.joined_at, source.updated_at, source.created_at)
      end as claimed_at
    from (
      select
        memberships.*,
        coalesce(
          nullif(substring(memberships.register_key from 'NTUSTBGC([0-9]+)'), '')::integer,
          row_number() over (
            partition by memberships.academic_year_id
            order by memberships.created_at, memberships.id
          )::integer
        ) as sequence_number
      from memberships
      where memberships.register_key is not null
    ) as source
    on conflict (register_key) do nothing;

    update memberships
    set membership_register_key_id = membership_register_keys.id
    from membership_register_keys
    where memberships.register_key = membership_register_keys.register_key
      and memberships.user_id is not null;

    -- Old placeholder rows represented unused keys, not memberships.
    delete from memberships
    where user_id is null
      and status = 'pending'
      and register_key is not null;
  end if;
end $$;

create unique index if not exists memberships_register_key_id_unique_idx
  on memberships (membership_register_key_id)
  where membership_register_key_id is not null;

create unique index if not exists memberships_one_active_annual_per_year_idx
  on memberships (user_id, academic_year_id)
  where user_id is not null
    and type = 'annual'
    and status in ('pending', 'active', 'suspended');

create unique index if not exists memberships_one_active_lifetime_idx
  on memberships (user_id)
  where user_id is not null
    and type = 'lifetime'
    and status in ('pending', 'active', 'suspended');

alter table memberships
  drop column if exists register_key;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_membership_register_keys_updated_at
  on membership_register_keys;

create trigger set_membership_register_keys_updated_at
before update on membership_register_keys
for each row
execute function set_updated_at();

create or replace function generate_membership_register_keys(
  p_academic_year_id uuid,
  p_count integer,
  p_secret text,
  p_created_by_user_id uuid
)
returns setof membership_register_keys
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_academic_year academic_years%rowtype;
  v_start_sequence integer;
  v_sequence integer;
  v_register_key text;
  v_digest text;
  v_row membership_register_keys%rowtype;
begin
  if p_count < 1 or p_count > 100 then
    raise exception 'INVALID_COUNT';
  end if;

  if p_secret is null or length(trim(p_secret)) < 16 then
    raise exception 'REGISTER_KEY_SECRET_NOT_CONFIGURED';
  end if;

  select *
  into v_academic_year
  from academic_years
  where id = p_academic_year_id;

  if not found then
    raise exception 'ACADEMIC_YEAR_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtext('membership_register_keys:' || p_academic_year_id::text));

  select coalesce(max(sequence_number), 0) + 1
  into v_start_sequence
  from membership_register_keys
  where academic_year_id = p_academic_year_id;

  for v_sequence in v_start_sequence..(v_start_sequence + p_count - 1) loop
    v_digest := upper(
      substring(
        encode(
          hmac(
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

    insert into membership_register_keys (
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
      'available',
      p_created_by_user_id
    )
    returning * into v_row;

    return next v_row;
  end loop;
end;
$$;

create or replace function claim_membership_register_key(
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
set search_path = public
as $$
declare
  v_key membership_register_keys%rowtype;
  v_now timestamptz := now();
  v_membership memberships%rowtype;
begin
  select *
  into v_key
  from membership_register_keys
  where register_key = upper(trim(p_register_key))
  for update;

  if not found then
    result := 'not_found';
    return next;
    return;
  end if;

  if not exists (
    select 1
    from academic_years
    where id = v_key.academic_year_id
      and is_current = true
  ) then
    result := 'not_current_year';
    return next;
    return;
  end if;

  if v_key.status <> 'available' then
    result := 'unavailable';
    return next;
    return;
  end if;

  if exists (
    select 1
    from memberships
    where memberships.user_id = p_user_id
      and memberships.type = 'lifetime'
      and memberships.status in ('pending', 'active', 'suspended')
  ) then
    result := 'already_lifetime_member';
    return next;
    return;
  end if;

  if exists (
    select 1
    from memberships
    where memberships.user_id = p_user_id
      and memberships.academic_year_id = v_key.academic_year_id
      and memberships.type = 'annual'
      and memberships.status in ('pending', 'active', 'suspended')
  ) then
    result := 'already_current_member';
    return next;
    return;
  end if;

  begin
    insert into memberships (
      user_id,
      type,
      academic_year_id,
      status,
      joined_at,
      membership_register_key_id
    )
    values (
      p_user_id,
      'annual',
      v_key.academic_year_id,
      'active',
      v_now,
      v_key.id
    )
    returning * into v_membership;

    update membership_register_keys
    set status = 'claimed',
        claimed_at = v_now
    where membership_register_keys.id = v_key.id;
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
