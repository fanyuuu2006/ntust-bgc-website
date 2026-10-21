-- PR #43 public review rankings read-only verification.
with
expected_columns(column_name) as (
  values ('global_rank'), ('review_id'), ('board_game_id'),
    ('board_game_name'), ('rating'), ('content'), ('created_at'),
    ('author_id'), ('author_name'), ('author_avatar'),
    ('author_closed_at'), ('like_count')
),
expected_ranks as (
  select review.id review_id,
    row_number() over (
      order by count(review_like.user_id) desc,
        review.created_at desc, review.id desc
    )::bigint global_rank
  from public.board_game_reviews review
  left join public.board_game_review_likes review_like
    on review_like.review_id = review.id
  where review.content is not null and btrim(review.content) <> ''
  group by review.id
),
rank_mismatches as (
  select coalesce(expected.review_id, actual.review_id) review_id
  from expected_ranks expected
  full join public.board_game_review_rankings actual
    on actual.review_id = expected.review_id
   and actual.global_rank = expected.global_rank
  where expected.review_id is null or actual.review_id is null
),
checks as (
  select 'catalog'::text category, 'view_exists'::text check_name,
    case when to_regclass('public.board_game_review_rankings') is not null then 'PASS' else 'MISSING' end status,
    coalesce(to_regclass('public.board_game_review_rankings')::text, 'MISSING') details
  union all
  select 'security', 'security_invoker',
    case when coalesce(classes.reloptions, '{}') @> array['security_invoker=true'] then 'PASS' else 'FAIL' end,
    coalesce(array_to_string(classes.reloptions, ', '), 'NULL')
  from pg_class classes
  where classes.oid = 'public.board_game_review_rankings'::regclass
  union all
  select 'privilege', roles.role_name || '.select',
    case when has_table_privilege(roles.role_name, 'public.board_game_review_rankings', 'SELECT') = roles.expected then 'PASS' else 'FAIL' end,
    has_table_privilege(roles.role_name, 'public.board_game_review_rankings', 'SELECT')::text
  from (values ('service_role', true), ('anon', false), ('authenticated', false)) roles(role_name, expected)
  union all
  select 'privilege', 'public.select',
    case when not exists (
      select 1 from pg_class classes,
        lateral aclexplode(coalesce(classes.relacl, acldefault('r', classes.relowner))) acl
      where classes.oid = 'public.board_game_review_rankings'::regclass
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
   and columns.table_name = 'board_game_review_rankings'
   and columns.column_name = expected.column_name
  union all
  select 'ranking', 'matches_existing_order',
    case when not exists (select 1 from rank_mismatches) then 'PASS' else 'FAIL' end,
    'mismatches=' || (select count(*) from rank_mismatches)
  union all
  select 'ranking', 'continuous',
    case when count(*) = 0 or (min(global_rank) = 1 and max(global_rank) = count(*)) then 'PASS' else 'FAIL' end,
    concat_ws(', ', 'min=' || min(global_rank), 'max=' || max(global_rank), 'count=' || count(*))
  from public.board_game_review_rankings
  union all
  select 'scope', 'text_reviews_only',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    'invalid=' || count(*)
  from public.board_game_review_rankings
  where content is null or btrim(content) = ''
)
select category, check_name, status, details
from checks
order by category, check_name;
