-- Phase 1B: account and required profile creation share one RPC transaction.

do $$
begin
  if to_regprocedure('public.register_user(text,text,text)') is null then
    raise exception 'Expected function public.register_user(text,text,text) is missing';
  end if;

  if to_regprocedure('public.register_user(text,text,text,text,text)') is not null then
    raise exception 'Function public.register_user(text,text,text,text,text) already exists';
  end if;

  if to_regclass('public.users') is null
    or to_regclass('public.auth_credentials') is null
    or to_regclass('public.user_profiles') is null then
    raise exception 'Expected registration tables are missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'user_id'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'real_name'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'phone'
  ) then
    raise exception 'Expected required user_profiles columns are missing';
  end if;
end;
$$;

create function public.register_user(
  p_email text,
  p_name text,
  p_password_hash text,
  p_real_name text,
  p_phone text
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

  insert into public.user_profiles (user_id, real_name, phone)
  values (new_user.id, p_real_name, p_phone);

  return new_user;
end;
$$;

revoke all privileges on function public.register_user(text, text, text)
  from public, anon, authenticated;
drop function public.register_user(text, text, text);

revoke all privileges on function public.register_user(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.register_user(text, text, text, text, text) to service_role;
