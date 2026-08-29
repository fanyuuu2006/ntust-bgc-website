-- Read-only structural verification for canonical-public-schema.sql.
-- Run after applying the snapshot to a new database. Compare the result with
-- the verified remote metadata exports; this script never changes database state.

begin read only;

select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_schema,
  udt_name,
  is_nullable,
  column_default,
  is_identity,
  identity_generation
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

select
  relation.relname as table_name,
  constraint_.conname as constraint_name,
  constraint_.contype as constraint_type,
  pg_get_constraintdef(constraint_.oid) as definition
from pg_constraint constraint_
join pg_class relation on relation.oid = constraint_.conrelid
join pg_namespace namespace_ on namespace_.oid = relation.relnamespace
where namespace_.nspname = 'public'
  and constraint_.contype in ('p', 'f', 'u', 'c')
order by relation.relname, constraint_.conname;

select tablename as table_name, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

select
  type_namespace.nspname as enum_schema,
  type_.typname as enum_name,
  enum_.enumlabel as enum_value,
  enum_.enumsortorder
from pg_type type_
join pg_namespace type_namespace on type_namespace.oid = type_.typnamespace
join pg_enum enum_ on enum_.enumtypid = type_.oid
where type_namespace.nspname = 'public'
order by type_.typname, enum_.enumsortorder;

select
  relation.relname as table_name,
  relation.relrowsecurity as rls_enabled,
  relation.relforcerowsecurity as rls_forced
from pg_class relation
join pg_namespace namespace_ on namespace_.oid = relation.relnamespace
where namespace_.nspname = 'public'
  and relation.relkind = 'r'
order by relation.relname;

select *
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select
  routine_namespace.nspname as schema_name,
  routine.proname as function_name,
  pg_get_function_identity_arguments(routine.oid) as arguments,
  pg_get_function_result(routine.oid) as return_type,
  pg_get_userbyid(routine.proowner) as owner,
  routine.prosecdef as security_definer,
  routine.proconfig as function_config,
  routine.proacl as execute_acl,
  pg_get_functiondef(routine.oid) as full_definition
from pg_proc routine
join pg_namespace routine_namespace on routine_namespace.oid = routine.pronamespace
where routine_namespace.nspname = 'public'
order by routine.proname, arguments;

select
  relation.relname as table_name,
  trigger_.tgname as trigger_name,
  trigger_.tgenabled as enabled_state,
  pg_get_triggerdef(trigger_.oid) as trigger_definition,
  routine.proname as function_name
from pg_trigger trigger_
join pg_class relation on relation.oid = trigger_.tgrelid
join pg_namespace namespace_ on namespace_.oid = relation.relnamespace
join pg_proc routine on routine.oid = trigger_.tgfoid
where namespace_.nspname = 'public'
  and not trigger_.tgisinternal
order by relation.relname, trigger_.tgname;

select
  extension_.extname as extension_name,
  extension_.extversion as installed_version,
  namespace_.nspname as installed_schema
from pg_extension extension_
join pg_namespace namespace_ on namespace_.oid = extension_.extnamespace
order by extension_.extname;

commit;
