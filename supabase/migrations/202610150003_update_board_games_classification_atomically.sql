create function public.update_admin_board_games_classification(
  p_items jsonb,
  p_action text,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_item_count integer;
  v_locked_count integer := 0;
  v_updated_count integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or p_action not in ('set-category', 'set-location') or p_target_id is null then
    return jsonb_build_object('outcome', 'invalid_input');
  end if;
  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 100 then return jsonb_build_object('outcome', 'invalid_input'); end if;
  if v_item_count <> (select count(distinct input.id) from jsonb_to_recordset(p_items) as input(id uuid, expected_updated_at timestamptz)) then
    return jsonb_build_object('outcome', 'invalid_input');
  end if;
  if p_action = 'set-category' then
    perform 1 from public.board_game_categories where id = p_target_id for key share;
  else
    perform 1 from public.board_game_locations where id = p_target_id for key share;
  end if;
  if not found then return jsonb_build_object('outcome', 'conflict'); end if;
  for v_id in
    select game.id from public.board_games as game
    join jsonb_to_recordset(p_items) as input(id uuid, expected_updated_at timestamptz) on input.id = game.id
    order by game.id for update of game
  loop v_locked_count := v_locked_count + 1; end loop;
  if v_locked_count <> v_item_count then return jsonb_build_object('outcome', 'conflict'); end if;
  if exists (
    select 1 from public.board_games as game
    join jsonb_to_recordset(p_items) as input(id uuid, expected_updated_at timestamptz) on input.id = game.id
    where game.updated_at is distinct from input.expected_updated_at
  ) then return jsonb_build_object('outcome', 'conflict'); end if;
  if p_action = 'set-category' then
    update public.board_games set category_id = p_target_id where id in (select input.id from jsonb_to_recordset(p_items) as input(id uuid));
  else
    update public.board_games set location_id = p_target_id where id in (select input.id from jsonb_to_recordset(p_items) as input(id uuid));
  end if;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> v_item_count then raise exception 'Atomic board-game update affected an unexpected row count'; end if;
  return jsonb_build_object('outcome', 'updated', 'updated_count', v_updated_count);
end;
$$;

revoke all privileges on function public.update_admin_board_games_classification(jsonb, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.update_admin_board_games_classification(jsonb, text, uuid) to service_role;
