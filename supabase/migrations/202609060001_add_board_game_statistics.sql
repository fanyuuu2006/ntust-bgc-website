-- Public board-game statistics remain derived from borrowing history.
-- The view keeps aggregate ordering inside PostgreSQL so filters and sorting
-- are applied before PostgREST pagination.
create or replace view public.board_games_with_statistics
with (security_invoker = true)
as
select
  board_game.*,
  coalesce(statistics.completed_borrow_count, 0)::bigint
    as completed_borrow_count
from public.board_games as board_game
left join (
  select
    borrowing.board_game_id,
    count(*)::bigint as completed_borrow_count
  from public.board_game_borrowings as borrowing
  where borrowing.status in ('borrowed', 'returned')
  group by borrowing.board_game_id
) as statistics
  on statistics.board_game_id = board_game.id;

revoke all privileges on table public.board_games_with_statistics
  from public, anon, authenticated;
grant select on table public.board_games_with_statistics to service_role;

create index if not exists board_game_borrowings_completed_board_game_idx
  on public.board_game_borrowings (board_game_id)
  where status in ('borrowed', 'returned');
