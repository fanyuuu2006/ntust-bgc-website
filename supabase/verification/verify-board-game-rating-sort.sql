begin;

insert into public.board_game_categories (id, name)
values ('10000000-0000-4000-8000-000000000001', 'Rating fixture');
insert into public.board_game_locations (id, name)
values ('20000000-0000-4000-8000-000000000001', 'Rating fixture');

insert into public.board_games (
  id, name, category_id, location_id, status, inventory_number
)
values
  ('a0000000-0000-4000-8000-000000000001', 'A', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'available', 900001),
  ('b0000000-0000-4000-8000-000000000001', 'B', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'available', 900002),
  ('c0000000-0000-4000-8000-000000000001', 'C', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'available', 900003),
  ('d0000000-0000-4000-8000-000000000001', 'D', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'available', 900004);

insert into public.users (id, name, email)
select md5('rating-user-' || value::text)::uuid, 'Rating user', 'rating-' || value::text || '@example.invalid'
from generate_series(1, 71) as value;

-- A = 5.0（1）；B = 4.9（20）；C = 4.8（50）；D = 未評分。
insert into public.board_game_reviews (board_game_id, user_id, rating)
select 'a0000000-0000-4000-8000-000000000001'::uuid, md5('rating-user-1')::uuid, 5
union all
select 'b0000000-0000-4000-8000-000000000001'::uuid, md5('rating-user-' || value::text)::uuid,
  case when value <= 19 then 5 else 4 end
from generate_series(2, 21) as value
union all
select 'c0000000-0000-4000-8000-000000000001'::uuid, md5('rating-user-' || value::text)::uuid,
  case when value <= 61 then 5 else 4 end
from generate_series(22, 71) as value;

do $$
declare
  actual text[];
  a_score numeric;
  b_score numeric;
begin
  select array_agg(name order by bayesian_rating desc nulls last, rating_count desc,
    average_rating desc nulls last, completed_borrow_count desc, board_game_id asc)
  into actual
  from public.board_game_popularity_statistics
  where inventory_number between 900001 and 900004;

  if actual <> array['B', 'C', 'A', 'D'] then
    raise exception 'unexpected Bayesian rating order: %', actual;
  end if;

  select bayesian_rating into a_score
  from public.board_game_popularity_statistics where inventory_number = 900001;
  select bayesian_rating into b_score
  from public.board_game_popularity_statistics where inventory_number = 900002;
  if a_score >= 5 or b_score <= a_score then
    raise exception 'single-rating confidence adjustment failed';
  end if;
  if exists (
    select 1 from public.board_game_popularity_statistics
    where inventory_number = 900004 and (bayesian_rating is not null or average_rating is not null or rating_count <> 0)
  ) then
    raise exception 'unrated semantics failed';
  end if;
end
$$;

rollback;
