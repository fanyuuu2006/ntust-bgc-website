create function public.manage_admin_board_game_borrowings(
  p_actor_user_id uuid,
  p_records jsonb,
  p_action text,
  p_due_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected_count integer;
  v_locked_count integer := 0;
  v_updated_count integer;
  v_record record;
begin
  if p_actor_user_id is null then
    raise exception using errcode = '22023', message = 'ACTOR_REQUIRED';
  end if;
  if p_action not in ('approve', 'reject', 'borrow', 'return') then
    raise exception using errcode = '22023', message = 'INVALID_ACTION';
  end if;
  if p_action = 'borrow' and (p_due_at is null or p_due_at <= clock_timestamp()) then
    raise exception using errcode = '22023', message = 'BORROWING_DUE_DATE_INVALID';
  end if;
  if p_action <> 'borrow' and p_due_at is not null then
    raise exception using errcode = '22023', message = 'UNEXPECTED_DUE_DATE';
  end if;
  if p_records is null or jsonb_typeof(p_records) <> 'array' then
    raise exception using errcode = '22023', message = 'RECORDS_MUST_BE_ARRAY';
  end if;

  v_expected_count := jsonb_array_length(p_records);
  if v_expected_count < 1 or v_expected_count > 100 then
    raise exception using errcode = '22023', message = 'INVALID_RECORD_COUNT';
  end if;
  if (
    select count(distinct input.id)
    from jsonb_to_recordset(p_records) as input(id bigint)
  ) <> v_expected_count then
    raise exception using errcode = '22023', message = 'DUPLICATE_RECORD_ID';
  end if;

  -- 先依借用 ID 鎖定，再依桌遊 UUID 鎖定；所有批次均使用相同順序以降低死鎖機率。
  for v_record in
    select
      borrowing.id,
      borrowing.board_game_id,
      borrowing.status,
      input.expected_status,
      input.expected_board_game_id,
      input.expected_board_game_status
    from jsonb_to_recordset(p_records) as input(
      id bigint,
      expected_status public.borrowing_status,
      expected_board_game_id uuid,
      expected_board_game_status public.board_game_status
    )
    join public.board_game_borrowings as borrowing on borrowing.id = input.id
    order by borrowing.id
    for update of borrowing
  loop
    v_locked_count := v_locked_count + 1;
    if v_record.status is distinct from v_record.expected_status
      or v_record.board_game_id is distinct from v_record.expected_board_game_id
      or (p_action in ('approve', 'reject') and v_record.status <> 'pending'::public.borrowing_status)
      or (p_action = 'borrow' and v_record.status <> 'approved'::public.borrowing_status)
      or (p_action = 'return' and v_record.status <> 'borrowed'::public.borrowing_status)
    then
      return jsonb_build_object('outcome', 'conflict', 'updated_count', 0);
    end if;
  end loop;
  if v_locked_count <> v_expected_count then
    return jsonb_build_object('outcome', 'conflict', 'updated_count', 0);
  end if;

  v_locked_count := 0;
  for v_record in
    select game.id, game.status, input.expected_board_game_status
    from jsonb_to_recordset(p_records) as input(
      id bigint,
      expected_status public.borrowing_status,
      expected_board_game_id uuid,
      expected_board_game_status public.board_game_status
    )
    join public.board_games as game on game.id = input.expected_board_game_id
    order by game.id
    for update of game
  loop
    v_locked_count := v_locked_count + 1;
    if v_record.status is distinct from v_record.expected_board_game_status
      or (p_action = 'approve' and v_record.status <> 'available'::public.board_game_status)
      or (p_action = 'borrow' and v_record.status <> 'available'::public.board_game_status)
      or (p_action = 'return' and v_record.status <> 'borrowed'::public.board_game_status)
    then
      return jsonb_build_object('outcome', 'conflict', 'updated_count', 0);
    end if;
  end loop;
  if v_locked_count <> v_expected_count then
    return jsonb_build_object('outcome', 'conflict', 'updated_count', 0);
  end if;

  if p_action = 'approve' then
    update public.board_game_borrowings as borrowing
    set status = 'approved'::public.borrowing_status,
        approved_at = clock_timestamp(),
        approved_by_user_id = p_actor_user_id
    from jsonb_to_recordset(p_records) as input(id bigint)
    where borrowing.id = input.id;
  elsif p_action = 'reject' then
    update public.board_game_borrowings as borrowing
    set status = 'rejected'::public.borrowing_status,
        rejected_at = clock_timestamp(),
        approved_by_user_id = p_actor_user_id
    from jsonb_to_recordset(p_records) as input(id bigint)
    where borrowing.id = input.id;
  elsif p_action = 'borrow' then
    -- 借用與桌遊庫存狀態在同一交易更新，避免只借出其中一部分。
    update public.board_game_borrowings as borrowing
    set status = 'borrowed'::public.borrowing_status,
        borrowed_at = clock_timestamp(),
        due_at = p_due_at
    from jsonb_to_recordset(p_records) as input(id bigint)
    where borrowing.id = input.id;

    update public.board_games as game
    set status = 'borrowed'::public.board_game_status
    from jsonb_to_recordset(p_records) as input(expected_board_game_id uuid)
    where game.id = input.expected_board_game_id;
  else
    update public.board_game_borrowings as borrowing
    set status = 'returned'::public.borrowing_status,
        returned_at = clock_timestamp()
    from jsonb_to_recordset(p_records) as input(id bigint)
    where borrowing.id = input.id;

    update public.board_games as game
    set status = 'available'::public.board_game_status
    from jsonb_to_recordset(p_records) as input(expected_board_game_id uuid)
    where game.id = input.expected_board_game_id;
  end if;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> v_expected_count then
    raise exception using errcode = 'P0001', message = 'BULK_UPDATE_COUNT_MISMATCH';
  end if;

  return jsonb_build_object('outcome', 'updated', 'updated_count', v_updated_count);
end;
$$;

revoke all privileges on function public.manage_admin_board_game_borrowings(uuid, jsonb, text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.manage_admin_board_game_borrowings(uuid, jsonb, text, timestamptz)
  to service_role;
