-- Remote verification fixture. It creates only transaction-local rows and
-- always rolls them back, leaving the linked database unchanged.
begin;

do $$
declare
  v_user_id uuid;
  v_game_one_id uuid;
  v_game_two_id uuid;
  v_game_three_id uuid;
  v_game_one_status public.board_game_status;
  v_pending_id bigint;
  v_approved_id bigint;
  v_borrowed_id bigint;
  v_rejected_id bigint;
  v_returned_id bigint;
  v_cancelled_id bigint;
begin
  select id into v_user_id from public.users order by created_at, id limit 1;

  select id into v_game_one_id
  from public.board_games as game
  where not exists (
    select 1 from public.board_game_borrowings as borrowing
    where borrowing.board_game_id = game.id
      and borrowing.status in ('pending'::public.borrowing_status, 'approved'::public.borrowing_status, 'borrowed'::public.borrowing_status)
  )
  order by id
  limit 1;

  select id into v_game_two_id
  from public.board_games as game
  where game.id <> v_game_one_id
    and not exists (
      select 1 from public.board_game_borrowings as borrowing
      where borrowing.board_game_id = game.id
        and borrowing.status in ('pending'::public.borrowing_status, 'approved'::public.borrowing_status, 'borrowed'::public.borrowing_status)
    )
  order by id
  limit 1;

  select id into v_game_three_id
  from public.board_games as game
  where game.id not in (v_game_one_id, v_game_two_id)
    and not exists (
      select 1 from public.board_game_borrowings as borrowing
      where borrowing.board_game_id = game.id
        and borrowing.status in ('pending'::public.borrowing_status, 'approved'::public.borrowing_status, 'borrowed'::public.borrowing_status)
    )
  order by id
  limit 1;

  if v_user_id is null or v_game_one_id is null or v_game_two_id is null or v_game_three_id is null then
    raise exception 'CANCELLATION_FIXTURE_PREREQUISITE_MISSING';
  end if;

  select status into v_game_one_status from public.board_games where id = v_game_one_id;

  -- Owner cancellation: pending -> cancelled; no board-game or workflow-field mutation.
  insert into public.board_game_borrowings (user_id, board_game_id, status)
  values (v_user_id, v_game_one_id, 'pending'::public.borrowing_status)
  returning id into v_pending_id;

  update public.board_game_borrowings
  set status = 'cancelled'::public.borrowing_status
  where id = v_pending_id and user_id = v_user_id and status = 'pending'::public.borrowing_status;
  if not found then raise exception 'PENDING_CANCELLATION_FAILED'; end if;

  if exists (
    select 1 from public.board_game_borrowings
    where id = v_pending_id
      and (status <> 'cancelled'::public.borrowing_status
        or due_at is not null
        or approved_by_user_id is not null
        or borrowed_at is not null
        or returned_at is not null)
  ) then raise exception 'PENDING_CANCELLATION_MUTATED_WORKFLOW_FIELDS'; end if;

  if (select status from public.board_games where id = v_game_one_id) <> v_game_one_status then
    raise exception 'PENDING_CANCELLATION_MUTATED_BOARD_GAME';
  end if;

  -- Admin wins first: approved cannot subsequently satisfy the pending predicate.
  insert into public.board_game_borrowings (user_id, board_game_id, status)
  values (v_user_id, v_game_one_id, 'approved'::public.borrowing_status)
  returning id into v_approved_id;
  update public.board_game_borrowings
  set status = 'cancelled'::public.borrowing_status
  where id = v_approved_id and user_id = v_user_id and status = 'pending'::public.borrowing_status;
  if found then raise exception 'APPROVED_CANCELLATION_SUCCEEDED'; end if;

  -- Non-pending terminal/current records cannot be cancelled.
  insert into public.board_game_borrowings (user_id, board_game_id, status, borrowed_at, due_at)
  values (v_user_id, v_game_two_id, 'borrowed'::public.borrowing_status, now(), now() + interval '1 day')
  returning id into v_borrowed_id;
  insert into public.board_game_borrowings (user_id, board_game_id, status)
  values (v_user_id, v_game_two_id, 'rejected'::public.borrowing_status)
  returning id into v_rejected_id;
  insert into public.board_game_borrowings (user_id, board_game_id, status, borrowed_at, returned_at)
  values (v_user_id, v_game_two_id, 'returned'::public.borrowing_status, now() - interval '2 days', now() - interval '1 day')
  returning id into v_returned_id;
  insert into public.board_game_borrowings (user_id, board_game_id, status)
  values (v_user_id, v_game_two_id, 'cancelled'::public.borrowing_status)
  returning id into v_cancelled_id;

  update public.board_game_borrowings set status = 'cancelled'::public.borrowing_status
  where id in (v_borrowed_id, v_rejected_id, v_returned_id, v_cancelled_id)
    and user_id = v_user_id and status = 'pending'::public.borrowing_status;
  if found then raise exception 'NON_PENDING_CANCELLATION_SUCCEEDED'; end if;

  -- User wins first: the same pending predicate prevents later approve/reject.
  insert into public.board_game_borrowings (user_id, board_game_id, status)
  values (v_user_id, v_game_three_id, 'pending'::public.borrowing_status)
  returning id into v_pending_id;
  update public.board_game_borrowings set status = 'cancelled'::public.borrowing_status
  where id = v_pending_id and user_id = v_user_id and status = 'pending'::public.borrowing_status;
  if not found then raise exception 'USER_WINS_CANCELLATION_FAILED'; end if;
  update public.board_game_borrowings set status = 'approved'::public.borrowing_status
  where id = v_pending_id and status = 'pending'::public.borrowing_status;
  if found then raise exception 'USER_WINS_APPROVAL_SUCCEEDED'; end if;
  update public.board_game_borrowings set status = 'rejected'::public.borrowing_status
  where id = v_pending_id and status = 'pending'::public.borrowing_status;
  if found then raise exception 'USER_WINS_REJECTION_SUCCEEDED'; end if;
end;
$$;

rollback;

select '202609050001 cancellation fixture passed and was rolled back' as result;
