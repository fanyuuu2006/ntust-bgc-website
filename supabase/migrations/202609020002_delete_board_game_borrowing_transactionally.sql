-- Deleting a borrowed record must restore the asset state in the same transaction.
create function public.delete_board_game_borrowing(
  p_borrowing_id bigint
)
returns void
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

  if v_borrowing.status = 'borrowed'::public.borrowing_status then
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

    delete from public.board_game_borrowings
    where id = v_borrowing.id;

    update public.board_games
    set status = 'available'::public.board_game_status
    where id = v_board_game.id;
  else
    delete from public.board_game_borrowings
    where id = v_borrowing.id;
  end if;
end;
$$;

revoke all privileges on function public.delete_board_game_borrowing(bigint)
  from public, anon, authenticated;

grant execute on function public.delete_board_game_borrowing(bigint) to service_role;
