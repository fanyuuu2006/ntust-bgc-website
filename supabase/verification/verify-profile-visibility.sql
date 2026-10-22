-- PR Profile Visibility 唯讀驗證；預期全部 PASS。
with checks as (
  select 'enum.values' check_name, array_agg(enum.enumlabel order by enum.enumsortorder) = array['public', 'limited'] passed
  from pg_type type
  join pg_namespace namespace on namespace.oid = type.typnamespace
  join pg_enum enum on enum.enumtypid = type.oid
  where namespace.nspname = 'public' and type.typname = 'profile_visibility'
  union all
  select 'column.default_public', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users'
      and column_name = 'profile_visibility'
      and is_nullable = 'NO'
      and column_default = '''public''::profile_visibility'
  )
  union all
  select 'existing_users.valid_visibility', not exists (
    select 1 from public.users where profile_visibility is null
  )
)
select check_name, case when passed then 'PASS' else 'FAIL' end status
from checks order by check_name;
