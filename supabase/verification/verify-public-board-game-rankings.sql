-- 公開桌遊排行榜唯讀驗證：不呼叫 mutation、不修改資料。
with
expected_ranks as (
  select 'popular'::text ranking, statistics.board_game_id,
    row_number() over (
      order by statistics.popularity_score desc, statistics.rating_count desc,
        statistics.completed_borrow_count desc,
        statistics.average_rating desc nulls last, statistics.board_game_id asc
    )::bigint global_rank
  from public.board_game_popularity_statistics statistics
  where statistics.popularity_score > 0
  union all
  select 'rating', statistics.board_game_id,
    row_number() over (
      order by statistics.bayesian_rating desc nulls last,
        statistics.rating_count desc, statistics.average_rating desc nulls last,
        statistics.completed_borrow_count desc, statistics.board_game_id asc
    )::bigint
  from public.board_game_popularity_statistics statistics
  where statistics.rating_count > 0
  union all
  select 'reviews', statistics.board_game_id,
    row_number() over (
      order by statistics.review_count desc, statistics.rating_count desc,
        statistics.average_rating desc nulls last, statistics.board_game_id asc
    )::bigint
  from public.board_game_popularity_statistics statistics
  where statistics.review_count > 0
  union all
  select 'borrowed', statistics.board_game_id,
    row_number() over (
      order by statistics.completed_borrow_count desc,
        statistics.review_count desc, statistics.rating_count desc,
        statistics.board_game_id asc
    )::bigint
  from public.board_game_popularity_statistics statistics
  where statistics.completed_borrow_count > 0
),
rank_mismatches as (
  select coalesce(expected.ranking, actual.ranking) ranking,
    coalesce(expected.board_game_id, actual.board_game_id) board_game_id
  from expected_ranks expected
  full join public.board_game_rankings actual
    on actual.ranking = expected.ranking
   and actual.board_game_id = expected.board_game_id
   and actual.global_rank = expected.global_rank
  where expected.board_game_id is null or actual.board_game_id is null
),
expected_columns(column_name) as (
  values ('ranking'), ('global_rank'), ('board_game_id'), ('name'), ('image'),
    ('status'), ('inventory_number'), ('completed_borrow_count'),
    ('average_rating'), ('rating_count'), ('review_count'),
    ('category_name'), ('location_name')
),
checks as (
  select 'catalog'::text category, 'view_exists'::text check_name,
    case when to_regclass('public.board_game_rankings') is not null then 'PASS' else 'MISSING' end status,
    coalesce(to_regclass('public.board_game_rankings')::text, 'MISSING') details
  union all
  select 'security', 'security_invoker',
    case when coalesce(classes.reloptions, '{}') @> array['security_invoker=true'] then 'PASS' else 'FAIL' end,
    coalesce(array_to_string(classes.reloptions, ', '), 'NULL')
  from pg_class classes
  where classes.oid = 'public.board_game_rankings'::regclass
  union all
  select 'privilege', roles.role_name || '.select',
    case when has_table_privilege(roles.role_name, 'public.board_game_rankings', 'SELECT') = roles.expected then 'PASS' else 'FAIL' end,
    has_table_privilege(roles.role_name, 'public.board_game_rankings', 'SELECT')::text
  from (values ('service_role', true), ('anon', false), ('authenticated', false)) roles(role_name, expected)
  union all
  select 'privilege', 'public.select',
    case when not exists (
      select 1 from pg_class classes,
        lateral aclexplode(coalesce(classes.relacl, acldefault('r', classes.relowner))) acl
      where classes.oid = 'public.board_game_rankings'::regclass
        and acl.grantee = 0 and acl.privilege_type = 'SELECT'
    ) then 'PASS' else 'FAIL' end,
    'PUBLIC must not have SELECT'
  union all
  select 'column', expected.column_name,
    case when columns.column_name is not null then 'PASS' else 'MISSING' end,
    coalesce(columns.data_type, 'MISSING')
  from expected_columns expected
  left join information_schema.columns columns
    on columns.table_schema = 'public'
   and columns.table_name = 'board_game_rankings'
   and columns.column_name = expected.column_name
  union all
  select 'ranking', 'matches_existing_order',
    case when not exists (select 1 from rank_mismatches) then 'PASS' else 'FAIL' end,
    'mismatches=' || (select count(*) from rank_mismatches)
  union all
  select 'ranking', ranking || '.continuous',
    case when min(global_rank) = 1 and max(global_rank) = count(*) then 'PASS' else 'FAIL' end,
    concat_ws(', ', 'min=' || min(global_rank), 'max=' || max(global_rank), 'count=' || count(*))
  from public.board_game_rankings
  group by ranking
  union all
  select 'scope', 'known_rankings_only',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    'unexpected=' || count(*)
  from public.board_game_rankings
  where ranking not in ('popular', 'rating', 'reviews', 'borrowed')
)
select category, check_name, status, details
from checks
order by category, check_name;
