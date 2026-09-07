-- Phase 2K-A2: add explicit email ownership state and one-time verification tokens.

alter table public.users
  add column email_verified_at timestamptz;

-- Accounts that predate this feature remain trusted and are not locked out.
update public.users
set email_verified_at = now()
where email_verified_at is null;

create table public.email_verification_tokens (
  id uuid constraint email_verification_tokens_pkey primary key default gen_random_uuid(),
  user_id uuid not null
    references public.users (id)
    on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_verification_tokens_token_hash_key unique (token_hash),
  constraint email_verification_tokens_expiry_check check (expires_at > created_at)
);

create index email_verification_tokens_user_created_idx
  on public.email_verification_tokens (user_id, created_at desc);

alter table public.email_verification_tokens enable row level security;

create function public.issue_email_verification_token(
  p_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_cooldown_before timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_verified_at timestamptz;
  latest_active_created_at timestamptz;
begin
  select email_verified_at
  into target_verified_at
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise foreign_key_violation using message = 'Email verification user does not exist';
  end if;

  if target_verified_at is not null then
    return 'already_verified';
  end if;

  select created_at
  into latest_active_created_at
  from public.email_verification_tokens
  where user_id = p_user_id
    and consumed_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if latest_active_created_at is not null
    and latest_active_created_at > p_cooldown_before then
    return 'cooldown';
  end if;

  update public.email_verification_tokens
  set consumed_at = now()
  where user_id = p_user_id
    and consumed_at is null;

  insert into public.email_verification_tokens (user_id, token_hash, expires_at)
  values (p_user_id, p_token_hash, p_expires_at);

  return 'issued';
end;
$$;

create function public.consume_email_verification_token(p_token_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_token public.email_verification_tokens;
  target_verified_at timestamptz;
begin
  select *
  into target_token
  from public.email_verification_tokens
  where token_hash = p_token_hash
  for update;

  if not found
    or target_token.consumed_at is not null
    or target_token.expires_at <= now() then
    return 'invalid';
  end if;

  select email_verified_at
  into target_verified_at
  from public.users
  where id = target_token.user_id
  for update;

  if not found or target_verified_at is not null then
    update public.email_verification_tokens
    set consumed_at = now()
    where id = target_token.id;
    return 'invalid';
  end if;

  update public.users
  set email_verified_at = now()
  where id = target_token.user_id;

  update public.email_verification_tokens
  set consumed_at = now()
  where id = target_token.id;

  return 'verified';
end;
$$;

revoke all privileges on table public.email_verification_tokens
  from public, anon, authenticated;
grant select, insert, update, delete on table public.email_verification_tokens
  to service_role;

revoke all privileges on function public.issue_email_verification_token(uuid, text, timestamptz, timestamptz)
  from public, anon, authenticated;
revoke all privileges on function public.consume_email_verification_token(text)
  from public, anon, authenticated;
grant execute on function public.issue_email_verification_token(uuid, text, timestamptz, timestamptz)
  to service_role;
grant execute on function public.consume_email_verification_token(text)
  to service_role;
