-- 註銷保留 User FK；closed_at 同時代表停止登入及本次去識別已完成。
-- 不提供復原 RPC，不修改任何既有帳號或社團歷史。
alter table public.users add column closed_at timestamptz;
alter table public.users add constraint users_closed_identity_check check (
  closed_at is null or (
    name = '已註銷使用者' and avatar is null and email_verified_at is null
    and email ~ '^closed-[0-9a-f-]{36}@account\.invalid$'
  )
);

-- 所有新認證資料／開放借用共用 User row lock，避免註銷檢查與新增並行。
create function public.require_open_account() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_closed_at timestamptz;
begin
  if new.user_id is null then return new; end if;
  select closed_at into v_closed_at from public.users where id = new.user_id for update;
  if not found or v_closed_at is not null then
    raise exception using errcode = 'PCL01', message = 'ACCOUNT_CLOSED';
  end if;
  return new;
end;
$$;

create trigger sessions_require_open_account before insert or update of user_id on public.sessions
for each row execute function public.require_open_account();
create trigger credentials_require_open_account before insert or update of user_id on public.auth_credentials
for each row execute function public.require_open_account();
create trigger profiles_require_open_account before insert or update of user_id on public.user_profiles
for each row execute function public.require_open_account();
create trigger verification_require_open_account before insert or update of user_id on public.email_verification_tokens
for each row execute function public.require_open_account();
create trigger borrowings_require_open_account before insert or update of user_id, status on public.board_game_borrowings
for each row when (new.status in ('pending', 'approved', 'borrowed'))
execute function public.require_open_account();

-- 已註銷帳號不可經一般帳號更新／驗證流程重新寫入個資或復原。
create function public.protect_closed_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.closed_at is not null and new is distinct from old then
    raise exception using errcode = 'PCL01', message = 'ACCOUNT_CLOSED';
  end if;
  return new;
end;
$$;
create trigger users_protect_closed_account before update on public.users
for each row execute function public.protect_closed_account();

/**
 * 僅供受信任 Server 呼叫：由 cookie token 解析目標，不接受指定 User ID。
 * Server 先驗證目前密碼；交易內再核對當時比較的 hash，防止重驗期間密碼已改。
 * User lock 後重新核對 Session、借用及憑證；任一步失敗即整筆 rollback。
 */
create function public.close_account(p_session_token text, p_expected_password_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid; v_closed_at timestamptz; v_hash text;
begin
  select user_id into v_user_id from public.sessions
    where token = p_session_token and expires_at > clock_timestamp();
  if not found then
    raise exception using errcode = 'PCL01', message = 'INVALID_SESSION';
  end if;
  select closed_at into v_closed_at from public.users where id = v_user_id for update;
  if not found or v_closed_at is not null then
    raise exception using errcode = 'PCL01', message = 'ACCOUNT_CLOSED';
  end if;
  perform 1 from public.sessions where token = p_session_token and user_id = v_user_id
    and expires_at > clock_timestamp() for update;
  if not found then
    raise exception using errcode = 'PCL01', message = 'INVALID_SESSION';
  end if;
  select password_hash into v_hash from public.auth_credentials where user_id = v_user_id for update;
  if not found or p_expected_password_hash is null or v_hash <> p_expected_password_hash then
    raise exception using errcode = 'PCL03', message = 'REAUTH_REQUIRED';
  end if;
  if exists (select 1 from public.board_game_borrowings where user_id = v_user_id
    and status in ('pending', 'approved', 'borrowed')) then
    raise exception using errcode = 'PCL02', message = 'OPEN_BORROWINGS';
  end if;

  delete from public.email_verification_tokens where user_id = v_user_id;
  delete from public.sessions where user_id = v_user_id;
  delete from public.auth_credentials where user_id = v_user_id;
  delete from public.user_profiles where user_id = v_user_id;
  update public.users set name = '已註銷使用者',
    email = 'closed-' || gen_random_uuid()::text || '@account.invalid',
    avatar = null, email_verified_at = null, closed_at = clock_timestamp(), updated_at = clock_timestamp()
    where id = v_user_id;
end;
$$;

revoke all on function public.require_open_account() from public, anon, authenticated;
revoke all on function public.protect_closed_account() from public, anon, authenticated;
revoke all on function public.close_account(text, text) from public, anon, authenticated;
grant execute on function public.close_account(text, text) to service_role;
