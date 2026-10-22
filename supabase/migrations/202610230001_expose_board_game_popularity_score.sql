-- ???????????????????????????????
create or replace view public.board_game_rankings
with (security_invoker = true)
as
select
  'popular'::text as ranking,
  row_number() over (
    order by
      statistics.popularity_score desc,
      statistics.rating_count desc,
      statistics.completed_borrow_count desc,
      statistics.average_rating desc nulls last,
      statistics.board_game_id asc
  )::bigint as global_rank,
  statistics.board_game_id,
  statistics.name,
  statistics.image,
  statistics.status,
  statistics.inventory_number,
  statistics.completed_borrow_count,
  statistics.average_rating,
  statistics.rating_count,
  statistics.review_count,
  category.name as category_name,
  location.name as location_name,
  statistics.popularity_score
from public.board_game_popularity_statistics as statistics
left join public.board_game_categories as category
  on category.id = statistics.category_id
left join public.board_game_locations as location
  on location.id = statistics.location_id
where statistics.popularity_score > 0

union all

select
  'rating'::text as ranking,
  row_number() over (
    order by
      statistics.bayesian_rating desc nulls last,
      statistics.rating_count desc,
      statistics.average_rating desc nulls last,
      statistics.completed_borrow_count desc,
      statistics.board_game_id asc
  )::bigint as global_rank,
  statistics.board_game_id,
  statistics.name,
  statistics.image,
  statistics.status,
  statistics.inventory_number,
  statistics.completed_borrow_count,
  statistics.average_rating,
  statistics.rating_count,
  statistics.review_count,
  category.name as category_name,
  location.name as location_name,
  statistics.popularity_score
from public.board_game_popularity_statistics as statistics
left join public.board_game_categories as category
  on category.id = statistics.category_id
left join public.board_game_locations as location
  on location.id = statistics.location_id
where statistics.rating_count > 0

union all

select
  'reviews'::text as ranking,
  row_number() over (
    order by
      statistics.review_count desc,
      statistics.rating_count desc,
      statistics.average_rating desc nulls last,
      statistics.board_game_id asc
  )::bigint as global_rank,
  statistics.board_game_id,
  statistics.name,
  statistics.image,
  statistics.status,
  statistics.inventory_number,
  statistics.completed_borrow_count,
  statistics.average_rating,
  statistics.rating_count,
  statistics.review_count,
  category.name as category_name,
  location.name as location_name,
  statistics.popularity_score
from public.board_game_popularity_statistics as statistics
left join public.board_game_categories as category
  on category.id = statistics.category_id
left join public.board_game_locations as location
  on location.id = statistics.location_id
where statistics.review_count > 0

union all

select
  'borrowed'::text as ranking,
  row_number() over (
    order by
      statistics.completed_borrow_count desc,
      statistics.review_count desc,
      statistics.rating_count desc,
      statistics.board_game_id asc
  )::bigint as global_rank,
  statistics.board_game_id,
  statistics.name,
  statistics.image,
  statistics.status,
  statistics.inventory_number,
  statistics.completed_borrow_count,
  statistics.average_rating,
  statistics.rating_count,
  statistics.review_count,
  category.name as category_name,
  location.name as location_name,
  statistics.popularity_score
from public.board_game_popularity_statistics as statistics
left join public.board_game_categories as category
  on category.id = statistics.category_id
left join public.board_game_locations as location
  on location.id = statistics.location_id
where statistics.completed_borrow_count > 0;

revoke all privileges on table public.board_game_rankings
  from public, anon, authenticated;
grant select on table public.board_game_rankings to service_role;
