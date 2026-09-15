\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL %', label; end if; end $$;

select pg_temp.assert_true(
  (select data_type = 'uuid' from information_schema.columns where table_schema='public' and table_name='board_game_reviews' and column_name='id'),
  'review id is uuid'
);
select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.board_game_reviews', 'SELECT')
  and not has_table_privilege('authenticated', 'public.board_game_reviews', 'SELECT')
  and has_table_privilege('service_role', 'public.board_game_reviews', 'SELECT,INSERT,UPDATE,DELETE'),
  'service role boundary'
);
select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid='public.board_game_reviews'::regclass),
  'RLS enabled'
);
select pg_temp.assert_true(
  not has_table_privilege('public', 'public.board_game_review_statistics', 'SELECT')
  and not has_table_privilege('anon', 'public.board_game_review_statistics', 'SELECT')
  and not has_table_privilege('authenticated', 'public.board_game_review_statistics', 'SELECT')
  and has_table_privilege('service_role', 'public.board_game_review_statistics', 'SELECT'),
  'aggregate view service role boundary'
);
select pg_temp.assert_true(
  (select coalesce(reloptions, '{}') @> array['security_invoker=true']
   from pg_class where oid='public.board_game_review_statistics'::regclass),
  'aggregate view uses invoker security'
);
select pg_temp.assert_true(
  (select array_agg(column_name::text order by ordinal_position)
   from information_schema.columns
   where table_schema='public' and table_name='board_game_review_statistics')
  = array['board_game_id','average_rating','rating_count','review_count'],
  'aggregate view exposes only aggregate fields'
);

do $$
declare
  uid1 uuid; uid2 uuid; game uuid; pagination_game uuid; pagination_user uuid;
  category uuid; location uuid; review1 uuid; review2 uuid; i integer;
  before_update timestamptz;
begin
  insert into public.users(name,email,email_verified_at) values
    ('review-one','review-one@example.invalid',now()) returning id into uid1;
  insert into public.users(name,email,email_verified_at) values
    ('review-two','review-two@example.invalid',now()) returning id into uid2;
  insert into public.board_game_categories(name) values ('review-category') returning id into category;
  insert into public.board_game_locations(name) values ('review-location') returning id into location;
  insert into public.board_games(name,category_id,location_id,status,inventory_number)
    values ('review-game',category,location,'available',-315001) returning id into game;
  insert into public.board_games(name,category_id,location_id,status,inventory_number)
    values ('review-pagination-game',category,location,'available',-315003) returning id into pagination_game;

  for i in 1..12 loop
    insert into public.users(name,email,email_verified_at)
      values ('pagination-author-' || i, 'pagination-author-' || i || '@example.invalid', now())
      returning id into pagination_user;
    insert into public.board_game_reviews(board_game_id,user_id,rating,content)
      values (pagination_game, pagination_user, 1 + (i % 5), case when i <= 8 then 'written-' || i else null end);
  end loop;
  perform pg_temp.assert_true(
    (select rating_count=12 and review_count=8 from public.board_game_review_statistics where board_game_id=pagination_game),
    'twelve ratings and eight written reviews'
  );
  perform pg_temp.assert_true(
    (select count(*)=5 from (select id from public.board_game_reviews where board_game_id=pagination_game and content is not null order by created_at desc,id desc limit 5 offset 0) page_one),
    'written page one has five rows'
  );
  perform pg_temp.assert_true(
    (select count(*)=3 from (select id from public.board_game_reviews where board_game_id=pagination_game and content is not null order by created_at desc,id desc limit 5 offset 5) page_two),
    'written page two has three rows'
  );
  perform pg_temp.assert_true(
    (select count(*)=0 from (select id from public.board_game_reviews where board_game_id=pagination_game and content is not null order by created_at desc,id desc limit 5 offset 10) page_three),
    'rating-only rows do not create a third written page'
  );

  perform pg_temp.assert_true(not exists(select 1 from public.board_game_review_statistics where board_game_id=game), 'empty aggregate');
  insert into public.board_game_reviews(board_game_id,user_id,rating,content)
    values (game,uid1,5,null) returning id,updated_at into review1,before_update;
  insert into public.board_game_reviews(board_game_id,user_id,rating,content)
    values (game,uid2,3,'plain <b>text</b>') returning id into review2;
  perform pg_temp.assert_true((select average_rating=4 and rating_count=2 and review_count=1 from public.board_game_review_statistics where board_game_id=game), 'rating and content aggregates');

  begin insert into public.board_game_reviews(board_game_id,user_id,rating) values (game,uid1,4);
    raise exception 'FAIL duplicate accepted'; exception when unique_violation then null; end;
  begin update public.board_game_reviews set rating=0 where id=review1;
    raise exception 'FAIL rating zero accepted'; exception when check_violation then null; end;
  begin update public.board_game_reviews set rating=6 where id=review1;
    raise exception 'FAIL rating six accepted'; exception when check_violation then null; end;
  begin update public.board_game_reviews set content='   ' where id=review1;
    raise exception 'FAIL blank content accepted'; exception when check_violation then null; end;
  begin update public.board_game_reviews set content=repeat('x',2001) where id=review1;
    raise exception 'FAIL long content accepted'; exception when check_violation then null; end;

  update public.board_game_reviews set content=repeat('x',2000) where id=review1;
  perform pg_temp.assert_true((select char_length(content)=2000 from public.board_game_reviews where id=review1), '2000 character content accepted');
  update public.board_game_reviews set content=null where id=review1;

  update public.board_game_reviews set rating=1 where id=review1;
  perform pg_temp.assert_true((select updated_at >= before_update from public.board_game_reviews where id=review1), 'updated timestamp');
  perform pg_temp.assert_true((select average_rating=2 and rating_count=2 and review_count=1 from public.board_game_review_statistics where board_game_id=game), 'edited aggregate');
  insert into public.auth_credentials(user_id,password_hash) values (uid2,'review-closure-hash');
  insert into public.sessions(user_id,token,expires_at) values (uid2,'review-closure-session',now()+interval '1 day');
  perform public.close_account('review-closure-session','review-closure-hash');
  perform pg_temp.assert_true((select rating_count=2 from public.board_game_review_statistics where board_game_id=game), 'closed author remains aggregate');

  begin delete from public.users where id=uid1;
    raise exception 'FAIL user cascade'; exception when foreign_key_violation then null; end;
  begin delete from public.board_games where id=game;
    raise exception 'FAIL game cascade'; exception when foreign_key_violation then null; end;
  delete from public.board_game_reviews where id=review2;
  perform pg_temp.assert_true((select average_rating=1 and rating_count=1 and review_count=0 from public.board_game_review_statistics where board_game_id=game), 'delete aggregate');
end $$;

rollback;
\echo BOARD GAME REVIEWS SQL VERIFICATION PASS
