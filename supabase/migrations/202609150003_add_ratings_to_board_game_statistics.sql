-- 公開桌遊清單的所有排序共用相同評分摘要，避免切換排序時卡片資料不一致。
-- 既有遠端 view 建立於 rich-description 欄位之前，而 canonical schema 會在欄位完整時建立；
-- 明確重建 view 才能消除兩者由 board_game.* 造成的欄位順序差異。
drop view public.board_games_with_statistics;

create view public.board_games_with_statistics
with (security_invoker = true)
as
select
  -- CREATE OR REPLACE VIEW 必須保留既有欄位的名稱與位置；
  -- description_format / rich_description 是 view 建立後才加入 base table 的欄位。
  board_game.id,
  board_game.created_at,
  board_game.name,
  board_game.description,
  board_game.image,
  board_game.updated_at,
  board_game.category_id,
  board_game.location_id,
  board_game.status,
  board_game.inventory_number,
  coalesce(borrowing.completed_borrow_count, 0)::bigint
    as completed_borrow_count,
  review.average_rating,
  coalesce(review.rating_count, 0)::bigint as rating_count,
  coalesce(review.review_count, 0)::bigint as review_count
from public.board_games as board_game
left join (
  select
    borrowing.board_game_id,
    count(*)::bigint as completed_borrow_count
  from public.board_game_borrowings as borrowing
  where borrowing.status in ('borrowed', 'returned')
  group by borrowing.board_game_id
) as borrowing
  on borrowing.board_game_id = board_game.id
left join public.board_game_review_statistics as review
  on review.board_game_id = board_game.id;

revoke all privileges on table public.board_games_with_statistics
  from public, anon, authenticated;
grant select on table public.board_games_with_statistics to service_role;

-- 評分排序沿用熱門度模型已計算的 Bayesian rating，避免在應用層或另一個 view 重複公式。
create or replace view public.board_game_popularity_statistics
with (security_invoker = true)
as
with
borrowing_statistics as (
  select borrowing.board_game_id, count(*)::bigint as completed_borrow_count
  from public.board_game_borrowings as borrowing
  where borrowing.status in ('borrowed', 'returned')
  group by borrowing.board_game_id
),
rating_totals as (
  select
    (coalesce(sum(review.rating), 0)::numeric + 20::numeric * 3.5::numeric)
      / (count(*)::numeric + 20::numeric) as community_mean
  from public.board_game_reviews as review
),
signals as (
  select
    board_game.id as board_game_id,
    board_game.name,
    board_game.description,
    board_game.image,
    board_game.status,
    board_game.inventory_number,
    board_game.category_id,
    board_game.location_id,
    coalesce(borrowing.completed_borrow_count, 0)::bigint as completed_borrow_count,
    review.average_rating,
    coalesce(review.rating_count, 0)::bigint as rating_count,
    coalesce(review.review_count, 0)::bigint as review_count,
    totals.community_mean
  from public.board_games as board_game
  left join borrowing_statistics as borrowing on borrowing.board_game_id = board_game.id
  left join public.board_game_review_statistics as review on review.board_game_id = board_game.id
  cross join rating_totals as totals
),
components as (
  select
    signals.*,
    least(1::double precision, greatest(0::double precision,
      ln(1::double precision + completed_borrow_count::double precision) / ln(21::double precision)
    )) as borrowing_heat,
    least(1::double precision, greatest(0::double precision,
      ln(1::double precision + rating_count::double precision) / ln(11::double precision)
    )) as rating_participation,
    case when rating_count = 0 then null::numeric else
      (rating_count::numeric * average_rating + 5::numeric * community_mean)
        / (rating_count::numeric + 5::numeric)
    end as bayesian_rating
  from signals
),
scored as (
  select
    components.*,
    case when rating_count = 0 then 0::double precision else
      least(1::double precision, greatest(0::double precision,
        ((bayesian_rating - 1::numeric) / 4::numeric)::double precision
      ))
    end as rating_quality
  from components
)
select
  board_game_id,
  name,
  description,
  image,
  status,
  inventory_number,
  category_id,
  location_id,
  completed_borrow_count,
  average_rating,
  rating_count,
  review_count,
  0.50::double precision * borrowing_heat
    + 0.35::double precision * rating_quality
    + 0.15::double precision * rating_participation as popularity_score,
  bayesian_rating
from scored;

revoke all privileges on table public.board_game_popularity_statistics
  from public, anon, authenticated;
grant select on table public.board_game_popularity_statistics to service_role;
