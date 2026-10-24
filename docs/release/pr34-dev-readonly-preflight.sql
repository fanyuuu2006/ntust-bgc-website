-- PR #34 DEV database preflight.
-- Run this complete file as one query in the DEV Supabase SQL Editor.
-- Read-only: no application RPC is invoked and no database state is changed.

with
expected_migrations(version) as (
  values ('202610140001'), ('202610150001'), ('202610150002'),
    ('202610150003'), ('202610150004'), ('202610150005'), ('202610150006')
),
migration_checks as (
  select 'migration'::text category, expected.version::text check_name,
    'installed'::text expected,
    case when installed.version is null then 'not installed' else 'installed' end::text actual,
    case when installed.version is null then 'MISSING' else 'PASS' end::text status,
    'supabase_migrations.schema_migrations'::text details
  from expected_migrations expected
  left join supabase_migrations.schema_migrations installed
    on installed.version = expected.version
),
expected_functions(function_name, signature) as (
  values
    ('revoke_membership_register_keys', 'public.revoke_membership_register_keys(uuid[])'),
    ('update_event_attendances_status', 'public.update_event_attendances_status(uuid,jsonb,public.attendance_status)'),
    ('update_admin_memberships_status', 'public.update_admin_memberships_status(jsonb,public.merbership_status)'),
    ('update_admin_board_games_classification', 'public.update_admin_board_games_classification(jsonb,text,uuid)'),
    ('manage_board_game_purchase_suggestions', 'public.manage_board_game_purchase_suggestions(uuid,jsonb,text)'),
    ('delete_event_attendances', 'public.delete_event_attendances(uuid,jsonb)')
),
function_metadata as (
  select expected.function_name, expected.signature,
    to_regprocedure(expected.signature) function_oid,
    namespace.nspname schema_name, proc.proname,
    pg_get_function_identity_arguments(proc.oid) actual_arguments,
    pg_get_function_result(proc.oid) return_type,
    proc.prosecdef security_definer, proc.proconfig function_settings,
    owner.rolname owner
  from expected_functions expected
  left join pg_proc proc on proc.oid = to_regprocedure(expected.signature)
  left join pg_namespace namespace on namespace.oid = proc.pronamespace
  left join pg_roles owner on owner.oid = proc.proowner
),
public_function_overloads as (
  select proc.proname,
    string_agg(
      format('%I.%I(%s)', namespace.nspname, proc.proname,
        pg_get_function_identity_arguments(proc.oid)),
      '; ' order by pg_get_function_identity_arguments(proc.oid)
    ) overloads
  from pg_proc proc
  join pg_namespace namespace on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
  group by proc.proname
),
function_overload_checks as (
  select 'rpc'::text category,
    metadata.function_name || '.available_overloads' check_name,
    metadata.signature expected,
    coalesce(overloads.overloads, 'none') actual,
    case when metadata.function_oid is not null then 'PASS'
      when overloads.overloads is not null then 'FAIL'
      else 'MISSING' end::text status,
    case when metadata.function_oid is not null then 'Exact signature is present'
      when overloads.overloads is not null then 'Same name exists, but the required signature is absent'
      else 'No function with this name exists in public' end::text details
  from function_metadata metadata
  left join public_function_overloads overloads on overloads.proname = metadata.function_name
),
function_checks as (
  select 'rpc'::text category, metadata.function_name || check_item.suffix check_name,
    check_item.expected, check_item.actual, check_item.status,
    check_item.details
  from function_metadata metadata
  cross join lateral (
    values
      (
        '.exists'::text,
        'true'::text,
        case when metadata.function_oid is null then 'false' else 'true' end::text,
        case when metadata.function_oid is null then 'MISSING' else 'PASS' end::text,
        metadata.signature::text
      ),
      (
        '.signature',
        metadata.signature,
        case when metadata.function_oid is null then 'MISSING'
          else format('%I.%I(%s)', metadata.schema_name, metadata.proname, metadata.actual_arguments) end,
        case when metadata.function_oid is null then 'MISSING' else 'PASS' end,
        case when metadata.function_oid is null then 'Exact signature was not resolved'
          else 'Resolved by to_regprocedure using the exact expected signature' end
      ),
      (
        '.return_type',
        'jsonb',
        coalesce(metadata.return_type, 'MISSING'),
        case when metadata.function_oid is null then 'MISSING'
          when metadata.return_type = 'jsonb' then 'PASS' else 'FAIL' end,
        metadata.signature
      ),
      (
        '.security_definer',
        'true',
        case when metadata.function_oid is null then 'MISSING' else metadata.security_definer::text end,
        case when metadata.function_oid is null then 'MISSING'
          when metadata.security_definer then 'PASS' else 'FAIL' end,
        metadata.signature
      ),
      (
        '.search_path',
        'search_path=""',
        case when metadata.function_oid is null then 'MISSING'
          else coalesce(array_to_string(metadata.function_settings, ', '), 'NULL') end,
        case when metadata.function_oid is null then 'MISSING'
          when metadata.function_settings @> array['search_path=""'] then 'PASS' else 'FAIL' end,
        metadata.signature
      ),
      (
        '.owner',
        'existing database role',
        coalesce(metadata.owner, 'MISSING'),
        case when metadata.function_oid is null or metadata.owner is null then 'MISSING' else 'PASS' end,
        metadata.signature
      )
  ) check_item(suffix, expected, actual, status, details)
),
expected_role_privileges(role_name, expected_execute) as (
  values ('service_role', true), ('authenticated', false), ('anon', false)
),
role_privilege_checks as (
  select 'rpc_privilege'::text category,
    metadata.function_name || '.' || expected.role_name || '.execute' check_name,
    expected.expected_execute::text expected,
    case when metadata.function_oid is null or roles.oid is null then 'NOT VERIFIED'
      else has_function_privilege(roles.oid, metadata.function_oid, 'EXECUTE')::text end actual,
    case when metadata.function_oid is null then 'MISSING'
      when roles.oid is null then 'NOT VERIFIED'
      when has_function_privilege(roles.oid, metadata.function_oid, 'EXECUTE') = expected.expected_execute then 'PASS'
      else 'FAIL' end::text status,
    case when roles.oid is null then 'Database role is missing' else metadata.signature end::text details
  from function_metadata metadata
  cross join expected_role_privileges expected
  left join pg_roles roles on roles.rolname = expected.role_name
),
public_privilege_checks as (
  select 'rpc_privilege'::text category,
    metadata.function_name || '.public.execute' check_name,
    'false'::text expected,
    case when metadata.function_oid is null then 'NOT VERIFIED' else public_acl.can_execute::text end actual,
    case when metadata.function_oid is null then 'MISSING'
      when public_acl.can_execute then 'FAIL' else 'PASS' end::text status,
    metadata.signature::text details
  from function_metadata metadata
  cross join lateral (
    select exists (
      select 1
      from pg_proc proc,
        lateral aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) acl
      where proc.oid = metadata.function_oid
        and acl.grantee = 0
        and acl.privilege_type = 'EXECUTE'
    ) can_execute
  ) public_acl
),
expected_tables(table_name) as (
  values ('membership_register_keys'), ('event_attendances'), ('memberships'),
    ('board_games'), ('board_game_categories'), ('board_game_locations'),
    ('users'), ('officer_positions'), ('board_game_purchase_suggestions')
),
table_checks as (
  select 'table'::text category, expected.table_name::text check_name,
    'exists'::text expected,
    case when actual.table_name is null then 'MISSING' else 'exists' end::text actual,
    case when actual.table_name is null then 'MISSING' else 'PASS' end::text status,
    'public.' || expected.table_name details
  from expected_tables expected
  left join information_schema.tables actual
    on actual.table_schema = 'public' and actual.table_name = expected.table_name
),
expected_columns(table_name, column_name) as (
  values
    ('membership_register_keys', 'id'), ('membership_register_keys', 'status'),
    ('membership_register_keys', 'revoked_at'), ('event_attendances', 'id'),
    ('event_attendances', 'event_id'), ('event_attendances', 'status'),
    ('event_attendances', 'attended_at'), ('memberships', 'id'),
    ('memberships', 'status'), ('memberships', 'academic_year_id'),
    ('memberships', 'updated_at'), ('board_games', 'id'),
    ('board_games', 'category_id'), ('board_games', 'location_id'),
    ('board_games', 'updated_at'), ('board_game_categories', 'id'),
    ('board_game_locations', 'id'), ('users', 'id'), ('users', 'closed_at'),
    ('users', 'email_verified_at'), ('officer_positions', 'user_id'),
    ('board_game_purchase_suggestions', 'id'),
    ('board_game_purchase_suggestions', 'status'),
    ('board_game_purchase_suggestions', 'deleted_at'),
    ('board_game_purchase_suggestions', 'deleted_by_user_id'),
    ('board_game_purchase_suggestions', 'reviewed_by_user_id'),
    ('board_game_purchase_suggestions', 'reviewed_at'),
    ('board_game_purchase_suggestions', 'updated_at'),
    ('board_game_purchase_suggestions', 'version'),
    ('board_game_purchase_suggestions', 'purchase_notice_version')
),
column_checks as (
  select 'column'::text category,
    expected.table_name || '.' || expected.column_name check_name,
    'exists'::text expected,
    case when actual.column_name is null then 'MISSING' else 'exists' end::text actual,
    case when actual.column_name is null then 'MISSING' else 'PASS' end::text status,
    case when actual.column_name is null then 'public.' || expected.table_name
      else concat_ws(', ', 'type=' || actual.data_type, 'udt=' || actual.udt_name,
        'nullable=' || actual.is_nullable) end::text details
  from expected_columns expected
  left join information_schema.columns actual
    on actual.table_schema = 'public' and actual.table_name = expected.table_name
   and actual.column_name = expected.column_name
),
expected_enums(type_name, enum_label) as (
  values ('attendance_status', 'present'), ('attendance_status', 'late'),
    ('attendance_status', 'absent'), ('merbership_status', 'pending'),
    ('merbership_status', 'active'), ('merbership_status', 'suspended'),
    ('merbership_status', 'cancelled'), ('merbership_status', 'expired'),
    ('membership_register_key_status', 'available'),
    ('membership_register_key_status', 'claimed'),
    ('membership_register_key_status', 'revoked')
),
public_enum_values as (
  select types.typname, enums.enumlabel
  from pg_type types
  join pg_namespace namespaces on namespaces.oid = types.typnamespace
  join pg_enum enums on enums.enumtypid = types.oid
  where namespaces.nspname = 'public'
),
enum_checks as (
  select 'enum'::text category,
    expected.type_name || '.' || expected.enum_label check_name,
    'exists'::text expected,
    case when actual.enumlabel is null then 'MISSING' else 'exists' end::text actual,
    case when actual.enumlabel is null then 'MISSING' else 'PASS' end::text status,
    'public.' || expected.type_name details
  from expected_enums expected
  left join public_enum_values actual
    on actual.typname = expected.type_name and actual.enumlabel = expected.enum_label
),
purchase_suggestion_behavior as (
  select metadata.function_oid,
    case when metadata.function_oid is null then null
      else pg_get_functiondef(metadata.function_oid) end definition
  from function_metadata metadata
  where metadata.function_name = 'manage_board_game_purchase_suggestions'
),
purchase_suggestion_checks as (
  select 'rpc_behavior'::text category, behavior_check.check_name,
    'true'::text expected,
    case when behavior.function_oid is null then 'NOT VERIFIED'
      else behavior_check.matches::text end actual,
    case when behavior.function_oid is null then 'MISSING'
      when behavior_check.matches then 'PASS' else 'FAIL' end::text status,
    'Inspects pg_get_functiondef without invoking the RPC'::text details
  from purchase_suggestion_behavior behavior
  cross join lateral (
    values
      ('manage_board_game_purchase_suggestions.soft_delete'::text,
        position('deleted_at = clock_timestamp()' in behavior.definition) > 0),
      ('manage_board_game_purchase_suggestions.delete_action'::text,
        position('''delete''' in behavior.definition) > 0)
  ) behavior_check(check_name, matches)
),
environment_checks as (
  select 'environment'::text category, 'database_identity'::text check_name,
    'recorded for comparison'::text expected, current_database()::text actual,
    'INFO'::text status,
    concat_ws(', ', 'user=' || current_user,
      'server=' || current_setting('server_version'),
      'checked_at=' || clock_timestamp())::text details
)
select category, check_name, expected, actual, status, details from environment_checks
union all select category, check_name, expected, actual, status, details from migration_checks
union all select category, check_name, expected, actual, status, details from function_overload_checks
union all select category, check_name, expected, actual, status, details from function_checks
union all select category, check_name, expected, actual, status, details from role_privilege_checks
union all select category, check_name, expected, actual, status, details from public_privilege_checks
union all select category, check_name, expected, actual, status, details from table_checks
union all select category, check_name, expected, actual, status, details from column_checks
union all select category, check_name, expected, actual, status, details from enum_checks
union all select category, check_name, expected, actual, status, details from purchase_suggestion_checks
order by category, check_name;
