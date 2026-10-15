create or replace function public.manage_board_game_purchase_suggestions(
  p_actor_id uuid,
  p_records jsonb,
  p_action text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected_count integer;
  v_locked_count integer;
  v_updated_count integer;
begin
  if not exists(
    select 1 from public.users u
    where u.id = p_actor_id and u.closed_at is null and u.email_verified_at is not null
      and exists(select 1 from public.officer_positions o where o.user_id = u.id)
  ) then return jsonb_build_object('outcome', 'forbidden'); end if;
  if p_action is null or p_action not in ('purchased', 'rejected', 'delete') then
    return jsonb_build_object('outcome', 'invalid_action');
  end if;
  if jsonb_typeof(p_records) is distinct from 'array'
    or jsonb_array_length(p_records) < 1 or jsonb_array_length(p_records) > 100 then
    return jsonb_build_object('outcome', 'invalid_action');
  end if;
  select count(*), count(distinct value->>'id') into v_expected_count, v_locked_count
  from jsonb_array_elements(p_records);
  if v_expected_count <> v_locked_count then return jsonb_build_object('outcome', 'invalid_action'); end if;

  perform suggestion.id
  from public.board_game_purchase_suggestions suggestion
  join jsonb_to_recordset(p_records) as expected(id uuid, version integer) on expected.id = suggestion.id
  where suggestion.deleted_at is null
  order by suggestion.id
  for update of suggestion;
  get diagnostics v_locked_count = row_count;
  if v_locked_count <> v_expected_count then return jsonb_build_object('outcome', 'not_found'); end if;
  if exists(
    select 1 from public.board_game_purchase_suggestions suggestion
    join jsonb_to_recordset(p_records) as expected(id uuid, version integer) on expected.id = suggestion.id
    where suggestion.version is distinct from expected.version or suggestion.deleted_at is not null
      or (p_action <> 'delete' and suggestion.status = p_action)
  ) then return jsonb_build_object('outcome', 'version_conflict'); end if;

  if p_action = 'delete' then
    update public.board_game_purchase_suggestions suggestion
    set deleted_at = clock_timestamp(), deleted_by_user_id = p_actor_id,
        updated_at = clock_timestamp(), version = suggestion.version + 1
    from jsonb_to_recordset(p_records) as expected(id uuid, version integer)
    where suggestion.id = expected.id and suggestion.version = expected.version and suggestion.deleted_at is null;
  else
    update public.board_game_purchase_suggestions suggestion
    set status = p_action, reviewed_by_user_id = p_actor_id, reviewed_at = clock_timestamp(),
        updated_at = clock_timestamp(), version = suggestion.version + 1,
        purchase_notice_version = suggestion.purchase_notice_version + case when p_action = 'purchased' then 1 else 0 end
    from jsonb_to_recordset(p_records) as expected(id uuid, version integer)
    where suggestion.id = expected.id and suggestion.version = expected.version
      and suggestion.deleted_at is null and suggestion.status <> p_action;
  end if;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> v_expected_count then raise exception 'purchase suggestion batch changed while locked'; end if;
  return jsonb_build_object('outcome', 'updated', 'updated_count', v_updated_count);
end;
$$;

revoke all on function public.manage_board_game_purchase_suggestions(uuid,jsonb,text)
  from public, anon, authenticated, service_role;
grant execute on function public.manage_board_game_purchase_suggestions(uuid,jsonb,text) to service_role;
