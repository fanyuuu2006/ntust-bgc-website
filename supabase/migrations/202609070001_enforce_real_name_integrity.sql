-- Phase 2J-B1: real names are required identity data and may not be blank.

do $$
begin
  if to_regclass('public.user_profiles') is null then
    raise exception 'Expected table public.user_profiles is missing';
  end if;

  if exists (
    select 1
    from public.user_profiles
    where real_name is null or btrim(real_name) = ''
  ) then
    raise exception 'Cannot enforce real-name integrity while blank values exist';
  end if;
end;
$$;

alter table public.user_profiles
  add constraint user_profiles_real_name_nonempty_check
  check (btrim(real_name) <> '');
