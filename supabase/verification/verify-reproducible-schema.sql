\set ON_ERROR_STOP on

do $$
declare
  missing text;
begin
  select string_agg(name, ', ' order by name) into missing
  from (values
    ('public.users'), ('public.user_profiles'), ('public.academic_years'),
    ('public.memberships'), ('public.membership_register_keys'),
    ('public.officer_positions'), ('public.board_games'),
    ('public.board_game_borrowings'), ('public.board_game_reviews'),
    ('public.events'), ('public.event_attendances'), ('public.sessions')
  ) required(name)
  where to_regclass(name) is null;
  if missing is not null then raise exception 'Missing required tables: %', missing; end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='membership_register_keys'
      and c.relrowsecurity and not c.relforcerowsecurity
  ) then raise exception 'membership_register_keys RLS invariant missing'; end if;

  if exists (select 1 from pg_policies where schemaname='public' and tablename='membership_register_keys') then
    raise exception 'membership_register_keys must not expose browser RLS policies';
  end if;

  if to_regprocedure('public.claim_membership_register_key(text,uuid)') is null
     or to_regprocedure('public.generate_membership_register_keys(uuid,integer,text,uuid)') is null then
    raise exception 'Required register-key RPC missing';
  end if;

  if not has_function_privilege('service_role', 'public.claim_membership_register_key(text,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.claim_membership_register_key(text,uuid)', 'EXECUTE') then
    raise exception 'Register-key RPC execute ACL invariant missing';
  end if;

  if to_regclass('public.board_games_with_statistics') is null
     or to_regclass('public.board_game_popularity_statistics') is null
     or to_regclass('public.board_game_review_statistics') is null then
    raise exception 'Required statistics view missing';
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='membership_register_key_status') then
    raise exception 'Required enum missing';
  end if;

  if (select count(*) from storage.buckets where id in ('avatars','rich-content-images','board-game-images')) <> 3 then
    raise exception 'Required Storage bucket declarations missing';
  end if;

  if exists (
    select 1 from storage.buckets
    where (id='avatars' and (not public or file_size_limit<>2097152 or allowed_mime_types<>array['image/jpeg','image/png','image/webp']))
       or (id in ('rich-content-images','board-game-images') and (not public or file_size_limit<>4194304 or allowed_mime_types<>array['image/jpeg','image/png','image/webp']))
  ) then raise exception 'Storage bucket configuration mismatch'; end if;
end $$;

select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 1;