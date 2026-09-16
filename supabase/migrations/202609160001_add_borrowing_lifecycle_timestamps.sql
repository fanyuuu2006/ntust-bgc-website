alter table public.board_game_borrowings
  add column approved_at timestamptz,
  add column rejected_at timestamptz,
  add column cancelled_at timestamptz;

create function public.approve_borrowing(p_borrowing_id bigint, p_approver_user_id uuid)
returns public.board_game_borrowings language plpgsql security definer set search_path = '' as $$
declare v_borrowing public.board_game_borrowings%rowtype;
begin
  update public.board_game_borrowings
  set status = 'approved'::public.borrowing_status, approved_at = now(), approved_by_user_id = p_approver_user_id
  where id = p_borrowing_id and status = 'pending'::public.borrowing_status
  returning * into v_borrowing;
  return v_borrowing;
end;
$$;

create function public.reject_borrowing(p_borrowing_id bigint, p_approver_user_id uuid)
returns public.board_game_borrowings language plpgsql security definer set search_path = '' as $$
declare v_borrowing public.board_game_borrowings%rowtype;
begin
  update public.board_game_borrowings
  set status = 'rejected'::public.borrowing_status, rejected_at = now(), approved_by_user_id = p_approver_user_id
  where id = p_borrowing_id and status = 'pending'::public.borrowing_status
  returning * into v_borrowing;
  return v_borrowing;
end;
$$;

create function public.cancel_pending_borrowing(p_borrowing_id bigint, p_user_id uuid)
returns public.board_game_borrowings language plpgsql security definer set search_path = '' as $$
declare v_borrowing public.board_game_borrowings%rowtype;
begin
  update public.board_game_borrowings
  set status = 'cancelled'::public.borrowing_status, cancelled_at = now()
  where id = p_borrowing_id and user_id = p_user_id and status = 'pending'::public.borrowing_status
  returning * into v_borrowing;
  return v_borrowing;
end;
$$;

revoke all privileges on function public.approve_borrowing(bigint, uuid) from public, anon, authenticated;
revoke all privileges on function public.reject_borrowing(bigint, uuid) from public, anon, authenticated;
revoke all privileges on function public.cancel_pending_borrowing(bigint, uuid) from public, anon, authenticated;
grant execute on function public.approve_borrowing(bigint, uuid) to service_role;
grant execute on function public.reject_borrowing(bigint, uuid) to service_role;
grant execute on function public.cancel_pending_borrowing(bigint, uuid) to service_role;
