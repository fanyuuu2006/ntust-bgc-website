create or replace function public.delete_event_attendances(
  p_event_id uuid,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_count integer;
  v_locked_count integer;
  v_deleted_count integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    return jsonb_build_object('outcome', 'conflict');
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 100 then
    return jsonb_build_object('outcome', 'conflict');
  end if;

  if (
    select count(distinct input.id)
    from jsonb_to_recordset(p_items) as input(
      id bigint,
      expected_status public.attendance_status,
      expected_attended_at timestamptz
    )
  ) <> v_item_count then
    return jsonb_build_object('outcome', 'conflict');
  end if;

  perform attendance.id
  from public.event_attendances attendance
  join jsonb_to_recordset(p_items) as input(
    id bigint,
    expected_status public.attendance_status,
    expected_attended_at timestamptz
  ) on input.id = attendance.id
  where attendance.event_id = p_event_id
  order by attendance.id
  for update of attendance;
  get diagnostics v_locked_count = row_count;

  if v_locked_count <> v_item_count then
    return jsonb_build_object('outcome', 'conflict');
  end if;

  if exists (
    select 1
    from public.event_attendances attendance
    join jsonb_to_recordset(p_items) as input(
      id bigint,
      expected_status public.attendance_status,
      expected_attended_at timestamptz
    ) on input.id = attendance.id
    where attendance.event_id = p_event_id
      and (
        attendance.status is distinct from input.expected_status
        or attendance.attended_at is distinct from input.expected_attended_at
      )
  ) then
    return jsonb_build_object('outcome', 'conflict');
  end if;

  delete from public.event_attendances attendance
  using jsonb_to_recordset(p_items) as input(
    id bigint,
    expected_status public.attendance_status,
    expected_attended_at timestamptz
  )
  where attendance.id = input.id
    and attendance.event_id = p_event_id
    and attendance.status is not distinct from input.expected_status
    and attendance.attended_at is not distinct from input.expected_attended_at;
  get diagnostics v_deleted_count = row_count;

  if v_deleted_count <> v_item_count then
    raise exception 'event attendances changed while locked';
  end if;

  return jsonb_build_object(
    'outcome', 'deleted',
    'deleted_count', v_deleted_count
  );
end;
$$;

revoke all privileges on function public.delete_event_attendances(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.delete_event_attendances(uuid, jsonb)
  to service_role;
