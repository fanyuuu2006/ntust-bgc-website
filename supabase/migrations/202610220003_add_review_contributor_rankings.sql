-- 評論貢獻者排行榜採明確 Opt-in；既有與新帳號預設都不參與。
alter table public.users
  add column review_contributor_ranking_opt_in boolean not null default false;

comment on column public.users.review_contributor_ranking_opt_in is
  '使用者是否自願加入公開評論貢獻者排行榜；預設 false，可隨時退出。';

create view public.review_contributor_rankings
with (security_invoker = true)
as
with valid_reviews as (
  select review.id, review.user_id, review.created_at
  from public.board_game_reviews as review
  where review.content is not null
    and btrim(review.content) <> ''
), contributor_statistics as (
  select
    author.id as user_id,
    author.name as user_name,
    count(distinct review.id)::bigint as review_count,
    count(review_like.user_id)::bigint as received_like_count,
    max(review.created_at) as latest_review_at
  from public.users as author
  join valid_reviews as review on review.user_id = author.id
  left join public.board_game_review_likes as review_like
    on review_like.review_id = review.id
  where author.review_contributor_ranking_opt_in = true
    and author.closed_at is null
  group by author.id
)
select
  row_number() over (
    order by review_count desc,
      received_like_count desc,
      latest_review_at desc,
      user_id asc
  )::bigint as global_rank,
  user_id,
  user_name,
  review_count,
  received_like_count,
  latest_review_at
from contributor_statistics;

revoke all privileges on table public.review_contributor_rankings
  from public, anon, authenticated;
grant select on table public.review_contributor_rankings to service_role;
