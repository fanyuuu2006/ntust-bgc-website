-- 公開評論排行榜只提供既有公開評論需要的欄位，並先在資料庫端完成排名。
create view public.board_game_review_rankings
with (security_invoker = true)
as
select
  row_number() over (
    order by
      count(review_like.user_id) desc,
      review.created_at desc,
      review.id desc
  )::bigint as global_rank,
  review.id as review_id,
  review.board_game_id,
  board_game.name as board_game_name,
  review.rating,
  review.content,
  review.created_at,
  author.id as author_id,
  author.name as author_name,
  author.avatar as author_avatar,
  author.closed_at as author_closed_at,
  count(review_like.user_id)::bigint as like_count
from public.board_game_reviews as review
join public.board_games as board_game on board_game.id = review.board_game_id
join public.users as author on author.id = review.user_id
left join public.board_game_review_likes as review_like
  on review_like.review_id = review.id
where review.content is not null
  and btrim(review.content) <> ''
group by review.id, board_game.id, author.id;

revoke all privileges on table public.board_game_review_rankings
  from public, anon, authenticated;
grant select on table public.board_game_review_rankings to service_role;
