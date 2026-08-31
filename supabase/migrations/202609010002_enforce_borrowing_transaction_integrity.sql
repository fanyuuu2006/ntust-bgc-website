-- Phase 1A: protect the verified borrowing workflow:
-- pending -> approved -> borrowed -> returned.

do $$
declare
  v_active_game_conflicts integer;
  v_open_user_game_conflicts integer;
begin
  if to_regclass('public.board_game_borrowings_one_active_game_idx') is not null then
    raise exception 'Unexpected existing index public.board_game_borrowings_one_active_game_idx';
  end if;

  if to_regclass('public.board_game_borrowings_one_open_user_game_idx') is not null then
    raise exception 'Unexpected existing index public.board_game_borrowings_one_open_user_game_idx';
  end if;

  if to_regprocedure('public.checkout_borrowing(bigint,timestamp with time zone)') is not null then
    raise exception 'Unexpected existing function public.checkout_borrowing(bigint,timestamp with time zone)';
  end if;

  if to_regprocedure('public.return_borrowing(bigint)') is not null then
    raise exception 'Unexpected existing function public.return_borrowing(bigint)';
  end if;

  select count(*)
  into v_active_game_conflicts
  from (
    select board_game_id
    from public.board_game_borrowings
    where status in ('approved'::public.borrowing_status, 'borrowed'::public.borrowing_status)
    group by board_game_id
    having count(*) > 1
  ) as conflicts;

  if v_active_game_conflicts > 0 then
    raise exception 'Cannot enforce active borrowing invariant: % conflicting board games', v_active_game_conflicts;
  end if;

  select count(*)
  into v_open_user_game_conflicts
  from (
    select user_id, board_game_id
    from public.board_game_borrowings
    where status in (
      'pending'::public.borrowing_status,
      'approved'::public.borrowing_status,
      'borrowed'::public.borrowing_status
    )
    group by user_id, board_game_id
    having count(*) > 1
  ) as conflicts;

  if v_open_user_game_conflicts > 0 then
    raise exception 'Cannot enforce open user borrowing invariant: % conflicting user and board-game pairs', v_open_user_game_conflicts;
  end if;
end;
$$;

create unique index board_game_borrowings_one_active_game_idx
  on public.board_game_borrowings (board_game_id)
  where status in ('approved'::public.borrowing_status, 'borrowed'::public.borrowing_status);

create unique index board_game_borrowings_one_open_user_game_idx
  on public.board_game_borrowings (user_id, board_game_id)
  where status in (
    'pending'::public.borrowing_status,
    'approved'::public.borrowing_status,
    'borrowed'::public.borrowing_status
  );

create function public.checkout_borrowing(
  p_borrowing_id bigint,
  p_due_at timestamptz
)
returns public.board_game_borrowings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borrowing public.board_game_borrowings%rowtype;
  v_board_game public.board_games%rowtype;
begin
  select *
  into v_borrowing
  from public.board_game_borrowings
  where id = p_borrowing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BORROWING_NOT_FOUND';
  end if;

  if v_borrowing.status <> 'approved'::public.borrowing_status then
    raise exception using errcode = 'P0001', message = 'BORROWING_NOT_APPROVED';
  end if;

  if p_due_at is null or p_due_at <= now() then
    raise exception using errcode = 'P0001', message = 'BORROWING_DUE_DATE_INVALID';
  end if;

  select *
  into v_board_game
  from public.board_games
  where id = v_borrowing.board_game_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BOARD_GAME_NOT_FOUND';
  end if;

  if v_board_game.status <> 'available'::public.board_game_status then
    raise exception using errcode = 'P0001', message = 'BOARD_GAME_NOT_AVAILABLE';
  end if;

  update public.board_game_borrowings
  set status = 'borrowed'::public.borrowing_status,
      borrowed_at = now(),
      due_at = p_due_at
  where id = v_borrowing.id
  returning * into v_borrowing;

  update public.board_games
  set status = 'borrowed'::public.board_game_status
  where id = v_board_game.id;

  return v_borrowing;
end;
$$;

create function public.return_borrowing(
  p_borrowing_id bigint
)
returns public.board_game_borrowings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borrowing public.board_game_borrowings%rowtype;
  v_board_game public.board_games%rowtype;
begin
  select *
  into v_borrowing
  from public.board_game_borrowings
  where id = p_borrowing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BORROWING_NOT_FOUND';
  end if;

  if v_borrowing.status <> 'borrowed'::public.borrowing_status then
    raise exception using errcode = 'P0001', message = 'BORROWING_NOT_BORROWED';
  end if;

  select *
  into v_board_game
  from public.board_games
  where id = v_borrowing.board_game_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BOARD_GAME_NOT_FOUND';
  end if;

  if v_board_game.status <> 'borrowed'::public.board_game_status then
    raise exception using errcode = 'P0001', message = 'BOARD_GAME_STATUS_CONFLICT';
  end if;

  update public.board_game_borrowings
  set status = 'returned'::public.borrowing_status,
      returned_at = now()
  where id = v_borrowing.id
  returning * into v_borrowing;

  update public.board_games
  set status = 'available'::public.board_game_status
  where id = v_board_game.id;

  return v_borrowing;
end;
$$;

revoke all privileges on function public.checkout_borrowing(bigint, timestamptz)
  from public, anon, authenticated;
revoke all privileges on function public.return_borrowing(bigint)
  from public, anon, authenticated;

grant execute on function public.checkout_borrowing(bigint, timestamptz) to service_role;
grant execute on function public.return_borrowing(bigint) to service_role;
