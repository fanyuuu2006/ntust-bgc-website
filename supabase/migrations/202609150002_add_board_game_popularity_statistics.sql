-- Phase 3J-D：熱門排序使用固定飽和參數，避免新增或篩選桌遊時改變既有分數。
-- 目前 Production 資料仍稀疏，因此採小型社群的保守產品參數：20 次完成借用、10 人評分。
create view public.board_game_popularity_statistics
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
    + 0.15::double precision * rating_participation as popularity_score
from scored;

revoke all privileges on table public.board_game_popularity_statistics
  from public, anon, authenticated;
grant select on table public.board_game_popularity_statistics to service_role;
