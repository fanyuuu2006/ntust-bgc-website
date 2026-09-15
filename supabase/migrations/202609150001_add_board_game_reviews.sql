-- 評分與純文字評論共用一筆紀錄；User／桌遊歷史均由 NO ACTION FK 保留。
create table public.board_game_reviews (
  id uuid constraint board_game_reviews_pkey primary key default gen_random_uuid(),
  board_game_id uuid not null,
  user_id uuid not null,
  rating smallint not null,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_game_reviews_board_game_id_fkey
    foreign key (board_game_id) references public.board_games (id)
    on delete no action on update no action,
  constraint board_game_reviews_user_id_fkey
    foreign key (user_id) references public.users (id)
    on delete no action on update no action,
  constraint board_game_reviews_user_game_key unique (board_game_id, user_id),
  constraint board_game_reviews_rating_check check (rating between 1 and 5),
  constraint board_game_reviews_content_check check (
    content is null or (btrim(content) <> '' and char_length(content) <= 2000)
  )
);

create index board_game_reviews_board_created_idx
  on public.board_game_reviews (board_game_id, created_at desc, id desc);

create trigger update_board_game_reviews_updated_at
before update on public.board_game_reviews
for each row execute function public.update_updated_at_column();

create view public.board_game_review_statistics
with (security_invoker = true)
as
select
  review.board_game_id,
  avg(review.rating)::numeric as average_rating,
  count(*)::bigint as rating_count,
  count(*) filter (where review.content is not null)::bigint as review_count
from public.board_game_reviews as review
group by review.board_game_id;

alter table public.board_game_reviews enable row level security;
revoke all privileges on table public.board_game_reviews
  from public, anon, authenticated;
grant select, insert, update, delete on table public.board_game_reviews
  to service_role;
revoke all privileges on table public.board_game_review_statistics
  from public, anon, authenticated;
grant select on table public.board_game_review_statistics to service_role;
