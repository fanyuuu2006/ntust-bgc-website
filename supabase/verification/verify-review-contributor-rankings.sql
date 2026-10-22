-- PR review contributor rankings: read-only catalog and behavior verification.
-- to_regclass() 會在物件不存在時回傳 null，避免權限函式因 relation 名稱不存在而中止。
with ranking_views(view_name, relation_oid) as (
  select expected.view_name, to_regclass(format('public.%I', expected.view_name))
  from (values
    ('board_game_rankings'),
    ('board_game_review_rankings'),
    ('review_contributor_rankings')
  ) as expected(view_name)
), checks as (
  select 'column.default_true' check_name,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'users'
        and column_name = 'review_contributor_ranking_opt_in'
        and is_nullable = 'NO' and column_default = 'true'
    ) passed
  union all
  select 'view.exists', relation_oid is not null
  from ranking_views where view_name = 'review_contributor_rankings'
  union all
  select 'view.security_invoker', coalesce((
    select 'security_invoker=true' = any(coalesce(c.reloptions, array[]::text[]))
    from pg_class c
    where c.oid = ranking_views.relation_oid
  ), false)
  from ranking_views where view_name = 'review_contributor_rankings'
  union all
  select 'view.service_role_select', relation_oid is not null
    and coalesce(has_table_privilege('service_role', relation_oid, 'SELECT'), false)
  from ranking_views where view_name = 'review_contributor_rankings'
  union all
  select 'view.public_no_select', relation_oid is not null and not exists (
    select 1
    from pg_class c
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    where c.oid = ranking_views.relation_oid
      and acl.grantee = 0
      and acl.privilege_type = 'SELECT'
  )
  from ranking_views where view_name = 'review_contributor_rankings'
  union all
  select 'view.anon_no_select', relation_oid is not null
    and not coalesce(has_table_privilege('anon', relation_oid, 'SELECT'), false)
  from ranking_views where view_name = 'review_contributor_rankings'
  union all
  select 'view.authenticated_no_select', relation_oid is not null
    and not coalesce(has_table_privilege('authenticated', relation_oid, 'SELECT'), false)
  from ranking_views where view_name = 'review_contributor_rankings'
  union all
  select 'view.columns_exact', coalesce((
    select array_agg(column_name::text order by ordinal_position) = array[
      'global_rank', 'user_id', 'user_name', 'review_count',
      'received_like_count', 'latest_review_at', 'user_avatar'
    ]::text[]
    from information_schema.columns
    where table_schema = 'public' and table_name = 'review_contributor_rankings'
  ), false)
  union all
  select 'view.only_opted_in_active_authors', not exists (
    select 1 from public.review_contributor_rankings ranking
    join public.users author on author.id = ranking.user_id
    where not author.review_contributor_ranking_opt_in or author.closed_at is not null
  )
  union all
  select 'view.positive_text_review_count', not exists (
    select 1 from public.review_contributor_rankings where review_count < 1
  )
  union all
  select 'view.public_avatar_only', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'review_contributor_rankings'
      and column_name = 'user_avatar'
  )
  union all
  select 'view.contiguous_global_rank', not exists (
    select 1 from (
      select global_rank, row_number() over (order by global_rank) expected_rank
      from public.review_contributor_rankings
    ) ranked where global_rank <> expected_rank
  )
  union all
  select 'existing_rankings.' || view_name || '.security_invoker', coalesce((
    select 'security_invoker=true' = any(coalesce(c.reloptions, array[]::text[]))
    from pg_class c where c.oid = ranking_views.relation_oid
  ), false)
  from ranking_views
  where view_name in ('board_game_rankings', 'board_game_review_rankings')
  union all
  select 'existing_rankings.' || view_name || '.service_role_select',
    relation_oid is not null
      and coalesce(has_table_privilege('service_role', relation_oid, 'SELECT'), false)
  from ranking_views
  where view_name in ('board_game_rankings', 'board_game_review_rankings')
  union all
  select 'existing_rankings.' || view_name || '.anon_no_select',
    relation_oid is not null
      and not coalesce(has_table_privilege('anon', relation_oid, 'SELECT'), false)
  from ranking_views
  where view_name in ('board_game_rankings', 'board_game_review_rankings')
  union all
  select 'existing_rankings.' || view_name || '.authenticated_no_select',
    relation_oid is not null
      and not coalesce(has_table_privilege('authenticated', relation_oid, 'SELECT'), false)
  from ranking_views
  where view_name in ('board_game_rankings', 'board_game_review_rankings')
  union all
  select 'existing_rankings.' || view_name || '.public_no_select',
    relation_oid is not null and not exists (
      select 1
      from pg_class c
      cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
      where c.oid = ranking_views.relation_oid
        and acl.grantee = 0
        and acl.privilege_type = 'SELECT'
    )
  from ranking_views
  where view_name in ('board_game_rankings', 'board_game_review_rankings')
)
select check_name, case when passed then 'PASS' else 'FAIL' end status
from checks order by check_name;
