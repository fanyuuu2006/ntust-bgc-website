-- Keep the one-minute clock-skew allowance while using valid PostgreSQL interval syntax.
create or replace function public.issue_password_recovery_token(
  p_user_id uuid, p_token_hash text, p_expires_at timestamptz
) returns text language plpgsql security definer set search_path = '' as $$
declare v_latest timestamptz;
begin
  perform 1 from public.users u where u.id = p_user_id and u.closed_at is null for update;
  if not found or not exists (
    select 1 from public.auth_credentials c where c.user_id = p_user_id
  ) then return 'ineligible'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at <= now() or p_expires_at > now() + interval '61 minutes'
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

revoke all privileges on function public.issue_password_recovery_token(uuid,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.issue_password_recovery_token(uuid,text,timestamptz)
  to service_role;
