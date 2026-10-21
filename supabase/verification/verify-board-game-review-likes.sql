-- PR #40 review likes catalog verification. Read-only; no RPC is invoked.
begin read only;

with expected_functions(signature) as (
  values
    ('public.set_board_game_review_like(uuid,uuid,uuid,boolean)'),
    ('public.list_public_board_game_reviews(uuid,uuid,text,smallint,text,integer,integer)')
), function_metadata as (
  select expected.signature, proc.oid, proc.prosecdef, proc.proconfig,
    pg_get_function_result(proc.oid) as return_type
  from expected_functions as expected
  left join pg_proc as proc on proc.oid = to_regprocedure(expected.signature)
)
select signature,
  case when oid is null then 'MISSING' else 'PASS' end as exists_status,
  return_type,
  prosecdef as security_definer,
  proconfig as function_settings,
  case when oid is null then null else has_function_privilege('service_role', oid, 'EXECUTE') end as service_role_execute,
  case when oid is null then null else has_function_privilege('anon', oid, 'EXECUTE') end as anon_execute,
  case when oid is null then null else has_function_privilege('authenticated', oid, 'EXECUTE') end as authenticated_execute,
  case when oid is null then null else exists (
    select 1 from pg_proc as target,
      lateral aclexplode(coalesce(target.proacl, acldefault('f', target.proowner))) as acl
    where target.oid = function_metadata.oid and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
  ) end as public_execute
from function_metadata
order by signature;

with relation_metadata as (
  select class.oid, class.relrowsecurity, class.relforcerowsecurity
  from (values (to_regclass('public.board_game_review_likes'))) as expected(oid)
  left join pg_class as class on class.oid = expected.oid
)
select 'public.board_game_review_likes' as relation,
  case when metadata.oid is null then 'MISSING' else 'PASS' end as exists_status,
  metadata.relrowsecurity as rls_enabled,
  metadata.relforcerowsecurity as rls_forced,
  case when metadata.oid is null then null else has_table_privilege('service_role', metadata.oid, 'SELECT') end as service_role_select,
  case when metadata.oid is null then null else has_table_privilege('service_role', metadata.oid, 'INSERT') end as service_role_insert,
  case when metadata.oid is null then null else has_table_privilege('service_role', metadata.oid, 'DELETE') end as service_role_delete,
  case when metadata.oid is null then null else has_table_privilege('anon', metadata.oid, 'SELECT, INSERT, DELETE') end as anon_access,
  case when metadata.oid is null then null else has_table_privilege('authenticated', metadata.oid, 'SELECT, INSERT, DELETE') end as authenticated_access,
  case when class.oid is null then null else exists (
    select 1
    from pg_class as class,
      lateral aclexplode(coalesce(class.relacl, acldefault('r', class.relowner))) as acl
    where class.oid = metadata.oid
      and acl.grantee = 0
  ) end as public_access,
  case when metadata.oid is null then null else (
    select count(*)
    from pg_policy as policy
    where policy.polrelid = metadata.oid
  ) end as policy_count
from relation_metadata as metadata
left join pg_class as class on class.oid = metadata.oid;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'board_game_review_likes'
order by ordinal_position;

select constraint_record.conname as constraint_name,
  case constraint_record.contype when 'p' then 'PRIMARY KEY' when 'f' then 'FOREIGN KEY' else constraint_record.contype::text end as constraint_type,
  pg_get_constraintdef(constraint_record.oid) as definition,
  case when constraint_record.contype = 'f' then constraint_record.confdeltype = 'c' else null end as delete_cascade
from pg_constraint as constraint_record
where constraint_record.conrelid = 'public.board_game_review_likes'::regclass
order by constraint_record.conname;

select index_record.indexname,
  index_record.indexdef,
  postgres_index.indisunique,
  postgres_index.indisvalid
from pg_indexes as index_record
join pg_class as index_class on index_class.relname = index_record.indexname
join pg_namespace as index_namespace on index_namespace.oid = index_class.relnamespace
join pg_index as postgres_index on postgres_index.indexrelid = index_class.oid
where index_record.schemaname = 'public'
  and index_record.tablename = 'board_game_review_likes'
  and index_namespace.nspname = 'public'
order by index_record.indexname;

commit;
