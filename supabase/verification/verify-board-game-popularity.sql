\set ON_ERROR_STOP on
begin;

do $$
begin
  if not exists (select 1 from pg_views where schemaname = 'public' and viewname = 'board_game_popularity_statistics') then raise exception 'popularity view missing'; end if;
  if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='board_game_popularity_statistics')
    <> array['board_game_id','name','description','image','status','inventory_number','category_id','location_id','completed_borrow_count','average_rating','rating_count','review_count','popularity_score'] then
    raise exception 'popularity projection mismatch';
  end if;
  if (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.board_game_popularity_statistics'::regclass) is not true then raise exception 'security_invoker missing'; end if;
  if exists (
    select 1 from pg_class relation
    cross join lateral aclexplode(coalesce(relation.relacl, acldefault('r', relation.relowner))) privilege
    where relation.oid='public.board_game_popularity_statistics'::regclass
      and privilege.grantee=0 and privilege.privilege_type='SELECT'
  ) then raise exception 'PUBLIC can read popularity view'; end if;
  if has_table_privilege('anon', 'public.board_game_popularity_statistics', 'select') or has_table_privilege('authenticated', 'public.board_game_popularity_statistics', 'select') then raise exception 'browser role can read popularity view'; end if;
  if not has_table_privilege('service_role', 'public.board_game_popularity_statistics', 'select') then raise exception 'service_role cannot read popularity view'; end if;
end $$;

-- fixture 只存在於本交易，結尾 rollback。
insert into public.board_game_categories (id, name) values ('10000000-0000-4000-8000-000000000001', 'ranking');
insert into public.board_game_locations (id, name) values ('20000000-0000-4000-8000-000000000001', 'ranking');
insert into public.users (id, name, email, email_verified_at) values
  ('30000000-0000-4000-8000-000000000001', 'active', 'rank-active@example.test', now()),
  ('30000000-0000-4000-8000-000000000002', '已註銷使用者', 'closed-30000000-0000-4000-8000-000000000002@account.invalid', null);
insert into public.board_games (id, name, description, inventory_number, category_id, location_id, status) values
  ('40000000-0000-4000-8000-000000000001', 'A', '', 91001, '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'available'),
  ('40000000-0000-4000-8000-000000000002', 'B', '', 91002, '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'available'),
  ('40000000-0000-4000-8000-000000000003', 'Lifecycle', '', 91003, '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'available'),
  ('40000000-0000-4000-8000-000000000004', 'Rating only', '', 91004, '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'available'),
  ('40000000-0000-4000-8000-000000000005', 'Written', '', 91005, '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'available'),
  ('40000000-0000-4000-8000-000000000006', 'Zero', '', 91006, '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'available');
insert into public.board_game_borrowings (user_id, board_game_id, status, borrowed_at, returned_at)
select '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'returned'::public.borrowing_status, now() - interval '2 days', now() - interval '1 day'
from generate_series(1, 20) value;
insert into public.board_game_reviews (board_game_id, user_id, rating, content) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 5, null),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 5, 'written'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 4, null),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', 4, 'written');

do $$
declare zero_row record; a_score double precision; b_score double precision; rating_only_score double precision; written_score double precision;
begin
  select * into zero_row from public.board_game_popularity_statistics where board_game_id = '40000000-0000-4000-8000-000000000006';
  if zero_row.popularity_score <> 0 or zero_row.rating_count <> 0 or zero_row.completed_borrow_count <> 0 or zero_row.average_rating is not null then raise exception 'zero-signal semantics failed'; end if;
  select popularity_score into a_score from public.board_game_popularity_statistics where board_game_id = '40000000-0000-4000-8000-000000000001';
  select popularity_score into b_score from public.board_game_popularity_statistics where board_game_id = '40000000-0000-4000-8000-000000000002';
  if a_score <= b_score then raise exception 'borrowing signal did not affect ranking'; end if;
  select popularity_score into rating_only_score from public.board_game_popularity_statistics where board_game_id = '40000000-0000-4000-8000-000000000004';
  select popularity_score into written_score from public.board_game_popularity_statistics where board_game_id = '40000000-0000-4000-8000-000000000005';
  if abs(rating_only_score - written_score) > 0.000000000001 then raise exception 'written content changed popularity'; end if;
  if (select count(*) from public.board_game_popularity_statistics where popularity_score is null or popularity_score < 0 or popularity_score > 1) <> 0 then raise exception 'score bounds failed'; end if;
end $$;

insert into public.board_game_borrowings (user_id, board_game_id, status)
values ('30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'pending');
do $$ begin
  if (select completed_borrow_count from public.board_game_popularity_statistics where board_game_id='40000000-0000-4000-8000-000000000003') <> 0 then raise exception 'pending counted'; end if;
end $$;
update public.board_game_borrowings set status='borrowed', borrowed_at=now(), due_at=now()+interval '7 days' where board_game_id='40000000-0000-4000-8000-000000000003';
do $$ begin
  if (select completed_borrow_count from public.board_game_popularity_statistics where board_game_id='40000000-0000-4000-8000-000000000003') <> 1 then raise exception 'borrowed not counted'; end if;
end $$;
update public.board_game_borrowings set status='returned', returned_at=now() where board_game_id='40000000-0000-4000-8000-000000000003';
do $$ begin
  if (select completed_borrow_count from public.board_game_popularity_statistics where board_game_id='40000000-0000-4000-8000-000000000003') <> 1 then raise exception 'return double-counted'; end if;
end $$;

do $$ declare before_score double precision; after_score double precision; begin
  select popularity_score into before_score from public.board_game_popularity_statistics where board_game_id='40000000-0000-4000-8000-000000000002';
  update public.board_game_reviews set content=null where board_game_id='40000000-0000-4000-8000-000000000002';
  select popularity_score into after_score from public.board_game_popularity_statistics where board_game_id='40000000-0000-4000-8000-000000000002';
  if abs(before_score-after_score) > 0.000000000001 then raise exception 'content changed score'; end if;
  update public.board_game_reviews set rating=1 where board_game_id='40000000-0000-4000-8000-000000000002';
  select popularity_score into after_score from public.board_game_popularity_statistics where board_game_id='40000000-0000-4000-8000-000000000002';
  if after_score >= before_score then raise exception 'rating update did not lower score'; end if;
  delete from public.board_game_reviews where board_game_id='40000000-0000-4000-8000-000000000002';
  if (select popularity_score from public.board_game_popularity_statistics where board_game_id='40000000-0000-4000-8000-000000000002') <> 0 then raise exception 'last rating deletion did not clear score'; end if;
end $$;

do $$ begin
  if (select board_game_id from public.board_game_popularity_statistics where popularity_score=0 order by popularity_score desc, rating_count desc, completed_borrow_count desc, average_rating desc nulls last, board_game_id limit 1)
    <> '40000000-0000-4000-8000-000000000002'::uuid then raise exception 'UUID tie-break failed'; end if;
end $$;

rollback;
