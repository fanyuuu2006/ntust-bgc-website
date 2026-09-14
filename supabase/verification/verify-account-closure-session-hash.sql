-- 僅於隔離本機／test DB 執行。全部假資料與測試函式隨 rollback 移除。
\set ON_ERROR_STOP on
begin;
create function pg_temp.check_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end;
$$;

select pg_temp.check_true(not has_function_privilege('anon', 'public.close_account_by_session_hash(text,text)', 'EXECUTE'), 'anon forbidden');
select pg_temp.check_true(not has_function_privilege('authenticated', 'public.close_account_by_session_hash(text,text)', 'EXECUTE'), 'authenticated forbidden');
select pg_temp.check_true(has_function_privilege('service_role', 'public.close_account_by_session_hash(text,text)', 'EXECUTE'), 'server allowed');

do $$
declare uid uuid; game uuid; cat uuid; loc uuid; yr uuid; ev uuid; s text; blocked boolean;
begin
  insert into public.academic_years(year,start_date,end_date,is_current) values ('closure-qa',now(),now()+interval '1 year',false) returning id into yr;
  insert into public.board_game_categories(name) values ('closure-qa') returning id into cat;
  insert into public.board_game_locations(name) values ('closure-qa') returning id into loc;
  insert into public.events(name,start_time,end_time) values ('closure-qa',now(),now()+interval '1 day') returning id into ev;
  foreach s in array array['none','pending','approved','borrowed','returned','rejected','cancelled'] loop
    insert into public.users(name,email,avatar,email_verified_at) values ('private-name',s||'@closure.example','https://example.com/private.png',now()) returning id into uid;
    insert into public.user_profiles(user_id,real_name,phone,student_id,school,department,grade)
      values (uid,'private-real-name','private-phone','private-student','private-school','private-department','private-grade');
    insert into public.auth_credentials(user_id,password_hash) values (uid,'qa-hash');
    insert into public.sessions(user_id,token_hash,expires_at) values (uid,encode(extensions.digest(uid||'-one','sha256'),'hex'),now()+interval '1 day'), (uid,encode(extensions.digest(uid||'-two','sha256'),'hex'),now()+interval '1 day');
    insert into public.email_verification_tokens(user_id,token_hash,expires_at) values (uid,uid||'-verify',now()+interval '1 hour');
    insert into public.memberships(user_id,academic_year_id,type,status,joined_at) values (uid,yr,'annual','active',now());
    insert into public.officer_positions(user_id,academic_year_id,title) values (uid,yr,'QA officer');
    insert into public.event_attendances(user_id,event_id,status,attended_at) values (uid,ev,'present',now());
    insert into public.announcements(author_id,title,content,is_published) values (uid,'QA','history',false);
    if s <> 'none' then
      insert into public.board_games(name,category_id,location_id,status,inventory_number)
        values ('QA',cat,loc,'available',-1000-array_position(array['none','pending','approved','borrowed','returned','rejected','cancelled'],s)) returning id into game;
      insert into public.board_game_borrowings(user_id,board_game_id,status) values (uid,game,s::public.borrowing_status);
    end if;
    begin
      perform public.close_account_by_session_hash(encode(extensions.digest(uid||'-one','sha256'),'hex'),'changed-hash');
      raise exception 'FAIL stale credential accepted';
    exception when sqlstate 'PCL03' then null; end;
    blocked := false;
    begin perform public.close_account_by_session_hash(encode(extensions.digest(uid||'-one','sha256'),'hex'),'qa-hash');
    exception when sqlstate 'PCL02' then blocked := true; end;
    perform pg_temp.check_true(blocked = (s in ('pending','approved','borrowed')), 'blocker '||s);
    if blocked then
      perform pg_temp.check_true((select closed_at is null and name='private-name' from public.users where id=uid), 'blocked user unchanged');
      perform pg_temp.check_true((select count(*)=2 from public.sessions where user_id=uid), 'blocked sessions unchanged');
      update public.board_game_borrowings set status='returned' where user_id=uid;
      perform public.close_account_by_session_hash(encode(extensions.digest(uid||'-one','sha256'),'hex'),'qa-hash');
    end if;
    perform pg_temp.check_true((select closed_at is not null and name='已註銷使用者' and email like 'closed-%@account.invalid'
      and avatar is null and email_verified_at is null from public.users where id=uid), 'tombstone');
    perform pg_temp.check_true(not exists(select 1 from public.user_profiles where user_id=uid), 'all profile PII removed');
    perform pg_temp.check_true(not exists(select 1 from public.auth_credentials where user_id=uid), 'credential removed');
    perform pg_temp.check_true(not exists(select 1 from public.sessions where user_id=uid), 'all sessions revoked');
    perform pg_temp.check_true(not exists(select 1 from public.email_verification_tokens where user_id=uid), 'verification removed');
    perform pg_temp.check_true(exists(select 1 from public.memberships where user_id=uid), 'membership retained');
    perform pg_temp.check_true(exists(select 1 from public.officer_positions where user_id=uid), 'officer retained');
    perform pg_temp.check_true(exists(select 1 from public.event_attendances where user_id=uid), 'attendance retained');
    perform pg_temp.check_true(exists(select 1 from public.announcements where author_id=uid), 'author retained');
    if s <> 'none' then perform pg_temp.check_true(exists(select 1 from public.board_game_borrowings where user_id=uid), 'borrowing retained'); end if;
    begin perform public.close_account_by_session_hash(encode(extensions.digest(uid||'-one','sha256'),'hex'),'qa-hash'); raise exception 'FAIL repeated closure accepted';
    exception when sqlstate 'PCL01' then null; end;
    begin insert into public.sessions(user_id,token_hash,expires_at) values (uid,encode(extensions.digest(uid||'-late','sha256'),'hex'),now()+interval '1 day'); raise exception 'FAIL late session accepted';
    exception when sqlstate 'PCL01' then null; end;
    begin insert into public.user_profiles(user_id,real_name,phone) values (uid,'restored','123'); raise exception 'FAIL profile restored';
    exception when sqlstate 'PCL01' then null; end;
    begin update public.users set closed_at=null,name='restored' where id=uid; raise exception 'FAIL reopened';
    exception when sqlstate 'PCL01' then null; end;
    -- 原 Email 不再占用 unique constraint；新帳號不繼承舊 UUID 或歷史。
    insert into public.users(name,email) values ('new-account',s||'@closure.example');
  end loop;
end;
$$;

create function pg_temp.force_closure_failure() returns trigger language plpgsql as $$
begin raise exception 'QA failure after auth deletions'; end;
$$;
create trigger qa_closure_failure before delete on public.user_profiles for each row execute function pg_temp.force_closure_failure();
do $$
declare uid uuid;
begin
  insert into public.users(name,email) values ('rollback','rollback@closure.example') returning id into uid;
  insert into public.user_profiles(user_id,real_name,phone) values (uid,'rollback','phone');
  insert into public.auth_credentials(user_id,password_hash) values (uid,'qa-hash');
  insert into public.sessions(user_id,token_hash,expires_at) values (uid,encode(extensions.digest('rollback-token','sha256'),'hex'),now()+interval '1 day');
  insert into public.email_verification_tokens(user_id,token_hash,expires_at) values (uid,'rollback-verify',now()+interval '1 hour');
  begin perform public.close_account_by_session_hash(encode(extensions.digest('rollback-token','sha256'),'hex'),'qa-hash'); raise exception 'FAIL missing injected error';
  exception when raise_exception then
    if sqlerrm <> 'QA failure after auth deletions' then raise; end if;
  end;
  perform pg_temp.check_true((select closed_at is null from public.users where id=uid), 'rollback user');
  perform pg_temp.check_true(exists(select 1 from public.auth_credentials where user_id=uid), 'rollback credential');
  perform pg_temp.check_true(exists(select 1 from public.sessions where user_id=uid), 'rollback session');
  perform pg_temp.check_true(exists(select 1 from public.email_verification_tokens where user_id=uid), 'rollback token');
end;
$$;
rollback;
\echo ACCOUNT CLOSURE SQL VERIFICATION PASS
