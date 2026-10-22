-- PR review contributor rankings: read-only catalog and behavior verification.
with checks as (
  select 'column.default_false' check_name,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'users'
        and column_name = 'review_contributor_ranking_opt_in'
        and is_nullable = 'NO' and column_default = 'false'
    ) passed
  union all
  select 'view.security_invoker', coalesce(
    (select 'security_invoker=true' = any(coalesce(c.reloptions, array[]::text[]))
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'review_contributor_rankings'), false)
  union all
  select 'view.service_role_select', has_table_privilege('service_role', 'public.review_contributor_rankings', 'SELECT')
  union all
  select 'view.public_no_select', not has_table_privilege('public', 'public.review_contributor_rankings', 'SELECT')
  union all
  select 'view.anon_no_select', not has_table_privilege('anon', 'public.review_contributor_rankings', 'SELECT')
  union all
  select 'view.authenticated_no_select', not has_table_privilege('authenticated', 'public.review_contributor_rankings', 'SELECT')
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
)
select check_name, case when passed then 'PASS' else 'FAIL' end status
from checks order by check_name;
