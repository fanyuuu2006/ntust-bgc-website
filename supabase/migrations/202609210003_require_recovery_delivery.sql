-- Recovery links are unusable until the transactional email sender reports success.
alter table public.password_recovery_tokens
  add column delivered_at timestamptz;

create function public.activate_password_recovery_token(p_token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.password_recovery_tokens
  set delivered_at = now()
  where token_hash = p_token_hash
    and consumed_at is null
    and expires_at > now()
    and delivered_at is null;
  return found;
end; $$;

create or replace function public.consume_password_recovery_token(
  p_token_hash text, p_password_hash text
) returns text language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid;
begin
  select t.user_id into v_user_id from public.password_recovery_tokens t
  where t.token_hash = p_token_hash;
  if not found then return 'invalid'; end if;
  perform 1 from public.users u where u.id = v_user_id and u.closed_at is null for update;
  if not found then return 'invalid'; end if;
  perform 1 from public.password_recovery_tokens t where t.token_hash = p_token_hash
    and t.user_id = v_user_id and t.delivered_at is not null
    and t.consumed_at is null and t.expires_at > now()
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

create or replace function public.inspect_password_recovery_token(p_token_hash text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.password_recovery_tokens t
    join public.users u on u.id = t.user_id
    join public.auth_credentials c on c.user_id = u.id
    where t.token_hash = p_token_hash and t.delivered_at is not null
      and t.consumed_at is null and t.expires_at > now() and u.closed_at is null
  );
$$;

revoke all privileges on function public.activate_password_recovery_token(text)
  from public, anon, authenticated;
revoke all privileges on function public.consume_password_recovery_token(text,text)
  from public, anon, authenticated;
revoke all privileges on function public.inspect_password_recovery_token(text)
  from public, anon, authenticated;
grant execute on function public.activate_password_recovery_token(text) to service_role;
grant execute on function public.consume_password_recovery_token(text,text) to service_role;
grant execute on function public.inspect_password_recovery_token(text) to service_role;
