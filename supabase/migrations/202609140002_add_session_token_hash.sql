-- Stage A：新增雜湊欄位，不回填、不清除 Session，並保留舊 RPC。
-- token 允許 NULL，讓新應用只保存雜湊；舊應用仍可使用 legacy row。
alter table public.sessions add column token_hash text;
alter table public.sessions alter column token drop not null;
alter table public.sessions add constraint sessions_credential_state_check check (
  (token is not null and token_hash is null) or
  (token is null and token_hash is not null and token_hash ~ '^[0-9a-f]{64}$')
);
create unique index sessions_token_hash_key on public.sessions(token_hash) where token_hash is not null;

-- 使用獨立函式名稱維持舊應用相容性；保留 Phase 3G 的鎖定與原子註銷契約。
create function public.close_account_by_session_hash(p_session_token_hash text, p_expected_password_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid; v_closed_at timestamptz; v_hash text;
begin
  select user_id into v_user_id from public.sessions
    where token_hash = p_session_token_hash and expires_at > clock_timestamp();
  if not found then
    raise exception using errcode = 'PCL01', message = 'INVALID_SESSION';
  end if;
  select closed_at into v_closed_at from public.users where id = v_user_id for update;
  if not found or v_closed_at is not null then
    raise exception using errcode = 'PCL01', message = 'ACCOUNT_CLOSED';
  end if;
  perform 1 from public.sessions where token_hash = p_session_token_hash and user_id = v_user_id
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


revoke all on function public.close_account_by_session_hash(text,text) from public, anon, authenticated;
grant execute on function public.close_account_by_session_hash(text,text) to service_role;
