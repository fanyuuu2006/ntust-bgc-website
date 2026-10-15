create function public.update_event_attendances_status(
  p_event_id uuid,
  p_items jsonb,
  p_status public.attendance_status
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_item_count integer;
  v_locked_count integer := 0;
  v_updated_count integer := 0;
  v_now timestamptz := clock_timestamp();
begin
  if p_event_id is null
     or p_status is null
     or p_items is null
     or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('outcome', 'invalid_input');
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 100 then
    return jsonb_build_object('outcome', 'invalid_input');
  end if;

  if v_item_count <> (
    select count(distinct input.id)
    from jsonb_to_recordset(p_items) as input(
      id bigint,
      expected_status public.attendance_status,
      expected_attended_at timestamptz
    )
  ) then
    return jsonb_build_object('outcome', 'invalid_input');
  end if;

  -- Lock overlapping batches in one deterministic order.
  for v_id in
    select attendance.id
    from public.event_attendances as attendance
    join jsonb_to_recordset(p_items) as input(
      id bigint,
      expected_status public.attendance_status,
      expected_attended_at timestamptz
    ) on input.id = attendance.id
    where attendance.event_id = p_event_id
    order by attendance.id
    for update of attendance
  loop
    v_locked_count := v_locked_count + 1;
  end loop;

  -- Missing rows and rows from another event share the same non-disclosing result.
  if v_locked_count <> v_item_count then
    return jsonb_build_object('outcome', 'conflict');
  end if;

  if exists (
    select 1
    from public.event_attendances as attendance
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

  update public.event_attendances as attendance
  set status = p_status,
      attended_at = case
        when p_status = 'absent'::public.attendance_status then null
        else coalesce(attendance.attended_at, v_now)
      end
  where attendance.event_id = p_event_id
    and attendance.id in (
      select input.id
      from jsonb_to_recordset(p_items) as input(id bigint)
    );

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> v_item_count then
    raise exception 'Atomic attendance update affected an unexpected row count';
  end if;

  return jsonb_build_object(
    'outcome', 'updated',
    'updated_count', v_updated_count
  );
end;
$$;

revoke all privileges on function public.update_event_attendances_status(
  uuid,
  jsonb,
  public.attendance_status
) from public, anon, authenticated, service_role;
grant execute on function public.update_event_attendances_status(
  uuid,
  jsonb,
  public.attendance_status
) to service_role;
