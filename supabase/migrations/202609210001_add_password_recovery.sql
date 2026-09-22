-- Password recovery is separate from email ownership verification.
create table public.password_recovery_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint password_recovery_token_hash_check check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint password_recovery_expiry_check check (expires_at > created_at)
);

create index password_recovery_tokens_user_created_idx
  on public.password_recovery_tokens(user_id, created_at desc);

alter table public.password_recovery_tokens enable row level security;
revoke all privileges on table public.password_recovery_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.password_recovery_tokens to service_role;

create function public.issue_password_recovery_token(
  p_user_id uuid, p_token_hash text, p_expires_at timestamptz
) returns text language plpgsql security definer set search_path = '' as $$
declare v_latest timestamptz;
begin
  perform 1 from public.users u where u.id = p_user_id and u.closed_at is null for update;
  if not found or not exists (
    select 1 from public.auth_credentials c where c.user_id = p_user_id
  ) then return 'ineligible'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at <= now() or p_expires_at > now() + interval '60 minutes 1 minute'
  then raise check_violation using message = 'Invalid password recovery token parameters'; end if;

  select max(created_at) into v_latest
  from public.password_recovery_tokens where user_id = p_user_id;
  if v_latest > now() - interval '60 seconds' then return 'cooldown'; end if;

  update public.password_recovery_tokens set consumed_at = now()
  where user_id = p_user_id and consumed_at is null;
  insert into public.password_recovery_tokens(user_id, token_hash, expires_at)
  values (p_user_id, p_token_hash, p_expires_at);
  return 'issued';
end; $$;

create function public.consume_password_recovery_token(
  p_token_hash text, p_password_hash text
) returns text language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid;
begin
  -- Lock users before tokens/credentials, matching issue and account closure.
  select t.user_id into v_user_id from public.password_recovery_tokens t
  where t.token_hash = p_token_hash;
  if not found then return 'invalid'; end if;
  perform 1 from public.users u where u.id = v_user_id and u.closed_at is null for update;
  if not found then return 'invalid'; end if;
  perform 1 from public.password_recovery_tokens t where t.token_hash = p_token_hash
    and t.user_id = v_user_id and t.consumed_at is null and t.expires_at > now()
    for update;
  if not found then return 'invalid'; end if;
  if p_password_hash is null or p_password_hash !~ '^\$argon2id\$' then
    raise check_violation using message = 'Invalid password hash';
  end if;
  update public.auth_credentials set password_hash = p_password_hash
  where user_id = v_user_id;
  if not found then return 'invalid'; end if;
  update public.password_recovery_tokens set consumed_at = now()
  where user_id = v_user_id and consumed_at is null;
  delete from public.sessions where user_id = v_user_id;
  return 'reset';
end; $$;

create function public.inspect_password_recovery_token(p_token_hash text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.password_recovery_tokens t
    join public.users u on u.id = t.user_id
    join public.auth_credentials c on c.user_id = u.id
    where t.token_hash = p_token_hash and t.consumed_at is null
      and t.expires_at > now() and u.closed_at is null
  );
$$;

revoke all privileges on function public.issue_password_recovery_token(uuid,text,timestamptz)
  from public, anon, authenticated;
revoke all privileges on function public.consume_password_recovery_token(text,text)
  from public, anon, authenticated;
revoke all privileges on function public.inspect_password_recovery_token(text)
  from public, anon, authenticated;
grant execute on function public.issue_password_recovery_token(uuid,text,timestamptz)
  to service_role;
grant execute on function public.consume_password_recovery_token(text,text)
  to service_role;
grant execute on function public.inspect_password_recovery_token(text)
  to service_role;
