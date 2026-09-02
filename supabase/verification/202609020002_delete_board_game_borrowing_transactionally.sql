-- Run with psql using ON_ERROR_STOP. This fixture is rollback-only.
begin;

do $$
declare
  v_suffix text := txid_current()::text;
  v_category_id uuid;
  v_location_id uuid;
  v_board_game_id uuid;
  v_user_id uuid;
  v_pending_borrowing_id bigint;
  v_borrowed_borrowing_id bigint;
  v_conflict_borrowing_id bigint;
  v_history_borrowing_id bigint;
  v_board_game_status public.board_game_status;
  v_history_status public.borrowing_status;
begin
  insert into public.board_game_categories (name)
  values ('Borrowing deletion verification category ' || v_suffix)
  returning id into v_category_id;

  insert into public.board_game_locations (name)
  values ('Borrowing deletion verification location ' || v_suffix)
  returning id into v_location_id;

  insert into public.board_games (
    name, inventory_number, category_id, location_id, status
  )
  values (
    'Borrowing deletion verification game ' || v_suffix,
      9000000000000 + txid_current(),
    v_category_id,
    v_location_id,
    'borrowed'::public.board_game_status
  )
  returning id into v_board_game_id;

  insert into public.users (name, email)
  values (
    'Borrowing deletion verification user',
    'borrowing-delete-' || v_suffix || '@example.invalid'
  )
  returning id into v_user_id;

  -- Pending deletion does not mutate the current asset status.
  insert into public.board_game_borrowings (board_game_id, user_id, status)
  values (v_board_game_id, v_user_id, 'pending'::public.borrowing_status)
  returning id into v_pending_borrowing_id;
  perform public.delete_board_game_borrowing(v_pending_borrowing_id);
  select status into v_board_game_status from public.board_games where id = v_board_game_id;
  if v_board_game_status <> 'borrowed'::public.board_game_status then
    raise exception 'Pending deletion changed board-game status';
  end if;

  -- Approved, rejected, and returned rows are history/state records only;
  -- deletion must not mutate a currently available asset.
  update public.board_games
  set status = 'available'::public.board_game_status
  where id = v_board_game_id;
  foreach v_history_status in array array[
    'approved'::public.borrowing_status,
    'rejected'::public.borrowing_status,
    'returned'::public.borrowing_status
  ]
  loop
    insert into public.board_game_borrowings (
      board_game_id, user_id, status, borrowed_at, due_at, returned_at
    )
    values (
      v_board_game_id,
      v_user_id,
      v_history_status,
      case when v_history_status = 'returned'::public.borrowing_status then now() else null end,
      case when v_history_status = 'returned'::public.borrowing_status then now() + interval '7 days' else null end,
      case when v_history_status = 'returned'::public.borrowing_status then now() else null end
    )
    returning id into v_history_borrowing_id;
    perform public.delete_board_game_borrowing(v_history_borrowing_id);
    select status into v_board_game_status from public.board_games where id = v_board_game_id;
    if v_board_game_status <> 'available'::public.board_game_status then
      raise exception '% deletion changed board-game status', v_history_status;
    end if;
  end loop;

  -- Borrowed deletion atomically removes the row and restores availability.
  update public.board_games
  set status = 'borrowed'::public.board_game_status
  where id = v_board_game_id;
  insert into public.board_game_borrowings (
    board_game_id, user_id, status, borrowed_at, due_at
  )
  values (
    v_board_game_id,
    v_user_id,
    'borrowed'::public.borrowing_status,
    now(),
    now() + interval '7 days'
  )
  returning id into v_borrowed_borrowing_id;
  perform public.delete_board_game_borrowing(v_borrowed_borrowing_id);
  if exists (select 1 from public.board_game_borrowings where id = v_borrowed_borrowing_id) then
    raise exception 'Borrowed deletion did not remove the borrowing row';
  end if;
  select status into v_board_game_status from public.board_games where id = v_board_game_id;
  if v_board_game_status <> 'available'::public.board_game_status then
    raise exception 'Borrowed deletion did not restore board-game availability';
  end if;

  -- A conflicting asset state rolls back without deleting the borrowing.
  update public.board_games
  set status = 'maintenance'::public.board_game_status
  where id = v_board_game_id;
  insert into public.board_game_borrowings (
    board_game_id, user_id, status, borrowed_at, due_at
  )
  values (
    v_board_game_id,
    v_user_id,
    'borrowed'::public.borrowing_status,
    now(),
    now() + interval '7 days'
  )
  returning id into v_conflict_borrowing_id;

  begin
    perform public.delete_board_game_borrowing(v_conflict_borrowing_id);
    raise exception 'Expected BOARD_GAME_STATUS_CONFLICT';
  exception
    when others then
      if sqlerrm <> 'BOARD_GAME_STATUS_CONFLICT' then
        raise;
      end if;
  end;

  if not exists (select 1 from public.board_game_borrowings where id = v_conflict_borrowing_id) then
    raise exception 'Conflict deletion removed the borrowing row';
  end if;
  select status into v_board_game_status from public.board_games where id = v_board_game_id;
  if v_board_game_status <> 'maintenance'::public.board_game_status then
    raise exception 'Conflict deletion changed board-game status';
  end if;
end;
$$;

rollback;
