\set ON_ERROR_STOP on
-- Run only after separately authorizing a disposable local QA database.
begin;
do $$ begin
  if current_database() !~ '^purchase_suggestions_qa' then
    raise exception 'Refusing non-QA database';
  end if;
end $$;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end $$;

select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid='public.board_game_purchase_suggestions'::regclass)
  and has_table_privilege('service_role','public.board_game_purchase_suggestions','SELECT')
  and not has_table_privilege('service_role','public.board_game_purchase_suggestions','INSERT')
  and not has_table_privilege('service_role','public.board_game_purchase_suggestions','UPDATE')
  and not has_table_privilege('service_role','public.board_game_purchase_suggestions','DELETE')
  and not has_table_privilege('anon','public.board_game_purchase_suggestions','SELECT')
  and not has_table_privilege('authenticated','public.board_game_purchase_suggestions','SELECT'), 'RLS and direct table ACL');
select pg_temp.assert_true(
  has_function_privilege('service_role','public.submit_board_game_purchase_suggestion(uuid,uuid,text,text,text)','EXECUTE')
  and not has_function_privilege('anon','public.submit_board_game_purchase_suggestion(uuid,uuid,text,text,text)','EXECUTE')
  and not has_function_privilege('authenticated','public.manage_board_game_purchase_suggestion(uuid,uuid,integer,text)','EXECUTE')
  and not has_function_privilege('anon','public.read_board_game_purchase_notice(uuid,uuid,integer)','EXECUTE'), 'RPC ACL');

do $$
declare
  uid uuid; admin_id uuid; unverified_id uuid; year_id uuid; sid uuid;
  rid uuid := gen_random_uuid(); r jsonb; v integer; used integer;
  week_start timestamptz := date_trunc('week', clock_timestamp() at time zone 'Asia/Taipei') at time zone 'Asia/Taipei';
  reason text := '這是一筆完全合成且會回滾的測試推薦。';
begin
  insert into public.users(name,email,email_verified_at) values ('purchase-qa',gen_random_uuid()||'@example.invalid',now()) returning id into uid;
  insert into public.users(name,email,email_verified_at) values ('purchase-admin',gen_random_uuid()||'@example.invalid',now()) returning id into admin_id;
  insert into public.users(name,email) values ('purchase-unverified',gen_random_uuid()||'@example.invalid') returning id into unverified_id;
  -- Historical officer, deliberately not the current academic year.
  insert into public.academic_years(year,start_date,end_date,is_current) values ('991','2900-08-01','2901-07-31',false) returning id into year_id;
  insert into public.officer_positions(user_id,academic_year_id,title) values(admin_id,year_id,'QA') returning id into sid;

  perform pg_temp.assert_true(public.submit_board_game_purchase_suggestion(unverified_id,gen_random_uuid(),'未驗證',reason,null)->>'outcome' = 'ineligible','unverified blocked');
  r := public.submit_board_game_purchase_suggestion(uid,rid,'  QA  GAME  ',reason,null);
  perform pg_temp.assert_true(r->>'outcome' = 'received','first submission');
  sid := (r->>'id')::uuid;
  perform pg_temp.assert_true((public.submit_board_game_purchase_suggestion(uid,rid,'QA  GAME',reason,null)->>'replayed')::boolean,'same request replay');
  perform pg_temp.assert_true(public.submit_board_game_purchase_suggestion(uid,rid,'另一款',reason,null)->>'outcome' = 'request_conflict','changed replay');
  perform pg_temp.assert_true(public.submit_board_game_purchase_suggestion(uid,gen_random_uuid(),'qa game',reason,null)->>'outcome' = 'duplicate','normalized duplicate');
  perform pg_temp.assert_true(public.submit_board_game_purchase_suggestion(uid,gen_random_uuid(),'下一款',reason,null)->>'outcome' = 'cooldown','60 second cooldown');
  perform pg_temp.assert_true(public.manage_board_game_purchase_suggestion(uid,sid,1,'purchased')->>'outcome' = 'forbidden','non-admin blocked');
  perform pg_temp.assert_true(public.manage_board_game_purchase_suggestion(admin_id,sid,1,'purchased')->>'outcome' = 'updated','historical officer accepted');
  perform pg_temp.assert_true(public.manage_board_game_purchase_suggestion(admin_id,sid,1,'delete')->>'outcome' = 'version_conflict','stale admin cannot delete');
  perform pg_temp.assert_true((select purchase_notice_version=1 and purchase_notice_unread from public.board_game_purchase_suggestions where id=sid),'notice created');
  perform pg_temp.assert_true(public.read_board_game_purchase_notice(admin_id,sid,1)->>'outcome' = 'not_found','other user cannot acknowledge');
  perform pg_temp.assert_true(public.read_board_game_purchase_notice(uid,sid,99)->>'outcome' = 'not_found','future notice version blocked');
  perform pg_temp.assert_true(public.read_board_game_purchase_notice(uid,sid,1)->>'outcome' = 'read','own acknowledgement');
  perform pg_temp.assert_true(public.manage_board_game_purchase_suggestion(admin_id,sid,2,'purchased')->>'outcome' = 'updated','same status is idempotent');
  perform pg_temp.assert_true((select version=2 and purchase_notice_version=1 from public.board_game_purchase_suggestions where id=sid),'no duplicate notice');
  perform public.manage_board_game_purchase_suggestion(admin_id,sid,2,'rejected');
  perform public.manage_board_game_purchase_suggestion(admin_id,sid,3,'purchased');
  perform public.read_board_game_purchase_notice(uid,sid,1);
  perform pg_temp.assert_true((select purchase_notice_version=2 and purchase_notice_unread from public.board_game_purchase_suggestions where id=sid),'old acknowledgement leaves new notice unread');
  perform public.manage_board_game_purchase_suggestion(admin_id,sid,4,'delete');
  perform pg_temp.assert_true((select deleted_at is not null and deleted_by_user_id=admin_id from public.board_game_purchase_suggestions where id=sid),'soft delete');
  perform pg_temp.assert_true(public.submit_board_game_purchase_suggestion(uid,gen_random_uuid(),'qa game',reason,null)->>'outcome' = 'duplicate','deleted duplicate still blocked');
  perform pg_temp.assert_true((public.submit_board_game_purchase_suggestion(uid,rid,'QA  GAME',reason,null)->>'replayed')::boolean,'deleted replay remains receipt only');

  -- Privileged fixture timestamps simulate elapsed time without waiting. All
  -- writes are rolled back. Place all three at the start of the current week.
  update public.board_game_purchase_suggestions set created_at=week_start where user_id=uid;
  insert into public.board_game_purchase_suggestions(user_id,request_id,game_name,reason,created_at)
    values(uid,gen_random_uuid(),'本週二',reason,week_start),(uid,gen_random_uuid(),'本週三',reason,week_start);
  select count(*) into used from public.board_game_purchase_suggestions where user_id=uid and created_at>=week_start;
  perform pg_temp.assert_true(used=3,'deleted row remains in quota');
  -- Within the first minute of a week, cooldown can take precedence; both deny.
  r := public.submit_board_game_purchase_suggestion(uid,gen_random_uuid(),'第四款',reason,null);
  perform pg_temp.assert_true(r->>'outcome' in ('weekly_limit','cooldown'),'fourth submission denied');
  update public.board_game_purchase_suggestions set created_at=week_start - interval '1 minute' where user_id=uid;
  r := public.submit_board_game_purchase_suggestion(uid,gen_random_uuid(),'新的一週',reason,null);
  perform pg_temp.assert_true(r->>'outcome'='received','previous week no longer counts');
  perform pg_temp.assert_true((date_trunc('week','2026-09-27 16:00:00+00'::timestamptz at time zone 'Asia/Taipei') at time zone 'Asia/Taipei')='2026-09-27 16:00:00+00'::timestamptz,'Taipei Monday boundary');

  begin
    insert into public.board_game_purchase_suggestions(user_id,request_id,game_name,reason) values(uid,gen_random_uuid(),'X',repeat('x',1001));
    raise exception 'FAIL: long reason accepted';
  exception when check_violation then null; end;
  begin
    insert into public.board_game_purchase_suggestions(user_id,request_id,game_name,reason,status) values(uid,gen_random_uuid(),'Y',reason,'purchased');
    raise exception 'FAIL: missing reviewer accepted';
  exception when check_violation then null; end;
end $$;
rollback;
