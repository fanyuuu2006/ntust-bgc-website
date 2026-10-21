create table public.board_game_review_likes (
  review_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint board_game_review_likes_pkey primary key (review_id, user_id),
  constraint board_game_review_likes_review_id_fkey
    foreign key (review_id) references public.board_game_reviews (id)
    on delete cascade on update no action,
  constraint board_game_review_likes_user_id_fkey
    foreign key (user_id) references public.users (id)
    on delete cascade on update no action
);

create index board_game_review_likes_user_created_idx
  on public.board_game_review_likes (user_id, created_at desc);

alter table public.board_game_review_likes enable row level security;
revoke all privileges on table public.board_game_review_likes
  from public, anon, authenticated;
grant select, insert, delete on table public.board_game_review_likes
  to service_role;

create function public.set_board_game_review_like(
  p_board_game_id uuid,
  p_review_id uuid,
  p_user_id uuid,
  p_liked boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_like_count bigint;
begin
  if p_board_game_id is null or p_review_id is null or p_user_id is null or p_liked is null then
    raise exception using errcode = '22023', message = 'INVALID_REVIEW_LIKE_INPUT';
  end if;

  -- 鎖定目標評論，讓刪除與按讚不會產生部分完成或幽靈按讚。
  perform 1
  from public.board_game_reviews as review
  where review.id = p_review_id
    and review.board_game_id = p_board_game_id
  for key share;

  if not found then
    raise exception using errcode = 'P0002', message = 'REVIEW_NOT_FOUND';
  end if;

  if p_liked then
    insert into public.board_game_review_likes (review_id, user_id)
    values (p_review_id, p_user_id)
    on conflict (review_id, user_id) do nothing;
  else
    delete from public.board_game_review_likes
    where review_id = p_review_id and user_id = p_user_id;
  end if;

  select count(*) into v_like_count
  from public.board_game_review_likes
  where review_id = p_review_id;

  return jsonb_build_object(
    'review_id', p_review_id,
    'liked_by_me', p_liked,
    'like_count', v_like_count
  );
end;
$$;

create function public.list_public_board_game_reviews(
  p_board_game_id uuid,
  p_viewer_user_id uuid,
  p_search text,
  p_rating smallint,
  p_sort text,
  p_offset integer,
  p_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_board_game_id is null
    or p_sort not in ('popular', 'newest', 'oldest', 'highest', 'lowest')
    or p_offset < 0
    or p_limit < 1
    or p_limit > 50
    or (p_rating is not null and p_rating not between 1 and 5)
  then
    raise exception using errcode = '22023', message = 'INVALID_REVIEW_LIST_INPUT';
  end if;

  with filtered as (
    select
      review.id,
      review.rating,
      review.content,
      review.created_at,
      review.updated_at,
      author.id as author_id,
      author.name as author_name,
      author.avatar as author_avatar,
      author.closed_at as author_closed_at,
      count(like_record.user_id)::bigint as like_count,
      coalesce(bool_or(like_record.user_id = p_viewer_user_id), false) as liked_by_me
    from public.board_game_reviews as review
    join public.users as author on author.id = review.user_id
    left join public.board_game_review_likes as like_record on like_record.review_id = review.id
    where review.board_game_id = p_board_game_id
      and (p_search is null or review.content ilike '%' || p_search || '%')
      and (p_rating is null or review.rating = p_rating)
    group by review.id, author.id
  ), ordered as (
    select filtered.*, row_number() over (order by
      case when p_sort = 'popular' then like_count end desc,
      case when p_sort = 'highest' then rating end desc,
      case when p_sort = 'lowest' then rating end asc,
      case when p_sort = 'oldest' then created_at end asc,
      case when p_sort <> 'oldest' then created_at end desc,
      case when p_sort = 'oldest' then id end asc,
      id desc
    ) as page_order
    from filtered
  ), paged as (
    select * from ordered
    order by
      case when p_sort = 'popular' then like_count end desc,
      case when p_sort = 'highest' then rating end desc,
      case when p_sort = 'lowest' then rating end asc,
      case when p_sort = 'oldest' then created_at end asc,
      case when p_sort <> 'oldest' then created_at end desc,
      case when p_sort = 'oldest' then id end asc,
      id desc
    offset p_offset limit p_limit
  )
  select jsonb_build_object(
    'data', coalesce((
      select jsonb_agg(to_jsonb(paged) - 'page_order' order by paged.page_order)
      from paged
    ), '[]'::jsonb),
    'total', (select count(*) from filtered)
  ) into v_result;

  return v_result;
end;
$$;

revoke all privileges on function public.set_board_game_review_like(uuid, uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.set_board_game_review_like(uuid, uuid, uuid, boolean)
  to service_role;

revoke all privileges on function public.list_public_board_game_reviews(uuid, uuid, text, smallint, text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_public_board_game_reviews(uuid, uuid, text, smallint, text, integer, integer)
  to service_role;
