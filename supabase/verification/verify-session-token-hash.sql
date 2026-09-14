-- 僅供空的新建隔離 DB；先套用 pre-S1 canonical snapshot。全部使用假資料。
\set ON_ERROR_STOP on
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL %', label; end if; end $$;
insert into public.users(id,name,email) values ('00000000-0000-4000-8000-000000000001','fixture','fixture@example.invalid');
insert into public.sessions(user_id,token,expires_at) values
 ('00000000-0000-4000-8000-000000000001','legacy-fixture',now()+interval '1 day');
\ir ../migrations/202609140002_add_session_token_hash.sql
select pg_temp.assert_true((select token='legacy-fixture' and token_hash is null from public.sessions), 'legacy unchanged, no backfill');
insert into public.sessions(user_id,token,expires_at) values
 ('00000000-0000-4000-8000-000000000001','old-app-fixture',now()+interval '1 day');
select pg_temp.assert_true((select count(*)=1 from public.sessions where token='old-app-fixture' and expires_at>now()), 'old app lookup works');
insert into public.sessions(user_id,token_hash,expires_at) values
 ('00000000-0000-4000-8000-000000000001',repeat('a',64),now()+interval '1 day'),
 ('00000000-0000-4000-8000-000000000001',repeat('b',64),now()-interval '1 day');
select pg_temp.assert_true((select count(*)=1 from public.sessions where token_hash=repeat('a',64) and token is null and expires_at>now()), 'new app hash works');
select pg_temp.assert_true((select count(*)=0 from public.sessions where token_hash=repeat('b',64) and expires_at>now()), 'expired rejected');
select pg_temp.assert_true(not has_function_privilege('anon','public.close_account_by_session_hash(text,text)','EXECUTE'), 'anon denied');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.close_account_by_session_hash(text,text)','EXECUTE'), 'authenticated denied');
select pg_temp.assert_true(has_function_privilege('service_role','public.close_account_by_session_hash(text,text)','EXECUTE'), 'service allowed');
select pg_temp.assert_true((select prosecdef and proconfig=array['search_path=""'] from pg_proc where oid='public.close_account_by_session_hash(text,text)'::regprocedure), 'hardened function');
do $$ begin
 begin
  insert into public.sessions(user_id,token,token_hash,expires_at) values ('00000000-0000-4000-8000-000000000001','both',repeat('c',64),now());
  raise exception 'FAIL dual credential';
 exception when check_violation then null; end;
 begin
  insert into public.sessions(user_id,token_hash,expires_at) values ('00000000-0000-4000-8000-000000000001','not-a-hash',now());
  raise exception 'FAIL malformed hash';
 exception when check_violation then null; end;
 begin
  insert into public.sessions(user_id,token_hash,expires_at) values ('00000000-0000-4000-8000-000000000001',repeat('a',64),now());
  raise exception 'FAIL duplicate hash';
 exception when unique_violation then null; end;
end $$;
\set approve_legacy_session_invalidation true
\ir ../operations/invalidate-legacy-sessions.sql
select pg_temp.assert_true((select count(*)=0 from public.sessions where token is not null), 'all legacy revoked');
select pg_temp.assert_true((select count(*)=1 from public.sessions where token_hash=repeat('a',64) and expires_at>now()), 'new session survives');
-- 尚未執行 cleanup：證明 schema 仍允許舊 writer，部署流程不能假設 DB 已阻擋它。
begin;
insert into public.sessions(user_id,token,expires_at) values
 ('00000000-0000-4000-8000-000000000001','old-recreated',now()+interval '1 day');
select pg_temp.assert_true((select count(*)=1 from public.sessions where token='old-recreated'), 'legacy writer requires operational shutdown');
rollback;
